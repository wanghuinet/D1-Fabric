// W04 idempotency race proof.
// Proves that N concurrent identical mutations produce exactly ONE authoritative
// (replay=false) write; all others are rejected (409) or replayed (replay=true).
const base = (process.argv[2] ?? 'http://127.0.0.1:8787').replace(/\/$/, '');
const CONCURRENCY = Number(process.argv[3] ?? 100);

async function call(body) {
  const r = await fetch(base + '/v1/write', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const b = await r.json().catch(() => ({}));
  return { status: r.status, body: b };
}

const key = `race-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const payload = JSON.stringify({ race: true, v: 1 });
const reqBody = { tenant_id: 'race-tenant', namespace: 'race', record_key: key, shard_id: 1, op: 'INSERT', idempotency_key: key, payload_json: payload };

// 1) Concurrent identical mutations: exactly one authoritative commit.
const outcomes = await Promise.all(Array.from({ length: CONCURRENCY }, () => call(reqBody)));
const authoritative = outcomes.filter((o) => o.status === 200 && o.body.accepted === true && o.body.replay === false);
const replayed = outcomes.filter((o) => o.status === 200 && o.body.accepted === true && o.body.replay === true);
const rejected = outcomes.filter((o) => o.status === 409);

console.log(`concurrency=${CONCURRENCY} authoritative=${authoritative.length} replayed=${replayed.length} rejected=${rejected.length}`);

if (authoritative.length !== 1) {
  throw new Error(`FAIL: expected exactly 1 authoritative mutation, got ${authoritative.length}`);
}
if (authoritative.length + replayed.length + rejected.length !== CONCURRENCY) {
  throw new Error('FAIL: unexpected outcome categories (non-200/409 responses present)');
}

// 2) Same idempotency key, different payload => IDEMPOTENCY_KEY_REUSE_CONFLICT.
const conflict = await call({ ...reqBody, payload_json: JSON.stringify({ race: true, v: 2 }) });
if (conflict.status !== 409 || conflict.body.code !== 'IDEMPOTENCY_KEY_REUSE_CONFLICT') {
  throw new Error(`FAIL: expected IDEMPOTENCY_KEY_REUSE_CONFLICT, got ${conflict.status} ${JSON.stringify(conflict.body)}`);
}

// 3) Retry after commit with same payload => replay=true.
const retry = await call(reqBody);
if (retry.status !== 200 || retry.body.replay !== true) {
  throw new Error(`FAIL: expected replay=true after commit, got ${retry.status} ${JSON.stringify(retry.body)}`);
}

console.log(`W04 concurrency PASS (authoritative=1, duplicates=0, conflict=409, retry=replay)`);
