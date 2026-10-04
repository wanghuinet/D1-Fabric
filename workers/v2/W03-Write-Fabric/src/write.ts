import { inspectD1Capabilities } from "./provider-capabilities.ts";
export const MASTER_CONTRACT_VERSION = "D1F-3.0-MASTER-v1.0" as const;
export const ARCHITECTURE_ID = "D1F-3.0-ARCH-v1.0" as const;
export const IDEMPOTENCY_TABLE = "__d1f_idempotency" as const;

export type D1Value = string | number | null | ArrayBuffer;
export type WriteErrorCode =
  | "INVALID_REQUEST" | "CONTRACT_MISMATCH" | "IDENTITY_MISMATCH" | "TARGET_REQUIRED" | "TARGET_UNSUPPORTED"
  | "STALE_EXECUTION_EPOCH" | "STALE_TOPOLOGY_VERSION" | "DEADLINE_EXCEEDED" | "CANCELLED" | "BUDGET_EXCEEDED" | "IDEMPOTENCY_KEY_REQUIRED"
  | "IDEMPOTENCY_CONFLICT" | "D1_EXECUTION_FAILED" | "D1_RESULT_INVALID" | "COMMIT_UNKNOWN" | "UNSUPPORTED_CROSS_TARGET_WRITE";

export class WriteExecutionError extends Error {
  readonly code: WriteErrorCode;
  constructor(code: WriteErrorCode, message: string) { super(message); this.name = "WriteExecutionError"; this.code = code; }
}

export interface WriteBudget { readonly d1Statements: number; readonly rowsWritten: number; readonly payloadBytes: number; readonly retries: number; }
export interface WriteIdentity {
  readonly requestId: string; readonly planId: string; readonly contractId: string; readonly contractVersion: string;
  readonly architectureId: string; readonly tenantId: string; readonly principalScope: string; readonly operation: string;
  readonly operationVersion: string; readonly logicalDatabaseId: string; readonly logicalShardId: string; readonly logicalTargetId: string;
  readonly physicalShardId: string; readonly topologyVersion: number; readonly executionEpoch: number; readonly deadlineAt: number;
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
  readonly logicalTargetId: string; readonly physicalShardId: string; readonly topologyVersion: number; readonly executionEpoch: number;
  readonly accounting: WriteAccounting; readonly affectedRows: number; readonly idempotencyState?: "COMMITTED";
}

