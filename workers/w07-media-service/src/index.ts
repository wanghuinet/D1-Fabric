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
  MEDIA_BUCKET: R2Bucket;
}

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB
const ALLOWED_MEDIA_TYPES = new Set(['image', 'video', 'audio', 'document', 'other']);

function detectMediaType(mime: string | null): string {
  if (!mime) return 'other';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('application/pdf') || mime.startsWith('text/')) return 'document';
  return 'other';
}

export default {
  async fetch(request: Request, env: Env) {
    const rid = requestId(request);
    try {
      const url = new URL(request.url);

      if (request.method === 'GET' && url.pathname === '/health') {
        return ok({ status: 'READY', service: 'd1-fabric-w07-media-service', version: '0.1.0' }, rid);
      }

      // Upload media to R2 and write platform_media metadata.
      // Media is routed by content_id so it lands on the same shard as the
      // content that will reference it (publish transaction locality).
      if (request.method === 'POST' && url.pathname === '/v1/media/upload') {
        const tenantId = url.searchParams.get('tenant_id');
        const ownerId = url.searchParams.get('owner_id');
        const contentId = url.searchParams.get('content_id');
        const mediaId = url.searchParams.get('media_id') ?? crypto.randomUUID();
        if (!tenantId || !ownerId || !contentId) return fail('INVALID_ARGUMENT', rid, 400, 'tenant_id, owner_id, content_id are required');

        const ct = request.headers.get('content-type') ?? 'application/octet-stream';
        const mediaType = detectMediaType(ct);
        if (!ALLOWED_MEDIA_TYPES.has(mediaType)) return fail('INVALID_MEDIA_TYPE', rid, 400);

        const contentLength = Number(request.headers.get('content-length') ?? 0);
        if (contentLength > MAX_UPLOAD_BYTES) return fail('PAYLOAD_TOO_LARGE', rid, 413);

        // Route media by content_id (colocated with content for publish validation).
        let shardId: number;
        let db: D1Database | null = null;
        try {
          const route = await resolveShard(env.ROUTER, tenantId, 'content', contentId);
          shardId = route.shard_id;
          db = dbForPhysical(env, route.physical);
        } catch (e) { return fail(e instanceof Error ? e.message : 'ROUTER_ERROR', rid, 503, undefined, true); }

        const r2Key = `${tenantId}/${contentId}/${mediaId}`;
        const arrayBuffer = await request.arrayBuffer();
        if (arrayBuffer.byteLength > MAX_UPLOAD_BYTES) return fail('PAYLOAD_TOO_LARGE', rid, 413);

        if (!db) return fail('SHARD_NOT_READY', rid, 503, `shard ${shardId} not bound`);

        // R2 upload is outside the D1 ACID boundary (Content Schema §R2 boundary).
        // We upload first, then write the DB record. If DB write fails, the R2
        // object becomes an orphan cleaned up by reconciliation.
        await env.MEDIA_BUCKET.put(r2Key, arrayBuffer, {
          httpMetadata: { contentType: ct },
          customMetadata: { tenant_id: tenantId, media_id: mediaId, owner_id: ownerId },
        });

        const byteSize = arrayBuffer.byteLength;
        await db.prepare(`INSERT OR REPLACE INTO platform_media(tenant_id,media_id,owner_id,content_id,media_type,object_key,r2_key,mime_type,byte_size,upload_status) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,'uploaded')`)
          .bind(tenantId, mediaId, ownerId, contentId, mediaType, r2Key, r2Key, ct, byteSize)
          .run();

        return ok({
          media_id: mediaId,
          tenant_id: tenantId,
          content_id: contentId,
          owner_id: ownerId,
          media_type: mediaType,
          mime_type: ct,
          byte_size: byteSize,
          r2_key: r2Key,
          upload_status: 'uploaded',
          shard_id: shardId,
        }, rid, 201);
      }

      // Get media metadata.
      if (request.method === 'GET' && url.pathname.startsWith('/v1/media/')) {
        const mediaId = url.pathname.slice('/v1/media/'.length);
        const tenantId = url.searchParams.get('tenant_id');
        const contentId = url.searchParams.get('content_id');
        if (!tenantId || !mediaId) return fail('INVALID_ARGUMENT', rid, 400);
        if (!contentId) return fail('CONTENT_ID_REQUIRED', rid, 400);
        let db: D1Database | null = null;
        try {
          const route = await resolveShard(env.ROUTER, tenantId, 'content', contentId);
          db = dbForPhysical(env, route.physical);
        } catch (e) { return fail(e instanceof Error ? e.message : 'ROUTER_ERROR', rid, 503, undefined, true); }
        if (!db) return fail('SHARD_NOT_READY', rid, 503);
        const row = await db.prepare('SELECT * FROM platform_media WHERE tenant_id=?1 AND media_id=?2 LIMIT 1').bind(tenantId, mediaId).first();
        if (!row) return fail('MEDIA_NOT_FOUND', rid, 404);
        return ok(row, rid);
      }

      return fail('NOT_FOUND', rid, 404);
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'INTERNAL_ERROR', rid, 500);
    }
  },
};
