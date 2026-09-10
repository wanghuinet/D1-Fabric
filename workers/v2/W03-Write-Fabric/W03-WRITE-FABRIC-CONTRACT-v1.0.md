# D1-Fabric W03 Write Fabric Contract v1.0

**Status:** ACTIVE / NORMATIVE / LOCKED
**Contract ID:** `D1F-W03-WRITE-FABRIC-v1.0`
**Architecture ID:** `D1F-3.0-ARCH-v1.0`
**Phase:** W03
**Implementation owner:** `workers/v2/W03-Write-Fabric/`
**Normative authority:** `AGENTS.md` → `docs/D1-FABRIC-3.0-MASTER-CONTRACT-v1.0.md` → this contract

## 1. Purpose

W03 is the concrete write-execution boundary of D1-Fabric 3.0.

W03 accepts an already-admitted, already-bounded execution context from the upstream execution fabric and performs the authoritative single-target D1 mutation.

W03 MUST remain generic middleware. Business entities, business rules, application APIs, content-platform semantics, schema definitions, and application-specific validation are forbidden.

## 2. Fixed Boundary

```text
W01 Fabric Gateway
        ↓
W02 Execution Fabric
        ↓
W03 Write Fabric
        ↓
D1 target
```

Responsibilities:

- W01: request admission and envelope validation.
- W02: execution-plan compilation, routing context, scheduling, deadline and resource admission.
- W03: concrete write execution, write-result accounting, and single-shard idempotent mutation semantics.
- W04: control-plane state, placement/control recovery and LKG governance.

W03 MUST NOT duplicate W01 or W02 responsibilities.

## 3. In Scope

W03 v1.0 MUST implement only:

1. validation of the W03 write-execution envelope;
2. validation of immutable execution identity received from W02;
3. one concrete D1 write operation against the target selected upstream;
4. transaction-scoped idempotency for retryable single-target mutations;
5. hard enforcement of the already-admitted write budget;
6. deadline and cancellation admission checks;
7. deterministic result classification;
8. bounded structured errors and execution accounting.

## 4. Explicitly Out of Scope

The following are forbidden in W03 v1.0:

- business logic;
- business schemas or migrations;
- ORM/query builders;
- automatic shard selection;
- routing-map ownership;
- placement ownership;
- LKG/control-plane ownership;
- cache implementation;
- retry policy ownership;
- cross-shard transactions;
- distributed transactions;
- custom replication protocols;
- queues;
- Durable Objects;
- global locks;
- background workers;
- unbounded batching;
- automatic capacity expansion;
- application authentication/authorization policy;
- application-specific response shaping.

W03 MAY receive an already-authorized principal scope for audit/binding purposes, but MUST NOT invent authorization policy.

## 5. Execution Model

A W03 request MUST contain an immutable execution identity and a write operation descriptor supplied by the upstream execution boundary.

Minimum identity:

```text
requestId
planId / planFingerprint
contractId
contractVersion
architectureId
tenantId
principalScope
operation
operationVersion
logicalTargetId
executionEpoch
deadlineAt
budget
```

W03 MUST reject missing, malformed, expired, incompatible, or internally inconsistent identity fields.

W03 MUST NOT replace an upstream identity with a locally generated identity.

## 6. Target Binding

W03 does not choose a shard.

The target MUST be supplied by the upstream routing/execution context.

W03 MUST verify that:

```text
logicalTargetId is present
executionEpoch is present
executionEpoch is admissible for this execution
```

W03 MUST NOT guess a target when target metadata is absent or stale.

For v1.0, a write execution is single-target only.

Any request requiring more than one physical target MUST be rejected with a deterministic unsupported error.

## 7. Write Operation Contract

W03 accepts a generic prepared-statement abstraction rather than embedding application SQL semantics in the Worker.

The execution descriptor MUST provide:

```text
statement
bindings
retryability
idempotencyKey (required when retryable)
expectedWriteCount (optional bounded assertion)
```

