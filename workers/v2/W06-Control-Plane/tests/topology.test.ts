import assert from "node:assert/strict";
import test from "node:test";
import { TopologyTransitionError, canTransition, transitionLifecycle } from "../src/topology.ts";

test("accepts only declared v1.1 lifecycle transitions", () => {
  assert.equal(canTransition("REGISTERED", "VALIDATING"), true);
  assert.equal(canTransition("VALIDATING", "ACTIVE"), true);
  assert.equal(canTransition("ACTIVE", "SPLITTING"), true);
  assert.equal(canTransition("ACTIVE", "DRAINING"), true);
  assert.equal(canTransition("SPLITTING", "ACTIVE"), true);
  assert.equal(canTransition("SPLITTING", "DRAINING"), true);
  assert.equal(canTransition("DRAINING", "RETIRED"), true);
});

test("rejects illegal lifecycle transitions", () => {
  for (const [from, to] of [
    ["REGISTERED", "ACTIVE"],
    ["VALIDATING", "DRAINING"],
    ["ACTIVE", "RETIRED"],
    ["DRAINING", "ACTIVE"],
    ["RETIRED", "ACTIVE"],
  ]) {
    assert.throws(
      () => transitionLifecycle(from, to),
      (error: unknown) => error instanceof TopologyTransitionError && error.code === "ILLEGAL_TRANSITION",
    );
  }
});

test("rejects unknown lifecycle state instead of coercing it", () => {
  assert.throws(
    () => canTransition("BROKEN", "ACTIVE"),
    (error: unknown) => error instanceof TopologyTransitionError && error.code === "INVALID_LIFECYCLE",
  );
});
