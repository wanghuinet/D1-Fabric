export interface AdmissionDemand {
  fanout: number;
  concurrency: number;
  statements: number;
  rowsRead: number;
  rowsWrite: number;
  deadlineMs: number;
  retries: number;
}

export interface AdmissionLimits {
  maxFanout: number;
  maxConcurrency: number;
  maxStatements: number;
  maxRowsRead: number;
  maxRowsWrite: number;
  deadlineMs: number;
  maxRetries: number;
}

export type AdmissionRejectCode =
  | "INVALID_DEMAND"
  | "FANOUT_EXCEEDED"
  | "CONCURRENCY_EXCEEDED"
  | "STATEMENTS_EXCEEDED"
  | "ROWS_READ_EXCEEDED"
  | "ROWS_WRITE_EXCEEDED"
  | "DEADLINE_EXCEEDED"
  | "RETRIES_EXCEEDED";

export interface AdmissionDecision {
  admitted: boolean;
  code?: AdmissionRejectCode;
}

const positiveSafeInt = (value: number): boolean =>
  Number.isSafeInteger(value) && value > 0;

const nonNegativeSafeInt = (value: number): boolean =>
  Number.isSafeInteger(value) && value >= 0;

export function validateAdmissionDemand(demand: AdmissionDemand): void {
  if (!positiveSafeInt(demand.fanout)) throw new Error("invalid fanout");
  if (!positiveSafeInt(demand.concurrency)) throw new Error("invalid concurrency");
  if (!positiveSafeInt(demand.statements)) throw new Error("invalid statements");
  if (!nonNegativeSafeInt(demand.rowsRead)) throw new Error("invalid rowsRead");
  if (!nonNegativeSafeInt(demand.rowsWrite)) throw new Error("invalid rowsWrite");
  if (!positiveSafeInt(demand.deadlineMs)) throw new Error("invalid deadlineMs");
  if (!nonNegativeSafeInt(demand.retries)) throw new Error("invalid retries");
}

export function validateAdmissionLimits(limits: AdmissionLimits): void {
  if (!positiveSafeInt(limits.maxFanout)) throw new Error("invalid maxFanout");
  if (!positiveSafeInt(limits.maxConcurrency)) throw new Error("invalid maxConcurrency");
  if (!positiveSafeInt(limits.maxStatements)) throw new Error("invalid maxStatements");
  if (!nonNegativeSafeInt(limits.maxRowsRead)) throw new Error("invalid maxRowsRead");
  if (!nonNegativeSafeInt(limits.maxRowsWrite)) throw new Error("invalid maxRowsWrite");
  if (!positiveSafeInt(limits.deadlineMs)) throw new Error("invalid deadlineMs");
  if (!nonNegativeSafeInt(limits.maxRetries)) throw new Error("invalid maxRetries");
}

export function admit(demand: AdmissionDemand, limits: AdmissionLimits): AdmissionDecision {
  try {
    validateAdmissionDemand(demand);
    validateAdmissionLimits(limits);
  } catch {
    return { admitted: false, code: "INVALID_DEMAND" };
  }

  if (demand.fanout > limits.maxFanout) return { admitted: false, code: "FANOUT_EXCEEDED" };
  if (demand.concurrency > limits.maxConcurrency) return { admitted: false, code: "CONCURRENCY_EXCEEDED" };
  if (demand.statements > limits.maxStatements) return { admitted: false, code: "STATEMENTS_EXCEEDED" };
  if (demand.rowsRead > limits.maxRowsRead) return { admitted: false, code: "ROWS_READ_EXCEEDED" };
  if (demand.rowsWrite > limits.maxRowsWrite) return { admitted: false, code: "ROWS_WRITE_EXCEEDED" };
  if (demand.deadlineMs > limits.deadlineMs) return { admitted: false, code: "DEADLINE_EXCEEDED" };
  if (demand.retries > limits.maxRetries) return { admitted: false, code: "RETRIES_EXCEEDED" };

  return { admitted: true };
}
