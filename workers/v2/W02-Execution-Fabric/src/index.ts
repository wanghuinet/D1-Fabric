import { compileExecutionPlan, PlanCompileError, validateRoutingSelection, type ExecutionRequest, type VersionedExecutionContract, type RoutingSelection } from "./plan.ts";

export interface ServiceBinding {
  fetch(input: Request): Promise<Response>;
}

interface Env {
  W05?: ServiceBinding;
  W06?: ServiceBinding;
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
    logicalDatabaseId: string;
    logicalShardId: string;
    logicalTargetId: string;
    executionEpoch: number;
    topologyVersion: number;
    operation: Record<string, unknown>;
  };
} {
  if (!isPlainRecord(value) || !isPlainRecord(value.write)) return false;
  const write = value.write;
  return typeof write.logicalDatabaseId === "string" && write.logicalDatabaseId.length > 0 &&
    typeof write.logicalShardId === "string" && write.logicalShardId.length > 0 &&
    typeof write.logicalTargetId === "string" && write.logicalTargetId.length > 0 &&
    Number.isSafeInteger(write.executionEpoch) && (write.executionEpoch as number) > 0 &&
    Number.isSafeInteger(write.topologyVersion) && (write.topologyVersion as number) > 0 &&
    isPlainRecord(write.operation);
}

interface ParsedWritePayload {
  readonly logicalDatabaseId: string;
  readonly logicalShardId: string;
  readonly logicalTargetId: string;
  readonly executionEpoch: number;
  readonly topologyVersion: number;
  readonly operation: Record<string, unknown>;
}

function extractWritePayload(payload: Record<string, unknown>): ParsedWritePayload {
  if (!isWritePayload(payload)) throw new PlanCompileError("INVALID_REQUEST", "write payload must include logical database, logical shard, logical target, topologyVersion, and executionEpoch");
  return payload.write;
}

async function resolveAuthoritativePlacement(
  binding: ServiceBinding,
  write: ParsedWritePayload,
): Promise<RoutingSelection> {
  const upstream = await binding.fetch(new Request("https://w06/v1/placement/resolve", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      request: {
        logicalDatabaseId: write.logicalDatabaseId,
        logicalShardId: write.logicalShardId,
        topologyVersion: write.topologyVersion,
      },
    }),
  }));

  if (!upstream.ok) {
    if (upstream.status === 503) throw new Error("W06_UNAVAILABLE");
    throw new Error(`W06_ROUTING_FAILED:${upstream.status}`);
  }

  let body: unknown;
  try { body = await upstream.json(); } catch { throw new Error("W06_INVALID_RESPONSE"); }
  if (!isPlainRecord(body) || body.status !== "RESOLVED") throw new Error("W06_INVALID_RESPONSE");
  const result = (body as Record<string, unknown>).result;
  validateRoutingSelection(result);
  const route = result as RoutingSelection;
  if (route.logicalDatabaseId !== write.logicalDatabaseId || route.logicalShardId !== write.logicalShardId || route.topologyVersion !== write.topologyVersion) {
    throw new Error("W06_ROUTING_CONFLICT");
  }
  return Object.freeze(route);
}

function toWriteRequest(
  executionRequest: ExecutionRequest,
  contract: VersionedExecutionContract,
  plan: ReturnType<typeof compileExecutionPlan>,
  write: ParsedWritePayload,
  route: RoutingSelection,
): Record<string, unknown> {
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
      logicalDatabaseId: route.logicalDatabaseId,
      logicalShardId: route.logicalShardId,
      logicalTargetId: write.logicalTargetId,
      physicalShardId: route.physicalShardId,
      topologyVersion: route.topologyVersion,
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

async function parseRequestBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json(?:\s*;|\s*$)/i.test(contentType)) throw new TypeError("unsupported media type");

  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const parsedLength = Number(contentLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0 || parsedLength > MAX_BODY_BYTES) {
      throw new RangeError(parsedLength > MAX_BODY_BYTES ? "payload too large" : "invalid content length");
    }
  }

  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) throw new RangeError("payload too large");
  try {
    return JSON.parse(body);
  } catch {
    throw new SyntaxError("invalid json");
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") return response({ error: "METHOD_NOT_ALLOWED" }, 405);

    let parsed: unknown;
    try {
      parsed = await parseRequestBody(request);
    } catch (error) {
      if (error instanceof RangeError && error.message === "payload too large") return response({ error: "PAYLOAD_TOO_LARGE" }, 413);
      if (error instanceof TypeError && error.message === "unsupported media type") return response({ error: "UNSUPPORTED_MEDIA_TYPE" }, 415);
      return response({ error: "INVALID_REQUEST" }, 400);
    }

    if (!isPlainRecord(parsed)) return response({ error: "INVALID_REQUEST" }, 400);

    const { request: executionRequest, contract } = parsed as Partial<{
      request: ExecutionRequest;
      contract: VersionedExecutionContract;
    }>;

    try {
      const plan = compileExecutionPlan(executionRequest as ExecutionRequest, contract as VersionedExecutionContract);
      if (plan.mode !== "WRITE") return response({ status: "COMPILED", plan });
      const write = extractWritePayload(executionRequest?.payload as Record<string, unknown>);
      if (!env?.W06 || typeof env.W06.fetch !== "function") return response({ error: "W06_UNAVAILABLE" }, 503);
      if (!env?.W05 || typeof env.W05.fetch !== "function") return response({ error: "W05_UNAVAILABLE" }, 503);

      const route = await resolveAuthoritativePlacement(env.W06, write);
      const writeRequest = toWriteRequest(executionRequest, contract as VersionedExecutionContract, plan, write, route);
      const upstream = await env.W05.fetch(new Request(new URL("/v1/execute", request.url), {
        method: "POST",
        headers: {
          "content-type": "application/json; charset=utf-8",
          "x-d1f-request-id": plan.requestId,
          "x-d1f-deadline-at": String(plan.deadlineAt),
        },
        body: JSON.stringify(writeRequest),
      }));
      return new Response(upstream.body, { status: upstream.status, headers: upstream.headers });
    } catch (error) {
      if (error instanceof PlanCompileError) return response({ error: error.code }, 400);
      if (error instanceof TypeError || error instanceof RangeError || error instanceof SyntaxError) return response({ error: "INVALID_REQUEST" }, 400);
      if (error instanceof Error && error.message === "W06_UNAVAILABLE") return response({ error: "W06_UNAVAILABLE" }, 503);
      if (error instanceof Error && error.message.startsWith("W06_ROUTING_FAILED:")) return response({ error: "W06_ROUTING_FAILED" }, 502);
      if (error instanceof Error && ["W06_INVALID_RESPONSE", "W06_ROUTING_CONFLICT"].includes(error.message)) return response({ error: error.message }, 502);
      return response({ error: "W05_UNAVAILABLE" }, 503);
    }
  },
};

export { compileExecutionPlan } from "./plan.ts";
