import { validateSnapshot, type MetadataSnapshot } from "./metadata.ts";

export interface RebalanceAssignment {
  logicalShardId: string;
  sourcePhysicalShardId: string;
  targetPhysicalShardId: string;
}

export interface RebalanceRequest {
  sourceSnapshot: MetadataSnapshot;
  targetTopologyVersion: number;
  assignments: readonly RebalanceAssignment[];
}

export interface RebalancePlan {
  logicalDatabaseId: string;
  sourceTopologyVersion: number;
  targetTopologyVersion: number;
  assignments: readonly RebalanceAssignment[];
  ownershipChanges: readonly RebalanceAssignment[];
  planId: string;
}

export type RebalanceErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_VERSION"
  | "INCOMPLETE_COVERAGE"
  | "DUPLICATE_LOGICAL_SHARD"
  | "UNKNOWN_LOGICAL_SHARD"
  | "SOURCE_MISMATCH"
  | "UNKNOWN_TARGET_SHARD"
  | "NON_ACTIVE_TARGET"
  | "DUPLICATE_TARGET_OWNERSHIP"
  | "PLAN_HASH_FAILED";

export class RebalanceError extends Error {
  readonly code: RebalanceErrorCode;
  constructor(code: RebalanceErrorCode, message: string) {
    super(message);
    this.name = "RebalanceError";
    this.code = code;
  }
}

function validIdentifier(value: string): boolean {
  return typeof value === "string" && value.length > 0 && value.length <= 256;
}

function validVersion(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 1;
}

function canonicalize(source: MetadataSnapshot, targetTopologyVersion: number, assignments: readonly RebalanceAssignment[]): string {
  return JSON.stringify({
    logicalDatabaseId: source.logicalDatabaseId,
    sourceTopologyVersion: source.topologyVersion,
    targetTopologyVersion,
    assignments: [...assignments]
      .map((assignment) => ({ ...assignment }))
      .sort((a, b) =>
        a.logicalShardId.localeCompare(b.logicalShardId) ||
        a.sourcePhysicalShardId.localeCompare(b.sourcePhysicalShardId) ||
        a.targetPhysicalShardId.localeCompare(b.targetPhysicalShardId),
      ),
  });
}

async function sha256Hex(value: string): Promise<string> {
  try {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    throw new RebalanceError("PLAN_HASH_FAILED", "unable to derive deterministic rebalance plan identifier");
  }
}

export async function planRebalance(request: RebalanceRequest): Promise<RebalancePlan> {
  if (!request || !request.sourceSnapshot || !Array.isArray(request.assignments)) {
    throw new RebalanceError("INVALID_REQUEST", "rebalance request, snapshot, and assignments are required");
  }
  validateSnapshot(request.sourceSnapshot);
  if (!validVersion(request.targetTopologyVersion) || request.targetTopologyVersion <= request.sourceSnapshot.topologyVersion) {
    throw new RebalanceError("INVALID_VERSION", "target topology version must be newer than source version");
  }
  if (request.assignments.length !== request.sourceSnapshot.shards.length) {
    throw new RebalanceError("INCOMPLETE_COVERAGE", "rebalance must explicitly assign every logical shard exactly once");
  }

  const sourceByLogical = new Map(request.sourceSnapshot.shards.map((shard) => [shard.logicalShardId, shard]));
  const targetByPhysical = new Map(request.sourceSnapshot.shards.map((shard) => [shard.physicalShardId, shard]));
  const seenLogical = new Set<string>();
  const seenTargets = new Set<string>();
  const normalized: RebalanceAssignment[] = [];

  for (const assignment of request.assignments) {
    if (
      !validIdentifier(assignment.logicalShardId) ||
      !validIdentifier(assignment.sourcePhysicalShardId) ||
      !validIdentifier(assignment.targetPhysicalShardId)
    ) {
      throw new RebalanceError("INVALID_REQUEST", "rebalance assignment identifiers are invalid");
    }
    if (seenLogical.has(assignment.logicalShardId)) {
      throw new RebalanceError("DUPLICATE_LOGICAL_SHARD", "each logical shard must be assigned exactly once");
    }
    if (seenTargets.has(assignment.targetPhysicalShardId)) {
      throw new RebalanceError("DUPLICATE_TARGET_OWNERSHIP", "each physical shard may own at most one logical shard in a published topology");
    }
    const source = sourceByLogical.get(assignment.logicalShardId);
    if (source === undefined) {
      throw new RebalanceError("UNKNOWN_LOGICAL_SHARD", "rebalance references an unknown logical shard");
    }
    if (source.physicalShardId !== assignment.sourcePhysicalShardId) {
      throw new RebalanceError("SOURCE_MISMATCH", "rebalance source ownership must match the published snapshot");
    }
    const target = targetByPhysical.get(assignment.targetPhysicalShardId);
    if (target === undefined) {
      throw new RebalanceError("UNKNOWN_TARGET_SHARD", "rebalance target physical shard is not in the published topology");
    }
    if (target.lifecycle !== "ACTIVE") {
      throw new RebalanceError("NON_ACTIVE_TARGET", "rebalance target physical shard must be ACTIVE");
    }
    seenLogical.add(assignment.logicalShardId);
    seenTargets.add(assignment.targetPhysicalShardId);
    normalized.push(Object.freeze({ ...assignment }));
  }

  for (const shard of request.sourceSnapshot.shards) {
    if (!seenLogical.has(shard.logicalShardId)) {
      throw new RebalanceError("INCOMPLETE_COVERAGE", "rebalance must preserve coverage for every logical shard");
    }
  }

  normalized.sort((a, b) => a.logicalShardId.localeCompare(b.logicalShardId));
  const ownershipChanges = normalized.filter(
    (assignment) => assignment.sourcePhysicalShardId !== assignment.targetPhysicalShardId,
  );
  const planId = `reb-${request.sourceSnapshot.topologyVersion}-${request.targetTopologyVersion}-${await sha256Hex(
    canonicalize(request.sourceSnapshot, request.targetTopologyVersion, normalized),
  )}`;

  return Object.freeze({
    logicalDatabaseId: request.sourceSnapshot.logicalDatabaseId,
    sourceTopologyVersion: request.sourceSnapshot.topologyVersion,
    targetTopologyVersion: request.targetTopologyVersion,
    assignments: Object.freeze(normalized),
    ownershipChanges: Object.freeze(ownershipChanges),
    planId,
  });
}
