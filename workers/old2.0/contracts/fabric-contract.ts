import type { ResourceBudget } from "./resilience-contract";

export type Consistency = "strong" | "bounded" | "eventual";
export type FailurePolicy = "strict" | "partial";

/** Compatibility alias; ResourceBudget is the single authoritative budget definition. */
export type FabricBudget = ResourceBudget;

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
  if (!Number.isSafeInteger(c.budget.maxFanout) || c.budget.maxFanout < 1) throw new Error("invalid maxFanout");
  if (!Number.isSafeInteger(c.budget.maxConcurrency) || c.budget.maxConcurrency < 1) throw new Error("invalid maxConcurrency");
  if (!Number.isSafeInteger(c.budget.maxStatements) || c.budget.maxStatements < 1) throw new Error("invalid maxStatements");
  if (!Number.isSafeInteger(c.budget.maxRowsRead) || c.budget.maxRowsRead < 0) throw new Error("invalid maxRowsRead");
  if (!Number.isSafeInteger(c.budget.maxRowsWrite) || c.budget.maxRowsWrite < 0) throw new Error("invalid maxRowsWrite");
  if (!Number.isSafeInteger(c.budget.deadlineMs) || c.budget.deadlineMs <= 0) throw new Error("invalid deadlineMs");
  if (!Number.isSafeInteger(c.budget.maxRetries) || c.budget.maxRetries < 0) throw new Error("invalid maxRetries");
}

export function allocateRows(globalRows: number, shardCount: number): number[] {
  if (!Number.isSafeInteger(globalRows) || globalRows < 0) throw new Error("invalid globalRows");
  if (!Number.isSafeInteger(shardCount) || shardCount < 1) throw new Error("invalid shardCount");
  const base = Math.floor(globalRows / shardCount);
  const remainder = globalRows % shardCount;
  return Array.from({ length: shardCount }, (_, i) => base + (i < remainder ? 1 : 0));
}
