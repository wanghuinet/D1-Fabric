import { executeWrite, WriteError, type WriteRequest } from "./write.ts";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

export interface W03Env { DB: D1DatabaseLike; }
interface D1PreparedStatementLike { bind(...values: unknown[]): D1PreparedStatementLike; first<T = unknown>(): Promise<T | null>; }
interface D1DatabaseLike { prepare(sql: string): D1PreparedStatementLike; batch<T = unknown>(statements: readonly D1PreparedStatementLike[]): Promise<T[]>; }

function response(body: unknown, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS }); }

export default {
  async fetch(request: Request, env: W03Env): Promise<Response> {
    if (request.method !== "POST") return response({ error: "METHOD_NOT_ALLOWED" }, 405);
    let body: unknown;
    try { body = await request.json(); } catch { return response({ error: "INVALID_REQUEST" }, 400); }
    if (body === null || typeof body !== "object" || Array.isArray(body)) return response({ error: "INVALID_REQUEST" }, 400);
    try {
      const result = await executeWrite(env.DB, body as WriteRequest);
      const status = result.status === "COMMITTED" || result.status === "REPLAYED" ? 200 : result.status === "IN_FLIGHT" ? 409 : 400;
      return response(result, status);
    } catch (error) {
      if (error instanceof WriteError) return response({ error: error.code }, error.code === "DEADLINE_EXCEEDED" ? 408 : 400);
      return response({ error: "WRITE_FAILED" }, 500);
    }
  },
};

export { executeWrite, WriteError } from "./write.ts";
