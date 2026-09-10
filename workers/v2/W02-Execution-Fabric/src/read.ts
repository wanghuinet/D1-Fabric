export type ReadBudget = Readonly<{
  d1Statements: number;
  rowsRead: number;
  payloadBytes: number;
}>;

export type ReadPlacement = Readonly<{
  logicalTargetId: string;
  executionEpoch: string;
  expiresAt: number;
  fenced: boolean;
}>;

export type CachePolicy = Readonly<{
  cacheAllowed: boolean;
  cacheTermination: boolean;
  contractVersion: string;
  shapeVersion: string;
}>;

export type CacheEntry = Readonly<{
  tenantId: string;
  principalScope: string;
  operation: string;
  contractVersion: string;
  shapeVersion: string;
  expiresAt: number;
  integrity: string;
  payload: unknown;
}>;

export interface D1Result<T = unknown> {
  readonly results: readonly T[];
  readonly meta?: Readonly<Record<string, unknown>>;
}

export interface D1PreparedStatement<T = unknown> {
  bind(...values: readonly unknown[]): D1PreparedStatement<T>;
  all(): Promise<D1Result<T>>;
}

export interface D1DatabaseLike {
  prepare<T = unknown>(statement: string): D1PreparedStatement<T>;
}

export type ReadExecutionInput<T = unknown> = Readonly<{
  requestId: string;
  tenantId: string;
  principalScope: string;
  operation: string;
  contractVersion: string;
  shapeVersion: string;
  placement: ReadPlacement;
  deadlineAt: number;
  budget: ReadBudget;
  cachePolicy: CachePolicy;
  cacheEntry?: CacheEntry;
  statement: string;
  bindings?: readonly unknown[];
  db: D1DatabaseLike;
}>;

export type ReadExecutionResult<T = unknown> = Readonly<{
  status: "CACHE_TERMINATED" | "READ_EXECUTED";
  requestId: string;
  tenantId: string;
  logicalTargetId: string;
  executionEpoch: string;
  cacheResult: "HIT" | "MISS";
  cacheTermination: boolean;
  d1Statements: 0 | 1;
  rowsRead: number;
  rowsWritten: 0;
  payloadBytes: number;
  actualFanout: 0 | 1;
  results: readonly T[];
}>;

export class ReadExecutionError extends Error {
  readonly code:
    | "READ_TARGET_MISSING"
    | "CONTROL_EPOCH_INCOMPATIBLE"
    | "CONTROL_EPOCH_FENCED"
    | "CONTROL_SNAPSHOT_EXPIRED"
    | "BUDGET_INVALID"
    | "BUDGET_EXCEEDED"
    | "DEADLINE_EXCEEDED"
    | "CACHE_BINDING_INVALID"
    | "READ_EXECUTION_FAILED";

  constructor(code: ReadExecutionError["code"], message: string) {
    super(message);
    this.name = "ReadExecutionError";
    this.code = code;
  }
}

function boundedToken(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 256) {
    throw new ReadExecutionError("READ_TARGET_MISSING", `${field} is invalid`);
  }
  return value;
}

function positiveBudget(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new ReadExecutionError("BUDGET_INVALID", `${field} is invalid`);
  }
  return value;
}

function nonNegativeBudget(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new ReadExecutionError("BUDGET_INVALID", `${field} is invalid`);
  }
  return value;
}

function validateBudget(budget: ReadBudget): ReadBudget {
  return Object.freeze({
    d1Statements: positiveBudget(budget.d1Statements, "d1Statements"),
    rowsRead: positiveBudget(budget.rowsRead, "rowsRead"),
    payloadBytes: positiveBudget(budget.payloadBytes, "payloadBytes"),
  });
}

function validatePlacement(placement: ReadPlacement): void {
  boundedToken(placement.logicalTargetId, "logicalTargetId");
  boundedToken(placement.executionEpoch, "executionEpoch");
  if (typeof placement.expiresAt !== "number" || !Number.isSafeInteger(placement.expiresAt)) {
    throw new ReadExecutionError("CONTROL_EPOCH_INCOMPATIBLE", "execution epoch is invalid");
  }
  if (placement.fenced) throw new ReadExecutionError("CONTROL_EPOCH_FENCED", "execution epoch is fenced");
  if (Date.now() >= placement.expiresAt) throw new ReadExecutionError("CONTROL_SNAPSHOT_EXPIRED", "execution epoch is expired");
}

