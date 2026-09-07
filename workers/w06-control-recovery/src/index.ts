type Status='NORMAL'|'DETECTED'|'ISOLATED'|'DIAGNOSING'|'RECOVERING'|'VERIFYING'|'CANARY'|'RESTORING_ADMISSION';
interface Env {
  CONTROL_DB:D1Database; CONTROL_VERSION?:string;
  SHARD_01?:D1Database; SHARD_02?:D1Database; SHARD_03?:D1Database; SHARD_04?:D1Database;
  SHARD_05?:D1Database; SHARD_06?:D1Database; SHARD_07?:D1Database; SHARD_08?:D1Database;
}
const json=(b:unknown,s=200,r=crypto.randomUUID())=>new Response(JSON.stringify(b),{status:s,headers:{'content-type':'application/json','x-request-id':r}});
const ALLOWED:Record<Status,Status[]>={NORMAL:['DETECTED'],DETECTED:['ISOLATED'],ISOLATED:['DIAGNOSING'],DIAGNOSING:['RECOVERING','NORMAL'],RECOVERING:['VERIFYING'],VERIFYING:['CANARY','RECOVERING'],CANARY:['RESTORING_ADMISSION','RECOVERING'],RESTORING_ADMISSION:['NORMAL','RECOVERING']};
function shard(env:Env,n:number){return env[`SHARD_${String(n).padStart(2,'0')}` as keyof Env] as D1Database|undefined;}

async function scanShard(db:D1Database){
  const [published,assetMismatch,orphans,sqlite]=await Promise.all([
    db.prepare(`SELECT COUNT(*) AS n FROM platform_content c WHERE c.status='published' AND NOT EXISTS(SELECT 1 FROM platform_publish_operations p WHERE p.tenant_id=c.tenant_id AND p.content_id=c.content_id AND p.status='COMMITTED')`).first<{n:number}>(),
    db.prepare(`SELECT COUNT(*) AS n FROM platform_publish_operations WHERE status='COMMITTED' AND validated_asset_count<>expected_asset_count`).first<{n:number}>(),
    db.prepare(`SELECT COUNT(*) AS n FROM platform_publish_assets a WHERE NOT EXISTS(SELECT 1 FROM platform_publish_operations p WHERE p.tenant_id=a.tenant_id AND p.publish_id=a.publish_id)`).first<{n:number}>(),
    db.prepare('PRAGMA quick_check').first<{quick_check:string}>(),
  ]);
  return {published_without_commit:published?.n??0,committed_asset_count_mismatch:assetMismatch?.n??0,orphan_publish_assets:orphans?.n??0,sqlite_check:sqlite?.quick_check??'UNKNOWN'};
}

async function reconcile(env:Env){
  const checks=await Promise.all(Array.from({length:8},async(_,i)=>{
    const n=i+1,db=shard(env,n);
    if(!db)return {n,status:'DETECTED',reason:'SHARD_BINDING_MISSING'};
    try{
      const v=await scanShard(db);
      const healthy=v.published_without_commit===0&&v.committed_asset_count_mismatch===0&&v.orphan_publish_assets===0&&(v.sqlite_check==='ok'||v.sqlite_check==='OK');
      return {n,status:healthy?'NORMAL':'DETECTED',reason:JSON.stringify(v)};
    }catch(e){return {n,status:'DETECTED',reason:`SCHEMA_OR_QUERY_ERROR:${e instanceof Error?e.message:'UNKNOWN'}`};}
  }));
  await env.CONTROL_DB.batch(checks.map(x=>env.CONTROL_DB.prepare(`INSERT INTO fabric_recovery(recovery_id,subject_type,subject_id,status,reason,updated_at) VALUES(?1,'SHARD_INTEGRITY',?2,?3,?4,CURRENT_TIMESTAMP) ON CONFLICT(recovery_id) DO UPDATE SET status=excluded.status,reason=excluded.reason,updated_at=CURRENT_TIMESTAMP`).bind(`integrity-shard-${String(x.n).padStart(2,'0')}`,`shard-${String(x.n).padStart(2,'0')}`,x.status,x.reason)));
  return checks;
}

