export const MASTER_CONTRACT_VERSION = "D1F-3.0-MASTER-v1.0" as const;
export const ARCHITECTURE_ID = "D1F-3.0-ARCH-v1.0" as const;
export const IDEMPOTENCY_TABLE = "__d1f_idempotency" as const;

export type D1Value = string | number | null | ArrayBuffer;
export type WriteErrorCode =
  | "INVALID_REQUEST" | "CONTRACT_MISMATCH" | "IDENTITY_MISMATCH" | "TARGET_REQUIRED" | "TARGET_UNSUPPORTED"
  | "STALE_EXECUTION_EPOCH" | "DEADLINE_EXCEEDED" | "CANCELLED" | "BUDGET_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED"
  | "IDEMPOTENCY_CONFLICT" | "D1_EXECUTION_FAILED" | "D1_RESULT_INVALID" | "COMMIT_UNKNOWN" | "UNSUPPORTED_CROSS_TARGET_WRITE";

export class WriteExecutionError extends Error {
  readonly code: WriteErrorCode;
  constructor(code: WriteErrorCode, message: string) { super(message); this.name = "WriteExecutionError"; this.code = code; }
}

export interface WriteBudget { readonly d1Statements: number; readonly rowsWritten: number; readonly payloadBytes: number; readonly retries: number; }
export interface WriteIdentity {
  readonly requestId: string; readonly planId: string; readonly contractId: string; readonly contractVersion: string;
  readonly architectureId: string; readonly tenantId: string; readonly principalScope: string; readonly operation: string;
  readonly operationVersion: string; readonly logicalTargetId: string; readonly executionEpoch: number; readonly deadlineAt: number;
  readonly budget: WriteBudget;
}
export interface PreparedStatementLike {
  bind(...values: D1Value[]): PreparedStatementLike;
  run(): Promise<D1ResultLike>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[]; meta?: D1MetaLike }>;
}
export interface D1ResultLike { success: boolean; meta?: D1MetaLike; results?: unknown[]; }
export interface D1MetaLike { changes?: number; rows_read?: number; rows_written?: number; duration?: number; }
export interface D1DatabaseLike { prepare(sql: string): PreparedStatementLike; batch(statements: PreparedStatementLike[]): Promise<D1ResultLike[]>; }

/** For retryable writes, the supplied statement MUST guard the business mutation by the idempotency owner. */
export interface AtomicIdempotencyProtocol { readonly guardedMutation: { sql: string; bindings: readonly D1Value[] }; }
export interface WriteOperation {
  readonly statement: string; readonly bindings: readonly D1Value[]; readonly retryable: boolean;
  readonly idempotencyKey?: string; readonly expectedWriteCount?: number; readonly atomicIdempotency?: AtomicIdempotencyProtocol;
}
export interface WriteAccounting { readonly d1Statements: number; readonly rowsWritten: number; readonly payloadBytes: number; readonly retries: number; }
export interface WriteResult {
  readonly status: "COMMITTED" | "REPLAYED"; readonly requestId: string; readonly contractId: string; readonly contractVersion: string;
  readonly logicalTargetId: string; readonly executionEpoch: number; readonly accounting: WriteAccounting; readonly affectedRows: number;
  readonly idempotencyState?: "COMMITTED";
}

