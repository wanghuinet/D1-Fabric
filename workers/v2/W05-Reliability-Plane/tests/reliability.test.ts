import {
  CircuitBreaker,
  ReliabilityError,
  RetryBudget,
  classifyFailure,
  executeReliably,
  retryDelayMs,
  type ReliabilityPolicy,
} from "../src/reliability.ts";

import assert from "node:assert/strict";
import test from "node:test";

const policy: ReliabilityPolicy = {
  retry: { maxAttempts: 3, maxElapsedMs: 5000, baseDelayMs: 10, maxDelayMs: 100, jitterRatio: 0, retryWrites: true },
  retryBudget: { capacity: 10, refillRate: 1 },
  timeout: { timeoutMs: 50 },
  circuit: { failureThreshold: 2, resetTimeoutMs: 1000, halfOpenMaxProbes: 1 },
};

test("classifies transient D1/network failures as retryable", () => {
  assert.equal(classifyFailure(new Error("Network connection lost")).retryable, true);
  assert.equal(classifyFailure(Object.assign(new Error("busy"), { status: 503 })).class, "transient");
  assert.equal(classifyFailure(Object.assign(new Error("bad request"), { status: 400 })).retryable, false);
});

test("retry delay is bounded and exponential", () => {
  assert.equal(retryDelayMs(policy.retry, 1, () => 0.5), 10);
  assert.equal(retryDelayMs(policy.retry, 2, () => 0.5), 20);
  assert.equal(retryDelayMs(policy.retry, Number.MAX_SAFE_INTEGER, () => 0.5), 100);
});

test("invalid jitter source is rejected instead of silently clamped", () => {
  assert.throws(() => retryDelayMs(policy.retry, 1, () => -0.01), (error: unknown) => error instanceof ReliabilityError && error.code === "INVALID_RANDOM");
  assert.throws(() => retryDelayMs(policy.retry, 1, () => 1.01), (error: unknown) => error instanceof ReliabilityError && error.code === "INVALID_RANDOM");
  assert.throws(() => retryDelayMs(policy.retry, 1, () => Number.NaN), (error: unknown) => error instanceof ReliabilityError && error.code === "INVALID_RANDOM");
});

test("retry budget token bucket consumes capacity and refills over time", () => {
  let now = 0;
  const budget = new RetryBudget({ capacity: 2, refillRate: 1 }, () => now);
  assert.equal(budget.available(), 2);
  assert.equal(budget.allow(), true);
  assert.equal(budget.allow(), true);
  assert.equal(budget.allow(), false);
  now = 500;
  assert.equal(budget.allow(), false);
  now = 1000;
  assert.equal(budget.allow(), true);
  assert.equal(budget.available(), 0);
  now = 3000;
  assert.equal(budget.available(), 2);
});

test("retry budget never gains tokens when the clock moves backwards", () => {
  let now = 1000;
  const budget = new RetryBudget({ capacity: 2, refillRate: 10 }, () => now);
  assert.equal(budget.allow(), true);
  assert.equal(budget.available(), 1);
  now = 500;
  assert.equal(budget.available(), 1);
  now = 600;
  assert.equal(budget.available(), 1);
  now = 1100;
  assert.equal(budget.available(), 2);
});

test("invalid retry budget clock is rejected", () => {
  assert.throws(() => new RetryBudget({ capacity: 1, refillRate: 1 }, () => Number.NaN), (error: unknown) => error instanceof ReliabilityError && error.code === "INVALID_CLOCK");
});

test("non-idempotent writes never retry or consume retry budget", async () => {
  const budget = new RetryBudget({ capacity: 1, refillRate: 0 }, () => 0);
  let calls = 0;
  await assert.rejects(
    executeReliably(async () => { calls += 1; throw new Error("Network connection lost"); }, {
      policy: { ...policy, retryBudget: { capacity: 1, refillRate: 0 } },
      retryBudget: budget,
      operation: { kind: "write", idempotent: false, target: "db-1" },
      sleep: async () => undefined,
    }),
  );
  assert.equal(calls, 1);
  assert.equal(budget.available(), 1);
});

test("idempotent writes retry within the attempt and retry budgets", async () => {
  let calls = 0;
  const result = await executeReliably(async () => {
    calls += 1;
    if (calls < 3) throw new Error("Network connection lost");
    return "ok";
  }, {
    policy,
    retryBudget: new RetryBudget({ capacity: 2, refillRate: 0 }, () => 0),
    operation: { kind: "write", idempotent: true, target: "db-1" },
    sleep: async () => undefined,
  });
  assert.equal(result, "ok");
  assert.equal(calls, 3);
});

