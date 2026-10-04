export type ShardLifecycle =
  | "REGISTERED"
  | "VALIDATING"
  | "ACTIVE"
  | "SPLITTING"
  | "DRAINING"
  | "RETIRED";

export type PlacementCapacityState = "ADMITTED" | "BLOCKED";

export interface KeySpace {
  lowerInclusive: string;
  upperExclusive: string;
}

export interface ShardMetadata {
  logicalDatabaseId: string;
  logicalShardId: string;
  physicalShardId: string;
  shardMapVersion: number;
  shardStatus: ShardLifecycle;
  keySpace: KeySpace;
  controlEpoch: number;
  capacityState: PlacementCapacityState;
  createdAt: string;
  updatedAt: string;
}

export interface TargetShardLocation {
  logicalDatabaseId: string;
  logicalShardId: string;
  physicalShardId: string;
  shardMapVersion: number;
  shardStatus: "ACTIVE";
  keySpace: KeySpace;
  controlEpoch: number;
}

export type PlacementResult = TargetShardLocation;

export interface PlacementRequest {
  logicalDatabaseId: string;
  logicalShardKey: string;
  shardMapVersion: number;
}

export type PlacementErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_METADATA"
  | "STALE_VERSION"
  | "STALE_CONTROL_EPOCH"
  | "MISSING_PLACEMENT"
  | "AMBIGUOUS_PLACEMENT"
  | "CAPACITY_BLOCKED"
  | "KEYSPACE_MISMATCH";

export class PlacementError extends Error {
  readonly code: PlacementErrorCode;

  constructor(code: PlacementErrorCode, message: string) {
    super(message);
    this.name = "PlacementError";
    this.code = code;
  }
}

function validIdentifier(value: string): boolean {
  return typeof value === "string" && value.length > 0 && value.length <= 256;
}

function validVersion(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 1;
}

function validateKeySpace(keySpace: KeySpace): void {
  if (!keySpace || !validIdentifier(keySpace.lowerInclusive) || !validIdentifier(keySpace.upperExclusive)) {
    throw new PlacementError("INVALID_METADATA", "invalid shard keyspace");
  }
  if (keySpace.lowerInclusive >= keySpace.upperExclusive) {
    throw new PlacementError("INVALID_METADATA", "keyspace lower bound must be less than upper bound");
  }
}

function validateMetadata(metadata: ShardMetadata): void {
  if (
    !validIdentifier(metadata.logicalDatabaseId) ||
    !validIdentifier(metadata.logicalShardId) ||
    !validIdentifier(metadata.physicalShardId) ||
    !validVersion(metadata.shardMapVersion) ||
    !validVersion(metadata.controlEpoch) ||
    !validIdentifier(metadata.createdAt) ||
    !validIdentifier(metadata.updatedAt) ||
    !Object.prototype.hasOwnProperty.call(metadata, "capacityState") ||
    (metadata.capacityState !== "ADMITTED" && metadata.capacityState !== "BLOCKED")
  ) {
    throw new PlacementError("INVALID_METADATA", "invalid shard metadata");
  }
  validateKeySpace(metadata.keySpace);
}

function validateRequest(request: PlacementRequest): void {
  if (
    !validIdentifier(request.logicalDatabaseId) ||
    !validIdentifier(request.logicalShardKey) ||
    !validVersion(request.shardMapVersion)
  ) {
    throw new PlacementError("INVALID_REQUEST", "invalid placement request");
  }
}

function keyInRange(key: string, keySpace: KeySpace): boolean {
  return key >= keySpace.lowerInclusive && key < keySpace.upperExclusive;
}

export function resolvePlacement(
  request: PlacementRequest,
  metadata: readonly ShardMetadata[],
): TargetShardLocation {
  validateRequest(request);

  const sameDatabase = metadata.filter((entry) => entry.logicalDatabaseId === request.logicalDatabaseId);
  if (sameDatabase.length === 0) {
    throw new PlacementError("MISSING_PLACEMENT", "no placement metadata exists for the requested logical database");
  }

  for (const entry of sameDatabase) validateMetadata(entry);

  const versionMatches = sameDatabase.filter((entry) => entry.shardMapVersion === request.shardMapVersion);
  if (versionMatches.length === 0) {
    throw new PlacementError("STALE_VERSION", "requested shard map version is not published for this database");
  }

  const rangeMatches = versionMatches.filter((entry) => keyInRange(request.logicalShardKey, entry.keySpace));
  if (rangeMatches.length === 0) {
    throw new PlacementError("MISSING_PLACEMENT", "no placement covers the requested shard key");
  }

  if (rangeMatches.length !== 1) {
    throw new PlacementError("AMBIGUOUS_PLACEMENT", "placement must resolve to exactly one shard keyspace");
  }

  const selected = rangeMatches[0];
  if (selected.shardStatus !== "ACTIVE") {
    throw new PlacementError("MISSING_PLACEMENT", "placement target is not active");
  }
  if (selected.capacityState === "BLOCKED") {
    throw new PlacementError("CAPACITY_BLOCKED", "placement target is currently blocked by capacity admission state");
  }

  return {
    logicalDatabaseId: selected.logicalDatabaseId,
    logicalShardId: selected.logicalShardId,
    physicalShardId: selected.physicalShardId,
    shardMapVersion: selected.shardMapVersion,
    shardStatus: "ACTIVE",
    keySpace: selected.keySpace,
    controlEpoch: selected.controlEpoch,
  };
}
