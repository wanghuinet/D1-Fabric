export type OperationKind = "read" | "write";
export type FailureClass = "transient" | "timeout" | "permanent" | "circuit_open";

export interface RetryPolicy {
  maxAttempts: number;
  maxElapsedMs: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterRatio: number;
  retryWrites: boolean;
}

export interface RetryBudgetPolicy {
  capacity: number;
  refillRate: number;
}

export interface TimeoutPolicy {
  timeoutMs: number;
}

export interface CircuitBreakerPolicy {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxProbes: number;
}

export interface ReliabilityPolicy {
  retry: RetryPolicy;
  retryBudget: RetryBudgetPolicy;
  timeout: TimeoutPolicy;
  circuit: CircuitBreakerPolicy;
}

export interface OperationDescriptor {
  kind: OperationKind;
  idempotent: boolean;
  target: string;
}

export interface FailureInfo {
  class: FailureClass;
  retryable: boolean;
  status?: number;
  code?: string;
}

export class ReliabilityError extends Error {
  readonly code: string;
  readonly failure: FailureInfo;
  readonly attempts: number;

  constructor(code: string, message: string, failure: FailureInfo, attempts = 0) {
    super(message);
    this.name = "ReliabilityError";
    this.code = code;
    this.failure = failure;
    this.attempts = attempts;
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function statusOf(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: unknown }).status;
    return typeof status === "number" ? status : undefined;
  }
  return undefined;
}

