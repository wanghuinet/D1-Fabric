# D1-Fabric 3.0 Code Normalization Contract v1.0

**Status:** PROPOSED / GOVERNANCE / NON-RUNTIME
**Authority:** subordinate to `docs/D1-FABRIC-3.0-MASTER-CONTRACT-v1.0.md`

## 1. Purpose

Normalize a growing codebase without changing public behavior, runtime semantics, or production availability.

## 2. Ownership

Every runtime capability MUST have exactly one owner. A consumer may depend on an owner's contract but MUST NOT duplicate the implementation.

Current reconciliation target:

| Capability | Owner |
|---|---|
| Gateway admission/protocol boundary | W01 |
| Execution planning/scheduling | W02 |
| Write/idempotency authority | W03 |
| Generic runtime control metadata/LKG/epoch | W04 |
| Retry/deadline/circuit/recovery | W05 |
| Topology/placement/migration/rebalance planning | W06 |

This table does not amend the Master Contract. W05/W06 remain blocked from normative release until the architecture authority conflict is resolved.

## 3. Dependency law

Allowed direction is contract-mediated. Runtime Workers MUST NOT form cycles. A Worker MUST NOT import another Worker's private implementation. Cross-Worker communication uses versioned contracts/service bindings only.

`shared/` MUST contain only stable, domain-neutral primitives. It MUST NOT become a hidden monolith or contain Worker-owned business/control behavior.

## 4. Change scope

Every implementation task MUST declare:

- changeId;
- phaseId;
- contractIds;
- architectureIds;
- allowedFiles;
- forbiddenFiles;
- expected behavior;
- tests;
- rollback method.

Any changed file outside the declared scope is a release-blocking scope failure.

## 5. Code health gates

These are engineering warning thresholds, not language limits:

- single source file >800 LOC: mandatory decomposition review;
- module >4,000 LOC: mandatory ownership/dependency review;
- Worker >15,000 LOC: mandatory architecture review;
- duplicated normative logic: P1 defect;
- duplicated runtime capability: P1 defect unless explicitly justified;
- circular Worker dependency: P0 defect.

Line count alone never justifies behavior-changing refactoring.

## 6. Refactoring safety

Refactoring MUST preserve:

- public API compatibility;
- contract semantics;
- authorization and tenant isolation;
- budgets and deadlines;
- idempotency behavior;
- error classifications;
- observability fields;
- rollback/LKG behavior.

Behavior changes require a separate contract change and MUST NOT be hidden inside a cleanup commit.

## 7. Verification

Every normalization change requires typecheck, unit tests, contract tests, affected integration tests, regression tests, scope audit, and exact pushed-SHA verification. Runtime behavior MUST be compared before and after when semantics could be affected.

## 8. No-stop operating rule

Normalization MUST use additive, backward-compatible changes first. Deployment MUST use old/new compatibility, shadowing or canarying where runtime behavior changes, followed by progressive promotion and immediate rollback on failed health criteria.

## 9. STOP conditions

Stop rather than improvise when ownership is ambiguous, the Master Contract conflicts with implementation, a new Worker appears necessary, a public compatibility decision is undefined, or a refactor requires data migration without a separately approved migration contract.
