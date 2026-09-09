const base = (process.argv[2] ?? 'http://127.0.0.1:8787').replace(/\/$/, '');
async function req(path, init, code) {
  const r = await fetch(base + path, init);
  const b = await r.json();
  if (r.status !== code) throw new Error(`${path}: ${r.status} ${JSON.stringify(b)}`);
  return b;
}
const put = (tenant, key, value, ttl) => req('/v1/cache/put', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenant_id: tenant, namespace: 'default', key, value, ttl_ms: ttl }) }, 200);
const get = (tenant, key) => req('/v1/cache/get', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenant_id: tenant, namespace: 'default', key }) }, 200);

await req('/health', undefined, 200);

// Key derivation remains a pure policy helper (no storage, non-authoritative).
const k = await req('/v1/cache/key', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenant_id: 't1', namespace: 'default', key: 'k1', ttl_ms: 5000 }) }, 200);
if (k.authoritative !== false || k.ttl_ms !== 5000) throw new Error('invalid cache metadata');

// Actual cache round-trip: put -> hit -> invalidate -> miss.
await put('t1', 'k1', '{"v":1}', 30000);
const hit = await get('t1', 'k1');
if (hit.hit !== true || hit.value !== '{"v":1}') throw new Error('cache hit mismatch');
const inv = await req('/v1/cache/invalidate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenant_id: 't1', namespace: 'default', key: 'k1' }) }, 200);
if (inv.invalidated !== true) throw new Error('invalidate failed');
const miss = await get('t1', 'k1');
if (miss.hit !== false) throw new Error('expected cache miss after invalidate');

// TTL expiry: a 1ms entry should be a miss on next get.
await put('t1', 'ttl', 'x', 1);
await new Promise((r) => setTimeout(r, 10));
const expired = await get('t1', 'ttl');
if (expired.hit !== false) throw new Error('TTL expiry not enforced');

// Tenant isolation: same key in different tenants must not collide.
await put('tenantA', 'shared', 'A', 30000);
await put('tenantB', 'shared', 'B', 30000);
const a = await get('tenantA', 'shared');
const b = await get('tenantB', 'shared');
if (a.value !== 'A' || b.value !== 'B') throw new Error('tenant isolation violated');

// MAX_ENTRIES eviction: insert more than the entry budget; oldest should be evicted.
// Use unique keys to force growth; default MAX_ENTRIES=10000 so insert 10100 to trigger.
for (let i = 0; i < 10100; i++) await put('t1', `e${i}`, 'v', 60000);
const first = await get('t1', 'e0');
if (first.hit !== false) throw new Error('oldest entry not evicted under MAX_ENTRIES');

console.log('W05 smoke PASS');
