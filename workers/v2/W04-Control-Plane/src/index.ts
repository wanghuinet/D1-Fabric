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
}

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: JSON_HEADERS });
}

function errorResponse(error: unknown): Response {
  if (error instanceof ControlPlaneError) {
    const status = error.code.startsWith("STALE_") || error.code.includes("EPOCH") || error.code === "REVOKED_CONTROL_EPOCH" ? 409 :
      error.code === "NO_VALID_LKG" ? 503 : 400;
    return json({ status: "ERROR", code: error.code, message: error.message }, status);
  }
  return json({ status: "ERROR", code: "CONTROL_PLANE_FAILURE", message: "control-plane operation failed" }, 500);
}

function requireDb(env: Env): D1ControlStore {
  if (!env.CONTROL_DB) throw new ControlPlaneError("CONTROL_PLANE_NOT_CONFIGURED", "CONTROL_DB binding is required");
  return new D1ControlStore(env.CONTROL_DB);
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
  const payload = body.payload;
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) throw new ControlPlaneError("INVALID_REQUEST", "payload must be an object");
  return {
    configVersion: body.configVersion as number,
    epoch: body.epoch as number,
    activationTime: body.activationTime as number,
    expiryTime: body.expiryTime as number,
    validationStatus: "VALIDATED",
    source: body.source as string,
    revoked: false,
    payload: payload as Record<string, unknown>,
  };
}

export async function handleControl(request: Request, env: Env): Promise<Response> {
  try {
    if (request.method === "GET" && new URL(request.url).pathname === "/v1/control/lkg") {
      const store = requireDb(env);
      const snapshot = await getLkg(store, Date.now());
      return json(snapshot);
    }

    if (request.method === "GET" && new URL(request.url).pathname === "/v1/control/epoch") {
      const url = new URL(request.url);
      const epoch = Number(url.searchParams.get("epoch"));
      if (!Number.isSafeInteger(epoch) || epoch <= 0) throw new ControlPlaneError("INVALID_REQUEST", "epoch must be a positive safe integer");
      const store = requireDb(env);
      const head = await store.currentHead();
      if (!head || head.epoch !== epoch) throw new ControlPlaneError("STALE_CONTROL_EPOCH", "epoch is not the active control epoch");
      const snapshot = await store.get(head);
      return json({ epoch: assertWriteEpoch(snapshot, epoch, Date.now()).epoch });
    }

    if (request.method === "POST" && new URL(request.url).pathname === "/v1/control/publish") {
      const body = await readJson(request);
      const store = requireDb(env);
      const snapshot = asSnapshot(body);
      await publishSnapshot(store, snapshot, Date.now());
      return json({ status: "COMMITTED", configVersion: snapshot.configVersion, epoch: snapshot.epoch }, 201);
    }

    if (request.method === "POST" && new URL(request.url).pathname === "/v1/control/revoke") {
      const body = await readJson(request);
      if (!Number.isSafeInteger(body.configVersion) || !Number.isSafeInteger(body.epoch)) throw new ControlPlaneError("INVALID_REQUEST", "configVersion and epoch are required safe integers");
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
