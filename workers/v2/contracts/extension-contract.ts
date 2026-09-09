/**
 * D1-Fabric 3.0 generic extension contracts.
 *
 * This file contains middleware-neutral contract types only.
 * It MUST NOT contain game, social, content, commerce, billing, ads,
 * recommendation, or other business-domain semantics.
 */

export type ExtensionLifecycle =
  | "PROPOSED"
  | "CONTRACTED"
  | "VALIDATED"
  | "ACTIVE"
  | "DEPRECATED"
  | "RETIRED";

export interface ExtensionResourceBudget {
  maxFanout: number;
  maxConcurrency: number;
  maxStatements: number;
  maxRowsRead: number;
  maxRowsWrite: number;
  maxRetries: number;
  deadlineMs: number;
}

export interface ExtensionCapabilityContract {
  capabilityId: string;
  version: number;
  inputSchema: string;
  outputSchema: string;
  dataOwnership: string;
  consistencyRequirement: "strong" | "bounded" | "eventual";
  resourceBudget: ExtensionResourceBudget;
  securityPolicy: string;
  compatibilityPolicy: string;
  lifecycleState: ExtensionLifecycle;
}

export interface ApplicationOperationIntent {
  operationId: string;
  version: number;
  inputSchema: string;
  outputSchema: string;
  routingIntent: string;
  consistency: "strong" | "bounded" | "eventual";
  resourceBudget: ExtensionResourceBudget;
  failurePolicy: "strict" | "partial";
  capabilityRefs: string[];
}

export function validateExtensionBudget(b: ExtensionResourceBudget): void {
  if (!Number.isInteger(b.maxFanout) || b.maxFanout < 1) {
    throw new Error("invalid extension maxFanout");
  }
  if (!Number.isInteger(b.maxConcurrency) || b.maxConcurrency < 1) {
    throw new Error("invalid extension maxConcurrency");
  }
  if (!Number.isInteger(b.maxStatements) || b.maxStatements < 1) {
    throw new Error("invalid extension maxStatements");
  }
  if (!Number.isInteger(b.maxRowsRead) || b.maxRowsRead < 0) {
    throw new Error("invalid extension maxRowsRead");
  }
  if (!Number.isInteger(b.maxRowsWrite) || b.maxRowsWrite < 0) {
    throw new Error("invalid extension maxRowsWrite");
  }
  if (!Number.isInteger(b.maxRetries) || b.maxRetries < 0) {
    throw new Error("invalid extension maxRetries");
  }
  if (!Number.isInteger(b.deadlineMs) || b.deadlineMs <= 0) {
    throw new Error("invalid extension deadlineMs");
  }
}

export function validateExtensionContract(c: ExtensionCapabilityContract): void {
  if (!c.capabilityId || c.capabilityId.length > 128) {
    throw new Error("invalid capabilityId");
  }
  if (!Number.isInteger(c.version) || c.version < 1) {
    throw new Error("invalid capability version");
  }
  if (!c.inputSchema || !c.outputSchema) {
    throw new Error("invalid extension schema reference");
  }
  if (!c.dataOwnership || !c.securityPolicy || !c.compatibilityPolicy) {
    throw new Error("invalid extension governance metadata");
  }
  validateExtensionBudget(c.resourceBudget);
}

export function validateApplicationIntent(c: ApplicationOperationIntent): void {
  if (!c.operationId || c.operationId.length > 128) {
    throw new Error("invalid operationId");
  }
  if (!Number.isInteger(c.version) || c.version < 1) {
    throw new Error("invalid operation version");
  }
  if (!c.inputSchema || !c.outputSchema || !c.routingIntent) {
    throw new Error("invalid application operation intent");
  }
  validateExtensionBudget(c.resourceBudget);
}
