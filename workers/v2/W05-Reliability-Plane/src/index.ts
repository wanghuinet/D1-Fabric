import {
  executeReliably,
  classifyFailure,
  retryDelayMs,
  RetryBudget,
  CircuitBreaker,
  ReliabilityError,
  type ExecuteOptions,
  type ReliabilityPolicy,
  type OperationDescriptor,
} from "./reliability.ts";

export {
  executeReliably,
  classifyFailure,
  retryDelayMs,
  RetryBudget,
  CircuitBreaker,
  ReliabilityError,
};
export type { ExecuteOptions, ReliabilityPolicy, OperationDescriptor };

interface ServiceBinding {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  W03?: ServiceBinding;
}

const SERVICE = "d1-fabric-w05-reliability-plane";
const MAX_BODY_BYTES = 1_048_576;
const MAX_ATTEMPTS = 4;
const MAX_TIMEOUT_MS = 10_000;

const retryBudget = new RetryBudget({ capacity: 8, refillRate: 1 }, () => Date.now());
const circuitBreaker = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 5_000, halfOpenMaxProbes: 1 });

class RetryableUpstreamFailure extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`retryable upstream response: ${status}`);
    this.name = "RetryableUpstreamFailure";
    this.status = status;
  }
}

function errorResponse(error: ReliabilityError): Response {
  const status = error.code === "TIMEOUT" || error.failure.class === "timeout" ? 408 :
    error.code === "RETRY_RATE_LIMITED" ? 429 :
    error.code === "CIRCUIT_OPEN" ? 503 : 502;
  return Response.json(
    { status: "ERROR", code: error.code, attempts: error.attempts },
    { status },
  );
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function readBoundedJson(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json(?:\s*;|\s*$)/i.test(contentType)) throw new ReliabilityError("INVALID_REQUEST", "content-type must be application/json", { class: "permanent", retryable: false });
  const declared = request.headers.get("content-length");
  if (declared !== null) {
    const length = Number(declared);
    if (!Number.isSafeInteger(length) || length < 0) throw new ReliabilityError("INVALID_REQUEST", "content-length is invalid", { class: "permanent", retryable: false });
    if (length > MAX_BODY_BYTES) throw new ReliabilityError("PAYLOAD_TOO_LARGE", "request body exceeds 1 MiB", { class: "permanent", retryable: false });
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) throw new ReliabilityError("PAYLOAD_TOO_LARGE", "request body exceeds 1 MiB", { class: "permanent", retryable: false });
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new ReliabilityError("INVALID_REQUEST", "request body must be valid JSON", { class: "permanent", retryable: false }); }
  if (!record(parsed)) throw new ReliabilityError("INVALID_REQUEST", "request body must be an object", { class: "permanent", retryable: false });
  return parsed;
}

function writeOperation(body: Record<string, unknown>): { identity: Record<string, unknown>; operation: Record<string, unknown> } {
  if (!record(body.identity) || !record(body.operation)) {
    throw new ReliabilityError("INVALID_REQUEST", "identity and operation are required", { class: "permanent", retryable: false });
  }
  const identity = body.identity;
  const operation = body.operation;
  if (
    typeof identity.requestId !== "string" ||
    typeof identity.logicalTargetId !== "string" ||
    !Number.isSafeInteger(identity.deadlineAt) ||
    identity.deadlineAt <= Date.now()
  ) {
    throw new ReliabilityError("INVALID_REQUEST", "identity deadline or target is invalid", { class: "permanent", retryable: false });
  }
  if (typeof operation.retryable !== "boolean") {
    throw new ReliabilityError("INVALID_REQUEST", "operation retryability is required", { class: "permanent", retryable: false });
  }
  return { identity, operation };
}

function reliabilityPolicy(identity: Record<string, unknown>): ReliabilityPolicy {
  const remaining = Number(identity.deadlineAt) - Date.now();
  if (!Number.isFinite(remaining) || remaining <= 0) {
    throw new ReliabilityError("TIMEOUT", "request deadline has expired", { class: "timeout", retryable: false });
  }
  const retries = typeof identity.budget === "object" && identity.budget !== null && !Array.isArray(identity.budget) &&
    Number.isSafeInteger((identity.budget as Record<string, unknown>).retries) &&
    Number((identity.budget as Record<string, unknown>).retries) >= 0
    ? Number((identity.budget as Record<string, unknown>).retries)
    : 0;
  return {
    retry: {
      maxAttempts: Math.min(MAX_ATTEMPTS, retries + 1),
      maxElapsedMs: remaining,
      baseDelayMs: 25,
      maxDelayMs: Math.min(500, remaining),
      jitterRatio: 0.2,
      retryWrites: true,
    },
    retryBudget: { capacity: 8, refillRate: 1 },
    timeout: { timeoutMs: Math.min(MAX_TIMEOUT_MS, remaining) },
    circuit: { failureThreshold: 3, resetTimeoutMs: 5_000, halfOpenMaxProbes: 1 },
  };
}

async function forwardWithReliability(
  request: Request,
  body: Record<string, unknown>,
  env: Env,
): Promise<Response> {
  if (!env.W03 || typeof env.W03.fetch !== "function") {
    return Response.json({ error: "W03_UNAVAILABLE" }, { status: 503 });
  }

  const { identity, operation } = writeOperation(body);
  const descriptor: OperationDescriptor = {
    kind: "write",
    idempotent: operation.retryable === true,
    target: identity.logicalTargetId as string,
  };
  const policy = reliabilityPolicy(identity);
  const upstreamRequest = new Request(new URL("/", request.url), {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8", "x-d1f-request-id": identity.requestId as string },
    body: JSON.stringify(body),
  });

  try {
    const result = await executeReliably(
      async (signal) => {
        const upstream = await env.W03!.fetch(new Request(upstreamRequest, { signal }));
        if (upstream.status === 408 || upstream.status === 425 || upstream.status === 429 || upstream.status >= 500) {
          throw new RetryableUpstreamFailure(upstream.status);
        }
        return upstream;
      },
      { policy, operation: descriptor, breaker: circuitBreaker, retryBudget },
    );
    return result;
  } catch (error) {
    if (error instanceof ReliabilityError) return errorResponse(error);
    if (error instanceof RetryableUpstreamFailure) {
      return Response.json({ status: "ERROR", code: "UPSTREAM_UNAVAILABLE", attempts: policy.retry.maxAttempts }, { status: 503 });
    }
    return Response.json({ status: "ERROR", code: "UPSTREAM_UNAVAILABLE" }, { status: 503 });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({ service: SERVICE, status: "ok" });
    }

    if (request.method === "GET" && url.pathname === "/ready") {
      return Response.json({ service: SERVICE, ready: Boolean(env?.W03) });
    }

    if (request.method === "POST" && url.pathname === "/v1/execute") {
      try {
        const body = await readBoundedJson(request);
        return await forwardWithReliability(request, body, env);
      } catch (error) {
        if (error instanceof ReliabilityError) return errorResponse(error);
        return Response.json({ status: "ERROR", code: "INVALID_REQUEST" }, { status: 400 });
      }
    }

    return Response.json({ error: "NOT_FOUND", service: SERVICE }, { status: 404 });
  },
};
