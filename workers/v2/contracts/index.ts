export const MASTER_CONTRACT_VERSION = "D1F-3.0-MASTER-v1.0" as const;
export const ARCHITECTURE_ID = "D1F-3.0-ARCH-v1.0" as const;
export const ENVELOPE_VERSION = "1.0" as const;

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

export interface ExecutionEnvelope {
  readonly envelopeVersion: typeof ENVELOPE_VERSION;
  readonly contractVersion: typeof MASTER_CONTRACT_VERSION;
  readonly architectureId: typeof ARCHITECTURE_ID;
  readonly requestId: string;
  readonly tenantId: string;
  readonly principalScope: string;
  readonly operation: string;
  readonly operationVersion: string;
  readonly deadlineAt: number;
  readonly budget: BudgetLimits;
  readonly payload: unknown;
}

export function freezeBudget(budget: BudgetLimits): BudgetLimits {
  return Object.freeze({ ...budget });
}

export function freezeEnvelope(envelope: ExecutionEnvelope): ExecutionEnvelope {
  return Object.freeze({
    ...envelope,
    budget: freezeBudget(envelope.budget),
  });
}
