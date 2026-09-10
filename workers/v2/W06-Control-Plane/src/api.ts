import { planExpansion, type ExpansionRequest } from "./expansion.ts";
import { planMigration, type MigrationPlanRequest } from "./migration.ts";
import { planRebalance, type RebalanceRequest } from "./rebalance.ts";
import { D1AuthoritativeMetadataStore, type D1DatabaseLike } from "./authoritative-store.ts";
import type { PlacementRequest, ShardMetadata } from "./placement.ts";

export const MAX_BODY_BYTES = 1_048_576;
export type W06ApiErrorCode = "INVALID_REQUEST" | "PAYLOAD_TOO_LARGE" | "UNSUPPORTED_MEDIA_TYPE" | "NOT_FOUND" | "AUTHORITATIVE_METADATA_UNAVAILABLE";

export class W06ApiError extends Error {
  readonly code: W06ApiErrorCode;
  readonly status: number;
  constructor(code: W06ApiErrorCode, message: string, status: number) { super(message); this.name = "W06ApiError"; this.code = code; this.status = status; }
}

interface W06Env { DB?: D1DatabaseLike }
function isRecord(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
function requireRecord(value: unknown, field: string): Record<string, unknown> { if (!isRecord(value)) throw new W06ApiError("INVALID_REQUEST", `${field} must be an object`, 400); return value; }

async function readJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json(?:\s*;|\s*$)/i.test(contentType)) throw new W06ApiError("UNSUPPORTED_MEDIA_TYPE", "content-type must be application/json", 415);
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const length = Number(declaredLength);
    if (!Number.isSafeInteger(length) || length < 0) throw new W06ApiError("INVALID_REQUEST", "invalid content-length", 400);
    if (length > MAX_BODY_BYTES) throw new W06ApiError("PAYLOAD_TOO_LARGE", "request body exceeds 1 MiB", 413);
  }
  let text: string;
  try { text = await request.text(); } catch { throw new W06ApiError("INVALID_REQUEST", "request body could not be read", 400); }
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) throw new W06ApiError("PAYLOAD_TOO_LARGE", "request body exceeds 1 MiB", 413);
  try { return JSON.parse(text); } catch { throw new W06ApiError("INVALID_REQUEST", "request body must be valid JSON", 400); }
}

function json(value: unknown, status = 200): Response { return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json; charset=utf-8" } }); }
function errorResponse(error: unknown): Response {
  if (error instanceof W06ApiError) return json({ status: "ERROR", code: error.code, message: error.message }, error.status);
  if (error instanceof Error) {
    const code = (error as unknown as { code?: unknown }).code;
    if (code === "AUTHORITATIVE_METADATA_UNAVAILABLE") return json({ status: "ERROR", code, message: error.message }, 503);
    if (typeof code === "string") return json({ status: "ERROR", code, message: error.message }, 400);
  }
  return json({ status: "ERROR", code: "CONTROL_PLANE_FAILURE", message: "control-plane operation failed" }, 500);
}
function requireAuthoritativeCapacityState(metadata: readonly ShardMetadata[]): void {
  for (const entry of metadata) if (!isRecord(entry) || (entry.capacityState !== "ADMITTED" && entry.capacityState !== "BLOCKED")) throw new W06ApiError("INVALID_REQUEST", "placement metadata must include an authoritative capacityState", 400);
}

export async function handleW06(request: Request, env: W06Env = {}): Promise<Response> {
  const pathname = new URL(request.url).pathname;
  if (request.method === "GET" && pathname === "/health") return json({ status: "ok" });
  if (request.method === "GET" && pathname === "/ready") return json({ status: "ready" });
  if (request.method !== "POST") return json({ status: "ERROR", code: "METHOD_NOT_ALLOWED", message: "POST required" }, 405);
  try {
    const body = requireRecord(await readJson(request), "request body");
    switch (pathname) {
      case "/v1/placement/resolve": {
        const requestBody = requireRecord(body.request, "request") as unknown as PlacementRequest;
        if (body.metadata !== undefined) {
          if (!Array.isArray(body.metadata)) throw new W06ApiError("INVALID_REQUEST", "metadata must be an array", 400);
          requireAuthoritativeCapacityState(body.metadata as ShardMetadata[]);
          throw new W06ApiError("INVALID_REQUEST", "caller-supplied placement metadata is forbidden", 400);
        }
        if (!env.DB) throw new W06ApiError("AUTHORITATIVE_METADATA_UNAVAILABLE", "authoritative metadata store is not configured", 503);
        const result = await new D1AuthoritativeMetadataStore(env.DB).resolve(requestBody);
        return json({ status: "RESOLVED", result });
      }
      case "/v1/expansion/plan": return json({ status: "PLANNED", plan: await planExpansion(body as unknown as ExpansionRequest) });
      case "/v1/migration/plan": return json({ status: "PLANNED", plan: await planMigration(body as unknown as MigrationPlanRequest) });
      case "/v1/rebalance/plan": return json({ status: "PLANNED", plan: await planRebalance(body as unknown as RebalanceRequest) });
      default: return json({ status: "ERROR", code: "NOT_FOUND", message: "control-plane route not found" }, 404);
    }
  } catch (error) { return errorResponse(error); }
}
