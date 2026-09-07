const base=(process.argv[2]??'http://127.0.0.1:8787').replace(/\/$/,'');
async function req(path,init,code){const r=await fetch(base+path,init);const b=await r.json();if(r.status!==code)throw new Error(`${path}: ${r.status} ${JSON.stringify(b)}`);return b;}
await req('/health',undefined,200);
const first=await req('/v1/route',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenant_id:'t1',namespace:'default',routing_key:'k1'})},200);
if(!Number.isInteger(first.shard_id)||!Number.isInteger(first.epoch))throw new Error('invalid route');
await req('/v1/route',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenant_id:'t1',namespace:'default',routing_key:'k1',expected_epoch:first.epoch+1})},409);
console.log('W02 smoke PASS');
