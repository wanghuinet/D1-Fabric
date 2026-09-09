import {
  allocateBudget,
  canRetry,
  clampPageSize,
  validateApiOperationContract,
  validateResourceBudget,
  ApiOperationContract,
} from "./resilience-contract";

function equal(actual: unknown, expected: unknown, name: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`FAIL: ${name}`);
}

function ok(value: unknown, name: string): void {
  if (!value) throw new Error(`FAIL: ${name}`);
}

function throws(fn: () => void, name: string): void {
  try {
    fn();
  } catch {
    return;
  }
  throw new Error(`FAIL: ${name}`);
}

const budget = {
  maxFanout: 8,
  maxConcurrency: 4,
  maxStatements: 8,
  maxRowsRead: 1000,
  maxRowsWrite: 100,
  maxRetries: 2,
  deadlineMs: 2500,
};

const contract: ApiOperationContract = {
  operationId: "feed.list",
  contractVersion: 1,
  resourceClass: "READ_LIST",
  requestBytesLimit: 64_000,
  responseBytesLimit: 1_000_000,
  maxBatchItems: 50,
  paginationMode: "cursor",
  maxPageSize: 50,
  maxCursorBytes: 256,
  maxResponseItems: 50,
  budget,
  cacheTermination: true,
  idempotencyRequired: false,
  failurePolicy: "strict",
};

validateResourceBudget(budget);
validateApiOperationContract(contract);

equal(allocateBudget(10, 3), [4, 3, 3], "budget remainder allocation");
equal(allocateBudget(2, 5), [1, 1, 0, 0, 0], "budget below shard count");
equal(allocateBudget(0, 5), [0, 0, 0, 0, 0], "zero budget");
equal(clampPageSize(999, 50), 50, "page size upper bound");
equal(clampPageSize(0, 50), 1, "invalid page size clamp");
ok(canRetry(0, budget, 1000, 500), "retry within budget");
ok(!canRetry(2, budget, 1000, 500), "retry exhaustion");
ok(!canRetry(0, budget, 100, 500), "retry deadline bound");
throws(() => validateResourceBudget({ ...budget, maxFanout: Number.POSITIVE_INFINITY }), "non-finite budget");
throws(() => validateApiOperationContract({ ...contract, operationId: "x".repeat(129) }), "operation id bound");
throws(() => validateApiOperationContract({ ...contract, maxCursorBytes: 8 }), "cursor bound");
throws(() => validateApiOperationContract({ ...contract, idempotencyRequired: true }), "idempotency mutation rule");
throws(() => allocateBudget(5, 0), "invalid shard count");

console.log("PASS: 14 resilience contract assertions");
