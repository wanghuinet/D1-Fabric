import { ok, fail, requestId } from '../../_shared/response';
import { resolveShard, dbForPhysical } from '../../_shared/router';

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
}

const CONTENT_TYPES = new Set(['article', 'video', 'image', 'dynamic', 'audio', 'qa', 'live', 'ai']);
const VISIBILITIES = new Set(['public', 'followers', 'private']);

// Author-page bounded fan-out (LOGICAL-DATA-PLACEMENT-CONTRACT §6): bounded 8
// physical shards, global row budget, keyset cursor, hard deadline.
const MAX_FANOUT = 8;
const MAX_ROWS_GLOBAL = 1000;
const DEADLINE_MS = 2000;

function physicalShards(env: Env): D1Database[] {
  const out: D1Database[] = [];
  for (let n = 1; n <= MAX_FANOUT; n++) {
    const db = env[`SHARD_${String(n).padStart(2, '0')}` as keyof Env] as D1Database | undefined;
    if (db) out.push(db);
  }
  return out;
}

const text = (v: unknown, max: number) => typeof v === 'string' && v.length > 0 && v.length <= max;

// Keyset cursor: (publish_at, content_id), index-backed by
// idx_platform_content_author(tenant_id, author_id, publish_at DESC, content_id DESC).
function decodeCursor(cursor: string | null): { publish_at: string; content_id: string } | null {
  if (!cursor) return null;
  try {
    const d = JSON.parse(atob(cursor)) as { publish_at?: string; content_id?: string };
    if (typeof d.publish_at === 'string' && typeof d.content_id === 'string') return { publish_at: d.publish_at, content_id: d.content_id };
    return null;
  } catch { return null; }
}

