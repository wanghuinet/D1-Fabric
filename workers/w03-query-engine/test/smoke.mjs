const base=(process.argv[2]??'http://127.0.0.1:8787').replace(/\/$/,'');
async function req(path,init,code){const r=await fetch(base+path,init);const b=await r.json();if(r.status!==code)throw new Error(`${path}: ${r.status} ${JSON.stringify(b)}`);return b;}
await req('/health',undefined,200);

// Shard contract: 0..63 valid, 64 invalid. Invalid shards are filtered; all-invalid => INVALID_SHARD_SET.
await req('/v1/query/plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenant_id:'t1',sql:'select 1',shard_ids:[64]})},400);
await req('/v1/query/plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenant_id:'t1',sql:'select 1',shard_ids:[-1]})},400);
const mixed=await req('/v1/query/plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenant_id:'t1',sql:'select 1',shard_ids:[0,64]})},200);
if(mixed.fanout!==1)throw new Error('invalid shards not filtered');

// Single shard bounded read: max_rows is a real execution budget; total_rows <= max_rows.
const single=await req('/v1/query/plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenant_id:'t1',sql:'select 1',shard_ids:[0],max_rows:5})},200);
if(single.total_rows>5)throw new Error('single shard exceeds max_rows');
if(single.max_rows!==5)throw new Error('max_rows not propagated');
if(typeof single.per_shard_limit!=='number')throw new Error('per_shard_limit missing');

// Multi-shard bounded read: global budget is NOT multiplied by fanout.
const multi=await req('/v1/query/plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenant_id:'t1',sql:'select 1',shard_ids:[0,1],max_rows:1})},200);
if(multi.total_rows>1)throw new Error(`global rows budget violated: ${multi.total_rows} > 1`);
if(multi.fanout!==2)throw new Error('fanout mismatch');

// Fanout limit: 65 shards exceeds default MAX_FANOUT=8.
await req('/v1/query/plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenant_id:'t1',sql:'select 1',shard_ids:Array.from({length:65},(_,i)=>i)})},429);

console.log('W03 smoke PASS');
