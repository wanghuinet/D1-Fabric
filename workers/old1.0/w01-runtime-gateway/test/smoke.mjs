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
if (runtime.capabilities?.routing !== true || runtime.capabilities?.query !== true || runtime.capabilities?.write !== true) throw new Error('execution capabilities not wired');
// Budget contract: enforcement map must declare who enforces each budget dimension.
if (!runtime.enforcement || runtime.enforcement.max_rows !== 'w03' || runtime.enforcement.payload_bytes !== 'w01') throw new Error('budget enforcement contract missing');
if (runtime.enforcement.retries !== 'none') throw new Error('retries must be declared none');
// /v1/execute no longer returns 501; it now validates input and rejects invalid payloads.
await check('/v1/execute', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }, 400);
await check('/v1/execute', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenant_id: 't1', namespace: 'n', routing_key: 'k', operation: 'BAD' }) }, 400);
// Oversized payload is rejected at W01 before routing.
const big = 'x'.repeat(70000);
await check('/v1/execute', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenant_id: 't1', namespace: 'n', routing_key: 'k', operation: 'READ', sql: big }) }, 413);
await check('/missing', undefined, 404);
console.log('W01 smoke PASS');