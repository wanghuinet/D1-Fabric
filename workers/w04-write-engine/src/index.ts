import { fingerprint, integrityCheck, publish, publishStatus } from './publish';
import type { PublishBody } from './publish';

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
  MAX_RETRIES?: string;
  MAX_BATCH?: string;
}

const json = (body: unknown, status = 200, requestId: string = crypto.randomUUID()) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'x-request-id': requestId } });

function validText(value: unknown, max: number) { return typeof value === 'string' && value.length > 0 && value.length <= max; }

const PHYSICAL_RE = /shard-(\d{2})$/;

// The authoritative logical -> physical binding lives in W02. W04 never recomputes
// the `% 8` striping; it resolves the physical shard via the ROUTER service binding.
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

// F-PUBLISH-1: a single bounded cross-shard read. Route author_id through W02,
// read one author row on its authoritative shard, and return active status.
async function validateAuthor(env: Env, tenantId: string, authorId: string): Promise<boolean> {
  if (!env.ROUTER) return false;
  const routeRes = await env.ROUTER.fetch('https://router/v1/route', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tenant_id: tenantId, namespace: 'author', routing_key: authorId }),
  });
  if (!routeRes.ok) return false;
  const route = (await routeRes.json()) as { shard_id?: number };
  if (!Number.isInteger(route.shard_id)) return false;
  const { db } = await resolveDb(env, route.shard_id as number);
  if (!db) return false;
  const row = await db
    .prepare("SELECT 1 AS one FROM platform_authors WHERE tenant_id=?1 AND author_id=?2 AND status='active' LIMIT 1")
    .bind(tenantId, authorId)
    .first();
  return !!row;
}

