export type MigrationPhase =
  | "PLANNED"
  | "COPYING"
  | "VERIFYING"
  | "CUTOVER_READY"
  | "CUTOVER"
  | "COMPLETE";

export interface MigrationPlanRequest {
  logicalDatabaseId: string;
  sourceTopologyVersion: number;
  targetTopologyVersion: number;
  logicalShardId: string;
  sourcePhysicalShardId: string;
  targetPhysicalShardId: string;
}

export interface MigrationPlan {
  logicalDatabaseId: string;
  logicalShardId: string;
  sourcePhysicalShardId: string;
  targetPhysicalShardId: string;
  sourceTopologyVersion: number;
  targetTopologyVersion: number;
  phase: MigrationPhase;
  planId: string;
}

export type MigrationErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_VERSION"
  | "IDENTICAL_SOURCE_AND_TARGET"
  | "INVALID_PHASE"
  | "ILLEGAL_TRANSITION"
  | "PLAN_HASH_FAILED";

export class MigrationError extends Error {
  readonly code: MigrationErrorCode;

  constructor(code: MigrationErrorCode, message: string) {
    super(message);
    this.name = "MigrationError";
    this.code = code;
  }
}

const legalTransitions: Readonly<Record<MigrationPhase, readonly MigrationPhase[]>> = {
  PLANNED: ["COPYING"],
  COPYING: ["VERIFYING"],
  VERIFYING: ["CUTOVER_READY"],
  CUTOVER_READY: ["CUTOVER"],
  CUTOVER: ["COMPLETE"],
  COMPLETE: [],
};

const phaseValues = new Set<MigrationPhase>([
  "PLANNED",
  "COPYING",
  "VERIFYING",
  "CUTOVER_READY",
  "CUTOVER",
  "COMPLETE",
]);

function validIdentifier(value: string): boolean {
  return typeof value === "string" && value.length > 0 && value.length <= 256;
}

function validVersion(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 1;
}

function canonicalize(request: MigrationPlanRequest): string {
  return JSON.stringify({
    logicalDatabaseId: request.logicalDatabaseId,
    logicalShardId: request.logicalShardId,
    sourcePhysicalShardId: request.sourcePhysicalShardId,
    targetPhysicalShardId: request.targetPhysicalShardId,
    sourceTopologyVersion: request.sourceTopologyVersion,
    targetTopologyVersion: request.targetTopologyVersion,
  });
}

async function sha256Hex(value: string): Promise<string> {
  try {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    throw new MigrationError("PLAN_HASH_FAILED", "unable to derive deterministic migration plan identifier");
  }
}

export function canTransitionMigrationPhase(from: string, to: string): boolean {
  if (!phaseValues.has(from as MigrationPhase) || !phaseValues.has(to as MigrationPhase)) {
    throw new MigrationError("INVALID_PHASE", "unknown migration phase");
  }
  return legalTransitions[from as MigrationPhase].includes(to as MigrationPhase);
}

export function transitionMigrationPhase(from: string, to: string): MigrationPhase {
  if (!canTransitionMigrationPhase(from, to)) {
    throw new MigrationError("ILLEGAL_TRANSITION", `illegal migration transition: ${from} -> ${to}`);
  }
  return to as MigrationPhase;
}

export async function planMigration(request: MigrationPlanRequest): Promise<MigrationPlan> {
  if (
    !request ||
    !validIdentifier(request.logicalDatabaseId) ||
    !validIdentifier(request.logicalShardId) ||
    !validIdentifier(request.sourcePhysicalShardId) ||
    !validIdentifier(request.targetPhysicalShardId)
  ) {
    throw new MigrationError("INVALID_REQUEST", "migration identifiers are invalid");
  }
  if (!validVersion(request.sourceTopologyVersion) || !validVersion(request.targetTopologyVersion)) {
    throw new MigrationError("INVALID_VERSION", "migration topology versions are invalid");
  }
  if (request.targetTopologyVersion <= request.sourceTopologyVersion) {
    throw new MigrationError("INVALID_VERSION", "migration target topology version must be newer than source version");
  }
  if (request.sourcePhysicalShardId === request.targetPhysicalShardId) {
    throw new MigrationError("IDENTICAL_SOURCE_AND_TARGET", "migration source and target physical shards must differ");
  }

  const planId = `mig-${request.sourceTopologyVersion}-${request.targetTopologyVersion}-${await sha256Hex(canonicalize(request))}`;
  return Object.freeze({
    logicalDatabaseId: request.logicalDatabaseId,
    logicalShardId: request.logicalShardId,
    sourcePhysicalShardId: request.sourcePhysicalShardId,
    targetPhysicalShardId: request.targetPhysicalShardId,
    sourceTopologyVersion: request.sourceTopologyVersion,
    targetTopologyVersion: request.targetTopologyVersion,
    phase: "PLANNED",
    planId,
  });
}
