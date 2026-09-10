import type { ShardLifecycle } from "./placement.ts";

export type TopologyTransitionErrorCode = "INVALID_LIFECYCLE" | "ILLEGAL_TRANSITION";

export class TopologyTransitionError extends Error {
  readonly code: TopologyTransitionErrorCode;

  constructor(code: TopologyTransitionErrorCode, message: string) {
    super(message);
    this.name = "TopologyTransitionError";
    this.code = code;
  }
}

const legalTransitions: Readonly<Record<ShardLifecycle, readonly ShardLifecycle[]>> = {
  PROVISIONING: ["ACTIVE"],
  ACTIVE: ["DRAINING"],
  DRAINING: ["MIGRATING"],
  MIGRATING: ["ACTIVE", "RETIRED"],
  RETIRED: [],
};

const lifecycleValues = new Set<ShardLifecycle>([
  "PROVISIONING",
  "ACTIVE",
  "DRAINING",
  "MIGRATING",
  "RETIRED",
]);

function assertLifecycle(value: string): asserts value is ShardLifecycle {
  if (!lifecycleValues.has(value as ShardLifecycle)) {
    throw new TopologyTransitionError("INVALID_LIFECYCLE", `unknown lifecycle state: ${value}`);
  }
}

export function canTransition(from: string, to: string): boolean {
  assertLifecycle(from);
  assertLifecycle(to);
  return legalTransitions[from].includes(to);
}

export function transitionLifecycle(from: string, to: string): ShardLifecycle {
  if (!canTransition(from, to)) {
    throw new TopologyTransitionError("ILLEGAL_TRANSITION", `illegal lifecycle transition: ${from} -> ${to}`);
  }
  return to;
}
