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

function bounded(value: unknown, fallback: number, max: number) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : fallback;
}

function dbForShard(env: Env, shardId: number): D1Database | null {
  if (!Number.isInteger(shardId) || shardId < 0 || shardId > 63) return null;
  const physical = (shardId % 8) + 1;
  return env[`SHARD_${String(physical).padStart(2, '0')}` as keyof Env] as D1Database | undefined ?? null;
}

function validText(value: unknown, max: number) {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
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
          version: '0.2.1',
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

        const requestHash = await sha256(JSON.stringify({
          tenant_id: body.tenant_id,
          namespace: body.namespace,
          record_key: body.record_key,
          shard_id: body.shard_id,
          op: body.op,
          payload_json: body.payload_json ?? null,
        }));

        const existing = await db.prepare(
          'SELECT status, request_hash, result_json FROM fabric_idempotency WHERE tenant_id = ?1 AND idempotency_key = ?2 LIMIT 1',
        ).bind(body.tenant_id, body.idempotency_key).first<{ status: string; request_hash: string; result_json: string | null }>();

        if (existing?.request_hash && existing.request_hash !== requestHash) {
          return json({ code: 'IDEMPOTENCY_KEY_REUSE_CONFLICT' }, 409, requestId);
        }
        if (existing?.status === 'COMMITTED') {
          return json({
            accepted: true,
            replay: true,
            shard_id: body.shard_id,
            result: existing.result_json ? JSON.parse(existing.result_json) : null,
          }, 200, requestId);
        }
        if (existing?.status === 'IN_PROGRESS') {
          return json({ code: 'WRITE_IN_PROGRESS' }, 409, requestId);
        }

        if (body.op === 'UPDATE' || body.op === 'DELETE') {
          const target = await db.prepare(
            'SELECT version FROM fabric_records WHERE namespace = ?1 AND record_key = ?2 AND tenant_id = ?3 LIMIT 1',
          ).bind(body.namespace, body.record_key, body.tenant_id).first<{ version: number }>();
          if (!target) return json({ code: 'NOT_FOUND' }, 404, requestId);
        }

        const result = {
          operation: body.op,
          tenant_id: body.tenant_id,
          namespace: body.namespace,
          record_key: body.record_key,
          shard_id: body.shard_id,
        };
        const resultJson = JSON.stringify(result);
        const statements: D1PreparedStatement[] = [];

        statements.push(
          db.prepare(
            'INSERT INTO fabric_idempotency (tenant_id, idempotency_key, operation, request_hash, status) VALUES (?1, ?2, ?3, ?4, \'IN_PROGRESS\')',
          ).bind(body.tenant_id, body.idempotency_key, body.op, requestHash),
        );

        if (body.op === 'INSERT') {
          statements.push(
            db.prepare(
              'INSERT INTO fabric_records (namespace, record_key, tenant_id, payload_json, version) VALUES (?1, ?2, ?3, ?4, 1)',
            ).bind(body.namespace, body.record_key, body.tenant_id, body.payload_json!),
          );
        } else if (body.op === 'UPDATE') {
          statements.push(
            db.prepare(
              'UPDATE fabric_records SET payload_json = ?1, version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE namespace = ?2 AND record_key = ?3 AND tenant_id = ?4',
            ).bind(body.payload_json!, body.namespace, body.record_key, body.tenant_id),
          );
        } else {
          statements.push(
            db.prepare(
              'DELETE FROM fabric_records WHERE namespace = ?1 AND record_key = ?2 AND tenant_id = ?3',
            ).bind(body.namespace, body.record_key, body.tenant_id),
          );
        }

        statements.push(
          db.prepare(
            'UPDATE fabric_idempotency SET status = \'COMMITTED\', result_json = ?1, updated_at = CURRENT_TIMESTAMP WHERE tenant_id = ?2 AND idempotency_key = ?3 AND status = \'IN_PROGRESS\'',
          ).bind(resultJson, body.tenant_id, body.idempotency_key),
        );

        await db.batch(statements);

        return json({ accepted: true, replay: false, result }, 200, requestId);
      }

      if (request.method === 'POST' && url.pathname === '/v1/write/plan') {
        return json({ code: 'USE_V1_WRITE' }, 410, requestId);
      }

      return json({ code: 'NOT_FOUND' }, 404, requestId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
      const code = message.includes('UNIQUE') ? 'WRITE_CONFLICT' : 'D1_WRITE_FAILED';
      return json({ code }, 502, requestId);
    }
  },
};
