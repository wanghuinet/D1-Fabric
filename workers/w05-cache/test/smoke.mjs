const base = (process.argv[2] ?? 'http://127.0.0.1:8787').replace(/\/$/, '');
async function req(path, init, code) {
  const r = await fetch(base + path, init);
  const b = await r.json();
  if (r.status !== code) throw new Error(`${path}: ${r.status} ${JSON.stringify(b)}`);
  return b;
}

await req('/health', undefined, 200);

// Key derivation remains a pure policy helper (no storage, non-authoritative).
const k = await req('/v1/cache/key', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenant_id: 't1', namespace: 'default', key: 'k1', ttl_ms: 5000 }) }, 200);
if (k.authoritative !== false || k.ttl_ms !== 5000) throw new Error('invalid cache metadata');

// Actual cache round-trip: put -> hit -> invalidate -> miss.
await req('/v1/cache/put', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenant_id: 't1', namespace: 'default', key: 'k1', value: '{"v":1}', ttl_ms: 30000 }) }, 200);

const hit = await req('/v1/cache/get', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenant_id: 't1', namespace: 'default', key: 'k1' }) }, 200);
if (hit.hit !== true || hit.value !== '{"v":1}') throw new Error('cache hit mismatch');

const inv = await req('/v1/cache/invalidate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenant_id: 't1', namespace: 'default', key: 'k1' }) }, 200);
if (inv.invalidated !== true) throw new Error('invalidate failed');

const miss = await req('/v1/cache/get', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenant_id: 't1', namespace: 'default', key: 'k1' }) }, 200);
if (miss.hit !== false) throw new Error('expected cache miss after invalidate');

console.log('W05 smoke PASS');