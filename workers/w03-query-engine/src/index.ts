import { allocateShardBudgets } from './shard-budget';

// Authoritative shard contract. 64 logical shards -> 8 physical D1: physical = (logical % 8) + 1.
const LOGICAL_SHARD_COUNT = 64;
const PHYSICAL_SHARD_COUNT = 8;
// Hard global cap on rows returned per request. The sum of per-shard D1 execution
// budgets is guaranteed <= MAX_ROWS_GLOBAL (never maxRows * fanout).
const MAX_ROWS_GLOBAL = 1000;

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
  if (!Number.isInteger(shardId) || shardId < 0 || shardId >= LOGICAL_SHARD_COUNT) return null;
  const physical = (shardId % PHYSICAL_SHARD_COUNT) + 1;
  return env[`SHARD_${String(physical).padStart(2, '0')}` as keyof Env] as D1Database | undefined ?? null;
}

// Reject any statement that is not a single read-only SELECT.
function rejectUnsafeRead(sql: string): string | null {
  const trimmed = sql.trim();
  if (trimmed.includes(';')) {
    // Allow trailing semicolon only if the rest is empty.
    const beforeSemicolon = trimmed.slice(0, trimmed.lastIndexOf(';')).trim();
    const afterSemicolon = trimmed.slice(trimmed.lastIndexOf(';') + 1).trim();
    if (afterSemicolon !== '') return 'MULTI_STATEMENT_NOT_ALLOWED';
    if (beforeSemicolon.includes(';')) return 'MULTI_STATEMENT_NOT_ALLOWED';
  }
  const normalized = trimmed.toUpperCase();
  if (!normalized.startsWith('SELECT')) return 'ONLY_SELECT_ALLOWED';
  // Block write/DDL/pragma keywords anywhere after SELECT.
  const writeKeywords = ['INSERT ', 'UPDATE ', 'DELETE ', 'DROP ', 'ALTER ', 'CREATE ', 'PRAGMA ', 'ATTACH ', 'DETACH '];
  for (const kw of writeKeywords) {
    if (normalized.includes(kw)) return 'UNSUPPORTED_STATEMENT';
  }
  return null;
}

// Extract the numeric LIMIT value from a SELECT statement.
// Returns null if no LIMIT clause is present.
function extractLimitValue(sql: string): number | null {
  const match = sql.match(/\bLIMIT\s+(\d+)\s*;?\s*$/i);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  return Number.isFinite(n) ? n : null;
}

// Enforce execution-level row budget: the D1 query must never read more rows
// than perShardLimit, regardless of what LIMIT the business SQL specifies.
function enforceLimit(sql: string, perShardLimit: number): string {
  const trimmed = sql.trim().replace(/;$/, '').trim();
  const existingLimit = extractLimitValue(trimmed);
  if (existingLimit === null) {
    // No LIMIT: append one.
    return `${trimmed} LIMIT ${perShardLimit}`;
  }
  if (existingLimit <= perShardLimit) {
    // Business LIMIT is within budget: trust it.
    return trimmed;
  }
  // Business LIMIT exceeds budget: replace with perShardLimit.
  return trimmed.replace(/\bLIMIT\s+\d+\s*$/i, `LIMIT ${perShardLimit}`);
}

