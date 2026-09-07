const base=(process.argv[2]??'http://127.0.0.1:8787').replace(/\/$/,'');
async function req(path,init,code){const r=await fetch(base+path,init);const b=await r.json();if(r.status!==code)throw new Error(`${path}: ${r.status} ${JSON.stringify(b)}`);return b;}
const health=await req('/health',undefined,200);
if(health.shards_bound!==8)throw new Error('expected 8 shard bindings');
await req('/v1/write',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenant_id:'t1',namespace:'smoke',record_key:'missing-shard',shard_id:64,op:'INSERT',idempotency_key:'idem-invalid'})},400);
await req('/v1/write',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenant_id:'t1',namespace:'smoke',record_key:'bad-payload',shard_id:1,op:'INSERT'})},400);
console.log('W04 smoke PASS');