test("retry budget exhaustion fails fast with a distinct code", async () => {
  let calls = 0;
  const budget = new RetryBudget({ capacity: 1, refillRate: 0 }, () => 0);
  await assert.rejects(
    executeReliably(async () => {
      calls += 1;
      throw new Error("Network connection lost");
    }, {
      policy: { ...policy, retry: { ...policy.retry, maxAttempts: 5 } },
      retryBudget: budget,
      operation: { kind: "read", idempotent: true, target: "db-1" },
      sleep: async () => undefined,
    }),
    (error: unknown) => error instanceof ReliabilityError && error.code === "RETRY_RATE_LIMITED" && error.attempts === 2,
  );
  assert.equal(calls, 2);
});

test("retry budget prevents a retry storm after the token capacity is consumed", async () => {
  const budget = new RetryBudget({ capacity: 2, refillRate: 0 }, () => 0);
  let calls = 0;
  await assert.rejects(
    executeReliably(async () => {
      calls += 1;
      throw new Error("Network connection lost");
    }, {
      policy: { ...policy, retry: { ...policy.retry, maxAttempts: 20 } },
      retryBudget: budget,
      operation: { kind: "read", idempotent: true, target: "db-1" },
      sleep: async () => undefined,
    }),
    (error: unknown) => error instanceof ReliabilityError && error.code === "RETRY_RATE_LIMITED",
  );
  assert.equal(calls, 3);
});

test("retryable internal attempts do not self-trip the circuit", async () => {
  const breaker = new CircuitBreaker({ ...policy.circuit, failureThreshold: 1 });
  let calls = 0;
  const result = await executeReliably(async () => {
    calls += 1;
    if (calls === 1) throw new Error("Network connection lost");
    return "ok";
  }, {
    policy: { ...policy, circuit: { ...policy.circuit, failureThreshold: 1 } },
    breaker,
    operation: { kind: "read", idempotent: true, target: "db-1" },
    sleep: async () => undefined,
  });
  assert.equal(result, "ok");
  assert.equal(calls, 2);
  assert.equal(breaker.stateAt(0), "closed");
});

test("read operations retry transient failures", async () => {
  let calls = 0;
  const result = await executeReliably(async () => {
    calls += 1;
    if (calls === 1) throw Object.assign(new Error("overloaded"), { status: 503 });
    return 42;
  }, {
    policy,
    operation: { kind: "read", idempotent: true, target: "db-1" },
    sleep: async () => undefined,
  });
  assert.equal(result, 42);
  assert.equal(calls, 2);
});

test("circuit opens after threshold and allows one half-open probe", () => {
  const breaker = new CircuitBreaker(policy.circuit);
  breaker.recordFailure(0);
  assert.equal(breaker.allow(0), true);
  breaker.recordFailure(0);
  assert.equal(breaker.allow(1), false);
  assert.equal(breaker.stateAt(1000), "half_open");
  assert.equal(breaker.allow(1000), true);
  assert.equal(breaker.allow(1000), false);
});

test("circuit rejects invalid timestamps", () => {
  const breaker = new CircuitBreaker(policy.circuit);
  assert.throws(() => breaker.allow(Number.NaN), (error: unknown) => error instanceof ReliabilityError && error.code === "INVALID_CLOCK");
});

test("timeout is surfaced as a typed reliability failure", async () => {
  await assert.rejects(
    executeReliably(() => new Promise<string>((resolve) => setTimeout(() => resolve("late"), 100)), {
      policy: { ...policy, retry: { ...policy.retry, maxAttempts: 1 } },
      operation: { kind: "read", idempotent: true, target: "db-1" },
      sleep: async () => undefined,
    }),
    (error: unknown) => error instanceof Error && error.name === "ReliabilityError" && "failure" in error,
  );
});

test("retry elapsed-time budget remains distinct from retry-rate budget", async () => {
  let nowValue = 1000;
  let calls = 0;
  await assert.rejects(
    executeReliably(async () => {
      calls += 1;
      nowValue += 40;
      throw new Error("Network connection lost");
    }, {
      policy: { ...policy, retry: { ...policy.retry, maxElapsedMs: 50, baseDelayMs: 20, maxDelayMs: 20 } },
      operation: { kind: "read", idempotent: true, target: "db-1" },
      now: () => nowValue,
      sleep: async () => undefined,
    }),
    (error: unknown) => error instanceof ReliabilityError && error.code === "RETRY_BUDGET_EXCEEDED" && error.attempts === 1,
  );
  assert.equal(calls, 1);
});

test("invalid reliability policy is rejected before execution", async () => {
  await assert.rejects(
    executeReliably(async () => "never", {
      policy: { ...policy, retryBudget: { capacity: 0, refillRate: 1 } },
      operation: { kind: "read", idempotent: true, target: "db-1" },
    }),
    (error: unknown) => error instanceof ReliabilityError && error.code === "INVALID_POLICY",
  );
});
