# D1-Fabric 3.0 — P06 Bounded Scheduler + Fan-out v1.0

**Status:** ACTIVE / EXECUTABLE / LOCKED
**phaseId:** P06
**taskId:** P06.1
**contractId:** D1F-3.0-MASTER-v1.0
**architectureId:** D1F-3.0-ARCH-v1.0
**implementationOwner:** GPT
**verificationId:** P06.1-GPT-REVIEW

## Objective

Implement the W02 bounded scheduler that admits already-routed work under finite fan-out and concurrency budgets.

P06 MUST terminate at bounded scheduling. It MUST NOT execute D1/SQL, perform reads/writes, implement cache, retry, idempotency, placement authority, or business semantics.

## Allowed files

```text
workers/v2/W02-Execution-Fabric/**
docs/phases/P06-BOUNDED-SCHEDULER-v1.0.md
docs/phases/evidence/P06.1-EVIDENCE.md
```

## Forbidden

```text
W01 changes
W03 changes
W04 changes
D1 execution
SQL execution
cache implementation
retry implementation
idempotency state
placement authority
business-domain semantics
Promise.all(N)
unbounded concurrency
unbounded fan-out
new Worker/runtime primitive
```

## Inputs

The scheduler accepts:

```text
already-routed generic work items
finite fanout budget
finite concurrency budget
a finite execution deadline
```

The scheduler MUST NOT invent a larger budget than the compiled execution plan provides.

## Required invariants

1. `items.length <= fanoutBudget` is required before admission; excess work is rejected rather than partially admitted.
2. Active work MUST never exceed `concurrencyBudget`.
3. Fan-out consumption is exactly one unit per admitted item.
4. Reservation occurs before a work item starts.
5. Completion releases concurrency reservation and records completion.
6. A rejected item receives no execution attempt.
7. No retry is created by the scheduler.
8. The scheduler MUST NOT use `Promise.all(N)` or create one promise per unbounded input item.
9. Deadline is checked before each admission.
10. Scheduler state is isolated to one invocation and one execution; no global mutable coordinator is introduced.
11. Ordering is deterministic for admission: source order is preserved.
12. Scheduler failure is fail-closed; it does not silently increase fan-out or concurrency.

## Resource ledger

The P06 scheduler tracks only scheduler-owned resources:

```text
fanout: DECLARED → RESERVED → CONSUMED
concurrency: DECLARED → RESERVED → RELEASED
```

D1 statements, rows, payload bytes, retries, and write budgets remain downstream execution resources and MUST NOT be fabricated or consumed by P06.

## Failure matrix

| Case | Expected |
|---|---|
| zero/invalid concurrency | `INVALID_SCHEDULER_BUDGET` |
| zero/invalid fanout | `INVALID_SCHEDULER_BUDGET` |
| items exceed fanout | `FANOUT_EXCEEDED` |
| deadline already expired | `DEADLINE_EXCEEDED` |
| downstream task fails | propagate failure; no implicit retry |
| valid bounded workload | complete with bounded concurrency |

## Security/resource cases

- Work items are opaque data; metadata is never interpreted as executable authority.
- No caller-supplied physical D1 identifier is accepted by the scheduler.
- No tenant context is discarded from routed work.
- No scheduler state survives the invocation.
- No resource ceiling may be increased at runtime.

## Tests

```text
npm ci
npm run typecheck
npm test
npm run dry-run
```

Tests MUST cover concurrency ceiling, fan-out ceiling, deadline rejection, deterministic admission order, failure propagation without retry, and zero topology/storage side effects.

## Acceptance

```text
100% P06.1 scoped tests PASS
maxActive <= concurrencyBudget
admittedItems <= fanoutBudget
0 D1 statements
0 SQL execution
0 retries
0 business semantics
0 unbounded promises
0 forbidden file changes
scope gate PASS
architecture gate PASS
GPT post-task review PASS
exact pushed SHA verified
reproducible evidence committed
```

## Stop condition

P06.1 stops after scheduler implementation, tests, scope/architecture review, commit, push, exact-SHA verification, and evidence review. Do not implement P07/P08 execution behavior in this task.