function boundedString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 256) throw new WriteExecutionError("INVALID_REQUEST", `${field} must be a bounded non-empty string`);
}
function safeInteger(value: unknown, field: string): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new WriteExecutionError("INVALID_REQUEST", `${field} must be a non-negative safe integer`);
}
function validateBudget(budget: WriteBudget): void { for (const key of ["d1Statements", "rowsWritten", "payloadBytes", "retries"] as const) safeInteger(budget[key], `budget.${key}`); }
function validateIdentity(identity: WriteIdentity): void {
  for (const [key, value] of Object.entries(identity)) if (key !== "executionEpoch" && key !== "deadlineAt" && key !== "budget") boundedString(value, key);
  safeInteger(identity.executionEpoch, "executionEpoch"); safeInteger(identity.deadlineAt, "deadlineAt"); validateBudget(identity.budget);
  if (identity.contractVersion !== MASTER_CONTRACT_VERSION) throw new WriteExecutionError("CONTRACT_MISMATCH", "contractVersion does not match master contract");
  if (identity.architectureId !== ARCHITECTURE_ID) throw new WriteExecutionError("CONTRACT_MISMATCH", "architectureId does not match architecture contract");
  if (identity.deadlineAt <= Date.now()) throw new WriteExecutionError("DEADLINE_EXCEEDED", "deadline has expired");
}
function validateStatement(statement: string): void {
  const firstToken = statement.trim().match(/^[A-Za-z]+/)?.[0]?.toUpperCase();
  if (!firstToken || !["INSERT", "UPDATE", "DELETE", "REPLACE"].includes(firstToken)) throw new WriteExecutionError("INVALID_REQUEST", "statement must be a single DML write operation");
  if (statement.includes(";")) throw new WriteExecutionError("INVALID_REQUEST", "multi-statement SQL is forbidden");
}
function validateOperation(operation: WriteOperation): void {
  boundedString(operation.statement, "statement"); validateStatement(operation.statement);
  if (operation.bindings.length > 128) throw new WriteExecutionError("INVALID_REQUEST", "too many bindings");
  if (operation.retryable && (!operation.idempotencyKey || operation.idempotencyKey.length > 256)) throw new WriteExecutionError("IDEMPOTENCY_KEY_REQUIRED", "retryable writes require a bounded idempotency key");
  if (operation.expectedWriteCount !== undefined) safeInteger(operation.expectedWriteCount, "expectedWriteCount");
  if (operation.retryable && !operation.atomicIdempotency) throw new WriteExecutionError("INVALID_REQUEST", "retryable writes require an atomic idempotency protocol");
  if (operation.atomicIdempotency) { boundedString(operation.atomicIdempotency.guardedMutation.sql, "guardedMutation.sql"); validateStatement(operation.atomicIdempotency.guardedMutation.sql); }
}
function ensureBudget(identity: WriteIdentity, statements: number, rows: number, payloadBytes: number, retries: number): void {
  const b = identity.budget;
  if (statements > b.d1Statements || rows > b.rowsWritten || payloadBytes > b.payloadBytes || retries > b.retries) throw new WriteExecutionError("BUDGET_EXCEEDED", "write result exceeds admitted budget");
}
function payloadSize(value: unknown): number { return JSON.stringify(value).length; }
function checkAbort(signal?: AbortSignal): void { if (signal?.aborted) throw new WriteExecutionError("CANCELLED", "execution cancelled before admission"); }

const CLAIM_SQL = `INSERT INTO ${IDEMPOTENCY_TABLE} (tenant_id, principal_scope, operation, operation_version, idempotency_key, owner_request_id, state, affected_rows) VALUES (?, ?, ?, ?, ?, ?, 'IN_FLIGHT', NULL) ON CONFLICT (tenant_id, principal_scope, operation, operation_version, idempotency_key) DO NOTHING`;
const COMMIT_SQL = `UPDATE ${IDEMPOTENCY_TABLE} SET state = 'COMMITTED', affected_rows = changes(), committed_at = unixepoch() WHERE tenant_id = ? AND principal_scope = ? AND operation = ? AND operation_version = ? AND idempotency_key = ? AND owner_request_id = ? AND state = 'IN_FLIGHT'`;
const REPLAY_SQL = `SELECT state, owner_request_id, affected_rows FROM ${IDEMPOTENCY_TABLE} WHERE tenant_id = ? AND principal_scope = ? AND operation = ? AND operation_version = ? AND idempotency_key = ?`;

async function replayState(db: D1DatabaseLike, identity: WriteIdentity, key: string): Promise<{ state: string; affectedRows: number } | undefined> {
  const result = await db.prepare(REPLAY_SQL).bind(identity.tenantId, identity.principalScope, identity.operation, identity.operationVersion, key).all<{ state: string; affected_rows: number | null }>();
  const row = result.results[0]; return row ? { state: row.state, affectedRows: row.affected_rows ?? 0 } : undefined;
}