function boundedString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 256) throw new WriteExecutionError("INVALID_REQUEST", `${field} must be a bounded non-empty string`);
}
function safeInteger(value: unknown, field: string): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new WriteExecutionError("INVALID_REQUEST", `${field} must be a non-negative safe integer`);
}
function validateBudget(budget: WriteBudget): void { for (const key of ["d1Statements", "rowsWritten", "payloadBytes", "retries"] as const) safeInteger(budget[key], `budget.${key}`); }
function validateIdentity(identity: WriteIdentity): void {
  for (const [key, value] of Object.entries(identity)) if (key !== "topologyVersion" && key !== "executionEpoch" && key !== "deadlineAt" && key !== "budget") boundedString(value, key);
  safeInteger(identity.topologyVersion, "topologyVersion");
  if (identity.topologyVersion === 0) throw new WriteExecutionError("STALE_TOPOLOGY_VERSION", "topologyVersion must be a positive published version");
  safeInteger(identity.executionEpoch, "executionEpoch");
  if (identity.executionEpoch === 0) throw new WriteExecutionError("STALE_EXECUTION_EPOCH", "executionEpoch must be a positive admissible epoch");
  safeInteger(identity.deadlineAt, "deadlineAt"); validateBudget(identity.budget);
  if (identity.contractVersion !== MASTER_CONTRACT_VERSION) throw new WriteExecutionError("CONTRACT_MISMATCH", "contractVersion does not match master contract");
  if (identity.architectureId !== ARCHITECTURE_ID) throw new WriteExecutionError("CONTRACT_MISMATCH", "architectureId does not match architecture contract");
  if (identity.deadlineAt <= Date.now()) throw new WriteExecutionError("DEADLINE_EXCEEDED", "deadline has expired");
}
function hasUnquotedSemicolon(statement: string): boolean {
  let quote: "'" | '"' | "`" | "]" | undefined;
  for (let i = 0; i < statement.length; i += 1) {
    const char = statement[i];
    if (quote) {
      if (quote === "]") { if (char === "]") quote = undefined; continue; }
      if (char === quote) { if (statement[i + 1] === quote) { i += 1; continue; } quote = undefined; }
      continue;
    }
    if (char === "'" || char === '"' || char === "`") { quote = char; continue; }
    if (char === "[") { quote = "]"; continue; }
    if (char === ";") return true;
  }
  return false;
}
function validateStatement(statement: string): void {
  const firstToken = statement.trim().match(/^[A-Za-z]+/)?.[0]?.toUpperCase();
  if (!firstToken || !["INSERT", "UPDATE", "DELETE", "REPLACE"].includes(firstToken)) throw new WriteExecutionError("INVALID_REQUEST", "statement must be a single DML write operation");
  if (hasUnquotedSemicolon(statement)) throw new WriteExecutionError("INVALID_REQUEST", "multi-statement SQL is forbidden");
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

const CLAIM_SQL = `INSERT INTO ${IDEMPOTENCY_TABLE} (tenant_id, principal_scope, operation, operation_version, idempotency_key, owner_request_id, state, affected_rows) VALUES (?, ?, ?, ?, ?, ?, 'IN_FLIGHT', NULL) ON CONFLICT (tenant_id, principal_scope, operation, operation_version, idempotency_key) DO UPDATE SET owner_request_id = excluded.owner_request_id, state = 'IN_FLIGHT', affected_rows = NULL, created_at = unixepoch() WHERE state = 'FAILED'`;
const COMMIT_SQL = `UPDATE ${IDEMPOTENCY_TABLE} SET state = 'COMMITTED', affected_rows = changes(), committed_at = unixepoch() WHERE tenant_id = ? AND principal_scope = ? AND operation = ? AND operation_version = ? AND idempotency_key = ? AND owner_request_id = ? AND state = 'IN_FLIGHT'`;
const FAILED_SQL = `UPDATE ${IDEMPOTENCY_TABLE} SET state = 'FAILED', affected_rows = NULL, committed_at = NULL WHERE tenant_id = ? AND principal_scope = ? AND operation = ? AND operation_version = ? AND idempotency_key = ? AND owner_request_id = ? AND state = 'IN_FLIGHT'`;
const REPLAY_SQL = `SELECT state, owner_request_id, affected_rows FROM ${IDEMPOTENCY_TABLE} WHERE tenant_id = ? AND principal_scope = ? AND operation = ? AND operation_version = ? AND idempotency_key = ?`;

async function replayState(db: D1DatabaseLike, identity: WriteIdentity, key: string): Promise<{ state: string; affectedRows: number } | undefined> {
  const result = await db.prepare(REPLAY_SQL).bind(identity.tenantId, identity.principalScope, identity.operation, identity.operationVersion, key).all<{ state: string; affected_rows: number | null }>();
  const row = result.results[0]; return row ? { state: row.state, affectedRows: row.affected_rows ?? 0 } : undefined;
}

export async function executeWrite(db: D1DatabaseLike, identity: WriteIdentity, operation: WriteOperation, signal?: AbortSignal): Promise<WriteResult> {
  validateIdentity(identity); validateOperation(operation); checkAbort(signal);
  if (!identity.logicalTargetId) throw new WriteExecutionError("TARGET_REQUIRED", "logicalTargetId is required");

  if (operation.retryable) {
    const capabilities = inspectD1Capabilities(db);
    if (!capabilities.atomicBatch) throw new WriteExecutionError("TARGET_UNSUPPORTED", "retryable writes require atomic D1 batch capability");
    const key = operation.idempotencyKey as string;
    ensureBudget(identity, 1, 0, 0, 0);
    const existing = await replayState(db, identity, key);
    if (existing?.state === "COMMITTED") {
      ensureBudget(identity, 1, 0, 0, 1);
      return { status: "REPLAYED", requestId: identity.requestId, contractId: identity.contractId, contractVersion: identity.contractVersion, logicalTargetId: identity.logicalTargetId, physicalShardId: identity.physicalShardId, topologyVersion: identity.topologyVersion, executionEpoch: identity.executionEpoch, accounting: { d1Statements: 1, rowsWritten: 0, payloadBytes: 0, retries: 1 }, affectedRows: existing.affectedRows, idempotencyState: "COMMITTED" };
    }

    const payloadBytes = payloadSize(operation);
    ensureBudget(identity, 5, Math.min(operation.expectedWriteCount ?? identity.budget.rowsWritten, identity.budget.rowsWritten), payloadBytes, 0);
    const claim = db.prepare(CLAIM_SQL).bind(identity.tenantId, identity.principalScope, identity.operation, identity.operationVersion, key, identity.requestId);
    const claimGuarded = operation.atomicIdempotency!.guardedMutation;
    const mutation = db.prepare(claimGuarded.sql).bind(...claimGuarded.bindings);
    const commit = db.prepare(COMMIT_SQL).bind(identity.tenantId, identity.principalScope, identity.operation, identity.operationVersion, key, identity.requestId);
    try {
      const results = await db.batch([claim, mutation, commit]);
      const mutationResult = results[1];
      const commitResult = results[2];
      if (!mutationResult?.success || !commitResult?.success) {
        await db.prepare(FAILED_SQL).bind(identity.tenantId, identity.principalScope, identity.operation, identity.operationVersion, key, identity.requestId).run().catch(() => undefined);
        throw new WriteExecutionError("D1_EXECUTION_FAILED", "retryable write batch failed");
      }
      const affectedRows = Number(commitResult.meta?.changes ?? mutationResult.meta?.changes ?? 0);
      if (!Number.isSafeInteger(affectedRows) || affectedRows < 0 || (operation.expectedWriteCount !== undefined && affectedRows !== operation.expectedWriteCount)) {
        await db.prepare(FAILED_SQL).bind(identity.tenantId, identity.principalScope, identity.operation, identity.operationVersion, key, identity.requestId).run().catch(() => undefined);
        throw new WriteExecutionError("D1_RESULT_INVALID", "affected row count is invalid or unexpected");
      }
      ensureBudget(identity, 5, affectedRows, payloadBytes, 0);
      return { status: "COMMITTED", requestId: identity.requestId, contractId: identity.contractId, contractVersion: identity.contractVersion, logicalTargetId: identity.logicalTargetId, physicalShardId: identity.physicalShardId, topologyVersion: identity.topologyVersion, executionEpoch: identity.executionEpoch, accounting: { d1Statements: 5, rowsWritten: affectedRows, payloadBytes, retries: 0 }, affectedRows };
    } catch (error) {
      if (error instanceof WriteExecutionError) throw error;
      const committed = await replayState(db, identity, key).catch(() => undefined);
      if (committed?.state === "COMMITTED") {
        return { status: "COMMITTED", requestId: identity.requestId, contractId: identity.contractId, contractVersion: identity.contractVersion, logicalTargetId: identity.logicalTargetId, physicalShardId: identity.physicalShardId, topologyVersion: identity.topologyVersion, executionEpoch: identity.executionEpoch, accounting: { d1Statements: 5, rowsWritten: committed.affectedRows, payloadBytes, retries: 0 }, affectedRows: committed.affectedRows };
      }
      throw new WriteExecutionError("COMMIT_UNKNOWN", "write outcome is unknown after transport failure");
    }
  }

  ensureBudget(identity, 1, 0, 0, 0);
  try {
    const result = await db.prepare(operation.statement).bind(...operation.bindings).run();
    if (!result.success) throw new WriteExecutionError("D1_EXECUTION_FAILED", "write execution failed");
    const affectedRows = Number(result.meta?.changes ?? 0);
    if (!Number.isSafeInteger(affectedRows) || affectedRows < 0 || (operation.expectedWriteCount !== undefined && affectedRows !== operation.expectedWriteCount)) throw new WriteExecutionError("D1_RESULT_INVALID", "affected row count is invalid or unexpected");
    const payloadBytes = payloadSize(operation);
    ensureBudget(identity, 1, affectedRows, payloadBytes, 0);
    return { status: "COMMITTED", requestId: identity.requestId, contractId: identity.contractId, contractVersion: identity.contractVersion, logicalTargetId: identity.logicalTargetId, physicalShardId: identity.physicalShardId, topologyVersion: identity.topologyVersion, executionEpoch: identity.executionEpoch, accounting: { d1Statements: 1, rowsWritten: affectedRows, payloadBytes, retries: 0 }, affectedRows };
  } catch (error) {
    if (error instanceof WriteExecutionError) throw error;
    throw new WriteExecutionError("D1_EXECUTION_FAILED", "write execution failed");
  }
}
