import type { KeySpace, PlacementCapacityState, ShardLifecycle } from "./placement.ts";

export type CapacityAdmissionState = PlacementCapacityState;

export interface AuthoritativeShardMetadata {
  logicalDatabaseId: string;
  logicalShardId: string;
  physicalShardId: string;
  shardMapVersion: number;
  shardStatus: ShardLifecycle;
  keySpace: KeySpace;
  controlEpoch: number;
  capacityState: CapacityAdmissionState;
  createdAt: string;
  updatedAt: string;
}

export interface MetadataSnapshot {
  logicalDatabaseId: string;
  shardMapVersion: number;
  controlEpoch: number;
  shards: readonly AuthoritativeShardMetadata[];
}

export type MetadataErrorCode =
  | "INVALID_SNAPSHOT"
  | "INVALID_SHARD_METADATA"
  | "DUPLICATE_PHYSICAL_SHARD"
  | "DUPLICATE_LOGICAL_SHARD"
  | "INVALID_KEYSPACE_COVERAGE"
  | "VERSION_MISMATCH"
  | "EPOCH_MISMATCH"
  | "IMMUTABLE_VERSION"
  | "MISSING_VERSION";

export class MetadataError extends Error {
  readonly code: MetadataErrorCode;

  constructor(code: MetadataErrorCode, message: string) {
    super(message);
    this.name = "MetadataError";
    this.code = code;
  }
}

const lifecycleValues = new Set<ShardLifecycle>([
  "REGISTERED",
  "VALIDATING",
  "ACTIVE",
  "SPLITTING",
  "DRAINING",
  "RETIRED",
]);

const capacityValues = new Set<CapacityAdmissionState>(["ADMITTED", "BLOCKED"]);

function validIdentifier(value: string): boolean {
  return typeof value === "string" && value.length > 0 && value.length <= 256;
}

function validVersion(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 1;
}

function validKeySpace(keySpace: KeySpace): boolean {
  return !!keySpace &&
    validIdentifier(keySpace.lowerInclusive) &&
    validIdentifier(keySpace.upperExclusive) &&
    keySpace.lowerInclusive < keySpace.upperExclusive;
}

function validTimestamp(value: string): boolean {
  return validIdentifier(value) && Number.isFinite(Date.parse(value));
}

export function validateShardMetadata(
  logicalDatabaseId: string,
  snapshotVersion: number,
  snapshotControlEpoch: number,
  shard: AuthoritativeShardMetadata,
): void {
  if (
    !validIdentifier(logicalDatabaseId) ||
    !validVersion(snapshotVersion) ||
    !validVersion(snapshotControlEpoch) ||
    !validIdentifier(shard.logicalDatabaseId) ||
    shard.logicalDatabaseId !== logicalDatabaseId ||
    !validIdentifier(shard.logicalShardId) ||
    !validIdentifier(shard.physicalShardId) ||
    !validVersion(shard.shardMapVersion) ||
    shard.shardMapVersion !== snapshotVersion ||
    !validVersion(shard.controlEpoch) ||
    shard.controlEpoch !== snapshotControlEpoch ||
    !lifecycleValues.has(shard.shardStatus) ||
    !capacityValues.has(shard.capacityState) ||
    !validKeySpace(shard.keySpace) ||
    !validTimestamp(shard.createdAt) ||
    !validTimestamp(shard.updatedAt)
  ) {
    throw new MetadataError("INVALID_SHARD_METADATA", "invalid authoritative shard metadata");
  }
}

function validateCoverage(shards: readonly AuthoritativeShardMetadata[]): void {
  const active = shards.filter((shard) => shard.shardStatus !== "RETIRED");
  const sorted = [...active].sort((a, b) => a.keySpace.lowerInclusive.localeCompare(b.keySpace.lowerInclusive));
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (current.keySpace.lowerInclusive !== previous.keySpace.upperExclusive) {
      throw new MetadataError("INVALID_KEYSPACE_COVERAGE", "published keyspace contains a gap or overlap");
    }
  }
}

export function validateSnapshot(snapshot: MetadataSnapshot): void {
  if (
    !validIdentifier(snapshot.logicalDatabaseId) ||
    !validVersion(snapshot.shardMapVersion) ||
    !validVersion(snapshot.controlEpoch) ||
    !Array.isArray(snapshot.shards) ||
    snapshot.shards.length === 0
  ) {
    throw new MetadataError("INVALID_SNAPSHOT", "invalid metadata snapshot");
  }

  const physicalShardIds = new Set<string>();
  const logicalShardIds = new Set<string>();
  for (const shard of snapshot.shards) {
    validateShardMetadata(snapshot.logicalDatabaseId, snapshot.shardMapVersion, snapshot.controlEpoch, shard);
    if (physicalShardIds.has(shard.physicalShardId)) {
      throw new MetadataError("DUPLICATE_PHYSICAL_SHARD", "physical shard ownership must be unique within a logical database");
    }
    if (logicalShardIds.has(shard.logicalShardId)) {
      throw new MetadataError("DUPLICATE_LOGICAL_SHARD", "logical shard ownership must be unique within a shard map version");
    }
    physicalShardIds.add(shard.physicalShardId);
    logicalShardIds.add(shard.logicalShardId);
  }
  validateCoverage(snapshot.shards);
}

export class MetadataRegistry {
  private readonly published = new Map<number, MetadataSnapshot>();

  publish(snapshot: MetadataSnapshot): void {
    validateSnapshot(snapshot);
    if (this.published.has(snapshot.shardMapVersion)) {
      throw new MetadataError("IMMUTABLE_VERSION", "published metadata versions are immutable");
    }

    const frozenShards = Object.freeze(snapshot.shards.map((shard) => Object.freeze({ ...shard, keySpace: Object.freeze({ ...shard.keySpace }) })));
    const frozenSnapshot = Object.freeze({
      logicalDatabaseId: snapshot.logicalDatabaseId,
      shardMapVersion: snapshot.shardMapVersion,
      controlEpoch: snapshot.controlEpoch,
      shards: frozenShards,
    });
    this.published.set(snapshot.shardMapVersion, frozenSnapshot);
  }

  read(logicalDatabaseId: string, shardMapVersion: number): MetadataSnapshot {
    if (!validIdentifier(logicalDatabaseId) || !validVersion(shardMapVersion)) {
      throw new MetadataError("MISSING_VERSION", "requested metadata version is invalid or unavailable");
    }

    const snapshot = this.published.get(shardMapVersion);
    if (snapshot === undefined || snapshot.logicalDatabaseId !== logicalDatabaseId) {
      throw new MetadataError("MISSING_VERSION", "requested shard map version is unavailable");
    }

    return snapshot;
  }
}
