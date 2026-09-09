import { parseAndValidateBody, ValidationError, W01_LIMITS } from "./validation";

const JSON_HEADERS = Object.freeze({ "content-type": "application/json; charset=utf-8" });

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

async function readBoundedBody(request: Request): Promise<string> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0) {
      throw new ValidationError("INVALID_REQUEST", "invalid content-length");
    }
    if (parsedLength > W01_LIMITS.maxPayloadBytes) {
      throw new ValidationError("PAYLOAD_TOO_LARGE", "payload exceeds W01 limit", 413);
    }
  }

  if (!request.body) return "";

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
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);
    }

    let rawBody: string;
    try {
      rawBody = await readBoundedBody(request);
    } catch (error) {
      if (error instanceof ValidationError) {
        return jsonResponse({ error: error.code }, error.status);
      }
      return jsonResponse({ error: "INVALID_REQUEST" }, 400);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ error: "INVALID_REQUEST" }, 400);
    }

    try {
      const normalized = parseAndValidateBody(parsed, Date.now());
      return jsonResponse(
        {
          status: "VALIDATED",
          requestId: normalized.requestId,
          operation: normalized.operation,
          operationVersion: normalized.operationVersion,
          contractVersion: "D1F-3.0-MASTER-v1.0",
        },
        200,
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        return jsonResponse({ error: error.code }, error.status);
      }
      return jsonResponse({ error: "INVALID_REQUEST" }, 400);
    }
  },
};

export { readBoundedBody };
