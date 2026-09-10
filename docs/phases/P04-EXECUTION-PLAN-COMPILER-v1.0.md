# D1-Fabric 3.0 — P04 Execution Plan Compiler v1.0

**Status:** ACTIVE / EXECUTABLE / LOCKED  
**phaseId:** P04  
**taskId:** P04.1  
**contractId:** D1F-3.0-MASTER-v1.0  
**architectureId:** D1F-3.0-ARCH-v1.0  
**implementationOwner:** GPT  
**verificationId:** P04.1-GPT-REVIEW

## Objective

Implement the W02 plan compiler required by the 3.0 execution pipeline:

```text
Contract → Admission → Compile → Schedule → Place → Execute → Merge → Terminate
```

P04 terminates at `Compile`. It produces only a topology-neutral execution plan. It MUST NOT route, select shards, reserve runtime work, access D1, invoke another Worker, use cache, retry, consult placement state, or implement business semantics.

## Allowed files

```text
workers/v2/W02-Execution-Fabric/**
docs/phases/P04-EXECUTION-PLAN-COMPILER-v1.0.md
docs/phases/evidence/P04.1-EVIDENCE.md
```

## Compiler input

The compiler accepts two already-validated generic objects:

```text
ExecutionRequest
VersionedExecutionContract
```

The execution contract provides finite ceilings for:

```text
fanout
concurrency
D1 statements
rows read
rows written
retries
deadline
payload bytes
```

The compiler does not invent missing ceilings.

## Required invariants

1. Request identity and operation identity remain opaque generic identifiers.
2. Every numeric ceiling is a finite non-negative safe integer.
3. Requested budget MUST NOT exceed the operation contract ceiling.
4. Requested deadline MUST be positive and MUST NOT exceed the operation contract deadline.
5. The result is immutable by construction (`readonly` fields and a frozen object graph).
6. The plan is deterministic for identical validated inputs.
7. Plan identity is a non-security fingerprint; it MUST NOT be used as an authorization credential.
8. No physical D1 identifier, shard identifier, Worker graph, SQL, or placement detail may appear in the result.
9. P04 does not reserve or consume budget. Reservation/consumption belongs to later scheduler phases.
10. Routing remains unresolved and is represented only by a boolean requirement marker.

## Failure matrix

| Case | Expected |
|---|---|
| invalid request | reject |
| invalid contract | reject |
| requested budget > contract ceiling | reject `BUDGET_EXCEEDED` |
| requested deadline > contract deadline | reject `DEADLINE_EXCEEDED` |
| unsafe numeric value | reject `INVALID_LIMIT` |
| valid input | deterministic immutable plan |

## Security cases

- Treat all compiler input as untrusted even though the caller is expected to perform P02/P03 validation.
- Never convert payload metadata into executable instructions.
- Never expose topology or storage identifiers.
- Contract metadata is descriptive authority only; it does not execute code.

## Resource cases

```text
D1 statements = 0
Worker dispatches = 0
retries = 0
budget reservations = 0
routing calls = 0
placement reads = 0
```

## Tests

```text
npm ci
npm run typecheck
npm test
npm run dry-run
```

Tests MUST cover deterministic compilation, budget ceiling rejection, deadline rejection, unsafe numeric rejection, immutability, topology non-disclosure, and zero-side-effect behavior.

## Acceptance

```text
100% P04.1 tests PASS
0 D1 work
0 downstream dispatches
0 routing decisions
0 business semantics
0 forbidden file changes
scope gate PASS
architecture gate PASS
GPT post-task review PASS
exact pushed SHA verified
```

## Stop condition

P04.1 stops after its own test, scope, architecture, commit, push, exact-SHA verification, and review/evidence gate. Do not begin P05 automatically.
