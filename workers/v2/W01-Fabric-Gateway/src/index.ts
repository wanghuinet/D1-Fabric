import { parseGatewayEnvelope, ValidationError, W01_LIMITS, type GatewayEnvelope } from "./validation.ts";

export interface ServiceBinding {
  fetch(input: Request): Promise<Response>;
}

const JSON_HEADERS = Object.freeze({ "content-type": "application/json; charset=utf-8" });
const JSON_CONTENT_TYPE = /^application\/json(?:\s*;\s*charset\s*=\s*[^;]+)?\s*$/i;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

async function readBoundedBody(request: Request): Promise<string | Response> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0) return jsonResponse({ error: "INVALID_REQUEST" }, 400);
    if (parsedLength > W01_LIMITS.maxPayloadBytes) return jsonResponse({ error: "PAYLOAD_TOO_LARGE" }, 413);
  }
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > W01_LIMITS.maxPayloadBytes) return jsonResponse({ error: "PAYLOAD_TOO_LARGE" }, 413);
  return body;
}

export async function handleGateway(request: Request, env: { W02?: ServiceBinding }): Promise<Response> {
  if (request.method !== "POST") return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);
  if (!JSON_CONTENT_TYPE.test(request.headers.get("content-type") ?? "")) return jsonResponse({ error: "UNSUPPORTED_MEDIA_TYPE" }, 415);
  if (!env?.W02 || typeof env.W02.fetch !== "function") return jsonResponse({ error: "W02_UNAVAILABLE" }, 503);

  const body = await readBoundedBody(request);
  if (body instanceof Response) return body;

  let parsed: unknown;
  try { parsed = JSON.parse(body); }
  catch { return jsonResponse({ error: "INVALID_REQUEST" }, 400); }

  let envelope: GatewayEnvelope;
  try { envelope = parseGatewayEnvelope(parsed, Date.now()); }
  catch (error) {
    if (error instanceof ValidationError) return jsonResponse({ error: error.code }, error.status);
    return jsonResponse({ error: "INVALID_REQUEST" }, 400);
  }

  if (envelope.request.deadlineAt <= Date.now()) return jsonResponse({ error: "DEADLINE_EXCEEDED" }, 408);

  const upstreamRequest = new Request(new URL("/", request.url), {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-d1f-request-id": envelope.request.requestId,
      "x-d1f-deadline-at": String(envelope.request.deadlineAt),
    },
    body: JSON.stringify(envelope),
  });

  try {
    const upstream = await env.W02.fetch(upstreamRequest);
    return new Response(upstream.body, { status: upstream.status, headers: upstream.headers });
  } catch {
    return jsonResponse({ error: "W02_UNAVAILABLE" }, 503);
  }
}

export default { fetch: handleGateway };
