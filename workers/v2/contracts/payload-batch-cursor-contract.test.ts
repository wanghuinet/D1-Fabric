import {
  evaluateBatch,
  evaluateCursor,
  evaluatePayload,
  utf8ByteLength,
  validateBatchDemand,
  validateBatchLimits,
  validateCursorDemand,
  validateCursorLimits,
  validatePayloadDemand,
  validatePayloadLimits,
  type BatchDemand,
  type BatchLimits,
  type CursorDemand,
  type CursorLimits,
  type PayloadDemand,
  type PayloadLimits,
} from "./payload-batch-cursor-contract";

const payloadLimits: PayloadLimits = {
  maxRequestBytes: 4096,
  maxHeaderBytes: 1024,
  maxFieldBytes: 2048,
  maxArrayItems: 100,
  maxNestingDepth: 8,
  maxResponseItems: 50,
};
const payload: PayloadDemand = {
  requestBytes: 1000,
  headerBytes: 200,
  largestFieldBytes: 500,
  arrayItems: 10,
  nestingDepth: 3,
  responseItems: 20,
};
const batchLimits: BatchLimits = { maxBatchItems: 32, maxItemBytes: 1024 };
const batch: BatchDemand = { itemCount: 8, largestItemBytes: 512 };
const cursorLimits: CursorLimits = {
  maxCursorBytes: 128,
  maxPageSize: 50,
  expectedVersion: 2,
};
const cursor: CursorDemand = {
  token: "opaque-cursor-token",
  version: 2,
  expiresAtMs: 2000,
  requestedPageSize: 20,
  nowMs: 1000,
};

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function assertThrows(fn: () => void, message: string): void {
  let threw = false;
  try { fn(); } catch { threw = true; }
  assert(threw, message);
}

validatePayloadLimits(payloadLimits);
validatePayloadDemand(payload);
validateBatchLimits(batchLimits);
validateBatchDemand(batch);
validateCursorLimits(cursorLimits);
validateCursorDemand(cursor);

assert(evaluatePayload(payload, payloadLimits).admitted === true, "valid payload admitted");
assert(evaluatePayload({ ...payload, requestBytes: payloadLimits.maxRequestBytes }, payloadLimits).admitted === true, "request byte ceiling admitted");
assert(evaluatePayload({ ...payload, requestBytes: payloadLimits.maxRequestBytes + 1 }, payloadLimits).code === "REQUEST_BYTES_EXCEEDED", "request byte overflow rejected");
assert(evaluatePayload({ ...payload, headerBytes: payloadLimits.maxHeaderBytes + 1 }, payloadLimits).code === "HEADER_BYTES_EXCEEDED", "header overflow rejected");
assert(evaluatePayload({ ...payload, largestFieldBytes: payloadLimits.maxFieldBytes + 1 }, payloadLimits).code === "FIELD_BYTES_EXCEEDED", "field overflow rejected");
assert(evaluatePayload({ ...payload, arrayItems: payloadLimits.maxArrayItems + 1 }, payloadLimits).code === "ARRAY_ITEMS_EXCEEDED", "array overflow rejected");
assert(evaluatePayload({ ...payload, nestingDepth: payloadLimits.maxNestingDepth + 1 }, payloadLimits).code === "NESTING_DEPTH_EXCEEDED", "nesting overflow rejected");
assert(evaluatePayload({ ...payload, responseItems: payloadLimits.maxResponseItems }, payloadLimits).admitted === true, "response item ceiling admitted");
assert(evaluatePayload({ ...payload, responseItems: payloadLimits.maxResponseItems + 1 }, payloadLimits).code === "RESPONSE_ITEMS_EXCEEDED", "response item overflow rejected");
assert(evaluatePayload({ ...payload, requestBytes: -1 }, payloadLimits).code === "INVALID_PAYLOAD", "invalid payload rejected before limits");

assert(evaluateBatch(batch, batchLimits).admitted === true, "valid batch admitted");
assert(evaluateBatch({ ...batch, itemCount: batchLimits.maxBatchItems }, batchLimits).admitted === true, "batch item ceiling admitted");
assert(evaluateBatch({ ...batch, itemCount: batchLimits.maxBatchItems + 1 }, batchLimits).code === "BATCH_ITEMS_EXCEEDED", "batch item overflow rejected");
assert(evaluateBatch({ ...batch, largestItemBytes: batchLimits.maxItemBytes + 1 }, batchLimits).code === "BATCH_ITEM_BYTES_EXCEEDED", "batch item bytes overflow rejected");
assert(evaluateBatch({ ...batch, itemCount: 0 }, batchLimits).code === "INVALID_PAYLOAD", "empty batch rejected by demand contract");

assert(utf8ByteLength("abc") === 3, "ASCII byte length is exact");
assert(utf8ByteLength("你好") === 6, "multibyte UTF-8 length is exact");
assert(utf8ByteLength("😀") === 4, "four-byte UTF-8 length is exact");
assert(evaluateCursor(cursor, cursorLimits).admitted === true, "valid cursor admitted");
assert(evaluateCursor({ ...cursor, token: "😀".repeat(40) }, cursorLimits).code === "CURSOR_OVERSIZED", "cursor byte ceiling uses UTF-8 bytes");
assert(evaluateCursor({ ...cursor, expiresAtMs: cursor.nowMs }, cursorLimits).code === "CURSOR_EXPIRED", "expired cursor rejected");
assert(evaluateCursor({ ...cursor, version: cursorLimits.expectedVersion + 1 }, cursorLimits).code === "CURSOR_VERSION_MISMATCH", "incompatible cursor rejected");
assert(evaluateCursor({ ...cursor, requestedPageSize: cursorLimits.maxPageSize + 1 }, cursorLimits).code === "PAGE_SIZE_EXCEEDED", "oversized page rejected");
assert(evaluateCursor({ ...cursor, token: "" }, cursorLimits).code === "CURSOR_INVALID", "empty cursor rejected");
assert(evaluateCursor({ ...cursor, requestedPageSize: 1 }, cursorLimits).effectivePageSize === 1, "bounded page size is preserved");

assertThrows(() => validatePayloadLimits({ ...payloadLimits, maxArrayItems: 0 }), "zero array limit rejected");
assertThrows(() => validateBatchLimits({ ...batchLimits, maxBatchItems: 0 }), "zero batch limit rejected");
assertThrows(() => validateCursorLimits({ ...cursorLimits, expectedVersion: 0 }), "zero cursor version rejected");
assertThrows(() => validateCursorDemand({ ...cursor, nowMs: 0 }), "invalid cursor clock rejected");

// Cursor is opaque: this contract bounds and versions it without exposing or interpreting physical shard IDs.
assert(evaluateCursor(cursor, cursorLimits).admitted, "opaque cursor remains topology-neutral");

console.log("PASS: payload/batch/cursor contract assertions");
