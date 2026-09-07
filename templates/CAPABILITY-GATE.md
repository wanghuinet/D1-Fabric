# D1-Fabric Capability Gate

**Status:** TEMPLATE / GATE

This gate determines whether a capability is actually complete. The implementation agent cannot self-certify completion without evidence.

## Identity

```text
Capability:
Requirement IDs:
Evaluated commit:
Contract baseline/version:
Semantic Contract Map:
Module Boundary Card:
Change Manifest:
```

## Completion Conditions

PASS only when every applicable condition is evidenced:

```text
Scope is frozen and Diff Scope Gate = PASS
Applicable contracts identified
Semantic Contract Map complete
Module boundary respected
All contract MUSTs mapped to evidence
State ownership unambiguous
Security/tenant isolation verified
Routing/epoch/ownership verified
Idempotency/retry semantics verified where applicable
Resource bounds verified
Failure/timeout/recovery verified where applicable
Compatibility/schema behavior verified where applicable
Relevant negative/adversarial tests passed
Relevant performance/cost claims evidenced
Regression impact assessed
Evidence references exact evaluated commit
No fabricated or stale evidence
No unresolved P0/P1 defect
No semantic/architecture drift
```

## Verification Result

```text
V0:
V1:
V2:
V3:
V4:
V5:
V6:
V7:
V8:
V9:
Omitted levels and reason:
```

## Decision

```text
UNKNOWN / PASS / BLOCKED / FAILED
Reason:
Blocking evidence:
Residual risk:
Independent reviewer:
```

### Rules

`PASS` means the applicable obligations are proven, not merely implemented.

`BLOCKED` means required evidence is missing or a boundary cannot yet be proven.

`FAILED` means a verified requirement, invariant, or regression is violated.

A capability MUST NOT advance to `RELEASE_READY` from `UNKNOWN`, `BLOCKED`, or `FAILED`.

> **Code completion is not capability completion. Evidence closes the capability.**
