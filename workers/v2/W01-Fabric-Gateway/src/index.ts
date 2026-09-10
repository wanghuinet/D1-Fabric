import { parseAndValidateBody, ValidationError, W01_LIMITS, type GatewayRequest } from "./validation.ts";

const MASTER_CONTRACT_VERSION = "D1F-3.0-MASTER-v1.0" as const;
const ARCHITECTURE_ID = "D1F-3.0-ARCH-v1.0" as const;
const ENVELOPE_VERSION = "1.0" as const;

export type ExecutionEnvelope = Readonly<{
  envelopeVersion: typeof ENVELOPE_VERSION;
  contractVersion: typeof MASTER_CONTRACT_VERSION;
  architectureId: typeof ARCHITECTURE_ID;
  requestId: string;
  tenantId: string;
  principalScope: string;
  operation: string;
  operationVersion: string;
  deadlineAt: number;
  budget: Readonly<GatewayRequest["budget"] & { payloadBytes: number }>;
  payload: unknown;
}>;

const JSON_HEADERS = Object.freeze({ "content-type": "application/json; charset=utf-8" });
const JSON_CONTENT_TYPE = /^application\/json(?:\s*;\s*charset\s*=\s*[^;]+)?\s*$/i;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function isJsonContentType(request: Request): boolean {
  const contentType = request.headers.get("content-type");
  return contentType !== null && JSON_CONTENT_TYPE.test(contentType);
}

async function readBoundedBody(request: Request): Promise<{ rawBody: string; payloadBytes: number }> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0) throw new ValidationError("INVALID_REQUEST", "invalid content-length");
    if (parsedLength > W01_LIMITS.maxPayloadBytes) throw new ValidationError("PAYLOAD_TOO_LARGE", "payload exceeds W01 limit", 413);
  }
  if (!request.body) return { rawBody: "", payloadBytes: 0 };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > W01_LIMITS.maxPayloadBytes) {
        await reader.cancel("payload limit exceeded");
        throw new ValidationError("PAYLOAD_TOO_LARGE", "payload exceeds W01 limit", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
  return { rawBody: new TextDecoder().decode(merged), payloadBytes: total };
}

function buildEnvelope(request: GatewayRequest, payloadBytes: number): ExecutionEnvelope {
  return Object.freeze({
    envelopeVersion: ENVELOPE_VERSION,
    contractVersion: MASTER_CONTRACT_VERSION,
    architectureId: ARCHITECTURE_ID,
    requestId: request.requestId,
    tenantId: request.tenantId,
    principalScope: request.principalScope,
    operation: request.operation,
    operationVersion: request.operationVersion,
    deadlineAt: request.deadlineAt,
    budget: Object.freeze({ ...request.budget, payloadBytes }),
    payload: request.payload,
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);
    if (!isJsonContentType(request)) return jsonResponse({ error: "UNSUPPORTED_MEDIA_TYPE" }, 415);

    let body: { rawBody: string; payloadBytes: number };
    try { body = await readBoundedBody(request); }
    catch (error) {
      if (error instanceof ValidationError) return jsonResponse({ error: error.code }, error.status);
      return jsonResponse({ error: "INVALID_REQUEST" }, 400);
    }

    let parsed: unknown;
    try { parsed = JSON.parse(body.rawBody); }
    catch { return jsonResponse({ error: "INVALID_REQUEST" }, 400); }

    try {
      const normalized = parseAndValidateBody(parsed, Date.now());
      const envelope = buildEnvelope(normalized, body.payloadBytes);
      return jsonResponse({ status: "ADMITTED", envelope });
    } catch (error) {
      if (error instanceof ValidationError) return jsonResponse({ error: error.code }, error.status);
      return jsonResponse({ error: "INVALID_REQUEST" }, 400);
    }
  },
};

export { ARCHITECTURE_ID, ENVELOPE_VERSION, MASTER_CONTRACT_VERSION, buildEnvelope, isJsonContentType, readBoundedBody };