export default {
  async fetch(request: Request, env: Env) {
    const rid = requestId(request);
    try {
      const url = new URL(request.url);

      if (request.method === 'GET' && url.pathname === '/health') {
        return ok({ status: 'READY', service: 'd1-fabric-w09-content-api', version: '0.1.0' }, rid);
      }

      // GET /v1/content/:id
      if (request.method === 'GET' && url.pathname.startsWith('/v1/content/')) {
        const contentId = url.pathname.slice('/v1/content/'.length);
        const tenantId = url.searchParams.get('tenant_id');
        if (!tenantId || !contentId) return fail('INVALID_ARGUMENT', rid, 400);
        let shardId: number;
        let db: D1Database | null = null;
        try {
          const route = await resolveShard(env.ROUTER, tenantId!, 'content', contentId!);
          shardId = route.shard_id;
          db = dbForPhysical(env, route.physical);
        } catch (e) { return fail(e instanceof Error ? e.message : 'ROUTER_ERROR', rid, 503, undefined, true); }
        if (!db) return fail('SHARD_NOT_READY', rid, 503);
        const row = await db.prepare('SELECT * FROM platform_content WHERE tenant_id=?1 AND content_id=?2 LIMIT 1').bind(tenantId, contentId).first();
        if (!row) return fail('CONTENT_NOT_FOUND', rid, 404);
        return ok(row, rid);
      }

      // GET /v1/content — author page: bounded fan-out over all physical shards.
      if (request.method === 'GET' && url.pathname === '/v1/content') {
        const tenantId = url.searchParams.get('tenant_id');
        const authorId = url.searchParams.get('author_id');
        const status = url.searchParams.get('status') ?? 'published';
        const limitRaw = Number(url.searchParams.get('limit') ?? 20);
        const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(MAX_ROWS_GLOBAL, Math.floor(limitRaw))) : 20;
        const cursor = url.searchParams.get('cursor');
        if (!tenantId || !authorId) return fail('INVALID_ARGUMENT', rid, 400, 'tenant_id and author_id required');

        const shards = physicalShards(env);
        if (shards.length === 0) return fail('SHARD_NOT_READY', rid, 503);

        const cur = decodeCursor(cursor);
        const perShardLimit = limit + 1; // internal execution cap; not exposed as row budget.
        const deadlineAt = Date.now() + DEADLINE_MS;

        // One bounded, index-backed, tenant-scoped window per shard.
        const queryShard = async (db: D1Database): Promise<Record<string, unknown>[]> => {
          const cols = 'content_id,author_id,content_type,title,summary,cover_url,status,visibility,publish_at,like_count,comment_count,share_count,tags_json';
          const sql = cur
            ? `SELECT ${cols} FROM platform_content WHERE tenant_id=?1 AND author_id=?2 AND status=?3 AND (publish_at, content_id) < (?4, ?5) ORDER BY publish_at DESC, content_id DESC LIMIT ?6`
            : `SELECT ${cols} FROM platform_content WHERE tenant_id=?1 AND author_id=?2 AND status=?3 ORDER BY publish_at DESC, content_id DESC LIMIT ?4`;
          const binds: unknown[] = cur
            ? [tenantId, authorId, status, cur.publish_at, cur.content_id, perShardLimit]
            : [tenantId, authorId, status, perShardLimit];
          const result = await db.prepare(sql).bind(...binds).all();
          return result.results as Record<string, unknown>[];
        };

        // Merge + global ordering (publish_at DESC, content_id DESC), no full scan.
        const cmp = (a: Record<string, unknown>, b: Record<string, unknown>): number => {
          const pa = String(a.publish_at ?? '');
          const pb = String(b.publish_at ?? '');
          if (pa !== pb) return pa > pb ? -1 : 1;
          const ca = String(a.content_id ?? '');
          const cb = String(b.content_id ?? '');
          if (ca !== cb) return ca > cb ? -1 : 1;
          return 0;
        };

        let rows: Record<string, unknown>[];
        try {
          const perShard = await Promise.race([
            Promise.all(shards.map(queryShard)),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('FANOUT_DEADLINE')), Math.max(0, deadlineAt - Date.now()))),
          ]);
          rows = perShard.flat().sort(cmp);
        } catch (e) {
          return fail(e instanceof Error && e.message === 'FANOUT_DEADLINE' ? 'FANOUT_DEADLINE' : 'INTERNAL_ERROR', rid, 503, undefined, true);
        }

        const hasMore = rows.length > limit;
        if (hasMore) rows = rows.slice(0, limit);
        let nextCursor: string | null = null;
        if (hasMore) {
          const last = rows[rows.length - 1];
          nextCursor = btoa(JSON.stringify({ publish_at: last.publish_at ?? '', content_id: last.content_id ?? '' }));
        }
        return ok({ items: rows, limit, next_cursor: nextCursor, fanout: shards.length }, rid);
      }

      // POST /v1/content — create draft content (idempotent)
      if (request.method === 'POST' && url.pathname === '/v1/content') {
        const body = await request.json() as {
          tenant_id?: string; idempotency_key?: string; content_id?: string;
          author_id?: string; content_type?: string; title?: string;
          summary?: string; body_json?: string; cover_media_id?: string;
          category_id?: string; visibility?: string;
        };
        if (!text(body.tenant_id, 256) || !text(body.idempotency_key, 128) || !text(body.content_id, 128) || !text(body.author_id, 128))
          return fail('INVALID_ARGUMENT', rid, 400, 'tenant_id, idempotency_key, content_id, author_id required');
        if (!body.content_type || !CONTENT_TYPES.has(body.content_type)) return fail('INVALID_CONTENT_TYPE', rid, 400);
        if (body.visibility && !VISIBILITIES.has(body.visibility)) return fail('INVALID_VISIBILITY', rid, 400);

        let shardId: number;
        let db: D1Database | null = null;
        try {
          const route = await resolveShard(env.ROUTER, body.tenant_id!, 'content', body.content_id!);
          shardId = route.shard_id;
          db = dbForPhysical(env, route.physical);
        } catch (e) { return fail(e instanceof Error ? e.message : 'ROUTER_ERROR', rid, 503, undefined, true); }
        if (!db) return fail('SHARD_NOT_READY', rid, 503);

        // Idempotency check
        const existing = await db.prepare('SELECT operation,status,result_json FROM fabric_idempotency WHERE tenant_id=?1 AND idempotency_key=?2 LIMIT 1').bind(body.tenant_id, body.idempotency_key).first<{ operation: string; status: string; result_json: string | null }>();
        if (existing) {
          if (existing.status === 'COMMITTED') return ok({ replay: true, content_id: body.content_id, result: existing.result_json ? JSON.parse(existing.result_json) : null }, rid);
          return fail('WRITE_IN_PROGRESS', rid, 409);
        }

        const result = { content_id: body.content_id, status: 'draft' };
        try {
          await db.batch([
            db.prepare("INSERT INTO fabric_idempotency(tenant_id,idempotency_key,operation,request_hash,status) VALUES(?1,?2,'CONTENT_CREATE','hash','IN_PROGRESS')").bind(body.tenant_id, body.idempotency_key),
            db.prepare('INSERT INTO platform_content(tenant_id,content_id,author_id,content_type,title,summary,body_json,cover_media_id,category_id,visibility,status) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,"draft")')
              .bind(body.tenant_id, body.content_id, body.author_id, body.content_type, body.title ?? null, body.summary ?? null, body.body_json ?? null, body.cover_media_id ?? null, body.category_id ?? null, body.visibility ?? 'public'),
            db.prepare('INSERT OR IGNORE INTO platform_content_stats(tenant_id,content_id) VALUES(?1,?2)').bind(body.tenant_id, body.content_id),
            db.prepare("UPDATE fabric_idempotency SET status='COMMITTED',result_json=?1 WHERE tenant_id=?2 AND idempotency_key=?3").bind(JSON.stringify(result), body.tenant_id, body.idempotency_key),
          ]);
        } catch (error) {
          const msg = error instanceof Error ? error.message : '';
          if (msg.includes('UNIQUE constraint failed: platform_content')) return fail('CONTENT_EXISTS', rid, 409);
          return fail('WRITE_FAILED', rid, 500);
        }
        return ok({ replay: false, ...result }, rid, 201);
      }

      // PATCH /v1/content/:id — update draft content
      if (request.method === 'PATCH' && url.pathname.startsWith('/v1/content/')) {
        const contentId = url.pathname.slice('/v1/content/'.length);
        const body = await request.json() as {
          tenant_id?: string; idempotency_key?: string;
          title?: string; summary?: string; body_json?: string;
          cover_media_id?: string; category_id?: string; visibility?: string;
        };
        if (!text(body.tenant_id, 256) || !contentId) return fail('INVALID_ARGUMENT', rid, 400);
        let shardId: number;
        let db: D1Database | null = null;
        try {
          const route = await resolveShard(env.ROUTER, body.tenant_id!, 'content', contentId);
          shardId = route.shard_id;
          db = dbForPhysical(env, route.physical);
        } catch (e) { return fail(e instanceof Error ? e.message : 'ROUTER_ERROR', rid, 503, undefined, true); }
        if (!db) return fail('SHARD_NOT_READY', rid, 503);

        const sets: string[] = [];
        const binds: unknown[] = [];
        if (body.title !== undefined) { sets.push('title=?'); binds.push(body.title); }
        if (body.summary !== undefined) { sets.push('summary=?'); binds.push(body.summary); }
        if (body.body_json !== undefined) { sets.push('body_json=?'); binds.push(body.body_json); }
        if (body.cover_media_id !== undefined) { sets.push('cover_media_id=?'); binds.push(body.cover_media_id); }
        if (body.category_id !== undefined) { sets.push('category_id=?'); binds.push(body.category_id); }
        if (body.visibility !== undefined) { sets.push('visibility=?'); binds.push(body.visibility); }
        if (sets.length === 0) return fail('NO_FIELDS_TO_UPDATE', rid, 400);
        sets.push('updated_at=CURRENT_TIMESTAMP');
        binds.push(body.tenant_id, contentId);
        const res = await db.prepare(`UPDATE platform_content SET ${sets.join(',')} WHERE tenant_id=?${binds.length - 1} AND content_id=?${binds.length} AND status='draft'`).bind(...binds).run();
        if (res.meta.changes === 0) {
          const exists = await db.prepare('SELECT status FROM platform_content WHERE tenant_id=?1 AND content_id=?2 LIMIT 1').bind(body.tenant_id, contentId).first<{ status: string }>();
          if (!exists) return fail('CONTENT_NOT_FOUND', rid, 404);
          return fail('CONTENT_ALREADY_PUBLISHED', rid, 409, 'cannot edit published content');
        }
        return ok({ content_id: contentId, updated: true }, rid);
      }

      // DELETE /v1/content/:id — soft delete
      if (request.method === 'DELETE' && url.pathname.startsWith('/v1/content/')) {
        const contentId = url.pathname.slice('/v1/content/'.length);
        const tenantId = url.searchParams.get('tenant_id');
        if (!tenantId || !contentId) return fail('INVALID_ARGUMENT', rid, 400);
        let shardId: number;
        let db: D1Database | null = null;
        try {
          const route = await resolveShard(env.ROUTER, tenantId!, 'content', contentId!);
          shardId = route.shard_id;
          db = dbForPhysical(env, route.physical);
        } catch (e) { return fail(e instanceof Error ? e.message : 'ROUTER_ERROR', rid, 503, undefined, true); }
        if (!db) return fail('SHARD_NOT_READY', rid, 503);
        await db.prepare("UPDATE platform_content SET status='deleted', updated_at=CURRENT_TIMESTAMP WHERE tenant_id=?1 AND content_id=?2").bind(tenantId, contentId).run();
        return ok({ content_id: contentId, status: 'deleted' }, rid);
      }

      return fail('NOT_FOUND', rid, 404);
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'INTERNAL_ERROR', rid, 500);
    }
  },
};