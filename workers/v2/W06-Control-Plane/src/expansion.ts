import { validateSnapshot, type MetadataSnapshot } from "./metadata.ts";

export interface ExpansionPlacementChange {
  logicalShardId: string;
  sourcePhysicalShardId: string;
  targetPhysicalShardId: string;
}

export interface ExpansionRequest {
  sourceSnapshot: MetadataSnapshot;
  targetShardMapVersion: number;
  targetControlEpoch: number;
  newPhysicalShardIds: readonly string[];
  placementChanges?: readonly ExpansionPlacementChange[];
}

export interface ExpansionMigrationRequirement {
  logicalShardId: string;
  sourcePhysicalShardId: string;
  targetPhysicalShardId: string;
}

export interface ExpansionPlan {
  logicalDatabaseId: string;
  sourceShardMapVersion: number;
  targetShardMapVersion: number;
  sourceControlEpoch: number;
  targetControlEpoch: number;
  existingPhysicalShardIds: readonly string[];
  proposedNewPhysicalShardIds: readonly string[];
  placementChanges: readonly ExpansionPlacementChange[];
  migrationRequirements: readonly ExpansionMigrationRequirement[];
  planId: string;
}

export type ExpansionErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_VERSION"
  | "NO_CAPACITY_INCREASE"
  | "DUPLICATE_NEW_SHARD"
  | "EXISTING_SHARD_REUSED"
  | "INVALID_PLACEMENT_CHANGE"
  | "DUPLICATE_TARGET"
  | "PLAN_HASH_FAILED";

export class ExpansionError extends Error {
  readonly code: ExpansionErrorCode;

  constructor(code: ExpansionErrorCode, message: string) {
    super(message);
    this.name = "ExpansionError";
    this.code = code;
  }
}

function validIdentifier(value: string): boolean {
  return typeof value === "string" && value.length > 0 && value.length <= 256;
}

