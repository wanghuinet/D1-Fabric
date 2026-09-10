# D1-Fabric 3.0 Zero-Downtime Evolution Contract v1.0

**Status:** PROPOSED / GOVERNANCE BASELINE
**Authority:** subordinate to the 3.0 Master Contract

## 1. Objective

Every production-visible runtime change must preserve service continuity, public compatibility, data integrity, and rollback capability.

## 2. Deployment model

Default lifecycle:

```text
CURRENT
  ↓
COMPATIBLE NEW VERSION
  ↓
SHADOW / PARALLEL VERIFICATION
  ↓
CANARY
  ↓
PROGRESSIVE ROLLOUT
  ↓
FULL ACTIVE
  ↓
RETIRE OLD VERSION AFTER DRAIN
```

A rollout must be reversible until the new version has passed the declared observation window.

## 3. Compatibility rules

A new runtime version must remain compatible with the currently active request, response, state, and control contracts during coexistence.

Schema/state transitions must follow:

```text
expand → dual-compatible operation → migrate → verify → contract/consumer cutover → contract cleanup
```

Destructive changes are prohibited in the coexistence phase.

## 4. Traffic controls

Rollout controls must be deterministic and auditable. They may use deployment versions, capability flags, request cohorts, tenant cohorts, or equivalent mechanisms that do not change business semantics.

Recommended default progression:

```text
0% shadow
1% canary
5%
10%
25%
50%
100%
```

The exact percentages are tunable per workload; safety gates are mandatory.

## 5. Health gates

Progression requires all applicable gates to remain within contract thresholds:

```text
availability
error rate
P50/P95/P99 latency
retry amplification
D1 statements
rows read/write
fanout/concurrency budgets
cache correctness
idempotency correctness
security/tenant isolation
```

Any release-blocking invariant violation immediately halts progression.

## 6. Rollback

Rollback is a control operation, not a new feature deployment. It must restore the last validated version or LKG state without requiring a destructive data operation.

For unknown write outcomes, rollback MUST NOT blindly replay a mutation. Idempotency and authoritative commit state determine recovery.

## 7. Control-plane fencing

A rollout version must carry a version/epoch identity. Retired or fenced versions cannot issue authoritative writes or control changes.

## 8. Data migration

Migrations must be backward compatible while old and new application/runtime versions coexist. Every migration has:

```text
precondition
forward action
verification
rollback/containment action
completion condition
```

## 9. Observability

Every rollout must be attributable to:

```text
releaseId
build/commit SHA
runtime version
contract version
control epoch
cohort
request/operation IDs
outcome
```

## 10. Evidence

A completed rollout requires reproducible evidence showing the health gates, exposure level, final decision, and exact deployed commit/version.

## 11. Forbidden patterns

```text
stop-the-world replacement
breaking active contracts without coexistence
unversioned state mutation
blind retry after unknown outcome
rollback by destructive data rewrite
AI direct production mutation
```
