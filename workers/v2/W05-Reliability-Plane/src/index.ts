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

const SERVICE = "d1-fabric-w05-reliability-plane";

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({ service: SERVICE, status: "ok" });
    }

    if (request.method === "GET" && url.pathname === "/ready") {
      return Response.json({ service: SERVICE, ready: true });
    }

    return Response.json(
      {
        error: "NOT_FOUND",
        service: SERVICE,
      },
      { status: 404 },
    );
  },
};
