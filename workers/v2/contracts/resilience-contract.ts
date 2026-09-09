export type PaginationMode = "cursor" | "none";
export type ResourceClass =
  | "READ_SMALL"
  | "READ_LIST"
  | "READ_FANOUT"
  | "WRITE_SINGLE"
  | "WRITE_BATCH"
  | "SEARCH_LIKE"
  | "HOT_OBJECT_READ"
  | "ASYNC_SUBMIT";
export type FailurePolicy = "strict" | "partial";

export interface ResourceBudget {
  maxFanout: number;
  maxConcurrency: number;
  maxStatements: number;
  maxRowsRead: number;
  maxRowsWrite: number;
  maxRetries: number;
  deadlineMs: number;
}

export interface ApiOperationContract {
  operationId: string;
  contractVersion: number;
  resourceClass: ResourceClass;
  requestBytesLimit: number;
  responseBytesLimit: number;
  maxBatchItems: number;
  paginationMode: PaginationMode;
  maxPageSize: number;
  maxCursorBytes: number;
  maxResponseItems: number;
  budget: ResourceBudget;
  cacheTermination: boolean;
  idempotencyRequired: boolean;
  failurePolicy: FailurePolicy;
}

const finitePositiveInt = (value: number) => Number.isSafeInteger(value) && value > 0;
const finiteNonNegativeInt = (value: number) => Number.isSafeInteger(value) && value >= 0;

export function validateResourceBudget(b: ResourceBudget): void {
  if (!finitePositiveInt(b.maxFanout)) throw new Error("invalid maxFanout");
  if (!finitePositiveInt(b.maxConcurrency)) throw new Error("invalid maxConcurrency");
  if (!finitePositiveInt(b.maxStatements)) throw new Error("invalid maxStatements");
  if (!finiteNonNegativeInt(b.maxRowsRead)) throw new Error("invalid maxRowsRead");
  if (!finiteNonNegativeInt(b.maxRowsWrite)) throw new Error("invalid maxRowsWrite");
  if (!finiteNonNegativeInt(b.maxRetries)) throw new Error("invalid maxRetries");
  if (!finitePositiveInt(b.deadlineMs)) throw new Error("invalid deadlineMs");
}

export function validateApiOperationContract(c: ApiOperationContract): void {
  if (!c.operationId || c.operationId.length > 128) throw new Error("invalid operationId");
  if (!finitePositiveInt(c.contractVersion)) throw new Error("invalid contractVersion");
  if (!c.resourceClass) throw new Error("invalid resourceClass");
  if (!finitePositiveInt(c.requestBytesLimit)) throw new Error("invalid requestBytesLimit");
  if (!finitePositiveInt(c.responseBytesLimit)) throw new Error("invalid responseBytesLimit");
  if (!finitePositiveInt(c.maxBatchItems)) throw new Error("invalid maxBatchItems");
  if (!finitePositiveInt(c.maxPageSize)) throw new Error("invalid maxPageSize");
  if (!finitePositiveInt(c.maxCursorBytes)) throw new Error("invalid maxCursorBytes");
  if (!finitePositiveInt(c.maxResponseItems)) throw new Error("invalid maxResponseItems");
  validateResourceBudget(c.budget);
  if (c.paginationMode === "cursor" && c.maxCursorBytes < 16) throw new Error("cursor limit too small");
  if (c.idempotencyRequired && c.resourceClass !== "WRITE_SINGLE" && c.resourceClass !== "WRITE_BATCH") {
    throw new Error("idempotency required only for mutation classes");
  }
}

export function allocateBudget(global: number, shardCount: number): number[] {
  if (!finiteNonNegativeInt(global) || !finitePositiveInt(shardCount)) throw new Error("invalid allocation input");
  const base = Math.floor(global / shardCount);
  const remainder = global % shardCount;
  const out = Array.from({ length: shardCount }, (_, i) => base + (i < remainder ? 1 : 0));
  if (out.reduce((a, b) => a + b, 0) > global) throw new Error("allocation exceeds global budget");
  return out;
}

export function clampPageSize(requested: number, max: number): number {
  if (!finitePositiveInt(max)) throw new Error("invalid maxPageSize");
  if (!finitePositiveInt(requested)) return 1;
  return Math.min(requested, max);
}

export function canRetry(attempt: number, budget: ResourceBudget, remainingDeadlineMs: number, retryCostMs: number): boolean {
  if (!Number.isSafeInteger(attempt) || attempt < 0) return false;
  if (attempt >= budget.maxRetries) return false;
  if (!finitePositiveInt(remainingDeadlineMs) || !finitePositiveInt(retryCostMs)) return false;
  return retryCostMs <= remainingDeadlineMs;
}
