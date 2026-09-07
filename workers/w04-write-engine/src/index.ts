interface Env {
  SHARD_01?: D1Database;
  SHARD_02?: D1Database;
  SHARD_03?: D1Database;
  SHARD_04?: D1Database;
  SHARD_05?: D1Database;
  SHARD_06?: D1Database;
  SHARD_07?: D1Database;
  SHARD_08?: D1Database;
  MAX_RETRIES?: string;
  MAX_BATCH?: string;
}

const json = (body: unknown, status = 200, requestId = crypto.randomUUID()) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'x-request-id': requestId },
  });

function dbForShard(env: Env, shardId: number): D1Database | null {
  if (!Number.isInteger(shardId) || shardId < 0 || shardId > 63) return null;
  const physical = (shardId % 8) + 1;
  return env[`SHARD_${String(physical).padStart(2, '0')}` as keyof Env] as D1Database | undefined ?? null;
}

function validText(value: unknown, max: number) {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

function hashInput(op: string, tenant: string, namespace: string, key: string, payload: string | undefined) {
  return `${op}:${tenant}:${namespace}:${key}:${payload ?? ''}`;
}

export default {
  async fetch(request: Request, env: Env) {
    const requestId = request.headers.get('x-request-id')?.slice(0, 128) || crypto.randomUUID();
    try {
      const url = new URL(request.url);

      if (request.method === 'GET' && url.pathname === '/health') {
        const ready = [1, 2, 3, 4, 5, 6, 7, 8].every((n) => !!env[`SHARD_${String(n).padStart(2, '0')}` as keyof Env]);
        return json({
          status: ready ? 'READY' : 'NOT_READY',
          service: 'd1-fabric-w04-write-engine',
          version: '0.3.0',
          shards_bound: ready ? 8 : 0,
        }, ready ? 200 : 503, requestId);
      }

      if (request.method === 'POST' && url.pathname === '/v1/write') {
        const body = await request.json() as {
          tenant_id?: string;
          namespace?: string;
          record_key?: string;
          shard_id?: number;
          op?: 'INSERT' | 'UPDATE' | 'DELETE';
          idempotency_key?: string;
          payload_json?: string;
        };

        if (!validText(body.tenant_id, 256) || !validText(body.namespace, 256) || !validText(body.record_key, 512)) {
          return json({ code: 'INVALID_ARGUMENT' }, 400, requestId);
        }
        if (!Number.isInteger(body.shard_id) || body.shard_id < 0 || body.shard_id > 63) {
          return json({ code: 'INVALID_SHARD_ID' }, 400, requestId);
        }
        if (!body.op || !['INSERT', 'UPDATE', 'DELETE'].includes(body.op)) {
          return json({ code: 'INVALID_OPERATION' }, 400, requestId);
        }
        if (!validText(body.idempotency_key, 128)) {
          return json({ code: 'INVALID_IDEMPOTENCY_KEY' }, 400, requestId);
        }
        if (body.op !== 'DELETE' && !validText(body.payload_json, 1000000)) {
          return json({ code: 'INVALID_PAYLOAD' }, 400, requestId);
        }

        const db = dbForShard(env, body.shard_id);
        if (!db) return json({ code: 'SHARD_NOT_READY', shard_id: body.shard_id }, 503, requestId);

        const requestHash = hashInput(body.op, body.tenant_id, body.namespace, body.record_key, body.payload_json);
        const existing = await db.prepare(
          'SELECT operation, request_hash, status, result_json FROM fabric_idempotency WHERE tenant_id = ?1 AND idempotency_key = ?2 LIMIT 1',
        ).bind(body.tenant_id, body.idempotency_key).first<{ operation: string; request_hash: string; status: string; result_json: string | null }>();

        if (existing) {
          if (existing.request_hash !== requestHash || existing.operation !== body.op) {
            return json({ code: 'IDEMPOTENCY_KEY_REUSE_CONFLICT' }, 409, requestId);
          }
          if (existing.status === 'COMMITTED') {
            return json({
              accepted: true,
              replay: true,
              shard_id: body.shard_id,
              result: existing.result_json ? JSON.parse(existing.result_json) : null,
            }, 200, requestId);
          }
          if (existing.status === 'IN_PROGRESS') {
            return json({ code: 'WRITE_IN_PROGRESS' }, 409, requestId);
          }
        }

        try {
          let result: Record<string, unknown>;
          if (body.op === 'INSERT') {
            await db.batch([
              db.prepare(
                'INSERT INTO fabric_idempotency (tenant_id, idempotency_key, operation, request_hash, status) VALUES (?1, ?2, ?3, ?4, \'IN_PROGRESS\')',
              ).bind(body.tenant_id, body.idempotency_key, body.op, requestHash),
              db.prepare(
                'INSERT INTO fabric_records (namespace, record_key, tenant_id, payload_json, version) VALUES (?1, ?2, ?3, ?4, 1)',
              ).bind(body.namespace, body.record_key, body.tenant_id, body.payload_json!),
              db.prepare(
                'UPDATE fabric_idempotency SET status = \'COMMITTED\', result_json = ?1, updated_at = CURRENT_TIMESTAMP WHERE tenant_id = ?2 AND idempotency_key = ?3 AND status = \'IN_PROGRESS\'',
              ).bind(JSON.stringify({ operation: body.op, tenant_id: body.tenant_id, namespace: body.namespace, record_key: body.record_key, shard_id: body.shard_id }), body.tenant_id, body.idempotency_key),
            ]);
            result = { operation: body.op, tenant_id: body.tenant_id, namespace: body.namespace, record_key: body.record_key, shard_id: body.shard_id };
          } else {
            const existingRecord = await db.prepare(
              'SELECT version FROM fabric_records WHERE namespace = ?1 AND record_key = ?2 AND tenant_id = ?3 LIMIT 1',
            ).bind(body.namespace, body.record_key, body.tenant_id).first<{ version: number }>();
            if (!existingRecord) return json({ code: 'NOT_FOUND' }, 404, requestId);

            result = { operation: body.op, tenant_id: body.tenant_id, namespace: body.namespace, record_key: body.record_key, shard_id: body.shard_id, previous_version: existingRecord.version };
            await db.batch([
              db.prepare(
                'INSERT INTO fabric_idempotency (tenant_id, idempotency_key, operation, request_hash, status) VALUES (?1, ?2, ?3, ?4, \'IN_PROGRESS\')',
              ).bind(body.tenant_id, body.idempotency_key, body.op, requestHash),
              body.op === 'UPDATE'
                ? db.prepare('UPDATE fabric_records SET payload_json = ?1, version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE namespace = ?2 AND record_key = ?3 AND tenant_id = ?4').bind(body.payload_json!, body.namespace, body.record_key, body.tenant_id)
                : db.prepare('DELETE FROM fabric_records WHERE namespace = ?1 AND record_key = ?2 AND tenant_id = ?3').bind(body.namespace, body.record_key, body.tenant_id),
              db.prepare(
                'UPDATE fabric_idempotency SET status = \'COMMITTED\', result_json = ?1, updated_at = CURRENT_TIMESTAMP WHERE tenant_id = ?2 AND idempotency_key = ?3 AND status = \'IN_PROGRESS\'',
              ).bind(JSON.stringify(result), body.tenant_id, body.idempotency_key),
            ]);
          }

          return json({ accepted: true, replay: false, result }, 200, requestId);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
          if (message.includes('UNIQUE constraint failed: fabric_records')) return json({ code: 'ALREADY_EXISTS' }, 409, requestId);
          if (message.includes('UNIQUE constraint failed: fabric_idempotency')) return json({ code: 'WRITE_RACE' }, 409, requestId);
          throw error;
        }
      }

      if (request.method === 'POST' && url.pathname === '/v1/write/plan') {
        return json({ code: 'USE_V1_WRITE' }, 410, requestId);
      }

      return json({ code: 'NOT_FOUND' }, 404, requestId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
      return json({ code: message === 'D1_ERROR' ? 'D1_WRITE_FAILED' : 'INTERNAL_ERROR' }, 500, requestId);
    }
  },
};