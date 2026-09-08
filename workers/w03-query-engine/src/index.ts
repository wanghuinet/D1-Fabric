type Router = { fetch(input: string | URL | Request, init?: RequestInit): Promise<Response> };

interface Env {
  SHARD_01?: D1Database;
  SHARD_02?: D1Database;
  SHARD_03?: D1Database;
  SHARD_04?: D1Database;
  SHARD_05?: D1Database;
  SHARD_06?: D1Database;
  SHARD_07?: D1Database;
  SHARD_08?: D1Database;
  ROUTER?: Router;
  MAX_FANOUT?: string;
  MAX_PARALLELISM?: string;
  MAX_ROWS?: string;
  MAX_ROWS_GLOBAL?: string;
  DEADLINE_MS?: string;
}

const PHYSICAL_SHARD_COUNT = 8;
const AUTHOR_PAGE_MAX_ROWS = 1000;
const AUTHOR_PAGE_DEADLINE_MS = 2000;

const json = (body: unknown, status = 200, requestId: string = crypto.randomUUID()) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'x-request-id': requestId },
  });

function bounded(value: unknown, fallback: number, max: number) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? Math.max(1, Math.min(max, n)) : fallback;
}

function validText(value: unknown, max: number) { return typeof value === 'string' && value.length > 0 && value.length <= max; }

const PHYSICAL_RE = /shard-(\d{2})$/;

// The authoritative logical -> physical binding lives in W02. W03 never recomputes
// the `% 8` striping; it resolves a logical shard via the ROUTER service binding.
function bindingKey(physical: string): keyof Env | null {
  const m = PHYSICAL_RE.exec(physical);
  return m ? (`SHARD_${m[1]}` as keyof Env) : null;
}

async function resolveDb(env: Env, shardId: number): Promise<{ db: D1Database | null; err?: string }> {
  if (!Number.isInteger(shardId) || shardId < 0 || shardId > 63) return { db: null, err: 'INVALID_SHARD_ID' };
  if (!env.ROUTER) return { db: null, err: 'ROUTER_UNAVAILABLE' };
  const res = await env.ROUTER.fetch('https://router/v1/resolve', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ shard_id: shardId }),
  });
  if (!res.ok) return { db: null, err: 'ROUTER_ERROR' };
  const r = (await res.json()) as { physical?: string; state?: string };
  if (!r.physical || r.state === 'RETIRED' || r.state === 'FAILED') return { db: null, err: 'SHARD_UNAVAILABLE' };
  const key = bindingKey(r.physical);
  if (!key) return { db: null, err: 'ROUTER_ERROR' };
  const db = env[key] as D1Database | undefined;
  return db ? { db } : { db: null, err: 'SHARD_NOT_READY' };
}

function rejectUnsafeRead(sql: string) {
  const normalized = sql.trim().toUpperCase();
  if (!normalized.startsWith('SELECT')) return 'ONLY_SELECT_ALLOWED';
  if (normalized.includes(';')) return 'MULTI_STATEMENT_NOT_ALLOWED';
  return null;
}

type AuthorRow = {
  content_id: string;
  content_type: string;
  title: string | null;
  summary: string | null;
  publish_at: string | null;
  status: string;
};

type Cursor = { publish_at: string; content_id: string };

function encodeCursor(c: Cursor): string { return JSON.stringify(c); }
function decodeCursor(raw: string): Cursor | null {
  try {
    const p = JSON.parse(raw) as Cursor;
    if (typeof p.publish_at !== 'string' || typeof p.content_id !== 'string') return null;
    return p;
  } catch { return null; }
}

function authorDesc(a: AuthorRow, b: AuthorRow): number {
  if (a.publish_at !== b.publish_at) return a.publish_at! < b.publish_at! ? 1 : -1;
  if (a.content_id !== b.content_id) return a.content_id < b.content_id ? 1 : -1;
  return 0;
}

