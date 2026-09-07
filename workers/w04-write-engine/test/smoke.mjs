const base=(process.argv[2]??'http://127.0.0.1:8787').replace(/\/$/,'');
async function req(path,init,code){const r=await fetch(base+path,init);const b=await r.json();if(r.status!==code)throw new Error(`${path}: ${r.status} ${JSON.stringify(b)}`);return b;}
await req('/health',undefined,200);
const p=await req('/v1/write/plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenant_id:'t1',shard_id:1,op:'INSERT',idempotency_key:'idem-1',batch:[{id:1}]})},200);
if(p.atomicity!=='SHARD_LOCAL'||p.transaction!==true)throw new Error('invalid write plan');
await req('/v1/write/plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenant_id:'t1',shard_id:1,op:'INSERT'})},400);
console.log('W04 smoke PASS');
