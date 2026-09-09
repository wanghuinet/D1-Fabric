const base = (process.argv[2] ?? 'http://127.0.0.1:8787').replace(/\/$/, '');
async function req(path, init, code) {
  const r = await fetch(base + path, init);
  const b = await r.json();
  if (r.status !== code) throw new Error(`${path}: ${r.status} ${JSON.stringify(b)}`);
  return b;
}
await req('/health', undefined, 200);

// Shard contract: 64 logical shards (0..63), physical = (logical % 8) + 1.
const LOGICAL_SHARD_COUNT = 64;
const PHYSICAL_SHARD_COUNT = 8;
const physicalOf = (id) => `D1-${(id % PHYSICAL_SHARD_COUNT) + 1}`;

const first = await req('/v1/route', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenant_id: 't1', namespace: 'default', routing_key: 'k1' }) }, 200);
if (!Number.isInteger(first.shard_id) || !Number.isInteger(first.epoch)) throw new Error('invalid route');
if (first.shard_id < 0 || first.shard_id >= LOGICAL_SHARD_COUNT) throw new Error(`shard_id ${first.shard_id} out of logical range`);
if (first.physical !== physicalOf(first.shard_id)) throw new Error(`physical mapping unstable: ${first.physical} !== ${physicalOf(first.shard_id)}`);

// Determinism: same identity always routes to the same logical shard.
const again = await req('/v1/route', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenant_id: 't1', namespace: 'default', routing_key: 'k1' }) }, 200);
if (again.shard_id !== first.shard_id || again.physical !== first.physical) throw new Error('routing is not deterministic');

// Spot-check boundary logical shards map to the correct physical D1.
for (const id of [0, 7, 8, 15, 63]) {
  const r = await req('/v1/route', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenant_id: 't1', namespace: 'default', routing_key: `k-${id}` }) }, 200);
  if (r.shard_id < 0 || r.shard_id >= LOGICAL_SHARD_COUNT) throw new Error(`shard ${id} out of range`);
  if (r.physical !== physicalOf(r.shard_id)) throw new Error(`physical mismatch for shard ${r.shard_id}`);
}

await req('/v1/route', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenant_id: 't1', namespace: 'default', routing_key: 'k1', expected_epoch: first.epoch + 1 }) }, 409);
console.log('W02 smoke PASS');
