export type ShardLifecycle =
  | "PROVISIONING"
  | "ACTIVE"
  | "DRAINING"
  | "MIGRATING"
  | "RETIRED";

export type PlacementCapacityState = "ADMITTED" | "BLOCKED";

export interface ShardMetadata {
  logicalDatabaseId: string;
  logicalShardId: string;
  physicalShardId: string;
  topologyVersion: number;
  lifecycle: ShardLifecycle;
  capacityState?: PlacementCapacityState;
}

export interface PlacementRequest {
  logicalDatabaseId: string;
  logicalShardId: string;
  topologyVersion: number;
}

export interface PlacementResult {
  logicalDatabaseId: string;
  logicalShardId: string;
  physicalShardId: string;
  topologyVersion: number;
}

export type PlacementErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_METADATA"
  | "STALE_VERSION"
  | "MISSING_PLACEMENT"
  | "AMBIGUOUS_PLACEMENT"
  | "CAPACITY_BLOCKED";

export class PlacementError extends Error {
  readonly code: PlacementErrorCode;

  constructor(code: PlacementErrorCode, message: string) {
    super(message);
    this.name = "PlacementError";
    this.code = code;
  }
}

function validIdentifier(value: string): boolean {
  return value.length > 0 && value.length <= 256;
}

function validateMetadata(metadata: ShardMetadata): void {
  if (
    !validIdentifier(metadata.logicalDatabaseId) ||
    !validIdentifier(metadata.logicalShardId) ||
    !validIdentifier(metadata.physicalShardId) ||
    !Number.isSafeInteger(metadata.topologyVersion) ||
    metadata.topologyVersion < 1 ||
    (metadata.capacityState !== undefined && metadata.capacityState !== "ADMITTED" && metadata.capacityState !== "BLOCKED")
  ) {
    throw new PlacementError("INVALID_METADATA", "invalid shard metadata");
  }
}

function validateRequest(request: PlacementRequest): void {
  if (
    !validIdentifier(request.logicalDatabaseId) ||
    !validIdentifier(request.logicalShardId) ||
    !Number.isSafeInteger(request.topologyVersion) ||
    request.topologyVersion < 1
  ) {
    throw new PlacementError("INVALID_REQUEST", "invalid placement request");
  }
}

export function resolvePlacement(
  request: PlacementRequest,
  metadata: readonly ShardMetadata[],
): PlacementResult {
  validateRequest(request);

  const matches = metadata.filter(
    (entry) =>
      entry.logicalDatabaseId === request.logicalDatabaseId &&
      entry.logicalShardId === request.logicalShardId,
  );

  if (matches.length === 0) {
    throw new PlacementError("MISSING_PLACEMENT", "no placement metadata exists for the requested logical shard");
  }

  for (const entry of matches) validateMetadata(entry);

  const versionMatches = matches.filter((entry) => entry.topologyVersion === request.topologyVersion);
  if (versionMatches.length === 0) {
    throw new PlacementError("STALE_VERSION", "requested topology version is not published for this placement");
  }

  const activeMatches = versionMatches.filter((entry) => entry.lifecycle === "ACTIVE");
  if (activeMatches.length !== 1) {
    throw new PlacementError("AMBIGUOUS_PLACEMENT", "placement must resolve to exactly one active physical shard");
  }

  const selected = activeMatches[0];
  if (selected.capacityState === "BLOCKED") {
    throw new PlacementError("CAPACITY_BLOCKED", "placement target is currently blocked by capacity admission state");
  }

  return {
    logicalDatabaseId: request.logicalDatabaseId,
    logicalShardId: request.logicalShardId,
    physicalShardId: selected.physicalShardId,
    topologyVersion: request.topologyVersion,
  };
}
