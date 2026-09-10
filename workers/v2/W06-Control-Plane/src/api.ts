import { planExpansion, type ExpansionRequest } from "./expansion.ts";
import { planMigration, type MigrationPlanRequest } from "./migration.ts";
import { planRebalance, type RebalanceRequest } from "./rebalance.ts";
import { resolvePlacement, type PlacementRequest, type ShardMetadata } from "./placement.ts";

export const MAX_BODY_BYTES = 1_048_576;

export type W06ApiErrorCode =
  | "INVALID_REQUEST"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "NOT_FOUND"
  | "CONTROL_PLANE_FAILURE";

export class W06ApiError extends Error {
  readonly code: W06ApiErrorCode;
  readonly status: number;

  constructor(code: W06ApiErrorCode, message: string, status: number) {
    super(message);
    this.name = "W06ApiError";
    this.code = code;
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function readJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json(?:\s*;|\s*$)/i.test(contentType)) {
    throw new W06ApiError("UNSUPPORTED_MEDIA_TYPE", "content-type must be application/json", 415);
  }

  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const length = Number(declaredLength);
    if (!Number.isSafeInteger(length) || length < 0) {
      throw new W06ApiError("INVALID_REQUEST", "invalid content-length", 400);
    }
    if (length > MAX_BODY_BYTES) {
      throw new W06ApiError("PAYLOAD_TOO_LARGE", "request body exceeds 1 MiB", 413);
    }
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw new W06ApiError("PAYLOAD_TOO_LARGE", "request body exceeds 1 MiB", 413);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new W06ApiError("INVALID_REQUEST", "request body must be valid JSON", 400);
  }
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function errorResponse(error: unknown): Response {
  if (error instanceof W06ApiError) return json({ status: "ERROR", code: error.code, message: error.message }, error.status);

  if (error && typeof error === "object" && "code" in error && error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return json({ status: "ERROR", code, message: error.message }, 400);
  }

  return json({ status: "ERROR", code: "CONTROL_PLANE_FAILURE", message: "control-plane operation failed" }, 500);
}

export async function handleW06(request: Request): Promise<Response> {
  if (request.method === "GET" && new URL(request.url).pathname === "/health") return json({ status: "ok" });
  if (request.method === "GET" && new URL(request.url).pathname === "/ready") return json({ status: "ready" });
  if (request.method !== "POST") return json({ status: "ERROR", code: "METHOD_NOT_ALLOWED", message: "POST required" }, 405);

  const pathname = new URL(request.url).pathname;
  const body = await readJson(request);
  if (!isRecord(body)) throw new W06ApiError("INVALID_REQUEST", "request body must be an object", 400);

  try {
    switch (pathname) {
      case "/v1/placement/resolve": {
        const requestBody = body.request as PlacementRequest;
        const metadata = body.metadata;
        if (!Array.isArray(metadata)) throw new W06ApiError("INVALID_REQUEST", "metadata must be an array", 400);
        return json({ status: "RESOLVED", result: resolvePlacement(requestBody, metadata as ShardMetadata[]) });
      }
      case "/v1/expansion/plan":
        return json({ status: "PLANNED", plan: await planExpansion(body as unknown as ExpansionRequest) });
      case "/v1/migration/plan":
        return json({ status: "PLANNED", plan: await planMigration(body as unknown as MigrationPlanRequest) });
      case "/v1/rebalance/plan":
        return json({ status: "PLANNED", plan: await planRebalance(body as unknown as RebalanceRequest) });
      default:
        throw new W06ApiError("NOT_FOUND", "control-plane route not found", 404);
    }
  } catch (error) {
    return errorResponse(error);
  }
}
