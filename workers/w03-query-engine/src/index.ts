interface Env {
  SHARD_01?: D1Database;
  SHARD_02?: D1Database;
  SHARD_03?: D1Database;
  SHARD_04?: D1Database;
  SHARD_05?: D1Database;
  SHARD_06?: D1Database;
  SHARD_07?: D1Database;
  SHARD_08?: D1Database;
  MAX_FANOUT?: string;
  MAX_PARALLELISM?: string;
  MAX_ROWS?: string;
}

const json = (body: unknown, status = 200, requestId: string = crypto.randomUUID()) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'x-request-id': requestId },
  });

function bounded(value: unknown, fallback: number, max: number) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? Math.max(1, Math.min(max, n)) : fallback;
}

function dbForShard(env: Env, shardId: number): D1Database | null {
  if (!Number.isInteger(shardId) || shardId < 0 || shardId > 63) return null;
  const physical = (shardId % 8) + 1;
  return env[`SHARD_${String(physical).padStart(2, '0')}` as keyof Env] as D1Database | undefined ?? null;
}

function rejectUnsafeRead(sql: string) {
  const normalized = sql.trim().toUpperCase();
  if (!normalized.startsWith('SELECT')) return 'ONLY_SELECT_ALLOWED';
  if (normalized.includes(';')) return 'MULTI_STATEMENT_NOT_ALLOWED';
  return null;
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
          service: 'd1-fabric-w03-query-engine',
          version: '0.2.0',
          shards_bound: ready ? 8 : 0,
        }, ready ? 200 : 503, requestId);
      }

      if (request.method === 'POST' && url.pathname === '/v1/query/plan') {
        const body = await request.json() as {
          tenant_id?: string;
          sql?: string;
          shard_ids?: number[];
          deadline_ms?: number;
          max_rows?: number;
        };
        if (!body.tenant_id || !body.sql) return json({ code: 'INVALID_ARGUMENT' }, 400, requestId);
        if (body.sql.length > 16000) return json({ code: 'PAYLOAD_TOO_LARGE' }, 413, requestId);
        const unsafe = rejectUnsafeRead(body.sql);
        if (unsafe) return json({ code: unsafe }, 400, requestId);

        const shardIds = [...new Set((body.shard_ids ?? [0]).filter((id) => Number.isInteger(id) && id >= 0 && id <= 63))];
        if (shardIds.length === 0) return json({ code: 'INVALID_SHARD_SET' }, 400, requestId);
        const maxFanout = bounded(env.MAX_FANOUT, 8, 64);
        const maxParallelism = bounded(env.MAX_PARALLELISM, 4, 32);
        const maxRows = bounded(body.max_rows ?? env.MAX_ROWS, 1000, 100000);
        if (shardIds.length > maxFanout) return json({ code: 'FANOUT_BUDGET_EXCEEDED', max_fanout: maxFanout }, 429, requestId);

        const missing = shardIds.find((id) => !dbForShard(env, id));
        if (missing !== undefined) return json({ code: 'SHARD_NOT_READY', shard_id: missing }, 503, requestId);

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
          if (Date.now() - started >= deadlineMs) return json({ code: 'TIMEOUT' }, 504, requestId);
          const batch = shardIds.slice(i, i + parallelism);
          const settled = await Promise.allSettled(batch.map(run));
          for (const item of settled) {
            if (item.status === 'rejected') {
              return json({ code: item.reason instanceof Error && item.reason.message === 'TIMEOUT' ? 'TIMEOUT' : 'D1_READ_FAILED' }, 502, requestId);
            }
            results.push(item.value);
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
          deadline_ms: deadlineMs,
          execution: 'D1_EXECUTED',
          results,
        }, 200, requestId);
      }

      return json({ code: 'NOT_FOUND' }, 404, requestId);
    } catch (error) {
      return json({ code: error instanceof Error ? error.message : 'INTERNAL_ERROR' }, 500, requestId);
    }
  },
};
