import assert from "node:assert/strict";
import test from "node:test";
import { CircuitBreaker, RetryBudget, ReliabilityError, executeReliably, type ReliabilityPolicy } from "../src/reliability.ts";

const policy: ReliabilityPolicy = {
  retry: { maxAttempts: 4, maxElapsedMs: 1_000, baseDelayMs: 1, maxDelayMs: 4, jitterRatio: 0, retryWrites: true },
  retryBudget: { capacity: 3, refillRate: 0 },
  timeout: { timeoutMs: 20 },
  circuit: { failureThreshold: 2, resetTimeoutMs: 100, halfOpenMaxProbes: 1 },
};

test("timeout remains retryable for idempotent operations and succeeds on recovery", async () => {
  let calls = 0;
  const result = await executeReliably(async (signal) => {
    calls += 1;
    if (calls === 1) {
      return new Promise<string>((_, reject) => {
        signal.addEventListener("abort", () => reject(new ReliabilityError("TIMEOUT", "aborted", { class: "timeout", retryable: true, code: "TIMEOUT" })), { once: true });
      });
    }
    return "recovered";
  }, { policy, operation: { kind: "read", idempotent: true, target: "timeout-recovery" }, retryBudget: new RetryBudget({ capacity: 3, refillRate: 0 }, () => 0), breaker: new CircuitBreaker(policy.circuit), sleep: async () => undefined });
  assert.equal(result, "recovered");
  assert.equal(calls, 2);
});

test("non-idempotent writes do not retry timeout failures", async () => {
  let calls = 0;
  await assert.rejects(executeReliably(async () => { calls += 1; throw new ReliabilityError("TIMEOUT", "timed out", { class: "timeout", retryable: true, code: "TIMEOUT" }); }, {
    policy, operation: { kind: "write", idempotent: false, target: "non-idempotent-timeout" }, sleep: async () => undefined,
  }), (error: unknown) => error instanceof ReliabilityError && error.code === "TIMEOUT" && error.attempts === 1);
  assert.equal(calls, 1);
});

test("circuit opening blocks subsequent execution after repeated transient terminal failures", async () => {
  const breaker = new CircuitBreaker({ ...policy.circuit, failureThreshold: 2 });
  let calls = 0;
  const failing = () => executeReliably(async () => { calls += 1; throw Object.assign(new Error("overloaded"), { status: 503 }); }, {
    policy: { ...policy, retry: { ...policy.retry, maxAttempts: 1 } }, breaker, operation: { kind: "read", idempotent: true, target: "circuit-retry" }, sleep: async () => undefined,
  });
  await assert.rejects(failing, (e: unknown) => e instanceof ReliabilityError && e.failure.class === "transient");
  await assert.rejects(failing, (e: unknown) => e instanceof ReliabilityError && e.failure.class === "transient");
  await assert.rejects(executeReliably(async () => { calls += 1; return "unexpected"; }, {
    policy, breaker, operation: { kind: "read", idempotent: true, target: "circuit-retry" }, sleep: async () => undefined,
  }), (e: unknown) => e instanceof ReliabilityError && e.code === "CIRCUIT_OPEN");
  assert.equal(calls, 2);
});

test("retry budget exhaustion bounds a retry storm", async () => {
  const budget = new RetryBudget({ capacity: 1, refillRate: 0 }, () => 0);
  let calls = 0;
  await assert.rejects(executeReliably(async () => { calls += 1; throw Object.assign(new Error("temporarily unavailable"), { status: 503 }); }, {
    policy: { ...policy, retry: { ...policy.retry, maxAttempts: 4 } }, retryBudget: budget, operation: { kind: "read", idempotent: true, target: "budget-storm" }, sleep: async () => undefined,
  }), (e: unknown) => e instanceof ReliabilityError && e.code === "RETRY_RATE_LIMITED" && e.attempts === 2);
  assert.equal(calls, 2);
});
