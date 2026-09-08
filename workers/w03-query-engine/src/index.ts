import { ok, fail, requestId } from '../../_shared/response';
import { resolveShard } from '../../_shared/router';

interface Env {
  SHARD_01?: D1Database;
  SHARD_02?: D1Database;
  SHARD_03?: D1Database;
  SHARD_04?: D1Database;
  SHARD_05?: D1Database;
  SHARD_06?: D1Database;
  SHARD_07?: D1Database;
  SHARD_08?: D1Database;
  ROUTER: Fetcher;
  MAX_FANOUT?: string;
  MAX_PARALLELISM?: string;
  MAX_ROWS?: string;
}

function dbForShard(env: Env, shardId: number): D1Database | null {
  if (!Number.isInteger(shardId) || shardId < 0 || shardId > 63) return null;
  const physical = (shardId % 8) + 1;
  return env[`SHARD_${String(physical).padStart(2, '0')}` as keyof Env] as D1Database | undefined ?? null;
}

function bounded(value: unknown, fallback: number, max: number) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? Math.max(1, Math.min(max, n)) : fallback;
}

// Allowed entity → table + primary routing key field. Hot-path rule: feed
// queries never SELECT body_json.
const ENTITY_MAP: Record<string, { table: string; routingField: string; listColumns: string }> = {
  content: { table: 'platform_content', routingField: 'content_id', listColumns: 'content_id,author_id,content_type,title,summary,cover_url,status,visibility,publish_at,like_count,comment_count,share_count,tags_json' },
  users: { table: 'platform_users', routingField: 'user_id', listColumns: 'user_id,display_name,avatar_media_id,bio,locale,region,status,is_creator,fans_count,following_count,created_at' },
  authors: { table: 'platform_authors', routingField: 'author_id', listColumns: 'author_id,user_id,creator_type,author_name,avatar_media_id,verification_status,quality_score,status,fans_count,content_count,description,category,created_at' },
  comments: { table: 'platform_comments', routingField: 'comment_id', listColumns: 'comment_id,content_id,user_id,parent_comment_id,root_comment_id,body_text,status,like_count,reply_count,created_at' },
  media: { table: 'platform_media', routingField: 'media_id', listColumns: 'media_id,owner_id,content_id,media_type,mime_type,byte_size,width,height,duration_ms,cdn_url,upload_status,created_at' },
  reactions: { table: 'platform_reactions', routingField: 'content_id', listColumns: 'content_id,user_id,reaction_type,status,created_at' },
  follows: { table: 'platform_follows', routingField: 'follower_id', listColumns: 'follower_id,followee_id,status,created_at' },
};

// Whitelisted filter/sort fields per entity to prevent SQL injection (Security §20).
const ALLOWED_FILTERS: Record<string, string[]> = {
  content: ['status','visibility','author_id','content_type','category_id','is_ad'],
  users: ['status','is_creator'],
  authors: ['status','verification_status','category'],
  comments: ['content_id','user_id','status','parent_comment_id','root_comment_id'],
  media: ['owner_id','content_id','media_type','upload_status'],
  reactions: ['user_id','reaction_type','status'],
  follows: ['followee_id','status'],
};
const ALLOWED_SORT: Record<string, string[]> = {
  content: ['publish_at','created_at','like_count','comment_count','content_id'],
  users: ['created_at','fans_count'],
  authors: ['fans_count','content_count','quality_score'],
  comments: ['created_at','like_count'],
  media: ['created_at'],
  reactions: ['updated_at','created_at'],
  follows: ['created_at'],
};

function b64decodeCursor(cursor: string | undefined): Record<string, unknown> | null {
  if (!cursor) return null;
  try { return JSON.parse(atob(cursor)); } catch { return null; }
}