function physicalShards(env: Env): D1Database[] {
  const out: D1Database[] = [];
  for (let i = 1; i <= PHYSICAL_SHARD_COUNT; i++) {
    const db = env[`SHARD_${String(i).padStart(2, '0')}` as keyof Env] as D1Database | undefined;
    if (db) out.push(db);
  }
  return out;
}

export default {
  async fetch(request: Request, env: Env) {
    const requestId = request.headers.get('x-request-id')?.slice(0, 128) || crypto.randomUUID();
    try {
      const url = new URL(request.url);

      if (request.method === 'GET' && url.pathname === '/health') {
        const shardsBound = [1, 2, 3, 4, 5, 6, 7, 8].every((n) => !!env[`SHARD_${String(n).padStart(2, '0')}` as keyof Env]);
        return json({
          status: shardsBound ? 'READY' : 'NOT_READY',
          service: 'd1-fabric-w03-query-engine',
          version: '0.3.0',
          shards_bound: shardsBound ? 8 : 0,
          router_bound: !!env.ROUTER,
        }, shardsBound ? 200 : 503, requestId);
      }

      if (request.method === 'POST' && url.pathname === '/v1/query/plan') {
        const body = await request.json() as {
          tenant_id?: string;
          sql?: string;
          shard_ids?: number[];
          deadline_ms?: number;
          max_rows?: number;
        };
        if (!validText(body.tenant_id, 256) || !validText(body.sql, 16000)) return json({ code: 'INVALID_ARGUMENT' }, 400, requestId);
        const unsafe = rejectUnsafeRead(body.sql!);
        if (unsafe) return json({ code: unsafe }, 400, requestId);

        const shardIds = [...new Set((body.shard_ids ?? [0]).filter((id) => Number.isInteger(id) && id >= 0 && id <= 63))];
        if (shardIds.length === 0) return json({ code: 'INVALID_SHARD_SET' }, 400, requestId);
        const maxFanout = bounded(env.MAX_FANOUT, 8, 64);
        const maxParallelism = bounded(env.MAX_PARALLELISM, 4, 32);
        // Global row budget: max_rows is the API's total row cap, not a per-shard budget.
        const maxRows = bounded(body.max_rows ?? env.MAX_ROWS ?? env.MAX_ROWS_GLOBAL, 1000, 100000);
        if (shardIds.length > maxFanout) return json({ code: 'FANOUT_BUDGET_EXCEEDED', max_fanout: maxFanout }, 429, requestId);

        const deadlineMs = Math.max(1, Math.min(10000, Number(body.deadline_ms ?? 10000)));
        const started = Date.now();
        const collected: unknown[] = [];
        const perShard: Array<{ shard_id: number; rows: unknown[] }> = [];
        const parallelism = Math.min(maxParallelism, shardIds.length);

        outer:
        for (let i = 0; i < shardIds.length; i += parallelism) {
          if (Date.now() - started >= deadlineMs) return json({ code: 'TIMEOUT' }, 504, requestId);
          const batch = shardIds.slice(i, i + parallelism);
          const settled = await Promise.all(batch.map(async (shardId) => {
            if (Date.now() - started >= deadlineMs) throw new Error('TIMEOUT');
            const { db, err } = await resolveDb(env, shardId);
            if (!db) throw new Error(err ?? 'SHARD_NOT_READY');
            const result = await db.prepare(body.sql!).bind().all();
            return { shard_id: shardId, rows: result.results as unknown[] };
          }));
          for (const item of settled) {
            if (Date.now() - started >= deadlineMs) return json({ code: 'TIMEOUT' }, 504, requestId);
            const remaining = maxRows - collected.length;
            if (remaining <= 0) break outer;
            const slice = item.rows.slice(0, remaining);
            perShard.push({ shard_id: item.shard_id, rows: slice });
            for (const r of slice) collected.push(r);
            if (collected.length >= maxRows) break outer;
          }
        }

        return json({
          plan_id: crypto.randomUUID(),
          tenant_id: body.tenant_id,
          operation: 'READ',
          shards: shardIds,
          fanout: shardIds.length,
          parallelism,
          max_rows: maxRows,
          total_rows: collected.length,
          deadline_ms: deadlineMs,
          execution: 'D1_EXECUTED',
          results: perShard,
        }, 200, requestId);
      }

      if (request.method === 'POST' && url.pathname === '/v1/author/content') {
        const body = await request.json() as {
          tenant_id?: string;
          author_id?: string;
          cursor?: string;
          limit?: number;
        };
        if (!validText(body.tenant_id, 256) || !validText(body.author_id, 128)) return json({ code: 'INVALID_ARGUMENT' }, 400, requestId);

        const limit = bounded(body.limit ?? env.MAX_ROWS_GLOBAL ?? env.MAX_ROWS, AUTHOR_PAGE_MAX_ROWS, AUTHOR_PAGE_MAX_ROWS);
        const maxFanout = bounded(env.MAX_FANOUT, PHYSICAL_SHARD_COUNT, PHYSICAL_SHARD_COUNT);
        const deadlineMs = bounded(env.DEADLINE_MS, AUTHOR_PAGE_DEADLINE_MS, 10000);
        // Bounded fanout across the 8 physical shards (content is placed by content_id,
        // so an author's content is scattered; a full list requires a bounded shard fanout).
        const shards = physicalShards(env).slice(0, maxFanout);
        if (shards.length === 0) return json({ code: 'SHARD_NOT_READY' }, 503, requestId);

        const cursor = body.cursor ? decodeCursor(body.cursor) : null;
        const started = Date.now();
        const perShard: Array<{ rows: AuthorRow[]; full: boolean }> = [];

        await Promise.all(shards.map(async (db) => {
          if (Date.now() - started >= deadlineMs) throw new Error('TIMEOUT');
          let rows: AuthorRow[];
          if (cursor) {
            rows = (await db.prepare(
              `SELECT content_id,content_type,title,summary,publish_at,status
               FROM platform_content
               WHERE tenant_id=?1 AND author_id=?2 AND status='published' AND publish_at IS NOT NULL
                 AND (publish_at < ?3 OR (publish_at = ?3 AND content_id < ?4))
               ORDER BY publish_at DESC, content_id DESC LIMIT ?5`
            ).bind(body.tenant_id, body.author_id, cursor.publish_at, cursor.content_id, limit).all()).results as unknown as AuthorRow[];
          } else {
            rows = (await db.prepare(
              `SELECT content_id,content_type,title,summary,publish_at,status
               FROM platform_content
               WHERE tenant_id=?1 AND author_id=?2 AND status='published' AND publish_at IS NOT NULL
               ORDER BY publish_at DESC, content_id DESC LIMIT ?3`
            ).bind(body.tenant_id, body.author_id, limit).all()).results as unknown as AuthorRow[];
          }
          perShard.push({ rows, full: rows.length >= limit });
        }));

        const merged = perShard.flatMap((s) => s.rows).sort(authorDesc);
        const hasMore = merged.length > limit || perShard.some((s) => s.full);
        const items = merged.slice(0, limit);
        const nextCursor = hasMore && items.length > 0 ? encodeCursor({ publish_at: items[items.length - 1].publish_at!, content_id: items[items.length - 1].content_id }) : null;

        return json({
          tenant_id: body.tenant_id,
          author_id: body.author_id,
          items,
          next_cursor: nextCursor,
          has_more: hasMore,
          fanout: shards.length,
          max_rows: limit,
          deadline_ms: deadlineMs,
        }, 200, requestId);
      }

      return json({ code: 'NOT_FOUND' }, 404, requestId);
    } catch (error) {
      return json({ code: error instanceof Error && error.message === 'TIMEOUT' ? 'TIMEOUT' : error instanceof Error ? error.message : 'INTERNAL_ERROR' }, 500, requestId);
    }
  },
};