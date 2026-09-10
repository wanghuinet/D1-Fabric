import {
  executeWrite,
  WriteExecutionError,
  type D1DatabaseLike,
  type WriteIdentity,
  type WriteOperation,
} from "./write.ts";

interface ServiceBinding { fetch(request: Request): Promise<Response> }
interface Env { DB: D1DatabaseLike; W04?: ServiceBinding }

const MAX_BODY_BYTES = 1024 * 1024;

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function errorResponse(error: WriteExecutionError): Response {
  const status = error.code === "D1_EXECUTION_FAILED" || error.code === "COMMIT_UNKNOWN" ? 502 :
    error.code === "DEADLINE_EXCEEDED" || error.code === "CANCELLED" ? 408 :
    error.code === "BUDGET_EXCEEDED" ? 429 : 400;
  return json({ status: "ERROR", code: error.code, message: error.message }, status);
}

async function parseBody(request: Request): Promise<{ identity: WriteIdentity; operation: WriteOperation }> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new WriteExecutionError("INVALID_REQUEST", "content-type must be application/json");
  }
  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) throw new WriteExecutionError("INVALID_REQUEST", "request body exceeds 1 MiB");
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) throw new WriteExecutionError("INVALID_REQUEST", "request body exceeds 1 MiB");
  let body: unknown;
  try { body = JSON.parse(text); } catch { throw new WriteExecutionError("INVALID_REQUEST", "request body must be valid JSON"); }
  if (body === null || typeof body !== "object") throw new WriteExecutionError("INVALID_REQUEST", "request body must be an object");
  const record = body as Record<string, unknown>;
  if (!record.identity || !record.operation) throw new WriteExecutionError("INVALID_REQUEST", "identity and operation are required");
  return { identity: record.identity as WriteIdentity, operation: record.operation as WriteOperation };
}

async function assertControlEpoch(identity: WriteIdentity, binding?: ServiceBinding): Promise<void> {
  if (!binding) return;
  const response = await binding.fetch(new Request(`https://w04/v1/control/epoch?epoch=${identity.executionEpoch}`));
  if (response.ok) return;
  if (response.status === 409) {
    const body = await response.json().catch(() => ({})) as { code?: string; message?: string };
    throw new WriteExecutionError("STALE_EXECUTION_EPOCH", body.message ?? "execution epoch is not active");
  }
  throw new WriteExecutionError("D1_EXECUTION_FAILED", "control-plane validation failed");
}

export async function handleWrite(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ status: "ERROR", code: "INVALID_REQUEST", message: "POST required" }, 405);
  try {
    const { identity, operation } = await parseBody(request);
    await assertControlEpoch(identity, env.W04);
    const result = await executeWrite(env.DB, identity, operation, request.signal);
    const response = json(result, 200);
    response.headers.set("x-request-id", identity.requestId);
    response.headers.set("x-d1f-contract-version", identity.contractVersion);
    response.headers.set("x-d1f-logical-target", identity.logicalTargetId);
    return response;
  } catch (error) {
    if (error instanceof WriteExecutionError) return errorResponse(error);
    return json({ status: "ERROR", code: "D1_EXECUTION_FAILED", message: "write execution failed" }, 502);
  }
}

export default { fetch: handleWrite };
export { executeWrite };
