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

function assertPolicy(policy: ReliabilityPolicy): void {
  if (!Number.isSafeInteger(policy.retry.maxAttempts) || policy.retry.maxAttempts < 1) throw new ReliabilityError("INVALID_POLICY", "maxAttempts must be >= 1", { class: "permanent", retryable: false });
  if (!Number.isFinite(policy.retry.maxElapsedMs) || policy.retry.maxElapsedMs <= 0) throw new ReliabilityError("INVALID_POLICY", "maxElapsedMs must be > 0", { class: "permanent", retryable: false });
  if (!Number.isFinite(policy.retry.baseDelayMs) || policy.retry.baseDelayMs < 0) throw new ReliabilityError("INVALID_POLICY", "baseDelayMs must be >= 0", { class: "permanent", retryable: false });
  if (!Number.isFinite(policy.retry.maxDelayMs) || policy.retry.maxDelayMs < policy.retry.baseDelayMs) throw new ReliabilityError("INVALID_POLICY", "maxDelayMs must be >= baseDelayMs", { class: "permanent", retryable: false });
  if (!Number.isFinite(policy.retry.jitterRatio) || policy.retry.jitterRatio < 0 || policy.retry.jitterRatio > 1) throw new ReliabilityError("INVALID_POLICY", "jitterRatio must be between 0 and 1", { class: "permanent", retryable: false });
  if (!Number.isFinite(policy.timeout.timeoutMs) || policy.timeout.timeoutMs <= 0) throw new ReliabilityError("INVALID_POLICY", "timeoutMs must be > 0", { class: "permanent", retryable: false });
  if (!Number.isSafeInteger(policy.circuit.failureThreshold) || policy.circuit.failureThreshold < 1) throw new ReliabilityError("INVALID_POLICY", "failureThreshold must be >= 1", { class: "permanent", retryable: false });
  if (!Number.isFinite(policy.circuit.resetTimeoutMs) || policy.circuit.resetTimeoutMs < 0) throw new ReliabilityError("INVALID_POLICY", "resetTimeoutMs must be >= 0", { class: "permanent", retryable: false });
  if (!Number.isSafeInteger(policy.circuit.halfOpenMaxProbes) || policy.circuit.halfOpenMaxProbes < 1) throw new ReliabilityError("INVALID_POLICY", "halfOpenMaxProbes must be >= 1", { class: "permanent", retryable: false });
}

export function retryDelayMs(policy: RetryPolicy, attempt: number, random = Math.random): number {
  const sample = random();
  if (!Number.isFinite(sample)) throw new ReliabilityError("INVALID_RANDOM", "random source must return a finite value", { class: "permanent", retryable: false });
  const exponent = Math.min(30, Math.max(0, attempt - 1));
  const exponential = Math.min(policy.maxDelayMs, policy.baseDelayMs * (2 ** exponent));
  const spread = exponential * policy.jitterRatio;
  return Math.max(0, Math.min(policy.maxDelayMs, exponential - spread + (2 * spread * sample)));
}

export class CircuitBreaker {
  private state: "closed" | "open" | "half_open" = "closed";
  private failures = 0;
  private openedAt = 0;
  private probes = 0;
  private readonly policy: CircuitBreakerPolicy;

  constructor(policy: CircuitBreakerPolicy) {
    this.policy = policy;
  }

  stateAt(now: number): "closed" | "open" | "half_open" {
    if (this.state === "open" && now - this.openedAt >= this.policy.resetTimeoutMs) {
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
    const state = this.stateAt(now);
    if (state === "half_open") {
      this.state = "open";
      this.openedAt = now;
      this.failures = this.policy.failureThreshold;
      this.probes = 0;
      return;
    }
    this.failures += 1;
    if (this.failures >= this.policy.failureThreshold) {
      this.state = "open";
      this.openedAt = now;
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
}

export async function executeReliably<T>(fn: () => Promise<T>, options: ExecuteOptions): Promise<T> {
  assertPolicy(options.policy);
  const now = options.now ?? (() => Date.now());
  const sleep = options.sleep ?? ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const random = options.random ?? Math.random;
  const breaker = options.breaker ?? new CircuitBreaker(options.policy.circuit);
  const startedAt = now();

  const retriesAllowed = options.operation.kind === "read" || (options.operation.kind === "write" && options.operation.idempotent && options.policy.retry.retryWrites);
  let attempt = 0;

  while (attempt < options.policy.retry.maxAttempts) {
    const elapsed = Math.max(0, now() - startedAt);
    if (elapsed >= options.policy.retry.maxElapsedMs) {
      throw new ReliabilityError("RETRY_BUDGET_EXCEEDED", "reliability time budget exhausted", { class: "transient", retryable: false }, attempt);
    }
    if (!breaker.allow(now())) {
      throw new ReliabilityError("CIRCUIT_OPEN", `circuit is open for ${options.operation.target}`, { class: "circuit_open", retryable: false }, attempt);
    }
    attempt += 1;
    try {
      const remaining = Math.min(options.policy.timeout.timeoutMs, Math.max(1, options.policy.retry.maxElapsedMs - Math.max(0, now() - startedAt)));
      const result = await withTimeout(fn(), remaining);
      breaker.recordSuccess(now());
      return result;
    } catch (error) {
      const failure = classifyFailure(error);
      const canRetry = failure.retryable && retriesAllowed && attempt < options.policy.retry.maxAttempts;
      if (!canRetry) {
        breaker.recordFailure(now());
        if (error instanceof ReliabilityError) throw new ReliabilityError(error.code, error.message, failure, attempt);
        throw new ReliabilityError("OPERATION_FAILED", messageOf(error), failure, attempt);
      }
      const delay = retryDelayMs(options.policy.retry, attempt, random);
      const remaining = options.policy.retry.maxElapsedMs - Math.max(0, now() - startedAt);
      if (delay >= remaining) {
        breaker.recordFailure(now());
        throw new ReliabilityError("RETRY_BUDGET_EXCEEDED", "reliability time budget exhausted before next retry", { class: "transient", retryable: false }, attempt);
      }
      await sleep(delay);
    }
  }

  throw new ReliabilityError("RETRY_EXHAUSTED", "retry attempt budget exhausted", { class: "transient", retryable: false }, attempt);
}
