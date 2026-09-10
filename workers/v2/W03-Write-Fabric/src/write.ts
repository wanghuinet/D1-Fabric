export type WriteState = "COMMITTED" | "IN_FLIGHT" | "FAILED";
export interface Budget { readonly d1Statements: number; readonly rowsWritten: number; readonly payloadBytes: number; }
export interface WriteRequest {
  readonly requestId: string; readonly tenantId: string; readonly principalScope: string; readonly operation: string; readonly operationVersion: string; readonly contractVersion: string; readonly idempotencyKey: string; readonly logicalTargetId: string; readonly executionEpoch: string; readonly mutationSql: string; readonly mutationBindings: readonly unknown[]; readonly replayResult: unknown; readonly expectedRowsWritten: number; readonly budget: Budget; readonly deadlineAt: number; readonly actualFanout: number;
}
export interface Ledger { readonly declared: Budget; readonly reserved: Budget; readonly consumed: Budget; readonly released: Budget; }
export interface WriteResult { readonly status: "COMMITTED" | "REPLAYED" | "IN_FLIGHT" | "FAILED"; readonly requestId: string; readonly idempotencyKey: string; readonly result?: unknown; readonly error?: "INVALID_REQUEST" | "BUDGET_EXCEEDED" | "DEADLINE_EXCEEDED" | "TARGET_INVALID" | "IDEMPOTENCY_CONFLICT" | "WRITE_FAILED"; readonly ledger: Readonly<Ledger>; }
export interface D1PreparedStatementLike { bind(...values: unknown[]): D1PreparedStatementLike; first<T = unknown>(): Promise<T | null>; }
export interface D1ResultLike { readonly meta?: { readonly rows_written?: number }; }
export interface D1DatabaseLike { prepare(sql: string): D1PreparedStatementLike; batch<T extends D1ResultLike = D1ResultLike>(statements: readonly D1PreparedStatementLike[]): Promise<T[]>; }
interface IdempotencyRecord { state: WriteState; tenantId: string; principalScope: string; operation: string; operationVersion: string; contractVersion: string; resultJson: string | null; }
const IDEMPOTENCY_TABLE = "__d1_fabric_idempotency";
const MAX_TOKEN = 256; const MAX_SQL = 16_384; const MAX_BINDINGS = 64; const MAX_REPLAY_BYTES = 65_536; const MIN_STATEMENTS = 5;
export class WriteError extends Error { readonly code: NonNullable<WriteResult["error"]>; constructor(code: NonNullable<WriteResult["error"]>, message: string) { super(message); this.name = "WriteError"; this.code = code; } }
function fail(code: NonNullable<WriteResult["error"]>, message: string): never { throw new WriteError(code, message); }
function token(value: unknown, field: string): string { if (typeof value !== "string" || value.length === 0 || value.length > MAX_TOKEN) fail("INVALID_REQUEST", `${field} is invalid`); return value; }
function safeBudget(budget: unknown): asserts budget is Budget { if (budget === null || typeof budget !== "object") fail("INVALID_REQUEST", "budget is invalid"); const b = budget as Record<string, unknown>; for (const key of ["d1Statements", "rowsWritten", "payloadBytes"] as const) if (!Number.isSafeInteger(b[key]) || (b[key] as number) < 0) fail("INVALID_REQUEST", `${key} is invalid`); }
function bytes(value: string): number { return new TextEncoder().encode(value).byteLength; }
function validate(request: WriteRequest, now: number): string {
  token(request.requestId, "requestId"); token(request.tenantId, "tenantId"); token(request.principalScope, "principalScope"); token(request.operation, "operation"); token(request.operationVersion, "operationVersion"); token(request.contractVersion, "contractVersion"); token(request.idempotencyKey, "idempotencyKey"); token(request.logicalTargetId, "logicalTargetId"); token(request.executionEpoch, "executionEpoch");
  if (typeof request.mutationSql !== "string" || request.mutationSql.length === 0 || request.mutationSql.length > MAX_SQL) fail("INVALID_REQUEST", "mutationSql is invalid");
  if (!Array.isArray(request.mutationBindings) || request.mutationBindings.length > MAX_BINDINGS) fail("INVALID_REQUEST", "mutationBindings are invalid");
  if (!Number.isSafeInteger(request.expectedRowsWritten) || request.expectedRowsWritten < 0) fail("INVALID_REQUEST", "expectedRowsWritten is invalid");
  if (typeof request.deadlineAt !== "number" || !Number.isSafeInteger(request.deadlineAt) || request.deadlineAt <= now) fail("DEADLINE_EXCEEDED", "deadline is expired");
  if (!Number.isSafeInteger(request.actualFanout) || request.actualFanout !== 1) fail("TARGET_INVALID", "P08 requires exactly one admitted target");
  safeBudget(request.budget); const replay = JSON.stringify(request.replayResult); if (replay === undefined || bytes(replay) > MAX_REPLAY_BYTES) fail("INVALID_REQUEST", "replayResult is invalid or too large"); return replay;
}
function identity(request: WriteRequest): readonly unknown[] { return [request.tenantId, request.principalScope, request.operation, request.operationVersion, request.contractVersion, request.idempotencyKey]; }
function selectExisting(db: D1DatabaseLike, request: WriteRequest): Promise<IdempotencyRecord | null> { return db.prepare(`SELECT state, tenant_id AS tenantId, principal_scope AS principalScope, operation, operation_version AS operationVersion, contract_version AS contractVersion, result_json AS resultJson FROM ${IDEMPOTENCY_TABLE} WHERE tenant_id = ? AND principal_scope = ? AND operation = ? AND operation_version = ? AND contract_version = ? AND idempotency_key = ? LIMIT 1`).bind(...identity(request)).first<IdempotencyRecord>(); }
function zero(): Budget { return { d1Statements: 0, rowsWritten: 0, payloadBytes: 0 }; }
function ledger(declared: Budget, consumed: Budget): Ledger { return { declared, reserved: zero(), consumed, released: { d1Statements: declared.d1Statements - consumed.d1Statements, rowsWritten: declared.rowsWritten - consumed.rowsWritten, payloadBytes: declared.payloadBytes - consumed.payloadBytes } }; }
function replay(record: IdempotencyRecord, request: WriteRequest, resultLedger: Ledger): WriteResult { if (record.tenantId !== request.tenantId || record.principalScope !== request.principalScope || record.operation !== request.operation || record.operationVersion !== request.operationVersion || record.contractVersion !== request.contractVersion) fail("IDEMPOTENCY_CONFLICT", "idempotency binding mismatch"); if (record.state === "COMMITTED" && record.resultJson !== null) return { status: "REPLAYED", requestId: request.requestId, idempotencyKey: request.idempotencyKey, result: JSON.parse(record.resultJson), ledger: resultLedger }; if (record.state === "IN_FLIGHT") return { status: "IN_FLIGHT", requestId: request.requestId, idempotencyKey: request.idempotencyKey, ledger: resultLedger }; return { status: "FAILED", requestId: request.requestId, idempotencyKey: request.idempotencyKey, error: "WRITE_FAILED", ledger: resultLedger }; }
export async function executeWrite(db: D1DatabaseLike, request: WriteRequest, now = Date.now()): Promise<WriteResult> {
  const replayJson = validate(request, now); const replayBytes = bytes(replayJson); const minimumRows = request.expectedRowsWritten + 2;
  if (request.budget.d1Statements < MIN_STATEMENTS || request.budget.rowsWritten < minimumRows || request.budget.payloadBytes < replayBytes) return { status: "FAILED", requestId: request.requestId, idempotencyKey: request.idempotencyKey, error: "BUDGET_EXCEEDED", ledger: ledger(request.budget, zero()) };
  const existing = await selectExisting(db, request); if (existing) return replay(existing, request, ledger(request.budget, { d1Statements: 1, rowsWritten: 0, payloadBytes: 0 }));
  if (Date.now() > request.deadlineAt) return { status: "FAILED", requestId: request.requestId, idempotencyKey: request.idempotencyKey, error: "DEADLINE_EXCEEDED", ledger: ledger(request.budget, zero()) };
  const statements = [
    db.prepare(`INSERT INTO ${IDEMPOTENCY_TABLE} (tenant_id, principal_scope, operation, operation_version, contract_version, idempotency_key, state, result_json) VALUES (?, ?, ?, ?, ?, ?, 'IN_FLIGHT', NULL)`).bind(...identity(request)),
    db.prepare(request.mutationSql).bind(...request.mutationBindings),
    db.prepare(`UPDATE ${IDEMPOTENCY_TABLE} SET state = 'COMMITTED', result_json = ? WHERE tenant_id = ? AND principal_scope = ? AND operation = ? AND operation_version = ? AND contract_version = ? AND idempotency_key = ? AND state = 'IN_FLIGHT'`).bind(replayJson, ...identity(request)),
  ];
  try {
    const batchResults = await db.batch(statements); const actualRows = batchResults.reduce((sum, item) => sum + (item.meta?.rows_written ?? 0), 0); const consumedRows = Math.max(actualRows, minimumRows);
    return { status: "COMMITTED", requestId: request.requestId, idempotencyKey: request.idempotencyKey, result: JSON.parse(replayJson), ledger: ledger(request.budget, { d1Statements: 4, rowsWritten: consumedRows, payloadBytes: replayBytes }) };
  } catch {
    const authoritative = await selectExisting(db, request);
    if (authoritative) return replay(authoritative, request, ledger(request.budget, { d1Statements: 5, rowsWritten: minimumRows, payloadBytes: replayBytes }));
    return { status: "FAILED", requestId: request.requestId, idempotencyKey: request.idempotencyKey, error: "WRITE_FAILED", ledger: ledger(request.budget, zero()) };
  }
}
