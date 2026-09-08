import { integrityCheck, publish, publishStatus } from './publish';
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

const json = (body: unknown, status = 200, rid: string = crypto.randomUUID()) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'x-request-id': rid } });

function validText(value: unknown, max: number) { return typeof value === 'string' && value.length > 0 && value.length <= max; }
function hashInput(op: string, tenant: string, namespace: string, key: string, payload: string | undefined) { return `${op}:${tenant}:${namespace}:${key}:${payload ?? ''}`; }

export default {
  async fetch(request: Request, env: Env) {
    const rid = requestId(request);
    try {
      const url = new URL(request.url);

      if (request.method === 'GET' && url.pathname === '/health') {
        const ready = [1,2,3,4,5,6,7,8].every((n) => !!env[`SHARD_${String(n).padStart(2, '0')}` as keyof Env]);
        return ok({ status: ready ? 'READY' : 'NOT_READY', service: 'd1-fabric-w04-write-engine', version: '0.5.0', shards_bound: ready ? 8 : 0 }, rid, ready ? 200 : 503);
      }

      // Publish: route by content_id so content + publish op + assets + outbox land on one shard.
      if (request.method === 'POST' && url.pathname === '/v1/publish') {
        const body = await request.json() as {
          tenant_id?: string; publish_id?: string; idempotency_key?: string; content_id?: string;
          author_id?: string; content_type?: string; title?: string | null; summary?: string | null;
          body_json?: string | null; cover_media_id?: string | null; body_ref?: string | null;
          language?: string | null; region?: string | null; category_id?: string | null;
          visibility?: 'public' | 'followers' | 'private'; assets?: unknown[];
        };
        if (!validText(body.tenant_id, 256) || !validText(body.content_id, 128)) return fail('INVALID_ARGUMENT', rid, 400, 'tenant_id and content_id are required');
        try {
          const route = await resolveShard(env.ROUTER, body.tenant_id!, 'content', body.content_id!);
          const db = dbForPhysical(env, route.physical);
          if (!db) return fail('SHARD_NOT_READY', rid, 503, `shard ${route.shard_id} not bound`);
          // Bounded cross-shard author validation (F-PUBLISH-1): resolve the
          // author's physical shard via W02 for a single bounded read. publish()
          // short-circuits idempotency replay before running author validation.
          const authorDb = body.author_id
            ? dbForPhysical(env, (await resolveShard(env.ROUTER, body.tenant_id!, 'users', body.author_id)).physical)
            : null;
          return publish(db, authorDb, body as Parameters<typeof publish>[2], rid, json);
        } catch (e) {
          const code = e instanceof Error ? e.message : 'ROUTER_ERROR';
          return fail(code, rid, code === 'STALE_ROUTING_EPOCH' ? 409 : 503, undefined, true);
        }
      }

      if (request.method === 'GET' && url.pathname === '/v1/publish/status') {
        const tenantId = url.searchParams.get('tenant_id');
        const publishId = url.searchParams.get('publish_id');
        if (!validText(tenantId, 256) || !validText(publishId, 128)) return fail('INVALID_ARGUMENT', rid, 400);
        // publish_id is unique per tenant; route by tenant + publish_id namespace.
        try {
          const route = await resolveShard(env.ROUTER, tenantId!, 'publish', publishId!);
          const db = dbForPhysical(env, route.physical);
          if (!db) return fail('SHARD_NOT_READY', rid, 503);
          return publishStatus(db, tenantId!, publishId!, rid, json);
        } catch (e) {
          return fail(e instanceof Error ? e.message : 'ROUTER_ERROR', rid, 503, undefined, true);
        }
      }

      if (request.method === 'GET' && url.pathname === '/v1/integrity') {
        const shardParam = url.searchParams.get('shard_id');
        // Admin diagnostic: explicit physical shard number (1..8), default 1.
        const shardNum = shardParam ? Number(shardParam) : 1;
        if (!Number.isInteger(shardNum) || shardNum < 1 || shardNum > 8) return fail('INVALID_SHARD_ID', rid, 400);
        const db = (env[`SHARD_${String(shardNum).padStart(2, '0')}` as keyof Env] as D1Database | undefined) ?? null;
        if (!db) return fail('SHARD_NOT_READY', rid, 503);
        return integrityCheck(db, rid, json);
      }

      if (request.method === 'POST' && url.pathname === '/v1/write') {
        const body = await request.json() as {
          tenant_id?: string; namespace?: string; record_key?: string;
          op?: 'INSERT' | 'UPDATE' | 'DELETE'; idempotency_key?: string; payload_json?: string; expected_version?: number;
        };
        if (!validText(body.tenant_id, 256) || !validText(body.namespace, 256) || !validText(body.record_key, 512)) return fail('INVALID_ARGUMENT', rid, 400);
        if (!body.op || !['INSERT','UPDATE','DELETE'].includes(body.op)) return fail('INVALID_OPERATION', rid, 400);
        if (!validText(body.idempotency_key, 128)) return fail('INVALID_IDEMPOTENCY_KEY', rid, 400);
        if (body.op !== 'DELETE' && !validText(body.payload_json, 1000000)) return fail('INVALID_PAYLOAD', rid, 400);
        // Route via W02; client-supplied shard_id is intentionally ignored.
        let shardId: number;
        let db: D1Database | null = null;
        try {
          const route = await resolveShard(env.ROUTER, body.tenant_id!, body.namespace!, body.record_key!);
          shardId = route.shard_id;
          db = dbForPhysical(env, route.physical);
        } catch (e) {
          return fail(e instanceof Error ? e.message : 'ROUTER_ERROR', rid, 503, undefined, true);
        }
        if (!db) return fail('SHARD_NOT_READY', rid, 503, `shard ${shardId} not bound`);
        const requestHash = hashInput(body.op as string, body.tenant_id!, body.namespace!, body.record_key!, body.payload_json);
        const existing = await db.prepare('SELECT operation,request_hash,status,result_json FROM fabric_idempotency WHERE tenant_id=?1 AND idempotency_key=?2 LIMIT 1').bind(body.tenant_id, body.idempotency_key).first<{operation:string;request_hash:string;status:string;result_json:string|null}>();
        if (existing) {
          if (existing.request_hash !== requestHash || existing.operation !== body.op) return fail('IDEMPOTENCY_KEY_REUSE_CONFLICT', rid, 409);
          if (existing.status === 'COMMITTED') return ok({ accepted:true, replay:true, shard_id:shardId, result:existing.result_json ? JSON.parse(existing.result_json) : null }, rid, 200);
          if (existing.status === 'IN_PROGRESS') return fail('WRITE_IN_PROGRESS', rid, 409);
        }
        try {
          let result: Record<string, unknown>;
          if (body.op === 'INSERT') {
            result = { operation:body.op, tenant_id:body.tenant_id, namespace:body.namespace, record_key:body.record_key, shard_id:shardId };
            await db.batch([
              db.prepare("INSERT INTO fabric_idempotency(tenant_id,idempotency_key,operation,request_hash,status) VALUES(?1,?2,?3,?4,'IN_PROGRESS')").bind(body.tenant_id,body.idempotency_key,body.op,requestHash),
              db.prepare('INSERT INTO fabric_records(namespace,record_key,tenant_id,payload_json,version) VALUES(?1,?2,?3,?4,1)').bind(body.namespace,body.record_key,body.tenant_id,body.payload_json!),
              db.prepare("UPDATE fabric_idempotency SET status='COMMITTED',result_json=?1,updated_at=CURRENT_TIMESTAMP WHERE tenant_id=?2 AND idempotency_key=?3 AND status='IN_PROGRESS'").bind(JSON.stringify(result),body.tenant_id,body.idempotency_key),
            ]);
          } else if (body.op === 'UPDATE') {
            // Optimistic concurrency (CAS): expected_version is mandatory; no
            // silent last-write-wins. Conflict surfaces WRITE_CONFLICT.
            if (!Number.isInteger(body.expected_version) || (body.expected_version as number) < 1) return fail('EXPECTED_VERSION_REQUIRED', rid, 400);
            const current = await db.prepare('SELECT version FROM fabric_records WHERE namespace=?1 AND record_key=?2 AND tenant_id=?3 LIMIT 1').bind(body.namespace,body.record_key,body.tenant_id).first<{version:number}>();
            if (!current) return fail('NOT_FOUND', rid, 404);
            if (current.version !== body.expected_version) return fail('WRITE_CONFLICT', rid, 409, `expected_version ${body.expected_version} but current is ${current.version}`);
            result = { operation:body.op,tenant_id:body.tenant_id,namespace:body.namespace,record_key:body.record_key,shard_id:shardId,previous_version:current.version };
            const res = await db.batch([
              db.prepare("INSERT INTO fabric_idempotency(tenant_id,idempotency_key,operation,request_hash,status) VALUES(?1,?2,?3,?4,'IN_PROGRESS')").bind(body.tenant_id,body.idempotency_key,body.op,requestHash),
              db.prepare('UPDATE fabric_records SET payload_json=?1,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE namespace=?2 AND record_key=?3 AND tenant_id=?4 AND version=?5').bind(body.payload_json!,body.namespace,body.record_key,body.tenant_id,body.expected_version),
              db.prepare("UPDATE fabric_idempotency SET status='COMMITTED',result_json=?1,updated_at=CURRENT_TIMESTAMP WHERE tenant_id=?2 AND idempotency_key=?3 AND status='IN_PROGRESS'").bind(JSON.stringify(result),body.tenant_id,body.idempotency_key),
            ]);
            // Close the SELECT→UPDATE race: if a concurrent writer advanced the
            // version in between, the CAS UPDATE matched 0 rows.
            if (res[1].meta.changes === 0) return fail('WRITE_CONFLICT', rid, 409, `expected_version ${body.expected_version} was concurrently modified`);
          } else {
            const current = await db.prepare('SELECT version FROM fabric_records WHERE namespace=?1 AND record_key=?2 AND tenant_id=?3 LIMIT 1').bind(body.namespace,body.record_key,body.tenant_id).first<{version:number}>();
            if (!current) return fail('NOT_FOUND', rid, 404);
            result = { operation:body.op,tenant_id:body.tenant_id,namespace:body.namespace,record_key:body.record_key,shard_id:shardId,previous_version:current.version };
            await db.batch([
              db.prepare("INSERT INTO fabric_idempotency(tenant_id,idempotency_key,operation,request_hash,status) VALUES(?1,?2,?3,?4,'IN_PROGRESS')").bind(body.tenant_id,body.idempotency_key,body.op,requestHash),
              db.prepare('DELETE FROM fabric_records WHERE namespace=?1 AND record_key=?2 AND tenant_id=?3').bind(body.namespace,body.record_key,body.tenant_id),
              db.prepare("UPDATE fabric_idempotency SET status='COMMITTED',result_json=?1,updated_at=CURRENT_TIMESTAMP WHERE tenant_id=?2 AND idempotency_key=?3 AND status='IN_PROGRESS'").bind(JSON.stringify(result),body.tenant_id,body.idempotency_key),
            ]);
          }
          return ok({ accepted:true,replay:false,result }, rid, 200);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
          if (message.includes('UNIQUE constraint failed: fabric_records')) return fail('ALREADY_EXISTS', rid, 409);
          if (message.includes('UNIQUE constraint failed: fabric_idempotency')) return fail('WRITE_RACE', rid, 409);
          throw error;
        }
      }

      if (request.method === 'POST' && url.pathname === '/v1/write/plan') return fail('USE_V1_WRITE', rid, 410);
      return fail('NOT_FOUND', rid, 404);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
      return fail(message === 'D1_ERROR' ? 'D1_WRITE_FAILED' : 'INTERNAL_ERROR', rid, 500);
    }
  },
};