function codeOf(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

export function classifyFailure(error: unknown): FailureInfo {
  const message = messageOf(error).toLowerCase();
  const status = statusOf(error);
  const code = codeOf(error);

  if (status === 408 || status === 425 || status === 429 || (status !== undefined && status >= 500)) {
    return { class: "transient", retryable: true, status, code };
  }
  if (status !== undefined && status >= 400) {
    return { class: "permanent", retryable: false, status, code };
  }
  if (code === "TIMEOUT" || code === "ETIMEDOUT" || message.includes("timeout") || message.includes("timed out")) {
    return { class: "timeout", retryable: true, status, code };
  }
  if (
    code === "NETWORK_ERROR" ||
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    message.includes("network connection lost") ||
    message.includes("connection reset") ||
    message.includes("temporarily unavailable")
  ) {
    return { class: "transient", retryable: true, status, code };
  }
  return { class: "permanent", retryable: false, status, code };
}

function invalidPolicy(message: string): ReliabilityError {
  return new ReliabilityError("INVALID_POLICY", message, { class: "permanent", retryable: false });
}

function assertPolicy(policy: ReliabilityPolicy): void {
  if (!Number.isSafeInteger(policy.retry.maxAttempts) || policy.retry.maxAttempts < 1) throw invalidPolicy("maxAttempts must be >= 1");
  if (!Number.isFinite(policy.retry.maxElapsedMs) || policy.retry.maxElapsedMs <= 0) throw invalidPolicy("maxElapsedMs must be > 0");
  if (!Number.isFinite(policy.retry.baseDelayMs) || policy.retry.baseDelayMs < 0) throw invalidPolicy("baseDelayMs must be >= 0");
  if (!Number.isFinite(policy.retry.maxDelayMs) || policy.retry.maxDelayMs < policy.retry.baseDelayMs) throw invalidPolicy("maxDelayMs must be >= baseDelayMs");
  if (!Number.isFinite(policy.retry.jitterRatio) || policy.retry.jitterRatio < 0 || policy.retry.jitterRatio > 1) throw invalidPolicy("jitterRatio must be between 0 and 1");
  if (!Number.isSafeInteger(policy.retryBudget.capacity) || policy.retryBudget.capacity < 1) throw invalidPolicy("retry budget capacity must be a positive safe integer");
  if (!Number.isFinite(policy.retryBudget.refillRate) || policy.retryBudget.refillRate < 0) throw invalidPolicy("retry budget refillRate must be >= 0");
  if (!Number.isFinite(policy.timeout.timeoutMs) || policy.timeout.timeoutMs <= 0) throw invalidPolicy("timeoutMs must be > 0");
  if (!Number.isSafeInteger(policy.circuit.failureThreshold) || policy.circuit.failureThreshold < 1) throw invalidPolicy("failureThreshold must be >= 1");
  if (!Number.isFinite(policy.circuit.resetTimeoutMs) || policy.circuit.resetTimeoutMs < 0) throw invalidPolicy("resetTimeoutMs must be >= 0");
  if (!Number.isSafeInteger(policy.circuit.halfOpenMaxProbes) || policy.circuit.halfOpenMaxProbes < 1) throw invalidPolicy("halfOpenMaxProbes must be >= 1");
}

function finiteNow(now: number, source: string): number {
  if (!Number.isFinite(now)) {
    throw new ReliabilityError("INVALID_CLOCK", `${source} clock must return a finite value`, { class: "permanent", retryable: false });
  }
  return now;
}

export function retryDelayMs(policy: RetryPolicy, attempt: number, random = Math.random): number {
  const sample = random();
  if (!Number.isFinite(sample) || sample < 0 || sample > 1) {
    throw new ReliabilityError("INVALID_RANDOM", "random source must return a value between 0 and 1", { class: "permanent", retryable: false });
  }
  const exponent = Math.min(30, Math.max(0, attempt - 1));
  const exponential = Math.min(policy.maxDelayMs, policy.baseDelayMs * (2 ** exponent));
  const spread = exponential * policy.jitterRatio;
  return Math.max(0, Math.min(policy.maxDelayMs, exponential - spread + (2 * spread * sample)));
}

export class RetryBudget {
  private tokens: number;
  private lastRefill: number;
  private readonly policy: RetryBudgetPolicy;
  private readonly now: () => number;

  constructor(policy: RetryBudgetPolicy, now = () => Date.now()) {
    if (!Number.isSafeInteger(policy.capacity) || policy.capacity < 1) throw invalidPolicy("retry budget capacity must be a positive safe integer");
    if (!Number.isFinite(policy.refillRate) || policy.refillRate < 0) throw invalidPolicy("retry budget refillRate must be >= 0");
    this.policy = policy;
    this.now = now;
    this.tokens = policy.capacity;
    this.lastRefill = finiteNow(this.now(), "retry budget");
  }

  allow(): boolean {
    this.refill();
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }

  available(): number {
    this.refill();
    return this.tokens;
  }

  private refill(): void {
    const current = finiteNow(this.now(), "retry budget");
    const effectiveCurrent = Math.max(this.lastRefill, current);
    const elapsedSeconds = (effectiveCurrent - this.lastRefill) / 1000;
    if (elapsedSeconds === 0) return;
    this.tokens = Math.min(this.policy.capacity, this.tokens + elapsedSeconds * this.policy.refillRate);
    this.lastRefill = effectiveCurrent;
  }
}

export class CircuitBreaker {
  private state: "closed" | "open" | "half_open" = "closed";
  private failures = 0;
  private openedAt = 0;
  private probes = 0;
  private readonly policy: CircuitBreakerPolicy;

  constructor(policy: CircuitBreakerPolicy) {
    if (!Number.isSafeInteger(policy.failureThreshold) || policy.failureThreshold < 1) throw invalidPolicy("failureThreshold must be >= 1");
    if (!Number.isFinite(policy.resetTimeoutMs) || policy.resetTimeoutMs < 0) throw invalidPolicy("resetTimeoutMs must be >= 0");
    if (!Number.isSafeInteger(policy.halfOpenMaxProbes) || policy.halfOpenMaxProbes < 1) throw invalidPolicy("halfOpenMaxProbes must be >= 1");
    this.policy = policy;
  }

  stateAt(now: number): "closed" | "open" | "half_open" {
    const current = finiteNow(now, "circuit");
    if (this.state === "open" && current - this.openedAt >= this.policy.resetTimeoutMs) {
      this.state = "half_open";
      this.probes = 0;
    }
    return this.state;
  }

  allow(now: number): boolean {
    const state = this.stateAt(now);
    if (state === "closed") return true;
    if (state === "open") return false;
    if (this.probes >= this.policy.halfOpenMaxProbes) return false;
    this.probes += 1;
    return true;
  }

  recordSuccess(now: number): void {
    this.stateAt(now);
    this.state = "closed";
    this.failures = 0;
    this.probes = 0;
  }

  recordFailure(now: number): void {
    const current = finiteNow(now, "circuit");
    const state = this.stateAt(current);
    if (state === "half_open") {
      this.state = "open";
      this.openedAt = current;
      this.failures = this.policy.failureThreshold;
      this.probes = 0;
      return;
    }
    this.failures += 1;
    if (this.failures >= this.policy.failureThreshold) {
      this.state = "open";
      this.openedAt = current;
    }
  }
}

export function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new ReliabilityError("TIMEOUT", `operation exceeded ${timeoutMs}ms`, { class: "timeout", retryable: true, code: "TIMEOUT" }));
    }, timeoutMs);
    operation.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

