interface Env {
  MAX_TTL_MS?: string;
  MAX_VALUE_BYTES?: string;
  MAX_ENTRIES?: string;
  MAX_TOTAL_BYTES?: string;
  CACHE_NAMESPACE?: string;
}

interface CacheRequest {
  tenant_id?: string;
  namespace?: string;
  key?: string;
  value?: string;
  value_bytes?: number;
  ttl_ms?: number;
}

interface CacheEntry {
  value: string;
  size: number;
  expiresAt: number;
}

const json = (b: unknown, s = 200, r: string = crypto.randomUUID()) =>
  new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json', 'x-request-id': r } });

// TTL is bounded to [0, MAX_TTL_MS]; a non-finite value falls back to the default.
const ttl = (v: unknown, d: number, max: number) => {
  const n = Number(v ?? d);
  return Number.isFinite(n) ? Math.max(0, Math.min(max, Math.floor(n))) : d;
};

function validText(v: unknown, max: number): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= max;
}

function maxBytes(env: Env): number {
  return Math.max(1, Math.min(1048576, Number(env.MAX_VALUE_BYTES ?? 262144)));
}

function maxTtl(env: Env): number {
  return Math.max(0, Math.min(86400000, Number(env.MAX_TTL_MS ?? 86400000)));
}

function maxEntries(env: Env): number {
  return Math.max(1, Math.min(1000000, Number(env.MAX_ENTRIES ?? 10000)));
}

function maxTotalBytes(env: Env): number {
  return Math.max(1, Math.min(268435456, Number(env.MAX_TOTAL_BYTES ?? 16777216)));
}

// Cache key is tenant-scoped so tenant isolation holds at the key level.
function cacheKey(env: Env, tenantId: string, namespace: string, key: string): string {
  return `${env.CACHE_NAMESPACE ?? 'd1f'}:${tenantId}:${namespace}:${key}`;
}

// In-memory, TTL-bounded store. Ephemeral and non-authoritative by design:
// a miss (or isolate recycle) is always correct. Growth is bounded by TTL expiry,
// MAX_ENTRIES, and MAX_TOTAL_BYTES with FIFO eviction (Map insertion order).
const store = new Map<string, CacheEntry>();
let totalBytes = 0;

function entryBytes(key: string, value: string): number {
  return key.length + new TextEncoder().encode(value).byteLength;
}

// Evict oldest entries (FIFO) until both entry count and total bytes are within budget.
function evict(env: Env) {
  const entryLimit = maxEntries(env);
  const byteLimit = maxTotalBytes(env);
  while ((store.size > entryLimit || totalBytes > byteLimit) && store.size > 0) {
    const oldestKey = store.keys().next().value as string;
    const entry = store.get(oldestKey);
    if (entry) totalBytes -= entry.size;
    store.delete(oldestKey);
  }
}

export default {
  async fetch(request: Request, env: Env) {
    const rid = request.headers.get('x-request-id')?.slice(0, 128) || crypto.randomUUID();
    try {
      const url = new URL(request.url);

      if (request.method === 'GET' && url.pathname === '/health') {
        return json({ status: 'READY', service: 'd1-fabric-w05-cache', version: '0.2.0', cache: 'in-memory' }, 200, rid);
      }

      // Derive a cache key + policy without touching storage. Kept for callers/edge-coordination.
      if (request.method === 'POST' && url.pathname === '/v1/cache/key') {
        const b = await request.json() as CacheRequest;
        if (!validText(b.tenant_id, 256) || !validText(b.namespace, 256) || !validText(b.key, 512)) return json({ code: 'INVALID_ARGUMENT' }, 400, rid);
        const limit = maxBytes(env);
        if ((b.value_bytes ?? 0) > limit) return json({ code: 'VALUE_TOO_LARGE', max_value_bytes: limit }, 413, rid);
        return json({ cache_key: cacheKey(env, b.tenant_id, b.namespace, b.key), ttl_ms: ttl(b.ttl_ms, 30000, maxTtl(env)), max_value_bytes: limit, authoritative: false, mode: 'DERIVED_OR_CACHE_ONLY', invalidation: 'EXPLICIT' }, 200, rid);
      }

      if (request.method === 'POST' && url.pathname === '/v1/cache/put') {
        const b = await request.json() as CacheRequest;
        if (!validText(b.tenant_id, 256) || !validText(b.namespace, 256) || !validText(b.key, 512)) return json({ code: 'INVALID_ARGUMENT' }, 400, rid);
        if (typeof b.value !== 'string') return json({ code: 'INVALID_ARGUMENT', field: 'value' }, 400, rid);
        const limit = maxBytes(env);
        const valueBytes = new TextEncoder().encode(b.value).byteLength;
        if (valueBytes > limit) return json({ code: 'VALUE_TOO_LARGE', max_value_bytes: limit }, 413, rid);
        const ttlMs = ttl(b.ttl_ms, 30000, maxTtl(env));
        const ck = cacheKey(env, b.tenant_id, b.namespace, b.key);
        if (ttlMs <= 0) return json({ stored: false, cache_key: ck, ttl_ms: 0, reason: 'TTL_TOO_SHORT' }, 200, rid);
        const size = entryBytes(ck, b.value);
        const existing = store.get(ck);
        if (existing) totalBytes -= existing.size;
        store.set(ck, { value: b.value, size, expiresAt: Date.now() + ttlMs });
        totalBytes += size;
        evict(env);
        return json({ stored: true, cache_key: ck, ttl_ms: ttlMs, entries: store.size, total_bytes: totalBytes, authoritative: false }, 200, rid);
      }

      if (request.method === 'POST' && url.pathname === '/v1/cache/get') {
        const b = await request.json() as CacheRequest;
        if (!validText(b.tenant_id, 256) || !validText(b.namespace, 256) || !validText(b.key, 512)) return json({ code: 'INVALID_ARGUMENT' }, 400, rid);
        const ck = cacheKey(env, b.tenant_id, b.namespace, b.key);
        const entry = store.get(ck);
        if (!entry || entry.expiresAt <= Date.now()) {
          if (entry) { totalBytes -= entry.size; store.delete(ck); }
          return json({ hit: false, cache_key: ck, authoritative: false }, 200, rid);
        }
        return json({ hit: true, cache_key: ck, value: entry.value, authoritative: false }, 200, rid);
      }

      if (request.method === 'POST' && url.pathname === '/v1/cache/invalidate') {
        const b = await request.json() as CacheRequest;
        if (!validText(b.tenant_id, 256) || !validText(b.namespace, 256) || !validText(b.key, 512)) return json({ code: 'INVALID_ARGUMENT' }, 400, rid);
        const ck = cacheKey(env, b.tenant_id, b.namespace, b.key);
        const existing = store.get(ck);
        const deleted = store.delete(ck);
        if (deleted && existing) totalBytes -= existing.size;
        return json({ invalidated: deleted, authoritative_state_unchanged: true }, 200, rid);
      }

      return json({ code: 'NOT_FOUND' }, 404, rid);
    } catch {
      return json({ code: 'INTERNAL_ERROR' }, 500, rid);
    }
  },
};