export default {
  async scheduled(_event:ScheduledEvent,env:Env){await reconcile(env);},
  async fetch(request:Request,env:Env){
    const rid=request.headers.get('x-request-id')?.slice(0,128)||crypto.randomUUID();
    try{
      const u=new URL(request.url);
      if(request.method==='GET'&&u.pathname==='/health'){
        const row=await env.CONTROL_DB.prepare("SELECT meta_value FROM fabric_control_meta WHERE meta_key='schema_version'").first<{meta_value:string}>();
        return json({status:'READY',service:'d1-fabric-w06-control-recovery',version:'0.3.0',control_version:env.CONTROL_VERSION??'1',schema_version:row?.meta_value??null},200,rid);
      }
      if(request.method==='POST'&&u.pathname==='/v1/recovery/reconcile'){
        const result=await reconcile(env);return json({accepted:true,result},200,rid);
      }
      if(request.method==='POST'&&u.pathname==='/v1/recovery/transition'){
        const b=await request.json() as {from?:Status;to?:Status;reason?:string;recovery_id?:string;subject_type?:string;subject_id?:string;observed_epoch?:number};
        if(!b.from||!b.to||!ALLOWED[b.from]?.includes(b.to))return json({code:'INVALID_RECOVERY_TRANSITION'},409,rid);
        if(b.from==='NORMAL'&&b.to==='DETECTED'&&(!b.subject_type||!b.subject_id))return json({code:'RECOVERY_SUBJECT_REQUIRED'},400,rid);
        const id=b.recovery_id??crypto.randomUUID();
        await env.CONTROL_DB.prepare('INSERT OR REPLACE INTO fabric_recovery(recovery_id,subject_type,subject_id,status,reason,observed_epoch,updated_at) VALUES(?,?,?,?,?,?,CURRENT_TIMESTAMP)').bind(id,b.subject_type??'UNKNOWN',b.subject_id??'UNKNOWN',b.to,b.reason??null,Number.isInteger(b.observed_epoch)?b.observed_epoch:null).run();
        return json({accepted:true,recovery_id:id,from:b.from,to:b.to,reason:b.reason??null,bounded:true},200,rid);
      }
      if(request.method==='POST'&&u.pathname==='/v1/migration/plan'){
        const b=await request.json() as {shard_id?:number;source?:string;target?:string;current_epoch?:number;target_epoch?:number;idempotency_key?:string};
        if(!Number.isInteger(b.shard_id)||!b.source||!b.target||!Number.isInteger(b.current_epoch)||b.target_epoch!==b.current_epoch+1)return json({code:'INVALID_EPOCH_TRANSITION'},400,rid);
        const existing=b.idempotency_key?await env.CONTROL_DB.prepare('SELECT migration_id,phase,from_epoch,to_epoch FROM fabric_migrations WHERE idempotency_key=?').bind(b.idempotency_key).first<{migration_id:string;phase:string;from_epoch:number;to_epoch:number}>():null;
        if(existing)return json({migration_id:existing.migration_id,phase:existing.phase,shard_id:b.shard_id,from_epoch:existing.from_epoch,to_epoch:existing.to_epoch,replayed:true},200,rid);
        const migrationId=crypto.randomUUID();
        await env.CONTROL_DB.prepare("INSERT INTO fabric_migrations(migration_id,shard_id,source_db,target_db,from_epoch,to_epoch,phase,idempotency_key) VALUES(?,?,?,?,?,?,?,?)").bind(migrationId,b.shard_id,b.source,b.target,b.current_epoch,b.target_epoch,'PLAN',b.idempotency_key??null).run();
        return json({migration_id:migrationId,phase:'PLAN',shard_id:b.shard_id,source:b.source,target:b.target,steps:['PLAN','PREPARE','COPY','VERIFY','FENCE','COMMIT_OWNERSHIP','ADVANCE_EPOCH','SERVE','RETIRE_SOURCE'],from_epoch:b.current_epoch,to_epoch:b.target_epoch},200,rid);
      }
      if(request.method==='GET'&&u.pathname==='/v1/shards'){
        const rows=await env.CONTROL_DB.prepare('SELECT shard_id,physical_db,owner,epoch,state,logical_shard_count FROM fabric_shards ORDER BY shard_id').all();
        return json({logical_shard_count:64,items:rows.results},200,rid);
      }
      return json({code:'NOT_FOUND'},404,rid);
    }catch(e){return json({code:e instanceof Error?e.message:'INTERNAL_ERROR'},500,rid)}
  }
};
