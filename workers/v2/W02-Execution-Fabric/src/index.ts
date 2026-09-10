import { compileExecutionPlan, PlanCompileError, type ExecutionRequest, type VersionedExecutionContract } from "./plan.ts";

export interface ServiceBinding {
  fetch(input: Request): Promise<Response>;
}

interface Env {
  W03?: ServiceBinding;
}

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const MAX_BODY_BYTES = 1_048_576;

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isWritePayload(value: unknown): value is {
  write: {
    logicalTargetId: string;
    executionEpoch: number;
    operation: Record<string, unknown>;
  };
} {
  if (!isPlainRecord(value) || !isPlainRecord(value.write)) return false;
  const write = value.write;
  return typeof write.logicalTargetId === "string" && write.logicalTargetId.length > 0 &&
    Number.isSafeInteger(write.executionEpoch) && (write.executionEpoch as number) > 0 &&
    isPlainRecord(write.operation);
}

function toWriteRequest(
  executionRequest: ExecutionRequest,
  contract: VersionedExecutionContract,
  plan: ReturnType<typeof compileExecutionPlan>,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const write = (payload.write as Record<string, unknown>);
  return {
    identity: {
      requestId: plan.requestId,
      planId: plan.planId,
      contractId: plan.contractId,
      contractVersion: plan.contractVersion,
      architectureId: plan.architectureId,
      tenantId: plan.tenantId,
      principalScope: plan.principalScope,
      operation: plan.operation,
      operationVersion: plan.operationVersion,
      logicalTargetId: write.logicalTargetId,
      executionEpoch: write.executionEpoch,
      deadlineAt: plan.deadlineAt,
      budget: {
        d1Statements: executionRequest.budget.d1Statements,
        rowsWritten: executionRequest.budget.rowsWritten,
        payloadBytes: executionRequest.budget.payloadBytes,
        retries: executionRequest.budget.retries,
      },
    },
    operation: write.operation,
    contract: { contractId: contract.contractId, contractVersion: contract.contractVersion },
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
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
    if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) return response({ error: "PAYLOAD_TOO_LARGE" }, 413);

    let parsed: unknown;
    try { parsed = JSON.parse(body); } catch { return response({ error: "INVALID_REQUEST" }, 400); }
    if (!isPlainRecord(parsed)) return response({ error: "INVALID_REQUEST" }, 400);

    const { request: executionRequest, contract } = parsed as Partial<{
      request: ExecutionRequest;
      contract: VersionedExecutionContract;
    }>;
    try {
      const plan = compileExecutionPlan(executionRequest as ExecutionRequest, contract as VersionedExecutionContract);
      if (plan.mode !== "WRITE") return response({ status: "COMPILED", plan });
      if (!isWritePayload(executionRequest?.payload)) return response({ error: "INVALID_REQUEST" }, 400);
      if (!env?.W03 || typeof env.W03.fetch !== "function") return response({ error: "W03_UNAVAILABLE" }, 503);
      const writeRequest = toWriteRequest(executionRequest, contract as VersionedExecutionContract, plan, executionRequest.payload as Record<string, unknown>);
      const upstream = await env.W03.fetch(new Request(new URL("/", request.url), {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8", "x-d1f-request-id": plan.requestId, "x-d1f-deadline-at": String(plan.deadlineAt) },
        body: JSON.stringify(writeRequest),
      }));
      return new Response(upstream.body, { status: upstream.status, headers: upstream.headers });
    } catch (error) {
      if (error instanceof PlanCompileError) return response({ error: error.code }, 400);
      if (error instanceof TypeError) return response({ error: "INVALID_REQUEST" }, 400);
      return response({ error: "W03_UNAVAILABLE" }, 503);
    }
  },
};

export { compileExecutionPlan } from "./plan.ts";
