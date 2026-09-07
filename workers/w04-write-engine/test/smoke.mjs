const base=(process.argv[2]??'http://127.0.0.1:8787').replace(/\/$/,'');
async function req(path,init,code){const r=await fetch(base+path,init);const b=await r.json();if(r.status!==code)throw new Error(`${path}: ${r.status} ${JSON.stringify(b)}`);return b;}
await req('/health',undefined,200);
const key=`smoke-${Date.now()}`;
const payload=JSON.stringify({smoke:true,value:1});
const w=await req('/v1/write',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenant_id:'smoke-tenant',namespace:'smoke',record_key:key,shard_id:1,op:'INSERT',idempotency_key:key,payload_json:payload})},200);
if(w.accepted!==true||w.replay!==false)throw new Error('invalid write result');
const replay=await req('/v1/write',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenant_id:'smoke-tenant',namespace:'smoke',record_key:key,shard_id:1,op:'INSERT',idempotency_key:key,payload_json:payload})},200);
if(replay.replay!==true)throw new Error('idempotent replay failed');
await req('/v1/write',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenant_id:'smoke-tenant',namespace:'smoke',record_key:key,shard_id:1,op:'INSERT',idempotency_key:key,payload_json:JSON.stringify({smoke:true,value:2})})},409);
console.log('W04 smoke PASS');