function validateCache<T>(input: ReadExecutionInput<T>, entry: CacheEntry): boolean {
  if (!input.cachePolicy.cacheAllowed || !input.cachePolicy.cacheTermination) return false;
  if (entry.tenantId !== input.tenantId || entry.principalScope !== input.principalScope) {
    throw new ReadExecutionError("CACHE_BINDING_INVALID", "cache security binding is invalid");
  }
  if (entry.operation !== input.operation || entry.contractVersion !== input.contractVersion || entry.shapeVersion !== input.shapeVersion) {
    throw new ReadExecutionError("CACHE_BINDING_INVALID", "cache contract binding is invalid");
  }
  boundedToken(entry.integrity, "cache integrity");
  if (Date.now() >= entry.expiresAt) return false;
  return true;
}

function serializedBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

export async function executeBoundedRead<T = unknown>(input: ReadExecutionInput<T>): Promise<ReadExecutionResult<T>> {
  boundedToken(input.requestId, "requestId");
  boundedToken(input.tenantId, "tenantId");
  boundedToken(input.principalScope, "principalScope");
  boundedToken(input.operation, "operation");
  boundedToken(input.contractVersion, "contractVersion");
  boundedToken(input.shapeVersion, "shapeVersion");
  boundedToken(input.statement, "statement");
  validatePlacement(input.placement);
  const budget = validateBudget(input.budget);

  if (Date.now() >= input.deadlineAt) throw new ReadExecutionError("DEADLINE_EXCEEDED", "read deadline has expired");

  if (input.cacheEntry !== undefined && validateCache(input, input.cacheEntry)) {
    const payloadBytes = serializedBytes(input.cacheEntry.payload);
    if (payloadBytes > budget.payloadBytes) throw new ReadExecutionError("BUDGET_EXCEEDED", "cache payload exceeds budget");
    const cached = Array.isArray(input.cacheEntry.payload) ? input.cacheEntry.payload as readonly T[] : [input.cacheEntry.payload as T];
    if (cached.length > budget.rowsRead) throw new ReadExecutionError("BUDGET_EXCEEDED", "cache response exceeds row budget");
    return Object.freeze({
      status: "CACHE_TERMINATED" as const,
      requestId: input.requestId,
      tenantId: input.tenantId,
      logicalTargetId: input.placement.logicalTargetId,
      executionEpoch: input.placement.executionEpoch,
      cacheResult: "HIT" as const,
      cacheTermination: true,
      d1Statements: 0 as const,
      rowsRead: 0,
      rowsWritten: 0 as const,
      payloadBytes,
      actualFanout: 0 as const,
      results: Object.freeze(cached),
    });
  }

  if (budget.d1Statements < 1) throw new ReadExecutionError("BUDGET_EXCEEDED", "statement budget is insufficient");
  if (Date.now() >= input.deadlineAt) throw new ReadExecutionError("DEADLINE_EXCEEDED", "read deadline expired before D1 dispatch");

  let result: D1Result<T>;
  try {
    result = await input.db.prepare<T>(input.statement).bind(...(input.bindings ?? [])).all();
  } catch {
    throw new ReadExecutionError("READ_EXECUTION_FAILED", "read execution failed");
  }

  const rowsRead = result.results.length;
  const payloadBytes = serializedBytes(result.results);
  if (rowsRead > budget.rowsRead || payloadBytes > budget.payloadBytes) {
    throw new ReadExecutionError("BUDGET_EXCEEDED", "read result exceeds budget");
  }

  return Object.freeze({
    status: "READ_EXECUTED" as const,
    requestId: input.requestId,
    tenantId: input.tenantId,
    logicalTargetId: input.placement.logicalTargetId,
    executionEpoch: input.placement.executionEpoch,
    cacheResult: "MISS" as const,
    cacheTermination: false,
    d1Statements: 1 as const,
    rowsRead,
    rowsWritten: 0 as const,
    payloadBytes,
    actualFanout: 1 as const,
    results: Object.freeze([...result.results]),
  });
}