W03 MUST NOT construct application SQL from business fields.

W03 MUST NOT silently rewrite SQL semantics merely to satisfy a budget.

The caller is responsible for providing a semantically correct bounded mutation.

## 8. Budget Contract

W03 consumes only budget already admitted by W02.

At minimum, the write ledger MUST track:

```text
D1 statements
rows written
payload bytes
wall-clock deadline
retries / replay attempts
```

Before D1 dispatch:

```text
required <= remaining admitted budget
```

After completion:

```text
actual usage → CONSUMED
unused reservation → RELEASED
```

If the remaining budget is insufficient, W03 MUST NOT dispatch new work.

W03 MUST never increase an upstream budget ceiling.

A result exceeding the declared/admitted write budget MUST be classified as a budget violation and MUST NOT be reported as successful execution.

## 9. Idempotency Contract

A retryable mutation MUST carry an idempotency key.

For a single-target mutation, idempotency state and the authoritative mutation MUST share the same atomic D1 transaction boundary whenever exactly-once effect semantics are required.

Required state model:

```text
ABSENT
  ↓
IN_FLIGHT
  ↓
COMMITTED
  ↘
   FAILED
```

A repeated committed key MUST replay the recorded committed result without repeating the authoritative mutation.

A request whose prior outcome is unknown MUST NOT be converted into a second mutation merely because the client timed out.

W03 MUST never report `COMMITTED` unless the authoritative mutation committed.

Cross-target retryable mutation is forbidden in v1.0.

## 10. Deadline and Cancellation

W03 MUST check the deadline before D1 admission.

W03 MUST propagate the upstream cancellation signal to all cancellable local work.

If the deadline has expired before authoritative mutation admission, W03 MUST reject without issuing the mutation.

W03 MUST NOT claim that a D1 operation was physically cancelled unless the underlying platform explicitly provides that capability.

If the mutation may already have committed when the caller loses the response, the result MUST be represented as an unknown/indeterminate transport outcome rather than falsely classified as a failed mutation.

## 11. Failure Semantics

W03 MUST use deterministic machine-readable error codes.

Minimum classes:

```text
INVALID_REQUEST
CONTRACT_MISMATCH
IDENTITY_MISMATCH
TARGET_REQUIRED
TARGET_UNSUPPORTED
STALE_EXECUTION_EPOCH
DEADLINE_EXCEEDED
CANCELLED
BUDGET_EXCEEDED
IDEMPOTENCY_KEY_REQUIRED
IDEMPOTENCY_CONFLICT
D1_EXECUTION_FAILED
D1_RESULT_INVALID
COMMIT_UNKNOWN
UNSUPPORTED_CROSS_TARGET_WRITE
```

W03 MUST NOT expose raw database credentials, secrets, stack traces, or internal binding details.

## 12. Tenant and Principal Isolation

Every execution MUST remain bound to its supplied tenant and principal scope.

W03 MUST NOT allow a request to substitute another tenant or principal after admission.

Idempotency records MUST be scoped so that a key from one tenant/principal scope cannot replay another scope's mutation result.

Cross-tenant replay is a hard failure.

## 13. Deterministic Result Contract

A successful mutation MUST return a bounded result containing at minimum:

```text
status
requestId
contractId
contractVersion
logicalTargetId
executionEpoch
write accounting
```

Where applicable it MAY include:

```text
idempotency state
affected rows
application-safe result metadata
```

Result ordering and classification MUST be deterministic for equivalent inputs.

## 14. Observability

W03 MUST emit or return sufficient structured execution identity for the executing boundary to support diagnosis:

```text
requestId
planId / planFingerprint
contractVersion
operation
operationVersion
tenantId
logicalTargetId
executionEpoch
outcome
actual budget usage
error code
```

W03 MUST NOT introduce a separate tracing platform or observability Worker.

## 15. Security Requirements

