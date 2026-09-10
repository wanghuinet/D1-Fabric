import type { BudgetLimits } from "../../contracts/index.ts";

export const W01_LIMITS = Object.freeze({
  maxPayloadBytes: 1_048_576,
  maxDeadlineMs: 25_000,
  maxFanout: 0,
  maxConcurrency: 0,
  maxD1Statements: 0,
  maxRowsRead: 0,
  maxRowsWritten: 0,
  maxRetries: 0,
} as const);

const MAX_ID_LENGTH = 128;
const MAX_VERSION_LENGTH = 32;
const MAX_AUTH_SCOPE_LENGTH = 256;
const OPERATION_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

export type GatewayBudget = Omit<BudgetLimits, "payloadBytes">;

export type GatewayRequest = {
  requestId: string;
  tenantId: string;
  principalScope: string;
  operation: string;
  operationVersion: string;
  deadlineAt: number;
  budget: GatewayBudget;
  payload: unknown;
};

export type ValidationFailureCode =
  | "INVALID_REQUEST"
  | "INVALID_BUDGET"
  | "BUDGET_EXCEEDED"
  | "INVALID_DEADLINE"
  | "PAYLOAD_TOO_LARGE";

export class ValidationError extends Error {
  readonly code: ValidationFailureCode;
  readonly status: 400 | 413;

  constructor(code: ValidationFailureCode, message: string, status: 400 | 413 = 400) {
    super(message);
    this.name = "ValidationError";
    this.code = code;
    this.status = status;
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string" || value.length === 0 || value.length > maxLength) {
    throw new ValidationError("INVALID_REQUEST", `${field} is invalid`);
  }
  return value;
}

function requiredToken(value: unknown, field: string, maxLength: number): string {
  const result = requiredString(value, field, maxLength);
  if (!OPERATION_TOKEN.test(result)) {
    throw new ValidationError("INVALID_REQUEST", `${field} is invalid`);
  }
  return result;
}

function nonNegativeInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new ValidationError("INVALID_BUDGET", `${field} is invalid`);
  }
  return value;
}

export function parseAndValidateBody(raw: unknown, nowMs: number): GatewayRequest {
  if (!isPlainRecord(raw)) {
    throw new ValidationError("INVALID_REQUEST", "request body must be an object");
  }

  const requestId = requiredString(raw.requestId, "requestId", MAX_ID_LENGTH);
  const tenantId = requiredString(raw.tenantId, "tenantId", MAX_ID_LENGTH);
  const principalScope = requiredString(raw.principalScope, "principalScope", MAX_AUTH_SCOPE_LENGTH);
  const operation = requiredToken(raw.operation, "operation", MAX_ID_LENGTH);
  const operationVersion = requiredToken(raw.operationVersion, "operationVersion", MAX_VERSION_LENGTH);

  const deadlineAt = raw.deadlineAt;
  if (typeof deadlineAt !== "number" || !Number.isSafeInteger(deadlineAt)) {
    throw new ValidationError("INVALID_DEADLINE", "deadlineAt is invalid");
  }
  if (deadlineAt <= nowMs || deadlineAt > nowMs + W01_LIMITS.maxDeadlineMs) {
    throw new ValidationError("INVALID_DEADLINE", "deadlineAt is outside the allowed window");
  }

  if (!isPlainRecord(raw.budget)) {
    throw new ValidationError("INVALID_BUDGET", "budget is required");
  }

  const budget: GatewayBudget = {
    fanout: nonNegativeInteger(raw.budget.fanout, "fanout"),
    concurrency: nonNegativeInteger(raw.budget.concurrency, "concurrency"),
    d1Statements: nonNegativeInteger(raw.budget.d1Statements, "d1Statements"),
    rowsRead: nonNegativeInteger(raw.budget.rowsRead, "rowsRead"),
    rowsWritten: nonNegativeInteger(raw.budget.rowsWritten, "rowsWritten"),
    retries: nonNegativeInteger(raw.budget.retries, "retries"),
  };

  for (const [key, value] of Object.entries(W01_LIMITS)) {
    if (key === "maxPayloadBytes" || key === "maxDeadlineMs") continue;
    const budgetKey = key.replace(/^max/, "");
    const normalizedKey = budgetKey.charAt(0).toLowerCase() + budgetKey.slice(1);
    if (value === 0 && budget[normalizedKey as keyof GatewayBudget] !== 0) {
      throw new ValidationError("BUDGET_EXCEEDED", `${normalizedKey} exceeds W01 admission envelope`);
    }
  }

  return {
    requestId,
    tenantId,
    principalScope,
    operation,
    operationVersion,
    deadlineAt,
    budget,
    payload: raw.payload,
  };
}
