interface Env {
  VERSION?: string;
  ROUTER: Fetcher;
  QUERY: Fetcher;
  WRITE: Fetcher;
}

interface ExecuteRequest {
  tenant_id?: string;
  namespace?: string;
  operation?: 'READ' | 'WRITE';
  routing_key?: string;
  routing_epoch?: number;
  deadline_ms?: number;
  idempotency_key?: string;
  sql?: string;
  max_rows?: number;
  op?: 'INSERT' | 'UPDATE' | 'DELETE';
  record_key?: string;
  payload_json?: string;
}

const DEFAULT_BUDGET = {
  deadlineMs: 10000,
  maxQueries: 0,
  maxRowsRead: 0,
  maxRowsWritten: 0,
  maxShards: 0,
  maxParallelism: 1,
  maxRetries: 0,
  maxPayloadBytes: 65536,
  maxMemoryMb: 16,
};

function requestId(request: Request): string {
  const supplied = request.headers.get('x-request-id');
  return supplied && supplied.length <= 128 ? supplied : crypto.randomUUID();
}

function json(body: unknown, status: number, rid: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'x-request-id': rid },
  });
}

function deadline(request: Request): number {
  const value = Number(request.headers.get('x-d1f-deadline-ms') ?? DEFAULT_BUDGET.deadlineMs);
  return Number.isFinite(value) ? Math.max(1, Math.min(10000, value)) : DEFAULT_BUDGET.deadlineMs;
}

function validText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const rid = requestId(request);
    try {
      const url = new URL(request.url);
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,POST,OPTIONS',
          'access-control-allow-headers': 'content-type,x-request-id,x-d1f-deadline-ms',
          'x-request-id': rid,
        }});
      }
      if (request.method === 'GET' && url.pathname === '/health') {
        return json({ status: 'READY', service: 'd1-fabric-w01-runtime-gateway', version: env.VERSION ?? '0.1.0', request_id: rid }, 200, rid);
      }
      if (request.method === 'GET' && url.pathname === '/v1/runtime') {
        return json({ status: 'READY', service: 'd1-fabric-w01-runtime-gateway', version: env.VERSION ?? '0.1.0', budget: { ...DEFAULT_BUDGET, deadlineMs: deadline(request) }, capabilities: { d1: false, routing: true, query: true, write: true, cache: false, ai: false } }, 200, rid);
      }
      if (request.method === 'POST' && url.pathname === '/v1/execute') {
        const raw = await request.text();
        if (new TextEncoder().encode(raw).byteLength > DEFAULT_BUDGET.maxPayloadBytes) return json({ code: 'PAYLOAD_TOO_LARGE' }, 413, rid);
        let body: ExecuteRequest;
        try { body = JSON.parse(raw) as ExecuteRequest; } catch { return json({ code: 'INVALID_JSON' }, 400, rid); }

        if (!validText(body.tenant_id, 256)) return json({ code: 'INVALID_ARGUMENT', field: 'tenant_id' }, 400, rid);
        if (!validText(body.namespace, 256)) return json({ code: 'INVALID_ARGUMENT', field: 'namespace' }, 400, rid);
        if (!validText(body.routing_key, 512)) return json({ code: 'INVALID_ARGUMENT', field: 'routing_key' }, 400, rid);
        if (body.operation !== 'READ' && body.operation !== 'WRITE') return json({ code: 'INVALID_OPERATION' }, 400, rid);

        // Route once through W02 (authoritative routing source).
        const routeResp = await env.ROUTER.fetch('https://router.internal/v1/route', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-request-id': rid },
          body: JSON.stringify({
            tenant_id: body.tenant_id,
            namespace: body.namespace,
            routing_key: body.routing_key,
            expected_epoch: Number.isInteger(body.routing_epoch) ? body.routing_epoch : undefined,
          }),
        });
        if (!routeResp.ok) return routeResp;

        const route = await routeResp.json() as { shard_id?: number };
        if (!Number.isInteger(route.shard_id)) return json({ code: 'ROUTING_RESULT_INVALID' }, 502, rid);

        if (body.operation === 'READ') {
          if (!validText(body.sql, 16000)) return json({ code: 'INVALID_ARGUMENT', field: 'sql' }, 400, rid);
          return env.QUERY.fetch('https://query.internal/v1/query/plan', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-request-id': rid },
            body: JSON.stringify({
              tenant_id: body.tenant_id,
              sql: body.sql,
              shard_ids: [route.shard_id],
              deadline_ms: Number.isInteger(body.deadline_ms) ? body.deadline_ms : deadline(request),
              max_rows: Number.isInteger(body.max_rows) ? body.max_rows : undefined,
            }),
          });
        }

        if (!body.op || !['INSERT', 'UPDATE', 'DELETE'].includes(body.op)) return json({ code: 'INVALID_OPERATION' }, 400, rid);
        if (!validText(body.record_key, 512)) return json({ code: 'INVALID_ARGUMENT', field: 'record_key' }, 400, rid);
        if (!validText(body.idempotency_key, 128)) return json({ code: 'INVALID_ARGUMENT', field: 'idempotency_key' }, 400, rid);
        if (body.op !== 'DELETE' && !validText(body.payload_json, 1000000)) return json({ code: 'INVALID_ARGUMENT', field: 'payload_json' }, 400, rid);
        return env.WRITE.fetch('https://write.internal/v1/write', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-request-id': rid },
          body: JSON.stringify({
            tenant_id: body.tenant_id,
            namespace: body.namespace,
            record_key: body.record_key,
            shard_id: route.shard_id,
            op: body.op,
            idempotency_key: body.idempotency_key,
            payload_json: body.payload_json,
          }),
        });
      }
      return json({ code: 'NOT_FOUND' }, 404, rid);
    } catch (error) {
      return json({ code: error instanceof Error ? error.message : 'INTERNAL_ERROR' }, 500, rid);
    }
  },
};