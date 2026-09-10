import assert from "node:assert/strict";
import test from "node:test";
import { TopologyTransitionError, canTransition, transitionLifecycle } from "../src/topology.ts";

test("accepts only declared lifecycle transitions", () => {
  assert.equal(canTransition("PROVISIONING", "ACTIVE"), true);
  assert.equal(canTransition("ACTIVE", "DRAINING"), true);
  assert.equal(canTransition("DRAINING", "MIGRATING"), true);
  assert.equal(canTransition("MIGRATING", "ACTIVE"), true);
  assert.equal(canTransition("MIGRATING", "RETIRED"), true);
});

test("rejects illegal lifecycle transitions", () => {
  assert.throws(
    () => transitionLifecycle("ACTIVE", "RETIRED"),
    (error: unknown) => error instanceof TopologyTransitionError && error.code === "ILLEGAL_TRANSITION",
  );
  assert.throws(
    () => transitionLifecycle("PROVISIONING", "DRAINING"),
    (error: unknown) => error instanceof TopologyTransitionError && error.code === "ILLEGAL_TRANSITION",
  );
  assert.throws(
    () => transitionLifecycle("RETIRED", "ACTIVE"),
    (error: unknown) => error instanceof TopologyTransitionError && error.code === "ILLEGAL_TRANSITION",
  );
});

test("rejects unknown lifecycle state instead of coercing it", () => {
  assert.throws(
    () => canTransition("BROKEN", "ACTIVE"),
    (error: unknown) => error instanceof TopologyTransitionError && error.code === "INVALID_LIFECYCLE",
  );
});