export default {
  async fetch(request: Request, env: Env) {
    const rid = requestId(request);
    try {
      const url = new URL(request.url);

      if (request.method === 'GET' && url.pathname === '/health') {
        const ready = [1,2,3,4,5,6,7,8].every((n) => !!env[`SHARD_${String(n).padStart(2, '0')}` as keyof Env]);
        return ok({ status: ready ? 'READY' : 'NOT_READY', service: 'd1-fabric-w03-query-engine', version: '0.3.0', shards_bound: ready ? 8 : 0 }, rid, ready ? 200 : 503);
      }

      // Structured single-entity GET: route via W02 by routing key.
      if (request.method === 'POST' && url.pathname === '/v1/query/get') {
        const body = await request.json() as { tenant_id?: string; entity?: string; id?: string };
        if (!body.tenant_id || !body.entity || !body.id) return fail('INVALID_ARGUMENT', rid, 400);
        const meta = ENTITY_MAP[body.entity];
        if (!meta) return fail('INVALID_ENTITY', rid, 400);
        let shardId: number;
        try {
          const route = await resolveShard(env.ROUTER, body.tenant_id, body.entity, body.id);
          shardId = route.shard_id;
        } catch (e) { return fail(e instanceof Error ? e.message : 'ROUTER_ERROR', rid, 503, undefined, true); }
        const db = dbForShard(env, shardId);
        if (!db) return fail('SHARD_NOT_READY', rid, 503);
        const row = await db.prepare(`SELECT * FROM ${meta.table} WHERE tenant_id=?1 AND ${meta.routingField}=?2 LIMIT 1`).bind(body.tenant_id, body.id).first();
        if (!row) return fail('NOT_FOUND', rid, 404);
        return ok({ entity: body.entity, data: row, shard_id: shardId }, rid);
      }

      // Structured list query on a single shard. If a routing-key filter is
      // provided, route to that shard; otherwise fan-out across shards via
      // query/plan. For P0 we require an explicit routing filter to keep the
      // query shard-local (bounded I/O).
      if (request.method === 'POST' && url.pathname === '/v1/query/list') {
        const body = await request.json() as {
          tenant_id?: string; entity?: string;
          filters?: Record<string, string>;
          sort?: { field: string; order?: 'asc' | 'desc' };
          limit?: number; cursor?: string;
          routing_key?: string;
        };
        if (!body.tenant_id || !body.entity) return fail('INVALID_ARGUMENT', rid, 400);
        const meta = ENTITY_MAP[body.entity];
        if (!meta) return fail('INVALID_ENTITY', rid, 400);
        const allowed = ALLOWED_FILTERS[body.entity] ?? [];
        const filters = body.filters ?? {};
        for (const k of Object.keys(filters)) {
          if (!allowed.includes(k)) return fail('INVALID_FILTER', rid, 400, `filter ${k} not allowed`);
        }
        if (!body.routing_key) return fail('ROUTING_KEY_REQUIRED', rid, 400, 'list queries must provide routing_key for shard-local execution');
        let shardId: number;
        try {
          const route = await resolveShard(env.ROUTER, body.tenant_id, body.entity, body.routing_key);
          shardId = route.shard_id;
        } catch (e) { return fail(e instanceof Error ? e.message : 'ROUTER_ERROR', rid, 503, undefined, true); }
        const db = dbForShard(env, shardId);
        if (!db) return fail('SHARD_NOT_READY', rid, 503);

        const limit = bounded(body.limit, 20, 100);
        const whereParts = ['tenant_id=?1'];
        const binds: unknown[] = [body.tenant_id];
        let idx = 2;
        for (const [k, v] of Object.entries(filters)) {
          whereParts.push(`${k}=?${idx}`);
          binds.push(v);
          idx++;
        }
        // Cursor: deterministic ordering on (sort_field, routing_id).
        const sortField = body.sort?.field ?? ALLOWED_SORT[body.entity][0];
        if (!ALLOWED_SORT[body.entity].includes(sortField)) return fail('INVALID_SORT', rid, 400);
        const sortOrder = body.sort?.order === 'asc' ? 'ASC' : 'DESC';
        const idField = meta.routingField;
        const cursor = b64decodeCursor(body.cursor);
        if (cursor) {
          whereParts.push(`(${sortField}, ${idField}) ${sortOrder === 'DESC' ? '<' : '>'} (?${idx}, ?${idx + 1})`);
          binds.push(cursor[sortField], cursor[idField]);
          idx += 2;
        }
        const sql = `SELECT ${meta.listColumns} FROM ${meta.table} WHERE ${whereParts.join(' AND ')} ORDER BY ${sortField} ${sortOrder}, ${idField} ${sortOrder} LIMIT ?${idx}`;
        binds.push(limit + 1);
        const result = await db.prepare(sql).bind(...binds).all();
        const rows = result.results;
        let nextCursor: string | null = null;
        if (rows.length > limit) {
          rows.pop();
          const last = rows[rows.length - 1] as Record<string, unknown>;
          nextCursor = btoa(JSON.stringify({ [sortField]: last[sortField], [idField]: last[idField] }));
        }
        return ok({ entity: body.entity, items: rows, limit, next_cursor: nextCursor, shard_id: shardId }, rid);
      }

      // Raw SQL fan-out (admin/internal). Kept for cross-shard queries but
      // restricted to SELECT only (Security §20, §21).
      if (request.method === 'POST' && url.pathname === '/v1/query/plan') {
        const body = await request.json() as { tenant_id?: string; sql?: string; shard_ids?: number[]; deadline_ms?: number; max_rows?: number };
        if (!body.tenant_id || !body.sql) return fail('INVALID_ARGUMENT', rid, 400);
        if (body.sql.length > 16000) return fail('PAYLOAD_TOO_LARGE', rid, 413);
        const normalized = body.sql.trim().toUpperCase();
        if (!normalized.startsWith('SELECT')) return fail('ONLY_SELECT_ALLOWED', rid, 400);
        if (normalized.includes(';')) return fail('MULTI_STATEMENT_NOT_ALLOWED', rid, 400);
        const shardIds = [...new Set((body.shard_ids ?? [0]).filter((id) => Number.isInteger(id) && id >= 0 && id <= 63))];
        if (shardIds.length === 0) return fail('INVALID_SHARD_SET', rid, 400);
        const maxFanout = bounded(env.MAX_FANOUT, 8, 64);
        const maxParallelism = bounded(env.MAX_PARALLELISM, 4, 32);
        const maxRows = bounded(body.max_rows ?? env.MAX_ROWS, 1000, 100000);
        if (shardIds.length > maxFanout) return fail('FANOUT_BUDGET_EXCEEDED', rid, 429, undefined, false);
        const missing = shardIds.find((id) => !dbForShard(env, id));
        if (missing !== undefined) return fail('SHARD_NOT_READY', rid, 503);
        const deadlineMs = Math.max(1, Math.min(10000, Number(body.deadline_ms ?? 10000)));
        const started = Date.now();
        const run = async (shardId: number) => {
          if (Date.now() - started >= deadlineMs) throw new Error('TIMEOUT');
          const db = dbForShard(env, shardId);
          if (!db) throw new Error('SHARD_NOT_READY');
          const result = await db.prepare(body.sql!).bind().all();
          return { shard_id: shardId, results: result.results.slice(0, maxRows), success: true };
        };
        const results: Array<{ shard_id: number; results: unknown[]; success: boolean }> = [];
        const parallelism = Math.min(maxParallelism, shardIds.length);
        for (let i = 0; i < shardIds.length; i += parallelism) {
          if (Date.now() - started >= deadlineMs) return fail('TIMEOUT', rid, 504);
          const batch = shardIds.slice(i, i + parallelism);
          const settled = await Promise.allSettled(batch.map(run));
          for (const item of settled) {
            if (item.status === 'rejected') return fail(item.reason instanceof Error && item.reason.message === 'TIMEOUT' ? 'TIMEOUT' : 'D1_READ_FAILED', rid, 502);
            results.push(item.value);
          }
        }
        return ok({ plan_id: crypto.randomUUID(), tenant_id: body.tenant_id, operation: 'READ', shards: shardIds, fanout: shardIds.length, parallelism, max_rows: maxRows, deadline_ms: deadlineMs, execution: 'D1_EXECUTED', results }, rid);
      }

      return fail('NOT_FOUND', rid, 404);
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'INTERNAL_ERROR', rid, 500);
    }
  },
};
