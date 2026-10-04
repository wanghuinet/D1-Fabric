export type MigrationPhase =
  | "PREPARED"
  | "COPYING"
  | "COPIED"
  | "CHECKSUMMING"
  | "RECONCILING"
  | "VERIFIED"
  | "APPROVED"
  | "PUBLISHED"
  | "CUTOVER"
  | "DRAINING"
  | "RETIRED"
  | "CLEANUP";

export interface MigrationPlanRequest {
  logicalDatabaseId: string;
  sourceShardMapVersion: number;
  targetShardMapVersion: number;
  controlEpoch: number;
  logicalShardId: string;
  sourcePhysicalShardId: string;
  targetPhysicalShardId: string;
}

export interface MigrationPlan {
  logicalDatabaseId: string;
  logicalShardId: string;
  sourcePhysicalShardId: string;
  targetPhysicalShardId: string;
  sourceShardMapVersion: number;
  targetShardMapVersion: number;
  controlEpoch: number;
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
  PREPARED: ["COPYING"],
  COPYING: ["COPIED"],
  COPIED: ["CHECKSUMMING"],
  CHECKSUMMING: ["RECONCILING"],
  RECONCILING: ["VERIFIED"],
  VERIFIED: ["APPROVED"],
  APPROVED: ["PUBLISHED"],
  PUBLISHED: ["CUTOVER"],
  CUTOVER: ["DRAINING"],
  DRAINING: ["RETIRED"],
  RETIRED: ["CLEANUP"],
  CLEANUP: [],
};

const phaseValues = new Set<MigrationPhase>(Object.keys(legalTransitions) as MigrationPhase[]);

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
    sourceShardMapVersion: request.sourceShardMapVersion,
    targetShardMapVersion: request.targetShardMapVersion,
    controlEpoch: request.controlEpoch,
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
  if (!validVersion(request.sourceShardMapVersion) || !validVersion(request.targetShardMapVersion) || !validVersion(request.controlEpoch)) {
    throw new MigrationError("INVALID_VERSION", "migration versions are invalid");
  }
  if (request.targetShardMapVersion <= request.sourceShardMapVersion) {
    throw new MigrationError("INVALID_VERSION", "migration target shard map version must be newer than source version");
  }
  if (request.sourcePhysicalShardId === request.targetPhysicalShardId) {
    throw new MigrationError("IDENTICAL_SOURCE_AND_TARGET", "migration source and target physical shards must differ");
  }

  const planId = `mig-${request.sourceShardMapVersion}-${request.targetShardMapVersion}-${await sha256Hex(canonicalize(request))}`;
  return Object.freeze({
    logicalDatabaseId: request.logicalDatabaseId,
    logicalShardId: request.logicalShardId,
    sourcePhysicalShardId: request.sourcePhysicalShardId,
    targetPhysicalShardId: request.targetPhysicalShardId,
    sourceShardMapVersion: request.sourceShardMapVersion,
    targetShardMapVersion: request.targetShardMapVersion,
    controlEpoch: request.controlEpoch,
    phase: "PREPARED",
    planId,
  });
}
