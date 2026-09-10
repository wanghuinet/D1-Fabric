export type SchedulerFailurePolicy = "FAIL_FAST";

export type SchedulerBudget = Readonly<{
  fanout: number;
  concurrency: number;
  deadlineAt: number;
  signal?: AbortSignal;
  failurePolicy?: SchedulerFailurePolicy;
}>;

export type SchedulerState = Readonly<{
  declaredFanout: number;
  reservedFanout: number;
  consumedFanout: number;
  declaredConcurrency: number;
  reservedConcurrency: number;
  maxReservedConcurrency: number;
  maxActive: number;
  completed: number;
}>;

export class SchedulerError extends Error {
  readonly code: "INVALID_SCHEDULER_BUDGET" | "FANOUT_EXCEEDED" | "DEADLINE_EXCEEDED" | "ABORTED" | "TASK_FAILED";
  constructor(code: SchedulerError["code"], message: string) {
    super(message);
    this.name = "SchedulerError";
    this.code = code;
  }
}

function finitePositive(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new SchedulerError("INVALID_SCHEDULER_BUDGET", `${field} must be a positive safe integer`);
  }
  return value;
}

function validateBudget(budget: SchedulerBudget): SchedulerBudget {
  const fanout = finitePositive(budget.fanout, "fanout");
  const concurrency = finitePositive(budget.concurrency, "concurrency");
  if (typeof budget.deadlineAt !== "number" || !Number.isSafeInteger(budget.deadlineAt)) {
    throw new SchedulerError("INVALID_SCHEDULER_BUDGET", "deadlineAt must be a safe integer");
  }
  if (budget.failurePolicy !== undefined && budget.failurePolicy !== "FAIL_FAST") {
    throw new SchedulerError("INVALID_SCHEDULER_BUDGET", "unsupported failure policy");
  }
  return Object.freeze({
    fanout,
    concurrency: Math.min(concurrency, fanout),
    deadlineAt: budget.deadlineAt,
    signal: budget.signal,
    failurePolicy: budget.failurePolicy ?? "FAIL_FAST",
  });
}

function deadlineError(signal?: AbortSignal): SchedulerError {
  if (signal?.aborted) return new SchedulerError("ABORTED", "scheduler execution was aborted");
  return new SchedulerError("DEADLINE_EXCEEDED", "scheduler deadline has expired");
}

function assertAdmissible(deadlineAt: number, signal?: AbortSignal): void {
  if (signal?.aborted) throw deadlineError(signal);
  if (Date.now() >= deadlineAt) throw new SchedulerError("DEADLINE_EXCEEDED", "scheduler deadline has expired");
}

export function createSchedulerState(budget: SchedulerBudget): SchedulerState {
  const valid = validateBudget(budget);
  return Object.freeze({
    declaredFanout: valid.fanout,
    reservedFanout: 0,
    consumedFanout: 0,
    declaredConcurrency: valid.concurrency,
    reservedConcurrency: 0,
    maxReservedConcurrency: 0,
    maxActive: 0,
    completed: 0,
  });
}

export async function runBounded<T, R>(
  items: readonly T[],
  budget: SchedulerBudget,
  task: (item: T, index: number, signal?: AbortSignal) => Promise<R>,
): Promise<Readonly<{ results: readonly R[]; state: SchedulerState }>> {
  const valid = validateBudget(budget);
  if (items.length > valid.fanout) {
    throw new SchedulerError("FANOUT_EXCEEDED", "work item count exceeds fanout budget");
  }
  assertAdmissible(valid.deadlineAt, valid.signal);

  const controller = new AbortController();
  const parentAbort = (): void => controller.abort(valid.signal?.reason);
  if (valid.signal?.aborted) controller.abort(valid.signal.reason);
  else valid.signal?.addEventListener("abort", parentAbort, { once: true });

  const results = new Array<R>(items.length);
  let nextIndex = 0;
  let active = 0;
  let completed = 0;
  let reservedFanout = 0;
  let maxActive = 0;
  let maxReservedConcurrency = 0;
  const activePromises = new Set<Promise<number>>();
  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
  const remainingMs = valid.deadlineAt - Date.now();
  if (remainingMs <= 0) {
    controller.abort(new SchedulerError("DEADLINE_EXCEEDED", "scheduler deadline has expired"));
    throw new SchedulerError("DEADLINE_EXCEEDED", "scheduler deadline has expired");
  }
  deadlineTimer = setTimeout(() => controller.abort(new SchedulerError("DEADLINE_EXCEEDED", "scheduler deadline reached")), remainingMs);

  const launch = (index: number): void => {
    assertAdmissible(valid.deadlineAt, valid.signal);
    if (controller.signal.aborted) throw deadlineError(controller.signal);
    reservedFanout += 1;
    active += 1;
    maxActive = Math.max(maxActive, active);
    maxReservedConcurrency = Math.max(maxReservedConcurrency, active);
    const operation = Promise.resolve()
      .then(() => task(items[index], index, controller.signal))
      .then(
        (result) => {
          results[index] = result;
          completed += 1;
          active -= 1;
          return index;
        },
        (error: unknown) => {
          active -= 1;
          throw new SchedulerError("TASK_FAILED", error instanceof Error ? error.message : "scheduled task failed");
        },
      );
    activePromises.add(operation);
    void operation.then(
      () => activePromises.delete(operation),
      () => activePromises.delete(operation),
    );
  };

  try {
    while (nextIndex < items.length && active < valid.concurrency) {
      launch(nextIndex);
      nextIndex += 1;
    }

    while (activePromises.size > 0) {
      await Promise.race(activePromises);
      assertAdmissible(valid.deadlineAt, valid.signal);
      while (nextIndex < items.length && active < valid.concurrency) {
        launch(nextIndex);
        nextIndex += 1;
      }
    }

    const state = Object.freeze({
      declaredFanout: valid.fanout,
      reservedFanout,
      consumedFanout: completed,
      declaredConcurrency: valid.concurrency,
      reservedConcurrency: 0,
      maxReservedConcurrency,
      maxActive,
      completed,
    });
    return Object.freeze({ results: Object.freeze(results), state });
  } finally {
    if (deadlineTimer !== undefined) clearTimeout(deadlineTimer);
    valid.signal?.removeEventListener("abort", parentAbort);
    controller.abort();
  }
}
