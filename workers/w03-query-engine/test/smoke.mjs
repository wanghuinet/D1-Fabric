const base=(process.argv[2]??'http://127.0.0.1:8787').replace(/\/$/,'');
async function req(path,init,code){const r=await fetch(base+path,init);const b=await r.json();if(r.status!==code)throw new Error(`${path}: ${r.status} ${JSON.stringify(b)}`);return b;}
await req('/health',undefined,200);
// /v1/query/plan raw-SQL fan-out is disabled for tenant isolation. Structured
// tenant-scoped reads go through /v1/query/get and /v1/query/list.
const p=await req('/v1/query/plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenant_id:'t1',sql:'select 1',shard_ids:[0,1]})},410);
if(p.ok!==false||p.error?.code!=='PLAN_QUERY_DISABLED')throw new Error('plan query should be disabled');
console.log('W03 smoke PASS');
