const base=(process.argv[2]??'http://127.0.0.1:8787').replace(/\/$/,'');
async function req(path,init,code){const r=await fetch(base+path,init);const b=await r.json();if(r.status!==code)throw new Error(`${path}: ${r.status} ${JSON.stringify(b)}`);return b;}
await req('/health',undefined,200);
await req('/v1/recovery/transition',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({from:'NORMAL',to:'DETECTED',reason:'smoke'})},200);
const m=await req('/v1/migration/plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({shard_id:1,source:'D1-1',target:'D1-2',current_epoch:1,target_epoch:2})},200);
if(m.steps[4]!=='FENCE'||m.to_epoch!==2)throw new Error('invalid migration plan');
await req('/v1/recovery/transition',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({from:'NORMAL',to:'NORMAL'})},409);
console.log('W06 smoke PASS');