function validVersion(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 1;
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function canonicalize(
  source: MetadataSnapshot,
  targetShardMapVersion: number,
  targetControlEpoch: number,
  newPhysicalShardIds: readonly string[],
  placementChanges: readonly ExpansionPlacementChange[],
): string {
  const shards = [...source.shards]
    .map((shard) => ({
      logicalShardId: shard.logicalShardId,
      physicalShardId: shard.physicalShardId,
      shardStatus: shard.shardStatus,
      capacityState: shard.capacityState,
      shardMapVersion: shard.shardMapVersion,
      controlEpoch: shard.controlEpoch,
      keySpace: shard.keySpace,
    }))
    .sort((a, b) => a.logicalShardId.localeCompare(b.logicalShardId));
  const changes = [...placementChanges]
    .map((change) => ({ ...change }))
    .sort((a, b) =>
      a.logicalShardId.localeCompare(b.logicalShardId) ||
      a.sourcePhysicalShardId.localeCompare(b.sourcePhysicalShardId) ||
      a.targetPhysicalShardId.localeCompare(b.targetPhysicalShardId),
    );
  return JSON.stringify({
    logicalDatabaseId: source.logicalDatabaseId,
    sourceShardMapVersion: source.shardMapVersion,
    targetShardMapVersion,
    sourceControlEpoch: source.controlEpoch,
    targetControlEpoch,
    shards,
    newPhysicalShardIds: sortedUnique(newPhysicalShardIds),
    placementChanges: changes,
  });
}

async function sha256Hex(value: string): Promise<string> {
  try {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    throw new ExpansionError("PLAN_HASH_FAILED", "unable to derive deterministic expansion plan identifier");
  }
}

export async function planExpansion(request: ExpansionRequest): Promise<ExpansionPlan> {
  if (!request || !request.sourceSnapshot) {
    throw new ExpansionError("INVALID_REQUEST", "expansion request and source snapshot are required");
  }

  validateSnapshot(request.sourceSnapshot);
  const sourceVersion = request.sourceSnapshot.shardMapVersion;
  const sourceEpoch = request.sourceSnapshot.controlEpoch;

  if (!validVersion(request.targetShardMapVersion) || request.targetShardMapVersion <= sourceVersion) {
    throw new ExpansionError("INVALID_VERSION", "target shard map version must be greater than source version");
  }
  if (!validVersion(request.targetControlEpoch) || request.targetControlEpoch < sourceEpoch) {
    throw new ExpansionError("INVALID_VERSION", "target control epoch must not move backwards");
  }

  if (!Array.isArray(request.newPhysicalShardIds) || request.newPhysicalShardIds.length === 0) {
    throw new ExpansionError("NO_CAPACITY_INCREASE", "expansion must add at least one physical shard");
  }

  for (const id of request.newPhysicalShardIds) {
    if (!validIdentifier(id)) {
      throw new ExpansionError("INVALID_REQUEST", "new physical shard identifiers must be non-empty and bounded");
    }
  }

  const existingPhysicalShardIds = sortedUnique(request.sourceSnapshot.shards.map((shard) => shard.physicalShardId));
  const existingSet = new Set(existingPhysicalShardIds);
  const newPhysicalShardIds = [...request.newPhysicalShardIds].sort();
  const newSet = new Set<string>();

  for (const id of newPhysicalShardIds) {
    if (newSet.has(id)) {
      throw new ExpansionError("DUPLICATE_NEW_SHARD", "new physical shard identifiers must be unique");
    }
    if (existingSet.has(id)) {
      throw new ExpansionError("EXISTING_SHARD_REUSED", "expansion cannot reuse an existing physical shard as new capacity");
    }
    newSet.add(id);
  }

  const changes = [...(request.placementChanges ?? [])];
  const logicalOwners = new Map(request.sourceSnapshot.shards.map((shard) => [shard.logicalShardId, shard.physicalShardId]));
  const changedLogicalShards = new Set<string>();
  const usedTargets = new Set<string>();

  for (const change of changes) {
    if (
      !validIdentifier(change.logicalShardId) ||
      !validIdentifier(change.sourcePhysicalShardId) ||
      !validIdentifier(change.targetPhysicalShardId) ||
      changedLogicalShards.has(change.logicalShardId) ||
      logicalOwners.get(change.logicalShardId) !== change.sourcePhysicalShardId ||
      !newSet.has(change.targetPhysicalShardId) ||
      usedTargets.has(change.targetPhysicalShardId)
    ) {
      throw new ExpansionError("INVALID_PLACEMENT_CHANGE", "placement changes must explicitly move one existing logical shard to one new physical shard");
    }
    changedLogicalShards.add(change.logicalShardId);
    usedTargets.add(change.targetPhysicalShardId);
  }

  const canonical = canonicalize(
    request.sourceSnapshot,
    request.targetShardMapVersion,
    request.targetControlEpoch,
    newPhysicalShardIds,
    changes,
  );
  const planId = `exp-${sourceVersion}-${request.targetShardMapVersion}-${await sha256Hex(canonical)}`;
  const normalizedChanges = changes
    .map((change) => Object.freeze({ ...change }))
    .sort((a, b) => a.logicalShardId.localeCompare(b.logicalShardId));
  const migrationRequirements = normalizedChanges.map((change) =>
    Object.freeze({
      logicalShardId: change.logicalShardId,
      sourcePhysicalShardId: change.sourcePhysicalShardId,
      targetPhysicalShardId: change.targetPhysicalShardId,
    }),
  );

  return Object.freeze({
    logicalDatabaseId: request.sourceSnapshot.logicalDatabaseId,
    sourceShardMapVersion: sourceVersion,
    targetShardMapVersion: request.targetShardMapVersion,
    sourceControlEpoch: sourceEpoch,
    targetControlEpoch: request.targetControlEpoch,
    existingPhysicalShardIds: Object.freeze(existingPhysicalShardIds),
    proposedNewPhysicalShardIds: Object.freeze(newPhysicalShardIds),
    placementChanges: Object.freeze(normalizedChanges),
    migrationRequirements: Object.freeze(migrationRequirements),
    planId,
  });
}
