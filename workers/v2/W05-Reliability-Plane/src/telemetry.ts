export type ReliabilityPhase = "attempt" | "backoff";
export type ReliabilityPhaseOutcome = "success" | "failure" | "completed";

export interface ReliabilityPhaseEvent {
  readonly phase: ReliabilityPhase;
  readonly attempt: number;
  readonly target: string;
  readonly durationMs: number;
  readonly outcome: ReliabilityPhaseOutcome;
  readonly scheduledDelayMs?: number;
}

export type ReliabilityPhaseObserver = (event: ReliabilityPhaseEvent) => void;

export function safeObserve(observer: ReliabilityPhaseObserver | undefined, event: ReliabilityPhaseEvent): void {
  if (!observer) return;
  try {
    observer(event);
  } catch {
    // Observability must never change execution semantics.
  }
}

export class PhaseCollector {
  private readonly items: ReliabilityPhaseEvent[] = [];

  readonly observer: ReliabilityPhaseObserver = (event) => {
    this.items.push(Object.freeze({ ...event }));
  };

  events(): readonly ReliabilityPhaseEvent[] {
    return Object.freeze(this.items.map((event) => Object.freeze({ ...event })));
  }

  stats(): readonly {
    phase: ReliabilityPhase;
    count: number;
    totalMs: number;
    averageMs: number;
    failures: number;
  }[] {
    const grouped = new Map<ReliabilityPhase, { count: number; totalMs: number; failures: number }>();
    for (const event of this.items) {
      const current = grouped.get(event.phase) ?? { count: 0, totalMs: 0, failures: 0 };
      current.count += 1;
      current.totalMs += event.durationMs;
      if (event.outcome === "failure") current.failures += 1;
      grouped.set(event.phase, current);
    }
    return Object.freeze(
      [...grouped.entries()].map(([phase, value]) => Object.freeze({
        phase,
        count: value.count,
        totalMs: value.totalMs,
        averageMs: value.count === 0 ? 0 : value.totalMs / value.count,
        failures: value.failures,
      })),
    );
  }
}