export async function executeWrite(db: D1DatabaseLike, identity: WriteIdentity, operation: WriteOperation, signal?: AbortSignal): Promise<WriteResult> {
  validateIdentity(identity); validateOperation(operation); checkAbort(signal);
  if (!identity.logicalTargetId) throw new WriteExecutionError("TARGET_REQUIRED", "logicalTargetId is required");

  if (operation.retryable) {
    const key = operation.idempotencyKey as string;
    const existing = await replayState(db, identity, key);
    if (existing?.state === "COMMITTED") {
      ensureBudget(identity, 1, 0, 0, 1);
      return { status: "REPLAYED", requestId: identity.requestId, contractId: identity.contractId, contractVersion: identity.contractVersion, logicalTargetId: identity.logicalTargetId, executionEpoch: identity.executionEpoch, accounting: { d1Statements: 1, rowsWritten: 0, payloadBytes: 0, retries: 1 }, affectedRows: existing.affectedRows, idempotencyState: "COMMITTED" };
    }
    if (existing?.state === "IN_FLIGHT") throw new WriteExecutionError("IDEMPOTENCY_CONFLICT", "idempotency key is already in flight");

    ensureBudget(identity, 3, 0, 0, 0); checkAbort(signal);
    const protocol = operation.atomicIdempotency as AtomicIdempotencyProtocol;
    const claim = db.prepare(CLAIM_SQL).bind(identity.tenantId, identity.principalScope, identity.operation, identity.operationVersion, key, identity.requestId);
    const mutation = db.prepare(protocol.guardedMutation.sql).bind(...protocol.guardedMutation.bindings);
    const commit = db.prepare(COMMIT_SQL).bind(identity.tenantId, identity.principalScope, identity.operation, identity.operationVersion, key, identity.requestId);
    let batch: D1ResultLike[];
    try { batch = await db.batch([claim, mutation, commit]); } catch { throw new WriteExecutionError("D1_EXECUTION_FAILED", "write transaction failed"); }
    const mutationResult = batch[1];
    const affectedRows = mutationResult?.meta?.changes ?? 0;
    const rowsWritten = mutationResult?.meta?.rows_written ?? affectedRows;
    const payloadBytes = payloadSize({ affectedRows });
    ensureBudget(identity, 3, rowsWritten, payloadBytes, 0);
    if (operation.expectedWriteCount !== undefined && affectedRows !== operation.expectedWriteCount) throw new WriteExecutionError("D1_RESULT_INVALID", "affected row count does not match expectedWriteCount");
    const state = await replayState(db, identity, key);
    if (!state || state.state !== "COMMITTED") throw new WriteExecutionError("COMMIT_UNKNOWN", "authoritative commit state could not be confirmed");
    return { status: "COMMITTED", requestId: identity.requestId, contractId: identity.contractId, contractVersion: identity.contractVersion, logicalTargetId: identity.logicalTargetId, executionEpoch: identity.executionEpoch, accounting: { d1Statements: 4, rowsWritten, payloadBytes, retries: 0 }, affectedRows, idempotencyState: "COMMITTED" };
  }

  ensureBudget(identity, 1, 0, 0, 0); checkAbort(signal);
  let result: D1ResultLike;
  try { result = await db.prepare(operation.statement).bind(...operation.bindings).run(); } catch { throw new WriteExecutionError("D1_EXECUTION_FAILED", "write execution failed"); }
  const affectedRows = result.meta?.changes ?? 0;
  const rowsWritten = result.meta?.rows_written ?? affectedRows;
  const payloadBytes = payloadSize({ affectedRows });
  ensureBudget(identity, 1, rowsWritten, payloadBytes, 0);
  if (operation.expectedWriteCount !== undefined && affectedRows !== operation.expectedWriteCount) throw new WriteExecutionError("D1_RESULT_INVALID", "affected row count does not match expectedWriteCount");
  return { status: "COMMITTED", requestId: identity.requestId, contractId: identity.contractId, contractVersion: identity.contractVersion, logicalTargetId: identity.logicalTargetId, executionEpoch: identity.executionEpoch, accounting: { d1Statements: 1, rowsWritten, payloadBytes, retries: 0 }, affectedRows };
}
