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
}

interface OutboxEvent {
  tenant_id: string;
  event_id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  payload_json: string;
  retry_count: number;
}

function allDbs(env: Env): D1Database[] {
  return [1, 2, 3, 4, 5, 6, 7, 8]
    .map((n) => env[`SHARD_${String(n).padStart(2, '0')}` as keyof Env] as D1Database | undefined)
    .filter((db): db is D1Database => !!db);
}

// Process a single outbox event. Returns true on success.
async function processEvent(env: Env, db: D1Database, ev: OutboxEvent): Promise<boolean> {
  const payload = JSON.parse(ev.payload_json) as Record<string, unknown>;
  try {
    if (ev.event_type === 'content.published') {
      const contentId = ev.aggregate_id;
      // Same-shard projections: feed candidate + search index.
      const content = await db.prepare('SELECT content_id,author_id,content_type,title,summary,cover_url,publish_at,category_id,tags_json,visibility FROM platform_content WHERE tenant_id=?1 AND content_id=?2 LIMIT 1').bind(ev.tenant_id, contentId).first<Record<string, unknown>>();
      if (!content) return true; // content not found, mark as done (idempotent).

      // Feed candidate (same shard). user_id='*' denotes "broadcast to all".
      const score = content.publish_at ? new Date(content.publish_at as string).getTime() / 1000 : 0;
      await db.prepare("INSERT OR IGNORE INTO platform_feed_candidates(tenant_id,user_id,content_id,source,score) VALUES(?1,'*',?2,'published',?3)")
        .bind(ev.tenant_id, contentId, score).run();

      // Search index (same shard).
      const tags = content.tags_json ? String(content.tags_json) : '';
      await db.prepare("INSERT INTO platform_search_index(content_id,title,body_text,author_name,tags) VALUES(?1,?2,'',?3,?4)")
        .bind(contentId, content.title ?? '', content.author_id ?? '', tags).run();

      return true;
    }

    if (ev.event_type === 'follow.created') {
      // Cross-shard: update followee's fans_count on followee's shard.
      const followeeId = payload.followee_id as string;
      let followeeShard: number;
      try {
        const route = await resolveShard(env.ROUTER, ev.tenant_id, 'users', followeeId);
        followeeShard = route.shard_id;
      } catch { return false; } // retry later
      const physical = (followeeShard % 8) + 1;
      const followeeDb = env[`SHARD_${String(physical).padStart(2, '0')}` as keyof Env] as D1Database | undefined;
      if (!followeeDb) return false;
      await followeeDb.prepare('UPDATE platform_users SET fans_count=fans_count+1 WHERE tenant_id=?1 AND user_id=?2').bind(ev.tenant_id, followeeId).run();
      await followeeDb.prepare('UPDATE platform_authors SET fans_count=fans_count+1 WHERE tenant_id=?1 AND author_id=?2').bind(ev.tenant_id, followeeId).run();
      return true;
    }

    // Unknown event type: mark completed to avoid infinite retry.
    return true;
  } catch {
    return false;
  }
}

async function processBatch(env: Env, batchSize = 50): Promise<{ processed: number; succeeded: number; failed: number }> {
  let processed = 0, succeeded = 0, failed = 0;
  for (const db of allDbs(env)) {
    const events = await db.prepare(`SELECT tenant_id,event_id,aggregate_type,aggregate_id,event_type,payload_json,retry_count FROM platform_outbox WHERE status IN ('pending','failed') AND (next_retry_at IS NULL OR next_retry_at <= CURRENT_TIMESTAMP) ORDER BY created_at ASC LIMIT ?1`).bind(batchSize).all<OutboxEvent>();
    for (const ev of events.results) {
      processed++;
      const ok = await processEvent(env, db, ev);
      if (ok) {
        succeeded++;
        await db.prepare("UPDATE platform_outbox SET status='completed', updated_at=CURRENT_TIMESTAMP WHERE tenant_id=?1 AND event_id=?2").bind(ev.tenant_id, ev.event_id).run();
      } else {
        failed++;
        const nextRetry = new Date(Date.now() + Math.min(300000, 1000 * Math.pow(2, ev.retry_count))).toISOString();
        await db.prepare("UPDATE platform_outbox SET status='failed', retry_count=retry_count+1, next_retry_at=?1, updated_at=CURRENT_TIMESTAMP WHERE tenant_id=?2 AND event_id=?3").bind(nextRetry, ev.tenant_id, ev.event_id).run();
      }
    }
  }
  return { processed, succeeded, failed };
}

export default {
  async fetch(request: Request, env: Env) {
    const rid = requestId(request);
    try {
      const url = new URL(request.url);
      if (request.method === 'GET' && url.pathname === '/health') {
        return ok({ status: 'READY', service: 'd1-fabric-w11-outbox-relay', version: '0.1.0' }, rid);
      }
      if (request.method === 'POST' && url.pathname === '/v1/outbox/process') {
        const result = await processBatch(env, 50);
        return ok(result, rid);
      }
      return fail('NOT_FOUND', rid, 404);
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'INTERNAL_ERROR', rid, 500);
    }
  },

  async scheduled(_controller: ScheduledController, env: Env) {
    await processBatch(env, 100).catch(() => {});
  },
};
