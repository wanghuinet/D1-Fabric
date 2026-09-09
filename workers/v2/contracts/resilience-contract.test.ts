import {
  allocateBudget,
  canRetry,
  validateApiOperationContract,
  validateResourceBudget,
  type ApiOperationContract,
} from "./resilience-contract";

let assertions = 0;

function equal(actual: unknown, expected: unknown, name: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`FAIL: ${name}`);
  assertions += 1;
}

function ok(value: unknown, name: string): void {
  if (!value) throw new Error(`FAIL: ${name}`);
  assertions += 1;
}

function throws(fn: () => void, name: string): void {
  try {
    fn();
  } catch {
    assertions += 1;
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
ok(canRetry(0, budget, 1000, 500), "retry within budget");
ok(!canRetry(2, budget, 1000, 500), "retry exhaustion");
ok(!canRetry(0, budget, 100, 500), "retry deadline bound");
throws(() => validateResourceBudget({ ...budget, maxFanout: Number.POSITIVE_INFINITY }), "non-finite budget");
throws(() => validateApiOperationContract({ ...contract, operationId: "x".repeat(129) }), "operation id bound");
throws(() => validateApiOperationContract({ ...contract, maxCursorBytes: 8 }), "cursor bound");
throws(() => validateApiOperationContract({ ...contract, idempotencyRequired: true }), "idempotency mutation rule");
throws(() => allocateBudget(5, 0), "invalid shard count");

console.log(`PASS: ${assertions} resilience contract assertions`);