export interface ExecuteOptions {
  policy: ReliabilityPolicy;
  operation: OperationDescriptor;
  now?: () => number;
  sleep?: (delayMs: number) => Promise<void>;
  random?: () => number;
  breaker?: CircuitBreaker;
  retryBudget?: RetryBudget;
}

export async function executeReliably<T>(fn: () => Promise<T>, options: ExecuteOptions): Promise<T> {
  assertPolicy(options.policy);
  const now = options.now ?? (() => Date.now());
  const sleep = options.sleep ?? ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const random = options.random ?? Math.random;
  const breaker = options.breaker ?? new CircuitBreaker(options.policy.circuit);
  const retryBudget = options.retryBudget ?? new RetryBudget(options.policy.retryBudget, now);
  const startedAt = finiteNow(now(), "reliability");

  const retriesAllowed = options.operation.kind === "read" || (options.operation.kind === "write" && options.operation.idempotent && options.policy.retry.retryWrites);
  let attempt = 0;

  while (attempt < options.policy.retry.maxAttempts) {
    const current = finiteNow(now(), "reliability");
    const elapsed = Math.max(0, current - startedAt);
    if (elapsed >= options.policy.retry.maxElapsedMs) {
      throw new ReliabilityError("RETRY_BUDGET_EXCEEDED", "reliability time budget exhausted", { class: "transient", retryable: false }, attempt);
    }
    if (!breaker.allow(current)) {
      throw new ReliabilityError("CIRCUIT_OPEN", `circuit is open for ${options.operation.target}`, { class: "circuit_open", retryable: false }, attempt);
    }
    attempt += 1;
    try {
      const remaining = Math.min(options.policy.timeout.timeoutMs, Math.max(1, options.policy.retry.maxElapsedMs - Math.max(0, finiteNow(now(), "reliability") - startedAt)));
      const result = await withTimeout(fn(), remaining);
      breaker.recordSuccess(finiteNow(now(), "reliability"));
      return result;
    } catch (error) {
      const failure = classifyFailure(error);
      const canRetry = failure.retryable && retriesAllowed && attempt < options.policy.retry.maxAttempts;
      if (!canRetry) {
        breaker.recordFailure(finiteNow(now(), "reliability"));
        if (error instanceof ReliabilityError) throw new ReliabilityError(error.code, error.message, failure, attempt);
        throw new ReliabilityError("OPERATION_FAILED", messageOf(error), failure, attempt);
      }
      if (!retryBudget.allow()) {
        breaker.recordFailure(finiteNow(now(), "reliability"));
        throw new ReliabilityError("RETRY_RATE_LIMITED", "retry budget exhausted", { class: "transient", retryable: false, code: "RETRY_RATE_LIMITED" }, attempt);
      }
      const delay = retryDelayMs(options.policy.retry, attempt, random);
      const remaining = options.policy.retry.maxElapsedMs - Math.max(0, finiteNow(now(), "reliability") - startedAt);
      if (delay >= remaining) {
        breaker.recordFailure(finiteNow(now(), "reliability"));
        throw new ReliabilityError("RETRY_BUDGET_EXCEEDED", "reliability time budget exhausted before next retry", { class: "transient", retryable: false }, attempt);
      }
      await sleep(delay);
    }
  }

  throw new ReliabilityError("RETRY_EXHAUSTED", "retry attempt budget exhausted", { class: "transient", retryable: false }, attempt);
}