export default {
  async fetch(request: Request, env: Env) {
    const requestId = request.headers.get('x-request-id')?.slice(0, 128) || crypto.randomUUID();
    try {
      const url = new URL(request.url);

      if (request.method === 'GET' && url.pathname === '/health') {
        const ready = Array.from({ length: PHYSICAL_SHARD_COUNT }, (_, i) => i + 1).every((n) => !!env[`SHARD_${String(n).padStart(2, '0')}` as keyof Env]);
        return json({
          status: ready ? 'READY' : 'NOT_READY',
          service: 'd1-fabric-w03-query-engine',
          version: '0.3.0',
          shards_bound: ready ? PHYSICAL_SHARD_COUNT : 0,
        }, ready ? 200 : 503, requestId);
      }

      if (request.method === 'POST' && url.pathname === '/v1/query/plan') {
        const body = await request.json() as {
          tenant_id?: string;
          sql?: string;
          shard_ids?: number[];
          deadline_ms?: number;
          max_rows?: number;
          params?: (string | number | null)[];
        };
        if (!body.tenant_id || !body.sql) return json({ code: 'INVALID_ARGUMENT' }, 400, requestId);
        const sql = body.sql;
        if (sql.length > 16000) return json({ code: 'PAYLOAD_TOO_LARGE' }, 413, requestId);
        const unsafe = rejectUnsafeRead(sql);
        if (unsafe) return json({ code: unsafe }, 400, requestId);

        const shardIds = [...new Set((body.shard_ids ?? [0]).filter((id) => Number.isInteger(id) && id >= 0 && id < LOGICAL_SHARD_COUNT))];
        if (shardIds.length === 0) return json({ code: 'INVALID_SHARD_SET' }, 400, requestId);
        const maxFanout = bounded(env.MAX_FANOUT, 8, 64);
        const maxParallelism = bounded(env.MAX_PARALLELISM, 4, 32);
        // Global row budget: never exceeds MAX_ROWS_GLOBAL, regardless of fanout.
        const globalMaxRows = Math.min(bounded(body.max_rows ?? env.MAX_ROWS, 1000, 100000), MAX_ROWS_GLOBAL);
        if (shardIds.length > maxFanout) return json({ code: 'FANOUT_BUDGET_EXCEEDED', max_fanout: maxFanout }, 429, requestId);

        const missing = shardIds.find((id) => !dbForShard(env, id));
        if (missing !== undefined) return json({ code: 'SHARD_NOT_READY', shard_id: missing }, 503, requestId);

        // Per-shard D1 read budget: deterministic split guarantees sum(budgets) <= globalMaxRows.
        // ceil() is deliberately avoided because it overshoots (e.g. 1000/3 -> 334*3 = 1002).
        const shardBudgets = allocateShardBudgets(shardIds.length, globalMaxRows);
        const budgetByShard = new Map<number, number>(shardIds.map((id, i) => [id, shardBudgets[i]]));
        const params = body.params ?? [];
        const deadlineMs = Math.max(1, Math.min(10000, Number(body.deadline_ms ?? 10000)));
        const started = Date.now();
        const run = async (shardId: number) => {
          if (Date.now() - started >= deadlineMs) throw new Error('TIMEOUT');
          const db = dbForShard(env, shardId);
          if (!db) throw new Error('SHARD_NOT_READY');
          const limit = budgetByShard.get(shardId) ?? 0;
          const execSql = enforceLimit(sql, limit);
          const stmt = db.prepare(execSql);
          const result = params.length > 0 ? await stmt.bind(...params).all() : await stmt.bind().all();
          return { shard_id: shardId, results: result.results, success: true };
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

        // Global cap: total rows across all shards must not exceed globalMaxRows.
        const allRows: unknown[] = [];
        for (const r of results) {
          for (const row of r.results) {
            if (allRows.length >= globalMaxRows) break;
            allRows.push(row);
          }
        }
        const truncated = results.some((r) => r.results.length > 0) && allRows.length >= globalMaxRows;

        return json({
          plan_id: crypto.randomUUID(),
          tenant_id: body.tenant_id,
          operation: 'READ',
          shards: shardIds,
          fanout: shardIds.length,
          parallelism,
          max_rows: globalMaxRows,
          per_shard_limits: shardBudgets,
          budget_sum: shardBudgets.reduce((a, b) => a + b, 0),
          total_rows: allRows.length,
          truncated,
          deadline_ms: deadlineMs,
          execution: 'D1_EXECUTED',
          results,
          rows: allRows,
        }, 200, requestId);
      }

      return json({ code: 'NOT_FOUND' }, 404, requestId);
    } catch {
      return json({ code: 'INTERNAL_ERROR' }, 500, requestId);
    }
  },
};
