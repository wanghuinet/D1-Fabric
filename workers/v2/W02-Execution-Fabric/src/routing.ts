import type { ExecutionPlan } from "./plan.ts";

export type RoutingEntry = Readonly<{ logicalTargetId: string; mapVersion: string }>;
export type TenantRoutingMap = Readonly<Record<string, RoutingEntry>>;
export type RoutingMap = Readonly<Record<string, TenantRoutingMap>>;

export type RoutingResult = Readonly<{
  status: "ROUTED";
  requestId: string;
  tenantId: string;
  logicalTargetId: string;
  mapVersion: string;
}>;

export class RoutingError extends Error {
  readonly code: "INVALID_ROUTING" | "ROUTING_MAP_INVALID" | "ROUTING_TARGET_NOT_FOUND" | "BUDGET_EXCEEDED";
  constructor(code: RoutingError["code"], message: string) {
    super(message);
    this.name = "RoutingError";
    this.code = code;
  }
}

function token(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 256) {
    throw new RoutingError("INVALID_ROUTING", `${field} is invalid`);
  }
  return value;
}

function object(value: unknown, field: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new RoutingError("ROUTING_MAP_INVALID", `${field} is invalid`);
  }
  return value as Record<string, unknown>;
}

export function routeExecutionPlan(
  plan: ExecutionPlan,
  routingKey: string,
  routingMap: RoutingMap,
): RoutingResult {
  token(plan.tenantId, "tenantId");
  token(routingKey, "routingKey");
  if (plan.routingRequired !== true || plan.routingResolved !== false) {
    throw new RoutingError("INVALID_ROUTING", "plan is not routable");
  }
  if (plan.requestedBudget.fanout > 1) {
    throw new RoutingError("BUDGET_EXCEEDED", "routing fanout exceeds single-target P05 boundary");
  }

  const root = object(routingMap, "routingMap");
  const tenantMap = root[plan.tenantId];
  if (tenantMap === undefined) {
    throw new RoutingError("ROUTING_TARGET_NOT_FOUND", "routing target not found");
  }
  const scopedMap = object(tenantMap, "tenant routing map");
  const entryValue = scopedMap[routingKey];
  if (entryValue === undefined) {
    throw new RoutingError("ROUTING_TARGET_NOT_FOUND", "routing target not found");
  }
  const entry = object(entryValue, "routing entry");
  const logicalTargetId = token(entry.logicalTargetId, "logicalTargetId");
  const mapVersion = token(entry.mapVersion, "mapVersion");

  return Object.freeze({
    status: "ROUTED" as const,
    requestId: plan.requestId,
    tenantId: plan.tenantId,
    logicalTargetId,
    mapVersion,
  });
}

export interface VersionedRoutingSnapshot {
  readonly version: string;
  readonly routingMap: RoutingMap;
}

export class RoutingSnapshotStore {
  private readonly snapshots: VersionedRoutingSnapshot[] = [];
  private readonly maxSnapshots: number;

  constructor(maxSnapshots = 3) {
    if (!Number.isSafeInteger(maxSnapshots) || maxSnapshots < 1 || maxSnapshots > 16) {
      throw new RoutingError("ROUTING_MAP_INVALID", "maxSnapshots must be between 1 and 16");
    }
    this.maxSnapshots = maxSnapshots;
  }

  publish(version: string, routingMap: RoutingMap): VersionedRoutingSnapshot {
    token(version, "snapshot version");
    const normalized = normalizeRoutingMap(routingMap);
    const existing = this.snapshots.findIndex((snapshot) => snapshot.version === version);
    if (existing >= 0) this.snapshots.splice(existing, 1);
    const snapshot = Object.freeze({ version, routingMap: normalized });
    this.snapshots.unshift(snapshot);
    if (this.snapshots.length > this.maxSnapshots) this.snapshots.length = this.maxSnapshots;
    return snapshot;
  }

  get(version: string): VersionedRoutingSnapshot | undefined {
    token(version, "snapshot version");
    return this.snapshots.find((snapshot) => snapshot.version === version);
  }

  resolve(plan: ExecutionPlan, routingKey: string, version: string): RoutingResult {
    const snapshot = this.get(version);
    if (!snapshot) {
      throw new RoutingError("ROUTING_SNAPSHOT_NOT_FOUND", "routing snapshot " + version + " is not available");
    }
    return routeExecutionPlan(plan, routingKey, snapshot.routingMap);
  }

  versions(): readonly string[] {
    return Object.freeze(this.snapshots.map((snapshot) => snapshot.version));
  }
}

function normalizeRoutingMap(routingMap: RoutingMap): RoutingMap {
  const root = object(routingMap, "routingMap");
  const normalizedRoot: Record<string, TenantRoutingMap> = {};
  for (const [tenantId, tenantValue] of Object.entries(root)) {
    const tenantMap = object(tenantValue, "tenant routing map: " + tenantId);
    const normalizedTenant: Record<string, RoutingEntry> = {};
    for (const [key, entryValue] of Object.entries(tenantMap)) {
      const entry = object(entryValue, "routing entry: " + tenantId + "/" + key);
      const logicalTargetId = token(entry.logicalTargetId, "logicalTargetId");
      const mapVersion = token(entry.mapVersion, "mapVersion");
      normalizedTenant[key] = Object.freeze({ logicalTargetId, mapVersion });
    }
    normalizedRoot[tenantId] = Object.freeze(normalizedTenant);
  }
  return Object.freeze(normalizedRoot);
}
