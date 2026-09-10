export const MASTER_CONTRACT_VERSION = "D1F-3.0-MASTER-v1.0" as const;
export const ARCHITECTURE_ID = "D1F-3.0-ARCH-v1.0" as const;
export type ExecutionMode = "READ" | "WRITE";

export interface BudgetLimits {
  readonly fanout: number;
  readonly concurrency: number;
  readonly d1Statements: number;
  readonly rowsRead: number;
  readonly rowsWritten: number;
  readonly retries: number;
  readonly payloadBytes: number;
}
export interface ExecutionRequest {
  readonly requestId: string;
  readonly tenantId: string;
  readonly principalScope: string;
  readonly operation: string;
  readonly operationVersion: string;
  readonly deadlineAt: number;
  readonly budget: BudgetLimits;
}
export interface VersionedExecutionContract {
  readonly contractId: string;
  readonly contractVersion: string;
  readonly operation: string;
  readonly operationVersion: string;
  readonly mode: ExecutionMode;
  readonly maxDeadlineMs: number;
  readonly limits: BudgetLimits;
}
export interface ExecutionPlan {
  readonly planId: string;
  readonly contractId: string;
  readonly contractVersion: string;
  readonly architectureId: typeof ARCHITECTURE_ID;
  readonly operation: string;
  readonly operationVersion: string;
  readonly requestId: string;
  readonly tenantId: string;
  readonly principalScope: string;
  readonly mode: ExecutionMode;
  readonly deadlineAt: number;
  readonly budgetCeiling: BudgetLimits;
  readonly requestedBudget: BudgetLimits;
  readonly routingRequired: true;
  readonly routingResolved: false;
}
export class PlanCompileError extends Error {
  readonly code: "INVALID_REQUEST" | "INVALID_CONTRACT" | "BUDGET_EXCEEDED" | "DEADLINE_EXCEEDED" | "INVALID_LIMIT";
  constructor(code: PlanCompileError["code"], message: string) { super(message); this.name = "PlanCompileError"; this.code = code; }
}
const LIMIT_KEYS: readonly (keyof BudgetLimits)[] = ["fanout", "concurrency", "d1Statements", "rowsRead", "rowsWritten", "retries", "payloadBytes"];
function assertSafeLimit(value: unknown, field: string): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new PlanCompileError("INVALID_LIMIT", `${field} must be a non-negative safe integer`);
}
function assertBudget(value: unknown, field: string): asserts value is BudgetLimits {
  if (value === null || typeof value !== "object") throw new PlanCompileError("INVALID_LIMIT", `${field} must be an object`);
  const record = value as Record<string, unknown>;
  for (const key of LIMIT_KEYS) assertSafeLimit(record[key], `${field}.${key}`);
}
function assertNonEmptyBounded(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 256) throw new PlanCompileError("INVALID_REQUEST", `${field} must be a bounded non-empty string`);
}
function assertRequest(request: ExecutionRequest): void {
  if (request === null || typeof request !== "object") throw new PlanCompileError("INVALID_REQUEST", "request must be an object");
  assertNonEmptyBounded(request.requestId, "requestId"); assertNonEmptyBounded(request.tenantId, "tenantId"); assertNonEmptyBounded(request.principalScope, "principalScope");
  assertNonEmptyBounded(request.operation, "operation"); assertNonEmptyBounded(request.operationVersion, "operationVersion"); assertSafeLimit(request.deadlineAt, "deadlineAt"); assertBudget(request.budget, "request.budget");
}
function assertContract(contract: VersionedExecutionContract): void {
  if (contract === null || typeof contract !== "object") throw new PlanCompileError("INVALID_CONTRACT", "contract must be an object");
  assertNonEmptyBounded(contract.contractId, "contractId"); assertNonEmptyBounded(contract.contractVersion, "contractVersion"); assertNonEmptyBounded(contract.operation, "operation"); assertNonEmptyBounded(contract.operationVersion, "operationVersion");
  if (contract.mode !== "READ" && contract.mode !== "WRITE") throw new PlanCompileError("INVALID_CONTRACT", "mode must be READ or WRITE");
  assertSafeLimit(contract.maxDeadlineMs, "maxDeadlineMs"); assertBudget(contract.limits, "contract.limits");
}
function freezeBudget(value: BudgetLimits): BudgetLimits { return Object.freeze({ ...value }); }
function stableFingerprint(parts: readonly string[]): string {
  let hash = 2166136261;
  for (const part of parts) for (let index = 0; index < part.length; index += 1) { hash ^= part.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
export function compileExecutionPlan(request: ExecutionRequest, contract: VersionedExecutionContract): ExecutionPlan {
  assertRequest(request); assertContract(contract);
  if (contract.contractVersion !== MASTER_CONTRACT_VERSION) throw new PlanCompileError("INVALID_CONTRACT", "contractVersion does not match master contract");
  if (request.operation !== contract.operation || request.operationVersion !== contract.operationVersion) throw new PlanCompileError("INVALID_CONTRACT", "request operation does not match execution contract");
  for (const key of LIMIT_KEYS) if (request.budget[key] > contract.limits[key]) throw new PlanCompileError("BUDGET_EXCEEDED", `${key} exceeds contract ceiling`);
  const remainingMs = request.deadlineAt - Date.now();
  if (remainingMs <= 0) throw new PlanCompileError("DEADLINE_EXCEEDED", "request deadline is not in the future");
  if (remainingMs > contract.maxDeadlineMs) throw new PlanCompileError("DEADLINE_EXCEEDED", "request deadline exceeds contract ceiling");
  const planId = stableFingerprint([request.requestId, request.tenantId, request.operation, request.operationVersion, contract.contractId, contract.contractVersion, String(request.deadlineAt)]);
  return Object.freeze({
    planId, contractId: contract.contractId, contractVersion: contract.contractVersion, architectureId: ARCHITECTURE_ID,
    operation: request.operation, operationVersion: request.operationVersion, requestId: request.requestId, tenantId: request.tenantId,
    principalScope: request.principalScope, mode: contract.mode, deadlineAt: request.deadlineAt,
    budgetCeiling: freezeBudget(contract.limits), requestedBudget: freezeBudget(request.budget), routingRequired: true, routingResolved: false,
  });
}