W03 MUST:

- enforce bounded request size;
- reject malformed JSON/envelopes;
- avoid dynamic executable metadata;
- treat extension metadata as data only;
- keep tenant/principal identity immutable after admission;
- prevent idempotency-key cross-scope reuse;
- avoid leaking SQL, secrets, or internal infrastructure details in errors.

No security mechanism may weaken the Master Contract's isolation or budget guarantees.

## 16. Cloudflare Boundary

W03 MAY own the actual D1 binding required for concrete write execution.

W03 MUST NOT access another Worker’s private D1 binding indirectly through undeclared global state.

The W03 Worker MUST be independently deployable and MUST contain its own:

```text
package.json
package-lock.json
tsconfig.json
wrangler configuration
source
unit tests
```

No root-level dependency aggregation is permitted.

## 17. Test Requirements

Before W03 can be marked PASS, tests MUST prove at minimum:

### Normal

- valid single-target write succeeds;
- affected-row/result accounting is deterministic;
- tenant/principal identity is preserved.

### Boundary

- zero/maximum admitted write budget;
- maximum payload;
- deadline boundary;
- expected write-count boundary;
- repeated committed idempotency key.

### Failure

- malformed envelope;
- contract mismatch;
- target missing/stale;
- expired deadline;
- cancellation before admission;
- budget exhaustion;
- D1 failure;
- unknown commit outcome;
- missing idempotency key for retryable mutation;
- cross-target write rejection.

### Isolation

- tenant A cannot replay tenant B's idempotency result;
- principal scope mismatch is rejected;
- execution epoch mismatch is rejected.

### Integration

The final W03 gate MUST prove:

```text
W01 → W02 → W03
```

with request identity, contract version, deadline, budget, target identity, and deterministic failure semantics preserved end-to-end.

## 18. CI / Release Gates

W03 release is blocked until all are PASS:

```text
Contract validation
Typecheck
Unit tests
Boundary/failure tests
Dry-run
W03 package integrity
W01 → W02 → W03 integration
GitHub Actions CI
Full regression
```

A local successful test run is insufficient evidence for release.

No W04 implementation may begin from the W03 implementation task until the W03 release gate is PASS.

## 19. AI Implementation Lock

AI coding agents MUST:

1. read `AGENTS.md`;
2. read the Master Contract;
3. read this W03 contract;
4. inspect current W01/W02 implementation before changing integration code;
5. implement only files permitted by the active task packet;
6. make the smallest coherent change;
7. add/update tests with production behavior;
8. run typecheck, tests and dry-run;
9. report exact changed files and verification results;
10. stop on contract ambiguity rather than inventing architecture.

AI MUST NOT:

- redesign W01/W02;
- create W05/W06;
- add speculative abstractions;
- introduce new infrastructure primitives;
- convert business requirements into middleware logic;
- claim PASS without machine-verifiable evidence.

## 20. Definition of Done

W03 is `PASS` only when:

```text
DOD-W03-01 Contract is committed and authoritative
DOD-W03-02 Minimal implementation matches contract
DOD-W03-03 Typecheck PASS
DOD-W03-04 Unit/boundary/failure tests PASS
DOD-W03-05 Dry-run PASS
DOD-W03-06 W01→W02→W03 integration PASS
DOD-W03-07 GitHub CI PASS
DOD-W03-08 Full regression PASS
DOD-W03-09 No business logic introduced
DOD-W03-10 No W02 responsibility duplicated
DOD-W03-11 Evidence is committed
```

Until all eleven conditions are satisfied, W03 status MUST remain `IN_PROGRESS`.

## 21. Change Control

Any change to:

- write atomicity;
- idempotency semantics;
- target model;
- budget semantics;
- deadline semantics;
- tenant/principal binding;
- cross-target behavior;
- result classification;

requires a versioned contract change and corresponding verification evidence.

Implementation convenience is not a valid reason to weaken this contract.
