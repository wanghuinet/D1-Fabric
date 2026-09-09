export type Consistency = "strong" | "bounded" | "eventual";
export type FailurePolicy = "strict" | "partial";

export interface FabricBudget {
  maxFanout: number;
  maxStatements: number;
  maxRowsRead: number;
  maxRowsWrite: number;
  deadlineMs: number;
  maxRetries: number;
}

export interface FabricOperationContract {
  operation: string;
  version: number;
  shardKey: string;
  budget: FabricBudget;
  consistency: Consistency;
  cache: "disabled" | "edge" | "worker";
  cacheTermination: boolean;
  failurePolicy: FailurePolicy;
}

export interface ExecutionPlan {
  operation: string;
  shardIds: number[];
  statementBudget: number;
  rowReadBudget: number;
  rowWriteBudget: number;
  deadlineMs: number;
}

export function validateContract(c: FabricOperationContract): void {
  if (!c.operation || c.version < 1) throw new Error("invalid operation contract");
  if (!Number.isInteger(c.budget.maxFanout) || c.budget.maxFanout < 1) throw new Error("invalid maxFanout");
  if (!Number.isInteger(c.budget.maxStatements) || c.budget.maxStatements < 1) throw new Error("invalid maxStatements");
  if (!Number.isInteger(c.budget.maxRowsRead) || c.budget.maxRowsRead < 0) throw new Error("invalid maxRowsRead");
  if (!Number.isInteger(c.budget.maxRowsWrite) || c.budget.maxRowsWrite < 0) throw new Error("invalid maxRowsWrite");
  if (!Number.isInteger(c.budget.deadlineMs) || c.budget.deadlineMs <= 0) throw new Error("invalid deadlineMs");
  if (!Number.isInteger(c.budget.maxRetries) || c.budget.maxRetries < 0) throw new Error("invalid maxRetries");
}

export function allocateRows(globalRows: number, shardCount: number): number[] {
  if (!Number.isInteger(globalRows) || globalRows < 0) throw new Error("invalid globalRows");
  if (!Number.isInteger(shardCount) || shardCount < 1) throw new Error("invalid shardCount");
  const base = Math.floor(globalRows / shardCount);
  const remainder = globalRows % shardCount;
  return Array.from({ length: shardCount }, (_, i) => base + (i < remainder ? 1 : 0));
}
