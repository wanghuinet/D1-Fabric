export type SchedulerBudget = Readonly<{
  fanout: number;
  concurrency: number;
  deadlineAt: number;
}>;

export type SchedulerState = Readonly<{
  declaredFanout: number;
  reservedFanout: number;
  consumedFanout: number;
  declaredConcurrency: number;
  reservedConcurrency: number;
  maxActive: number;
  completed: number;
}>;

export class SchedulerError extends Error {
  readonly code: "INVALID_SCHEDULER_BUDGET" | "FANOUT_EXCEEDED" | "DEADLINE_EXCEEDED";
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
  return Object.freeze({ fanout, concurrency: Math.min(concurrency, fanout), deadlineAt: budget.deadlineAt });
}

export function createSchedulerState(budget: SchedulerBudget): SchedulerState {
  const valid = validateBudget(budget);
  return Object.freeze({
    declaredFanout: valid.fanout,
    reservedFanout: 0,
    consumedFanout: 0,
    declaredConcurrency: valid.concurrency,
    reservedConcurrency: 0,
    maxActive: 0,
    completed: 0,
  });
}

export async function runBounded<T, R>(
  items: readonly T[],
  budget: SchedulerBudget,
  task: (item: T, index: number) => Promise<R>,
): Promise<Readonly<{ results: readonly R[]; state: SchedulerState }>> {
  const valid = validateBudget(budget);
  if (items.length > valid.fanout) {
    throw new SchedulerError("FANOUT_EXCEEDED", "work item count exceeds fanout budget");
  }
  if (Date.now() >= valid.deadlineAt) {
    throw new SchedulerError("DEADLINE_EXCEEDED", "scheduler deadline has expired");
  }

  const results = new Array<R>(items.length);
  let nextIndex = 0;
  let active = 0;
  let completed = 0;
  let reservedFanout = 0;
  let maxActive = 0;
  const activePromises = new Set<Promise<number>>();

  const launch = (index: number): void => {
    if (Date.now() >= valid.deadlineAt) {
      throw new SchedulerError("DEADLINE_EXCEEDED", "scheduler deadline reached before admission");
    }
    reservedFanout += 1;
    active += 1;
    maxActive = Math.max(maxActive, active);
    const operation = task(items[index], index).then((result) => {
      results[index] = result;
      completed += 1;
      active -= 1;
      return index;
    });
    activePromises.add(operation);
    void operation.finally(() => activePromises.delete(operation));
  };

  while (nextIndex < items.length && active < valid.concurrency) {
    launch(nextIndex);
    nextIndex += 1;
  }

  while (activePromises.size > 0) {
    await Promise.race(activePromises);
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
    maxActive,
    completed,
  });
  return Object.freeze({ results: Object.freeze(results), state });
}
