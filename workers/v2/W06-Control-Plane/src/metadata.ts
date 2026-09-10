import type { ShardLifecycle } from "./placement.ts";

export type CapacityAdmissionState = "ADMITTED" | "BLOCKED";

export interface AuthoritativeShardMetadata {
  logicalDatabaseId: string;
  physicalShardId: string;
  topologyVersion: number;
  lifecycle: ShardLifecycle;
  capacityState: CapacityAdmissionState;
  creationTimestamp: number;
  lastTransitionTimestamp: number;
}

export interface MetadataSnapshot {
  logicalDatabaseId: string;
  topologyVersion: number;
  shards: readonly AuthoritativeShardMetadata[];
}

export type MetadataErrorCode =
  | "INVALID_SNAPSHOT"
  | "INVALID_SHARD_METADATA"
  | "DUPLICATE_PHYSICAL_SHARD"
  | "VERSION_MISMATCH"
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
  "PROVISIONING",
  "ACTIVE",
  "DRAINING",
  "MIGRATING",
  "RETIRED",
]);

const capacityValues = new Set<CapacityAdmissionState>(["ADMITTED", "BLOCKED"]);

function validIdentifier(value: string): boolean {
  return value.length > 0 && value.length <= 256;
}

function validTimestamp(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

export function validateShardMetadata(
  logicalDatabaseId: string,
  snapshotVersion: number,
  shard: AuthoritativeShardMetadata,
): void {
  if (
    !validIdentifier(logicalDatabaseId) ||
    !Number.isSafeInteger(snapshotVersion) ||
    snapshotVersion < 1 ||
    !validIdentifier(shard.logicalDatabaseId) ||
    shard.logicalDatabaseId !== logicalDatabaseId ||
    !validIdentifier(shard.physicalShardId) ||
    !Number.isSafeInteger(shard.topologyVersion) ||
    shard.topologyVersion !== snapshotVersion ||
    !lifecycleValues.has(shard.lifecycle) ||
    !capacityValues.has(shard.capacityState) ||
    !validTimestamp(shard.creationTimestamp) ||
    !validTimestamp(shard.lastTransitionTimestamp) ||
    shard.lastTransitionTimestamp < shard.creationTimestamp
  ) {
    throw new MetadataError("INVALID_SHARD_METADATA", "invalid authoritative shard metadata");
  }
}

export function validateSnapshot(snapshot: MetadataSnapshot): void {
  if (
    !validIdentifier(snapshot.logicalDatabaseId) ||
    !Number.isSafeInteger(snapshot.topologyVersion) ||
    snapshot.topologyVersion < 1 ||
    !Array.isArray(snapshot.shards) ||
    snapshot.shards.length === 0
  ) {
    throw new MetadataError("INVALID_SNAPSHOT", "invalid metadata snapshot");
  }

  const physicalShardIds = new Set<string>();
  for (const shard of snapshot.shards) {
    validateShardMetadata(snapshot.logicalDatabaseId, snapshot.topologyVersion, shard);
    if (physicalShardIds.has(shard.physicalShardId)) {
      throw new MetadataError("DUPLICATE_PHYSICAL_SHARD", "physical shard ownership must be unique within a logical database");
    }
    physicalShardIds.add(shard.physicalShardId);
  }
}

export class MetadataRegistry {
  private readonly published = new Map<number, MetadataSnapshot>();

  publish(snapshot: MetadataSnapshot): void {
    validateSnapshot(snapshot);
    if (this.published.has(snapshot.topologyVersion)) {
      throw new MetadataError("IMMUTABLE_VERSION", "published metadata versions are immutable");
    }

    const frozenShards = Object.freeze(snapshot.shards.map((shard) => Object.freeze({ ...shard })));
    const frozenSnapshot = Object.freeze({
      logicalDatabaseId: snapshot.logicalDatabaseId,
      topologyVersion: snapshot.topologyVersion,
      shards: frozenShards,
    });
    this.published.set(snapshot.topologyVersion, frozenSnapshot);
  }

  read(logicalDatabaseId: string, topologyVersion: number): MetadataSnapshot {
    if (!validIdentifier(logicalDatabaseId) || !Number.isSafeInteger(topologyVersion) || topologyVersion < 1) {
      throw new MetadataError("MISSING_VERSION", "requested metadata version is invalid or unavailable");
    }

    const snapshot = this.published.get(topologyVersion);
    if (snapshot === undefined || snapshot.logicalDatabaseId !== logicalDatabaseId) {
      throw new MetadataError("MISSING_VERSION", "requested metadata version is unavailable");
    }

    return snapshot;
  }
}
