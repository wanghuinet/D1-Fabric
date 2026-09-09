export interface PayloadLimits {
  maxRequestBytes: number;
  maxHeaderBytes: number;
  maxFieldBytes: number;
  maxArrayItems: number;
  maxNestingDepth: number;
  maxResponseItems: number;
}

export interface PayloadDemand {
  requestBytes: number;
  headerBytes: number;
  largestFieldBytes: number;
  arrayItems: number;
  nestingDepth: number;
  responseItems: number;
}

export interface BatchLimits {
  maxBatchItems: number;
  maxItemBytes: number;
}

export interface BatchDemand {
  itemCount: number;
  largestItemBytes: number;
}

export interface CursorLimits {
  maxCursorBytes: number;
  maxPageSize: number;
  expectedVersion: number;
}

export interface CursorDemand {
  token: string;
  version: number;
  expiresAtMs: number;
  requestedPageSize: number;
  nowMs: number;
}

export type PayloadRejectCode =
  | "INVALID_PAYLOAD"
  | "REQUEST_BYTES_EXCEEDED"
  | "HEADER_BYTES_EXCEEDED"
  | "FIELD_BYTES_EXCEEDED"
  | "ARRAY_ITEMS_EXCEEDED"
  | "NESTING_DEPTH_EXCEEDED"
  | "RESPONSE_ITEMS_EXCEEDED"
  | "BATCH_ITEMS_EXCEEDED"
  | "BATCH_ITEM_BYTES_EXCEEDED"
  | "CURSOR_INVALID"
  | "CURSOR_OVERSIZED"
  | "CURSOR_EXPIRED"
  | "CURSOR_VERSION_MISMATCH"
  | "PAGE_SIZE_EXCEEDED";

export interface PayloadDecision {
  admitted: boolean;
  code?: PayloadRejectCode;
  effectivePageSize?: number;
}

const positiveSafeInt = (value: number): boolean =>
  Number.isSafeInteger(value) && value > 0;

const nonNegativeSafeInt = (value: number): boolean =>
  Number.isSafeInteger(value) && value >= 0;

/** Returns UTF-8 byte length without materializing an encoded buffer. */
export function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) as number;
    bytes += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return bytes;
}

export function validatePayloadLimits(limits: PayloadLimits): void {
  if (!positiveSafeInt(limits.maxRequestBytes)) throw new Error("invalid maxRequestBytes");
  if (!positiveSafeInt(limits.maxHeaderBytes)) throw new Error("invalid maxHeaderBytes");
  if (!positiveSafeInt(limits.maxFieldBytes)) throw new Error("invalid maxFieldBytes");
  if (!positiveSafeInt(limits.maxArrayItems)) throw new Error("invalid maxArrayItems");
  if (!positiveSafeInt(limits.maxNestingDepth)) throw new Error("invalid maxNestingDepth");
  if (!positiveSafeInt(limits.maxResponseItems)) throw new Error("invalid maxResponseItems");
}

export function validatePayloadDemand(demand: PayloadDemand): void {
  if (!nonNegativeSafeInt(demand.requestBytes)) throw new Error("invalid requestBytes");
  if (!nonNegativeSafeInt(demand.headerBytes)) throw new Error("invalid headerBytes");
  if (!nonNegativeSafeInt(demand.largestFieldBytes)) throw new Error("invalid largestFieldBytes");
  if (!nonNegativeSafeInt(demand.arrayItems)) throw new Error("invalid arrayItems");
  if (!nonNegativeSafeInt(demand.nestingDepth)) throw new Error("invalid nestingDepth");
  if (!nonNegativeSafeInt(demand.responseItems)) throw new Error("invalid responseItems");
}

export function validateBatchLimits(limits: BatchLimits): void {
  if (!positiveSafeInt(limits.maxBatchItems)) throw new Error("invalid maxBatchItems");
  if (!positiveSafeInt(limits.maxItemBytes)) throw new Error("invalid maxItemBytes");
}

