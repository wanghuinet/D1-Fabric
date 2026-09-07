const base = (process.argv[2] ?? 'http://127.0.0.1:8787').replace(/\/$/, '');
async function check(path, init, expected) {
  const res = await fetch(base + path, init);
  const body = await res.json();
  if (res.status !== expected) throw new Error(`${path}: expected ${expected}, got ${res.status}: ${JSON.stringify(body)}`);
  return body;
}
await check('/health', undefined, 200);
const runtime = await check('/v1/runtime', undefined, 200);
if (runtime.capabilities?.d1 !== false) throw new Error('unexpected D1 capability');
await check('/v1/execute', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }, 501);
await check('/missing', undefined, 404);
console.log('W01 smoke PASS');
