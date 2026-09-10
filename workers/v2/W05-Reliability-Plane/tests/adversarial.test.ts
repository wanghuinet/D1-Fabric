import {
  CircuitBreaker,
  ReliabilityError,
  RetryBudget,
  classifyFailure,
  executeReliably,
  type ReliabilityPolicy,
} from "../src/reliability.ts";

import assert from "node:assert/strict";
import test from "node:test";

const policy: ReliabilityPolicy = {
  retry: { maxAttempts: 10, maxElapsedMs: 5000, baseDelayMs: 1, maxDelayMs: 8, jitterRatio: 0, retryWrites: true },
  retryBudget: { capacity: 2, refillRate: 0 },
  timeout: { timeoutMs: 10 },
  circuit: { failureThreshold: 2, resetTimeoutMs: 1000, halfOpenMaxProbes: 1 },
};

test("failure classification matrix keeps client failures permanent and overload failures retryable", () => {
  for (const status of [400, 401, 403, 404]) {
    const failure = classifyFailure(Object.assign(new Error("client"), { status }));
    assert.equal(failure.class, "permanent");
    assert.equal(failure.retryable, false);
  }
  for (const status of [408, 425, 429, 500, 502, 503, 504]) {
    const failure = classifyFailure(Object.assign(new Error("server"), { status }));
    assert.equal(failure.class, "transient");
    assert.equal(failure.retryable, true);
  }
});

test("repeated transient failures cannot create an unbounded retry storm", async () => {
  const budget = new RetryBudget({ capacity: 2, refillRate: 0 }, () => 0);
  let calls = 0;
  await assert.rejects(
    executeReliably(async () => {
      calls += 1;
      throw Object.assign(new Error("overloaded"), { status: 503 });
    }, {
      policy,
      retryBudget: budget,
      operation: { kind: "read", idempotent: true, target: "db-storm" },
      sleep: async () => undefined,
    }),
    (error: unknown) => error instanceof ReliabilityError && error.code === "RETRY_RATE_LIMITED" && error.attempts === 3,
  );
  assert.equal(calls, 3);
});

test("circuit breaker absorbs repeated terminal failures and blocks the next call", async () => {
  const breaker = new CircuitBreaker(policy.circuit);
  const operation = { kind: "read" as const, idempotent: true, target: "db-circuit" };

  for (let i = 0; i < 2; i += 1) {
    await assert.rejects(
      executeReliably(async () => {
        throw Object.assign(new Error("unavailable"), { status: 503 });
      }, {
        policy: { ...policy, retry: { ...policy.retry, maxAttempts: 1 } },
        breaker,
        operation,
        sleep: async () => undefined,
      }),
      (error: unknown) => error instanceof ReliabilityError && error.failure.class === "transient",
    );
  }

  let calls = 0;
  await assert.rejects(
    executeReliably(async () => {
      calls += 1;
      return "must-not-run";
    }, {
      policy,
      breaker,
      operation,
      sleep: async () => undefined,
    }),
    (error: unknown) => error instanceof ReliabilityError && error.code === "CIRCUIT_OPEN",
  );
  assert.equal(calls, 0);
});

test("half-open circuit admits exactly the configured probe count", () => {
  const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 100, halfOpenMaxProbes: 2 });
  breaker.recordFailure(0);
  assert.equal(breaker.allow(100), true);
  assert.equal(breaker.allow(100), true);
  assert.equal(breaker.allow(100), false);
  breaker.recordSuccess(100);
  assert.equal(breaker.stateAt(100), "closed");
});

test("half-open probe failure immediately reopens the circuit", () => {
  const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 100, halfOpenMaxProbes: 1 });
  breaker.recordFailure(0);
  assert.equal(breaker.allow(100), true);
  breaker.recordFailure(100);
  assert.equal(breaker.allow(100), false);
  assert.equal(breaker.stateAt(199), "open");
  assert.equal(breaker.stateAt(200), "half_open");
});