export function validateBatchDemand(demand: BatchDemand): void {
  if (!positiveSafeInt(demand.itemCount)) throw new Error("invalid itemCount");
  if (!nonNegativeSafeInt(demand.largestItemBytes)) throw new Error("invalid largestItemBytes");
}

export function validateCursorLimits(limits: CursorLimits): void {
  if (!positiveSafeInt(limits.maxCursorBytes)) throw new Error("invalid maxCursorBytes");
  if (!positiveSafeInt(limits.maxPageSize)) throw new Error("invalid maxPageSize");
  if (!positiveSafeInt(limits.expectedVersion)) throw new Error("invalid expectedVersion");
}

export function validateCursorDemand(demand: CursorDemand): void {
  if (!demand.token || demand.token.length === 0) throw new Error("invalid cursor token");
  if (!positiveSafeInt(demand.version)) throw new Error("invalid cursor version");
  if (!positiveSafeInt(demand.expiresAtMs)) throw new Error("invalid cursor expiry");
  if (!positiveSafeInt(demand.requestedPageSize)) throw new Error("invalid requested page size");
  if (!positiveSafeInt(demand.nowMs)) throw new Error("invalid cursor clock");
}

export function evaluatePayload(
  demand: PayloadDemand,
  limits: PayloadLimits,
): PayloadDecision {
  try {
    validatePayloadDemand(demand);
    validatePayloadLimits(limits);
  } catch {
    return { admitted: false, code: "INVALID_PAYLOAD" };
  }

  if (demand.requestBytes > limits.maxRequestBytes) return { admitted: false, code: "REQUEST_BYTES_EXCEEDED" };
  if (demand.headerBytes > limits.maxHeaderBytes) return { admitted: false, code: "HEADER_BYTES_EXCEEDED" };
  if (demand.largestFieldBytes > limits.maxFieldBytes) return { admitted: false, code: "FIELD_BYTES_EXCEEDED" };
  if (demand.arrayItems > limits.maxArrayItems) return { admitted: false, code: "ARRAY_ITEMS_EXCEEDED" };
  if (demand.nestingDepth > limits.maxNestingDepth) return { admitted: false, code: "NESTING_DEPTH_EXCEEDED" };
  if (demand.responseItems > limits.maxResponseItems) return { admitted: false, code: "RESPONSE_ITEMS_EXCEEDED" };
  return { admitted: true };
}

export function evaluateBatch(
  demand: BatchDemand,
  limits: BatchLimits,
): PayloadDecision {
  try {
    validateBatchDemand(demand);
    validateBatchLimits(limits);
  } catch {
    return { admitted: false, code: "INVALID_PAYLOAD" };
  }

  if (demand.itemCount > limits.maxBatchItems) return { admitted: false, code: "BATCH_ITEMS_EXCEEDED" };
  if (demand.largestItemBytes > limits.maxItemBytes) return { admitted: false, code: "BATCH_ITEM_BYTES_EXCEEDED" };
  return { admitted: true };
}

export function evaluateCursor(
  demand: CursorDemand,
  limits: CursorLimits,
): PayloadDecision {
  try {
    validateCursorDemand(demand);
    validateCursorLimits(limits);
  } catch {
    return { admitted: false, code: "CURSOR_INVALID" };
  }

  if (utf8ByteLength(demand.token) > limits.maxCursorBytes) return { admitted: false, code: "CURSOR_OVERSIZED" };
  if (demand.expiresAtMs <= demand.nowMs) return { admitted: false, code: "CURSOR_EXPIRED" };
  if (demand.version !== limits.expectedVersion) return { admitted: false, code: "CURSOR_VERSION_MISMATCH" };
  if (demand.requestedPageSize > limits.maxPageSize) return { admitted: false, code: "PAGE_SIZE_EXCEEDED" };
  return { admitted: true, effectivePageSize: demand.requestedPageSize };
}
