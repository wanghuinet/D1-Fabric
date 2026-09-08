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

const text = (v: unknown, max: number) => typeof v === 'string' && v.length > 0 && v.length <= max;

export default {
  async fetch(request: Request, env: Env) {
    const rid = requestId(request);
    try {
      const url = new URL(request.url);

      if (request.method === 'GET' && url.pathname === '/health') {
        return ok({ status: 'READY', service: 'd1-fabric-w10-social-api', version: '0.1.0' }, rid);
      }

      // POST /v1/comments — create comment (route by content_id for colocation)
      if (request.method === 'POST' && url.pathname === '/v1/comments') {
        const body = await request.json() as {
          tenant_id?: string; idempotency_key?: string; comment_id?: string;
          content_id?: string; user_id?: string; parent_comment_id?: string | null;
          root_comment_id?: string | null; body_text?: string;
        };
        if (!text(body.tenant_id, 256) || !text(body.idempotency_key, 128) || !text(body.comment_id, 128) || !text(body.content_id, 128) || !text(body.user_id, 128))
          return fail('INVALID_ARGUMENT', rid, 400);
        if (!text(body.body_text, 5000)) return fail('INVALID_BODY', rid, 400);

        let shardId: number;
        let db: D1Database | null = null;
        try {
          const route = await resolveShard(env.ROUTER, body.tenant_id!, 'content', body.content_id!);
          shardId = route.shard_id;
          db = dbForPhysical(env, route.physical);
        } catch (e) { return fail(e instanceof Error ? e.message : 'ROUTER_ERROR', rid, 503, undefined, true); }
        if (!db) return fail('SHARD_NOT_READY', rid, 503);

        // Idempotency
        const existing = await db.prepare('SELECT status FROM fabric_idempotency WHERE tenant_id=?1 AND idempotency_key=?2 LIMIT 1').bind(body.tenant_id, body.idempotency_key).first<{ status: string }>();
        if (existing?.status === 'COMMITTED') return ok({ replay: true, comment_id: body.comment_id }, rid);
        if (existing?.status === 'IN_PROGRESS') return fail('WRITE_IN_PROGRESS', rid, 409);

        const rootCommentId = body.root_comment_id ?? body.parent_comment_id ?? null;
        try {
          await db.batch([
            db.prepare("INSERT INTO fabric_idempotency(tenant_id,idempotency_key,operation,request_hash,status) VALUES(?1,?2,'COMMENT_CREATE','hash','IN_PROGRESS')").bind(body.tenant_id, body.idempotency_key),
            db.prepare('INSERT INTO platform_comments(tenant_id,comment_id,content_id,user_id,parent_comment_id,root_comment_id,body_text,status) VALUES(?1,?2,?3,?4,?5,?6,?7,"published")')
              .bind(body.tenant_id, body.comment_id, body.content_id, body.user_id, body.parent_comment_id ?? null, rootCommentId, body.body_text),
            db.prepare('UPDATE platform_content SET comment_count=comment_count+1, updated_at=CURRENT_TIMESTAMP WHERE tenant_id=?1 AND content_id=?2').bind(body.tenant_id, body.content_id),
            db.prepare("UPDATE fabric_idempotency SET status='COMMITTED' WHERE tenant_id=?1 AND idempotency_key=?2").bind(body.tenant_id, body.idempotency_key),
          ]);
        } catch (error) {
          const msg = error instanceof Error ? error.message : '';
          if (msg.includes('UNIQUE constraint failed: platform_comments')) return fail('COMMENT_EXISTS', rid, 409);
          return fail('WRITE_FAILED', rid, 500);
        }
        return ok({ replay: false, comment_id: body.comment_id, shard_id: shardId }, rid, 201);
      }

      // GET /v1/comments — list comments for content
      if (request.method === 'GET' && url.pathname === '/v1/comments') {
        const tenantId = url.searchParams.get('tenant_id');
        const contentId = url.searchParams.get('content_id');
        const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 20)));
        const cursor = url.searchParams.get('cursor');
        if (!tenantId || !contentId) return fail('INVALID_ARGUMENT', rid, 400);
        let db: D1Database | null = null;
        try {
          const route = await resolveShard(env.ROUTER, tenantId!, 'content', contentId!);
          db = dbForPhysical(env, route.physical);
        } catch (e) { return fail(e instanceof Error ? e.message : 'ROUTER_ERROR', rid, 503, undefined, true); }
        if (!db) return fail('SHARD_NOT_READY', rid, 503);
        const where = ['tenant_id=?1', 'content_id=?2', "parent_comment_id IS NULL", 'status=?3'];
        const binds: unknown[] = [tenantId, contentId, 'published'];
        if (cursor) {
          const dec = JSON.parse(atob(cursor));
          where.push('(created_at, comment_id) < (?4, ?5)');
          binds.push(dec.created_at, dec.comment_id);
        }
        const sql = `SELECT comment_id,user_id,parent_comment_id,root_comment_id,body_text,like_count,reply_count,created_at FROM platform_comments WHERE ${where.join(' AND ')} ORDER BY created_at DESC, comment_id DESC LIMIT ?${binds.length + 1}`;
        binds.push(limit + 1);
        const result = await db.prepare(sql).bind(...binds).all();
        const rows = result.results;
        let nextCursor: string | null = null;
        if (rows.length > limit) {
          rows.pop();
          const last = rows[rows.length - 1] as Record<string, unknown>;
          nextCursor = btoa(JSON.stringify({ created_at: last.created_at, comment_id: last.comment_id }));
        }
        return ok({ items: rows, limit, next_cursor: nextCursor }, rid);
      }

      // POST /v1/reactions — like/bookmark/dislike content
      if (request.method === 'POST' && url.pathname === '/v1/reactions') {
        const body = await request.json() as {
          tenant_id?: string; idempotency_key?: string;
          content_id?: string; user_id?: string; reaction_type?: string;
        };
        if (!text(body.tenant_id, 256) || !text(body.idempotency_key, 128) || !text(body.content_id, 128) || !text(body.user_id, 128))
          return fail('INVALID_ARGUMENT', rid, 400);
        if (!body.reaction_type || !['like', 'bookmark', 'dislike'].includes(body.reaction_type)) return fail('INVALID_REACTION_TYPE', rid, 400);

        let db: D1Database | null = null;
        try {
          const route = await resolveShard(env.ROUTER, body.tenant_id!, 'content', body.content_id!);
          db = dbForPhysical(env, route.physical);
        } catch (e) { return fail(e instanceof Error ? e.message : 'ROUTER_ERROR', rid, 503, undefined, true); }
        if (!db) return fail('SHARD_NOT_READY', rid, 503);

        const existing = await db.prepare("SELECT status FROM platform_reactions WHERE tenant_id=?1 AND content_id=?2 AND user_id=?3 AND reaction_type=?4 LIMIT 1").bind(body.tenant_id, body.content_id, body.user_id, body.reaction_type).first<{ status: string }>();
        if (existing?.status === 'active') return ok({ already_active: true }, rid);

        // Toggle: if removed, reactivate; else insert.
        const counterField = body.reaction_type === 'like' ? 'like_count' : body.reaction_type === 'dislike' ? 'dislike_count' : null;
        const statements: D1PreparedStatement[] = [
          db.prepare("INSERT INTO platform_reactions(tenant_id,content_id,user_id,reaction_type,status) VALUES(?1,?2,?3,?4,'active') ON CONFLICT(tenant_id,content_id,user_id,reaction_type) DO UPDATE SET status='active',updated_at=CURRENT_TIMESTAMP").bind(body.tenant_id, body.content_id, body.user_id, body.reaction_type),
        ];
        if (counterField) {
          statements.push(db.prepare(`UPDATE platform_content SET ${counterField}=${counterField}+1, updated_at=CURRENT_TIMESTAMP WHERE tenant_id=?1 AND content_id=?2`).bind(body.tenant_id, body.content_id));
        }
        await db.batch(statements);
        return ok({ reaction_type: body.reaction_type, status: 'active' }, rid);
      }

      // DELETE /v1/reactions — remove reaction
      if (request.method === 'DELETE' && url.pathname === '/v1/reactions') {
        const tenantId = url.searchParams.get('tenant_id');
        const contentId = url.searchParams.get('content_id');
        const userId = url.searchParams.get('user_id');
        const reactionType = url.searchParams.get('reaction_type');
        if (!tenantId || !contentId || !userId || !reactionType) return fail('INVALID_ARGUMENT', rid, 400);
        let db: D1Database | null = null;
        try {
          const route = await resolveShard(env.ROUTER, tenantId!, 'content', contentId!);
          db = dbForPhysical(env, route.physical);
        } catch (e) { return fail(e instanceof Error ? e.message : 'ROUTER_ERROR', rid, 503, undefined, true); }
        if (!db) return fail('SHARD_NOT_READY', rid, 503);
        const counterField = reactionType === 'like' ? 'like_count' : reactionType === 'dislike' ? 'dislike_count' : null;
        const statements: D1PreparedStatement[] = [
          db.prepare("UPDATE platform_reactions SET status='removed', updated_at=CURRENT_TIMESTAMP WHERE tenant_id=?1 AND content_id=?2 AND user_id=?3 AND reaction_type=?4").bind(tenantId, contentId, userId, reactionType),
        ];
        if (counterField) {
          statements.push(db.prepare(`UPDATE platform_content SET ${counterField}=MAX(0,${counterField}-1), updated_at=CURRENT_TIMESTAMP WHERE tenant_id=?1 AND content_id=?2`).bind(tenantId, contentId));
        }
        await db.batch(statements);
        return ok({ reaction_type: reactionType, status: 'removed' }, rid);
      }

      // POST /v1/follows — follow user
      if (request.method === 'POST' && url.pathname === '/v1/follows') {
        const body = await request.json() as {
          tenant_id?: string; idempotency_key?: string;
          follower_id?: string; followee_id?: string;
        };
        if (!text(body.tenant_id, 256) || !text(body.idempotency_key, 128) || !text(body.follower_id, 128) || !text(body.followee_id, 128))
          return fail('INVALID_ARGUMENT', rid, 400);
        if (body.follower_id === body.followee_id) return fail('CANNOT_FOLLOW_SELF', rid, 400);

        // Route by follower_id (follow list is follower-centric)
        let db: D1Database | null = null;
        try {
          const route = await resolveShard(env.ROUTER, body.tenant_id!, 'follows', body.follower_id!);
          db = dbForPhysical(env, route.physical);
        } catch (e) { return fail(e instanceof Error ? e.message : 'ROUTER_ERROR', rid, 503, undefined, true); }
        if (!db) return fail('SHARD_NOT_READY', rid, 503);

        const existing = await db.prepare("SELECT status FROM platform_follows WHERE tenant_id=?1 AND follower_id=?2 AND followee_id=?3 LIMIT 1").bind(body.tenant_id, body.follower_id, body.followee_id).first<{ status: string }>();
        if (existing?.status === 'active') return ok({ already_following: true }, rid);

        await db.batch([
          db.prepare("INSERT INTO platform_follows(tenant_id,follower_id,followee_id,status) VALUES(?1,?2,?3,'active') ON CONFLICT(tenant_id,follower_id,followee_id) DO UPDATE SET status='active'").bind(body.tenant_id, body.follower_id, body.followee_id),
          db.prepare('UPDATE platform_users SET following_count=following_count+1 WHERE tenant_id=?1 AND user_id=?2').bind(body.tenant_id, body.follower_id),
          // Note: followee fans_count update would be on followee's shard (possibly different).
          // For shard-local consistency we only update follower's count here; followee's
          // fans_count is updated via outbox async.
          db.prepare("INSERT INTO platform_outbox(tenant_id,event_id,aggregate_type,aggregate_id,event_type,payload_json,status) VALUES(?1,?2,'follow',?3,'follow.created',?4,'pending')")
            .bind(body.tenant_id, `follow-${body.tenant_id}-${body.follower_id}-${body.followee_id}`, body.followee_id, JSON.stringify({ follower_id: body.follower_id, followee_id: body.followee_id })),
        ]);
        return ok({ follower_id: body.follower_id, followee_id: body.followee_id, status: 'active' }, rid, 201);
      }

      // DELETE /v1/follows — unfollow
      if (request.method === 'DELETE' && url.pathname === '/v1/follows') {
        const tenantId = url.searchParams.get('tenant_id');
        const followerId = url.searchParams.get('follower_id');
        const followeeId = url.searchParams.get('followee_id');
        if (!tenantId || !followerId || !followeeId) return fail('INVALID_ARGUMENT', rid, 400);
        let db: D1Database | null = null;
        try {
          const route = await resolveShard(env.ROUTER, tenantId!, 'follows', followerId!);
          db = dbForPhysical(env, route.physical);
        } catch (e) { return fail(e instanceof Error ? e.message : 'ROUTER_ERROR', rid, 503, undefined, true); }
        if (!db) return fail('SHARD_NOT_READY', rid, 503);
        await db.batch([
          db.prepare("UPDATE platform_follows SET status='removed' WHERE tenant_id=?1 AND follower_id=?2 AND followee_id=?3").bind(tenantId, followerId, followeeId),
          db.prepare('UPDATE platform_users SET following_count=MAX(0,following_count-1) WHERE tenant_id=?1 AND user_id=?2').bind(tenantId, followerId),
        ]);
        return ok({ status: 'removed' }, rid);
      }

      return fail('NOT_FOUND', rid, 404);
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'INTERNAL_ERROR', rid, 500);
    }
  },
};
