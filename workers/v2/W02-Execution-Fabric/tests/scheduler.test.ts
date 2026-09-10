import assert from "node:assert/strict";
import { test } from "node:test";
import { runBounded, SchedulerError, createSchedulerState } from "../src/scheduler.ts";

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

test("P06.1 bounds active work by concurrency", async () => {
  let active = 0;
  let maxActive = 0;
  const result = await runBounded([0, 1, 2, 3, 4], { fanout: 5, concurrency: 2, deadlineAt: Date.now() + 5000 }, async (item) => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await wait(5);
    active -= 1;
    return item * 2;
  });

  assert.deepEqual(result.results, [0, 2, 4, 6, 8]);
  assert.equal(maxActive, 2);
  assert.equal(result.state.maxActive, 2);
  assert.equal(result.state.reservedFanout, 5);
  assert.equal(result.state.consumedFanout, 5);
});

test("P06.1 rejects work above fanout before execution", async () => {
  let called = 0;
  await assert.rejects(
    () => runBounded([1, 2, 3], { fanout: 2, concurrency: 2, deadlineAt: Date.now() + 5000 }, async (item) => {
      called += 1;
      return item;
    }),
    (error: unknown) => error instanceof SchedulerError && error.code === "FANOUT_EXCEEDED",
  );
  assert.equal(called, 0);
});

test("P06.1 rejects expired deadline before execution", async () => {
  let called = 0;
  await assert.rejects(
    () => runBounded([1], { fanout: 1, concurrency: 1, deadlineAt: Date.now() - 1 }, async (item) => {
      called += 1;
      return item;
    }),
    (error: unknown) => error instanceof SchedulerError && error.code === "DEADLINE_EXCEEDED",
  );
  assert.equal(called, 0);
});

test("P06.1 preserves source order in results", async () => {
  const result = await runBounded([0, 1, 2], { fanout: 3, concurrency: 3, deadlineAt: Date.now() + 5000 }, async (item) => {
    await wait((2 - item) * 3);
    return `r${item}`;
  });
  assert.deepEqual(result.results, ["r0", "r1", "r2"]);
});

test("P06.1 propagates task failure without retry", async () => {
  let attempts = 0;
  await assert.rejects(
    () => runBounded([1], { fanout: 1, concurrency: 1, deadlineAt: Date.now() + 5000 }, async () => {
      attempts += 1;
      throw new Error("downstream-failure");
    }),
    /downstream-failure/,
  );
  assert.equal(attempts, 1);
});

test("P06.1 rejects invalid scheduler budget", () => {
  assert.throws(() => createSchedulerState({ fanout: 0, concurrency: 1, deadlineAt: Date.now() + 1000 }), (error: unknown) => error instanceof SchedulerError && error.code === "INVALID_SCHEDULER_BUDGET");
  assert.throws(() => createSchedulerState({ fanout: 2, concurrency: 0, deadlineAt: Date.now() + 1000 }), (error: unknown) => error instanceof SchedulerError && error.code === "INVALID_SCHEDULER_BUDGET");
});
