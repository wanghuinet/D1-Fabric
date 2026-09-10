import {
  assertWriteEpoch,
  ControlPlaneError,
  getLkg,
  MAX_BODY_BYTES,
  publishSnapshot,
  type ControlSnapshot,
} from "./control.ts";
import { D1ControlStore, type D1DatabaseLike } from "./store.ts";

interface Env {
  CONTROL_DB?: D1DatabaseLike;
  CONTROL_PLANE_ADMIN_TOKEN?: string;
}

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const ADMIN_AUTH_HEADER = "authorization";

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: JSON_HEADERS });
}

function errorResponse(error: unknown): Response {
  if (error instanceof ControlPlaneError) {
    const status = error.code === "UNAUTHORIZED" ? 401 :
      error.code === "CONTROL_PLANE_NOT_CONFIGURED" ? 503 :
      error.code.startsWith("STALE_") || error.code.includes("EPOCH") || error.code === "REVOKED_CONTROL_EPOCH" ? 409 :
      error.code === "NO_VALID_LKG" ? 503 : 400;
    return json({ status: "ERROR", code: error.code, message: error.message }, status);
  }
  return json({ status: "ERROR", code: "CONTROL_PLANE_FAILURE", message: "control-plane operation failed" }, 500);
}

function requireDb(env: Env): D1ControlStore {
  if (!env.CONTROL_DB) throw new ControlPlaneError("CONTROL_PLANE_NOT_CONFIGURED", "CONTROL_DB binding is required");
  return new D1ControlStore(env.CONTROL_DB);
}

function requireAdmin(request: Request, env: Env): void {
  const expected = env.CONTROL_PLANE_ADMIN_TOKEN;
  if (!expected) throw new ControlPlaneError("CONTROL_PLANE_NOT_CONFIGURED", "CONTROL_PLANE_ADMIN_TOKEN is required for mutating control-plane operations");

  const authorization = request.headers.get(ADMIN_AUTH_HEADER) ?? "";
  const prefix = "Bearer ";
  if (!authorization.startsWith(prefix) || authorization.slice(prefix.length) !== expected) {
    throw new ControlPlaneError("UNAUTHORIZED", "control-plane authorization is required");
  }
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) throw new ControlPlaneError("INVALID_REQUEST", "content-type must be application/json");
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) throw new ControlPlaneError("INVALID_REQUEST", "request body exceeds 1 MiB");
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) throw new ControlPlaneError("INVALID_REQUEST", "request body exceeds 1 MiB");
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new ControlPlaneError("INVALID_REQUEST", "request body must be valid JSON"); }
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new ControlPlaneError("INVALID_REQUEST", "request body must be an object");
  return value as Record<string, unknown>;
}

function asSnapshot(body: Record<string, unknown>): ControlSnapshot {
  if (!Number.isSafeInteger(body.configVersion) || (body.configVersion as number) <= 0) {
    throw new ControlPlaneError("INVALID_REQUEST", "configVersion must be a positive safe integer");
  }
  if (!Number.isSafeInteger(body.epoch) || (body.epoch as number) <= 0) {
    throw new ControlPlaneError("INVALID_REQUEST", "epoch must be a positive safe integer");
  }
  if (!Number.isFinite(body.activationTime) || !Number.isFinite(body.expiryTime)) {
    throw new ControlPlaneError("INVALID_REQUEST", "activationTime and expiryTime must be finite numbers");
  }
  if (typeof body.source !== "string") {
    throw new ControlPlaneError("INVALID_REQUEST", "source must be a string");
  }
  const payload = body.payload;
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) throw new ControlPlaneError("INVALID_REQUEST", "payload must be an object");
  return {
    configVersion: body.configVersion as number,
    epoch: body.epoch as number,
    activationTime: body.activationTime as number,
    expiryTime: body.expiryTime as number,
    validationStatus: "VALIDATED",
    source: body.source,
    revoked: false,
    payload: payload as Record<string, unknown>,
  };
}

export async function handleControl(request: Request, env: Env): Promise<Response> {
  try {
    const pathname = new URL(request.url).pathname;

    if (request.method === "GET" && pathname === "/v1/control/lkg") {
      const store = requireDb(env);
      const snapshot = await getLkg(store, Date.now());
      return json(snapshot);
    }

    if (request.method === "GET" && pathname === "/v1/control/epoch") {
      const url = new URL(request.url);
      const epoch = Number(url.searchParams.get("epoch"));
      if (!Number.isSafeInteger(epoch) || epoch <= 0) throw new ControlPlaneError("INVALID_REQUEST", "epoch must be a positive safe integer");
      const store = requireDb(env);
      const head = await store.currentHead();
      if (!head || head.epoch !== epoch) throw new ControlPlaneError("STALE_CONTROL_EPOCH", "epoch is not the active control epoch");
      const snapshot = await store.get(head);
      return json({ epoch: assertWriteEpoch(snapshot, epoch, Date.now()).epoch });
    }

    if (request.method === "POST" && pathname === "/v1/control/publish") {
      requireAdmin(request, env);
      const body = await readJson(request);
      const store = requireDb(env);
      const snapshot = asSnapshot(body);
      await publishSnapshot(store, snapshot, Date.now());
      return json({ status: "COMMITTED", configVersion: snapshot.configVersion, epoch: snapshot.epoch }, 201);
    }

    if (request.method === "POST" && pathname === "/v1/control/revoke") {
      requireAdmin(request, env);
      const body = await readJson(request);
      if (!Number.isSafeInteger(body.configVersion) || (body.configVersion as number) <= 0 ||
        !Number.isSafeInteger(body.epoch) || (body.epoch as number) <= 0) {
        throw new ControlPlaneError("INVALID_REQUEST", "configVersion and epoch are required positive safe integers");
      }
      const store = requireDb(env);
      const revoked = await store.revoke({ configVersion: body.configVersion as number, epoch: body.epoch as number });
      return json({ status: revoked ? "REVOKED" : "NOOP" });
    }

    return json({ status: "ERROR", code: "NOT_FOUND", message: "control-plane route not found" }, 404);
  } catch (error) {
    return errorResponse(error);
  }
}

export default { fetch: handleControl };
export { D1ControlStore } from "./store.ts";
export * from "./control.ts";
