import { compileExecutionPlan, PlanCompileError, type ExecutionRequest, type VersionedExecutionContract } from "./plan.ts";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const MAX_BODY_BYTES = 1_048_576;

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") return response({ error: "METHOD_NOT_ALLOWED" }, 405);
    const contentType = request.headers.get("content-type") ?? "";
    if (!/^application\/json(?:\s*;|\s*$)/i.test(contentType)) {
      return response({ error: "UNSUPPORTED_MEDIA_TYPE" }, 415);
    }

    const contentLength = request.headers.get("content-length");
    if (contentLength !== null) {
      const parsedLength = Number(contentLength);
      if (!Number.isSafeInteger(parsedLength) || parsedLength < 0 || parsedLength > MAX_BODY_BYTES) {
        return response({ error: parsedLength > MAX_BODY_BYTES ? "PAYLOAD_TOO_LARGE" : "INVALID_REQUEST" }, parsedLength > MAX_BODY_BYTES ? 413 : 400);
      }
    }

    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
      return response({ error: "PAYLOAD_TOO_LARGE" }, 413);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      return response({ error: "INVALID_REQUEST" }, 400);
    }
    if (!isPlainRecord(parsed)) return response({ error: "INVALID_REQUEST" }, 400);

    const { request: executionRequest, contract } = parsed as Partial<{
      request: ExecutionRequest;
      contract: VersionedExecutionContract;
    }>;
    try {
      const plan = compileExecutionPlan(executionRequest as ExecutionRequest, contract as VersionedExecutionContract);
      return response({ status: "COMPILED", plan });
    } catch (error) {
      if (error instanceof PlanCompileError) return response({ error: error.code }, 400);
      return response({ error: "INVALID_REQUEST" }, 400);
    }
  },
};

export { compileExecutionPlan } from "./plan.ts";
