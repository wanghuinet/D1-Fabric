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
