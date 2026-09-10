export const W01_LIMITS = Object.freeze({
  maxPayloadBytes: 1_048_576,
  maxDeadlineMs: 25_000,
  maxIdLength: 256,
  maxScopeLength: 256,
} as const);

const OPERATION_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const MASTER_CONTRACT_VERSION = "D1F-3.0-MASTER-v1.0";
const ARCHITECTURE_ID = "D1F-3.0-ARCH-v1.0";

export type GatewayRequest = {
  readonly requestId: string;
  readonly tenantId: string;
  readonly principalScope: string;
  readonly operation: string;
  readonly operationVersion: string;
  readonly deadlineAt: number;
  readonly budget: Record<string, unknown>;
  readonly payload?: unknown;
};

export type GatewayContract = {
  readonly contractId: string;
  readonly contractVersion: string;
  readonly operation: string;
  readonly operationVersion: string;
  readonly mode: "READ" | "WRITE";
  readonly maxDeadlineMs: number;
  readonly limits: Record<string, unknown>;
};

export type GatewayEnvelope = Readonly<{
  request: GatewayRequest;
  contract: GatewayContract;
}>;

export type ValidationFailureCode = "INVALID_REQUEST" | "INVALID_CONTRACT" | "INVALID_DEADLINE" | "PAYLOAD_TOO_LARGE";

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

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringField(value: unknown, field: string, max: number): string {
  if (typeof value !== "string" || value.length === 0 || value.length > max) throw new ValidationError("INVALID_REQUEST", `${field} is invalid`);
  return value;
}

function token(value: unknown, field: string): string {
  const result = stringField(value, field, W01_LIMITS.maxIdLength);
  if (!OPERATION_TOKEN.test(result)) throw new ValidationError("INVALID_REQUEST", `${field} is invalid`);
  return result;
}

export function parseGatewayEnvelope(raw: unknown, nowMs: number): GatewayEnvelope {
  if (!record(raw) || !record(raw.request) || !record(raw.contract)) throw new ValidationError("INVALID_REQUEST", "request and contract are required");
  const request = raw.request;
  const contract = raw.contract;

  const normalizedRequest: GatewayRequest = {
    requestId: stringField(request.requestId, "requestId", W01_LIMITS.maxIdLength),
    tenantId: stringField(request.tenantId, "tenantId", W01_LIMITS.maxIdLength),
    principalScope: stringField(request.principalScope, "principalScope", W01_LIMITS.maxScopeLength),
    operation: token(request.operation, "operation"),
    operationVersion: token(request.operationVersion, "operationVersion"),
    deadlineAt: request.deadlineAt as number,
    budget: request.budget as Record<string, unknown>,
    payload: request.payload,
  };
  if (!Number.isSafeInteger(normalizedRequest.deadlineAt) || normalizedRequest.deadlineAt <= nowMs) throw new ValidationError("INVALID_DEADLINE", "deadlineAt is invalid");
  if (normalizedRequest.deadlineAt > nowMs + W01_LIMITS.maxDeadlineMs) throw new ValidationError("INVALID_DEADLINE", "deadlineAt exceeds gateway ceiling");
  if (!record(normalizedRequest.budget)) throw new ValidationError("INVALID_REQUEST", "budget is invalid");

  if (contract.contractVersion !== MASTER_CONTRACT_VERSION || contract.mode !== "READ" && contract.mode !== "WRITE") {
    throw new ValidationError("INVALID_CONTRACT", "execution contract is invalid");
  }
  const normalizedContract: GatewayContract = {
    contractId: stringField(contract.contractId, "contractId", W01_LIMITS.maxIdLength),
    contractVersion: stringField(contract.contractVersion, "contractVersion", W01_LIMITS.maxIdLength),
    operation: token(contract.operation, "contract.operation"),
    operationVersion: token(contract.operationVersion, "contract.operationVersion"),
    mode: contract.mode,
    maxDeadlineMs: contract.maxDeadlineMs as number,
    limits: contract.limits as Record<string, unknown>,
  };
  if (normalizedContract.operation !== normalizedRequest.operation || normalizedContract.operationVersion !== normalizedRequest.operationVersion) throw new ValidationError("INVALID_CONTRACT", "request and contract operation mismatch");
  if (!Number.isSafeInteger(normalizedContract.maxDeadlineMs) || normalizedContract.maxDeadlineMs < 0 || !record(normalizedContract.limits)) throw new ValidationError("INVALID_CONTRACT", "contract limits are invalid");
  if (normalizedContract.maxDeadlineMs > W01_LIMITS.maxDeadlineMs) throw new ValidationError("INVALID_CONTRACT", "contract deadline exceeds gateway ceiling");

  return Object.freeze({ request: normalizedRequest, contract: normalizedContract });
}

export { ARCHITECTURE_ID, MASTER_CONTRACT_VERSION };
