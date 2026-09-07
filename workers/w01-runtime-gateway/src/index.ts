interface Env { VERSION?: string; }

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
        return json({ status: 'READY', service: 'd1-fabric-w01-runtime-gateway', version: env.VERSION ?? '0.1.0', budget: { ...DEFAULT_BUDGET, deadlineMs: deadline(request) }, capabilities: { d1: false, routing: false, query: false, write: false, cache: false, ai: false } }, 200, rid);
      }
      if (request.method === 'POST' && url.pathname === '/v1/execute') {
        const raw = await request.text();
        if (new TextEncoder().encode(raw).byteLength > DEFAULT_BUDGET.maxPayloadBytes) return json({ code: 'PAYLOAD_TOO_LARGE' }, 413, rid);
        return json({ code: 'EXECUTION_NOT_READY', message: 'Execution modules are not attached to W01.' }, 501, rid);
      }
      return json({ code: 'NOT_FOUND' }, 404, rid);
    } catch (error) {
      return json({ code: error instanceof Error ? error.message : 'INTERNAL_ERROR' }, 500, rid);
    }
  },
};