export default {
  async fetch(request: Request, env: Env) {
    const requestId = request.headers.get('x-request-id')?.slice(0, 128) || crypto.randomUUID();
    try {
      const url = new URL(request.url);

      if (request.method === 'GET' && url.pathname === '/health') {
        const shardsBound = [1,2,3,4,5,6,7,8].every((n) => !!env[`SHARD_${String(n).padStart(2, '0')}` as keyof Env]);
        return json({ status: shardsBound ? 'READY' : 'NOT_READY', service: 'd1-fabric-w04-write-engine', version: '0.5.0', shards_bound: shardsBound ? 8 : 0, router_bound: !!env.ROUTER }, shardsBound ? 200 : 503, requestId);
      }

      if (request.method === 'POST' && url.pathname === '/v1/publish') {
        const body = await request.json() as PublishBody & { shard_id?: number };
        const shardId = body.shard_id;
        const { db, err } = await resolveDb(env, shardId as number);
        if (!db) return json({ code: err === 'INVALID_SHARD_ID' ? 'INVALID_SHARD_ID' : (err ?? 'SHARD_NOT_READY'), shard_id: shardId }, err === 'INVALID_SHARD_ID' ? 400 : 503, requestId);
        return publish(db, (tid, aid) => validateAuthor(env, tid, aid), body, requestId, json);
      }

      if (request.method === 'GET' && url.pathname === '/v1/publish/status') {
        const tenantId = url.searchParams.get('tenant_id');
        const publishId = url.searchParams.get('publish_id');
        const shardId = Number(url.searchParams.get('shard_id'));
        if (!validText(tenantId, 256) || !validText(publishId, 128) || !Number.isInteger(shardId)) return json({ code: 'INVALID_ARGUMENT' }, 400, requestId);
        const { db, err } = await resolveDb(env, shardId);
        if (!db) return json({ code: err, shard_id: shardId }, err === 'INVALID_SHARD_ID' ? 400 : 503, requestId);
        return publishStatus(db, tenantId!, publishId!, requestId, json);
      }

      if (request.method === 'GET' && url.pathname === '/v1/integrity') {
        const shardId = Number(url.searchParams.get('shard_id'));
        if (!Number.isInteger(shardId) || shardId < 0 || shardId > 63) return json({ code: 'INVALID_SHARD_ID' }, 400, requestId);
        const { db, err } = await resolveDb(env, shardId);
        if (!db) return json({ code: err, shard_id: shardId }, 503, requestId);
        return integrityCheck(db, requestId, json);
      }

      if (request.method === 'POST' && url.pathname === '/v1/write') {
        const body = await request.json() as {
          tenant_id?: string; namespace?: string; record_key?: string; shard_id?: number;
          op?: 'INSERT' | 'UPDATE' | 'DELETE'; idempotency_key?: string; payload_json?: string; expected_version?: number;
        };
        if (!validText(body.tenant_id, 256) || !validText(body.namespace, 256) || !validText(body.record_key, 512)) return json({ code: 'INVALID_ARGUMENT' }, 400, requestId);
        if (!Number.isInteger(body.shard_id) || body.shard_id! < 0 || body.shard_id! > 63) return json({ code: 'INVALID_SHARD_ID' }, 400, requestId);
        if (!body.op || !['INSERT','UPDATE','DELETE'].includes(body.op)) return json({ code: 'INVALID_OPERATION' }, 400, requestId);
        if (!validText(body.idempotency_key, 128)) return json({ code: 'INVALID_IDEMPOTENCY_KEY' }, 400, requestId);
        if (body.op !== 'DELETE' && !validText(body.payload_json, 1000000)) return json({ code: 'INVALID_PAYLOAD' }, 400, requestId);
        // Optimistic concurrency: UPDATE declares the version it expects. No silent last-write-wins.
        if (body.op === 'UPDATE' && (!Number.isInteger(body.expected_version) || body.expected_version! < 1)) return json({ code: 'INVALID_EXPECTED_VERSION' }, 400, requestId);
        const { db, err } = await resolveDb(env, body.shard_id!);
        if (!db) return json({ code: err, shard_id: body.shard_id }, err === 'INVALID_SHARD_ID' ? 400 : 503, requestId);
        const requestHash = await fingerprint({ op: body.op, tenant_id: body.tenant_id, namespace: body.namespace, record_key: body.record_key, payload: body.payload_json ?? null });
        const existing = await db.prepare('SELECT operation,request_hash,status,result_json FROM fabric_idempotency WHERE tenant_id=?1 AND idempotency_key=?2 LIMIT 1').bind(body.tenant_id, body.idempotency_key).first<{operation:string;request_hash:string;status:string;result_json:string|null}>();
        if (existing) {
          if (existing.request_hash !== requestHash || existing.operation !== body.op) return json({ code: 'IDEMPOTENCY_KEY_REUSE_CONFLICT' }, 409, requestId);
          if (existing.status === 'COMMITTED') return json({ accepted:true, replay:true, shard_id:body.shard_id, result:existing.result_json ? JSON.parse(existing.result_json) : null }, 200, requestId);
          if (existing.status === 'IN_PROGRESS') return json({ code: 'WRITE_IN_PROGRESS' }, 409, requestId);
        }
        try {
          let result: Record<string, unknown>;
          if (body.op === 'INSERT') {
            result = { operation:body.op, tenant_id:body.tenant_id, namespace:body.namespace, record_key:body.record_key, shard_id:body.shard_id };
            await db.batch([
              db.prepare("INSERT INTO fabric_idempotency(tenant_id,idempotency_key,operation,request_hash,status) VALUES(?1,?2,?3,?4,'IN_PROGRESS')").bind(body.tenant_id,body.idempotency_key,body.op,requestHash),
              db.prepare('INSERT INTO fabric_records(namespace,record_key,tenant_id,payload_json,version) VALUES(?1,?2,?3,?4,1)').bind(body.namespace,body.record_key,body.tenant_id,body.payload_json!),
              db.prepare("UPDATE fabric_idempotency SET status='COMMITTED',result_json=?1,updated_at=CURRENT_TIMESTAMP WHERE tenant_id=?2 AND idempotency_key=?3 AND status='IN_PROGRESS'").bind(JSON.stringify(result),body.tenant_id,body.idempotency_key),
            ]);
          } else if (body.op === 'UPDATE') {
            const expected = body.expected_version!;
            const current = await db.prepare('SELECT version FROM fabric_records WHERE namespace=?1 AND record_key=?2 AND tenant_id=?3 LIMIT 1').bind(body.namespace,body.record_key,body.tenant_id).first<{version:number}>();
            if (!current) return json({ code:'NOT_FOUND' },404,requestId);
            if (current.version !== expected) return json({ code:'WRITE_CONFLICT', current_version:current.version, expected_version:expected },409,requestId);
            result = { operation:body.op, tenant_id:body.tenant_id, namespace:body.namespace, record_key:body.record_key, shard_id:body.shard_id, previous_version:current.version, next_version:current.version + 1 };
            const nextVersion = expected + 1;
            const committedJson = JSON.stringify(result);
            const results = await db.batch([
              db.prepare("INSERT INTO fabric_idempotency(tenant_id,idempotency_key,operation,request_hash,status) VALUES(?1,?2,?3,?4,'IN_PROGRESS')").bind(body.tenant_id,body.idempotency_key,body.op,requestHash),
              db.prepare('UPDATE fabric_records SET payload_json=?1,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE namespace=?2 AND record_key=?3 AND tenant_id=?4 AND version=?5').bind(body.payload_json!,body.namespace,body.record_key,body.tenant_id,expected),
              db.prepare("UPDATE fabric_idempotency SET status=CASE WHEN EXISTS(SELECT 1 FROM fabric_records WHERE namespace=?2 AND record_key=?3 AND tenant_id=?1 AND version=?5) THEN 'COMMITTED' ELSE 'FAILED' END,result_json=CASE WHEN EXISTS(SELECT 1 FROM fabric_records WHERE namespace=?2 AND record_key=?3 AND tenant_id=?1 AND version=?5) THEN ?4 ELSE NULL END,updated_at=CURRENT_TIMESTAMP WHERE tenant_id=?1 AND idempotency_key=?6 AND status='IN_PROGRESS'").bind(body.tenant_id,body.namespace,body.record_key,committedJson,nextVersion,body.idempotency_key),
            ]);
            const changed = results?.[1]?.meta?.changes ?? 0;
            if (changed === 0) return json({ code:'WRITE_CONFLICT', current_version:expected, expected_version:expected },409,requestId);
          } else {
            const current = await db.prepare('SELECT version FROM fabric_records WHERE namespace=?1 AND record_key=?2 AND tenant_id=?3 LIMIT 1').bind(body.namespace,body.record_key,body.tenant_id).first<{version:number}>();
            if (!current) return json({ code:'NOT_FOUND' },404,requestId);
            result = { operation:body.op,tenant_id:body.tenant_id,namespace:body.namespace,record_key:body.record_key,shard_id:body.shard_id,previous_version:current.version };
            await db.batch([
              db.prepare("INSERT INTO fabric_idempotency(tenant_id,idempotency_key,operation,request_hash,status) VALUES(?1,?2,?3,?4,'IN_PROGRESS')").bind(body.tenant_id,body.idempotency_key,body.op,requestHash),
              db.prepare('DELETE FROM fabric_records WHERE namespace=?1 AND record_key=?2 AND tenant_id=?3').bind(body.namespace,body.record_key,body.tenant_id),
              db.prepare("UPDATE fabric_idempotency SET status='COMMITTED',result_json=?1,updated_at=CURRENT_TIMESTAMP WHERE tenant_id=?2 AND idempotency_key=?3 AND status='IN_PROGRESS'").bind(JSON.stringify(result),body.tenant_id,body.idempotency_key),
            ]);
          }
          return json({ accepted:true,replay:false,result },200,requestId);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
          if (message.includes('UNIQUE constraint failed: fabric_records')) return json({ code:'ALREADY_EXISTS' },409,requestId);
          if (message.includes('UNIQUE constraint failed: fabric_idempotency')) return json({ code:'WRITE_RACE' },409,requestId);
          throw error;
        }
      }

      if (request.method === 'POST' && url.pathname === '/v1/write/plan') return json({ code:'USE_V1_WRITE' },410,requestId);
      return json({ code:'NOT_FOUND' },404,requestId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
      return json({ code:message === 'D1_ERROR' ? 'D1_WRITE_FAILED' : 'INTERNAL_ERROR' },500,requestId);
    }
  },
};