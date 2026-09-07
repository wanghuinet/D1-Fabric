const base=(process.argv[2]??'http://127.0.0.1:8787').replace(/\/$/,'');
async function req(path,init,code){const r=await fetch(base+path,init);const b=await r.json();if(r.status!==code)throw new Error(`${path}: ${r.status} ${JSON.stringify(b)}`);return b;}
await req('/health',undefined,200);
const k=await req('/v1/cache/key',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenant_id:'t1',namespace:'default',key:'k1',ttl_ms:5000})},200);
if(k.authoritative!==false||k.ttl_ms!==5000)throw new Error('invalid cache metadata');
await req('/v1/cache/invalidate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenant_id:'t1',key:k.cache_key})},200);
console.log('W05 smoke PASS');
