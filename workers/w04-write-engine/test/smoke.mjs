const base=(process.argv[2]??'http://127.0.0.1:8787').replace(/\/$/,'');
async function req(path,init,code){const r=await fetch(base+path,init);const b=await r.json();if(r.status!==code)throw new Error(`${path}: ${r.status} ${JSON.stringify(b)}`);return b;}
await req('/health',undefined,200);
const key=`smoke-${Date.now()}`;
const payload=JSON.stringify({smoke:true,value:1});
// shard_id is intentionally omitted: W04 now routes via W02 Shard Router.
const w=await req('/v1/write',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenant_id:'smoke-tenant',namespace:'smoke',record_key:key,op:'INSERT',idempotency_key:key,payload_json:payload})},200);
// Envelope contract: { ok, data, error, request_id }
if(w.ok!==true||w.data.accepted!==true||w.data.replay!==false)throw new Error('invalid write result');
const replay=await req('/v1/write',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenant_id:'smoke-tenant',namespace:'smoke',record_key:key,op:'INSERT',idempotency_key:key,payload_json:payload})},200);
if(replay.data.replay!==true)throw new Error('idempotent replay failed');
await req('/v1/write',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenant_id:'smoke-tenant',namespace:'smoke',record_key:key,op:'INSERT',idempotency_key:key,payload_json:JSON.stringify({smoke:true,value:2})})},409);
console.log('W04 smoke PASS');
