const base=(process.argv[2]??'http://127.0.0.1:8787').replace(/\/$/,'');
async function req(path,init,code){const r=await fetch(base+path,init);const b=await r.json();if(r.status!==code)throw new Error(`${path}: ${r.status} ${JSON.stringify(b)}`);return b;}
await req('/health',undefined,200);
const p=await req('/v1/query/plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenant_id:'t1',sql:'select 1',shard_ids:[0,1]})},200);
if(p.fanout!==2||p.parallelism!==2)throw new Error('invalid bounded plan');
await req('/v1/query/plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenant_id:'t1',sql:'select 1',shard_ids:Array.from({length:65},(_,i)=>i)})},429);
console.log('W03 smoke PASS');
