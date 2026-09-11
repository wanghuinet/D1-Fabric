# D1-Fabric 3.2 Development Admission Closure Contract v1.0

**Status:** DRAFT FOR MACHINE ACCEPTANCE

## 1. Purpose

This document closes the 3.2 governance admission chain. It does not add runtime capability, change Worker topology, or authorize implementation by itself. It defines the single closure gate that must be proven before normal code development is admitted.

## 2. Mandatory chain

`3.2.4 Machine Governance → Adversarial Acceptance → Evidence Proof → Final Architecture Gate → Code Development Admission`

A stage is PASS only when its machine evidence is valid for the same commit, policy version, registry generation, and target environment. A failed stage blocks all downstream stages.

## 3. Adversarial Acceptance

The following negative cases are mandatory and must deterministically FAIL when the invariant is violated:

- GOV-001 missing owner
- GOV-002 multiple primary owners
- GOV-003 unauthorized ownership mutation
- GOV-004 accepted ADR violation
- GOV-005 dependency cycle
- GOV-006 undeclared dependency
- GOV-007 binding authority escalation
- GOV-008 stale binding generation
- GOV-009 Worker addition without admission
- GOV-010 Worker removal/split without admission
- GOV-011 historical import
- GOV-012 historical mutation
- GOV-013 replay of old evidence
- GOV-014 invalid/forged evidence
- GOV-015 policy downgrade
- GOV-016 diff-scope escape
- GOV-017 AI self-approval of high-risk mutation
- GOV-018 recovery object without primary owner
- GOV-019 governance test that does not detect invariant mutation
- GOV-020 registry self-authorization

A test that merely exists or passes without proving mutation rejection is insufficient.

## 4. Evidence Proof

Evidence MUST bind at minimum:

- change_id
- commit
- registry_generation
- policy_version
- environment
- probe
- result
- verifier
- timestamp
- expiry

Replay of evidence from a different commit, policy version, registry generation, or expired validity window MUST FAIL.

For authority, ownership, Worker topology, recovery, security, and other P0/high-risk mutations, the verifier MUST be independent of the mutation author unless an explicitly accepted policy exception permits otherwise.

## 5. Final Architecture Gate

The following P0 gates MUST have current valid evidence:

1. Authority
2. Bootstrap / Control Plane Independence
3. SLO / Error Budget / RPO / RTO
4. Failure Domains
5. Tenant Isolation
6. Admission / Backpressure
7. Idempotency
8. Event Semantics
9. Migration Safety
10. Disaster Recovery

All mandatory P1 gates defined by the active architecture contract are also required. Missing or stale P0 evidence means FINAL ARCHITECTURE GATE = FAIL.

## 6. Code Development Admission

Admission is explicit and bounded. It MUST declare:

- authorized architecture scope
- authorized Workers
- authorized capabilities
- authorized owners
- authorized ADRs/contracts
- authorized dependency surface
- authorized file/directory scope
- required tests
- required evidence
- stop conditions

Admission does not authorize new Workers, capabilities, APIs, ownership, providers, or architecture outside the declared scope.

## 7. AI execution rules

GPT/Codex is an implementation actor, not an authority source. It may implement only admitted scope. It MUST stop when scope is exhausted, a governance gate fails, an undeclared architecture mutation is detected, or the task reaches its explicit completion boundary.

AI-generated code is governed identically to human-generated code.

## 8. Closure decision

The closure decision is machine-derived:

`CLOSURE = 3.2.4 PASS ∧ ADVERSARIAL PASS ∧ EVIDENCE PASS ∧ FINAL ARCHITECTURE PASS ∧ ADMISSION VALID`

If any operand is false or unverifiable, the result is `BLOCKED`.

## 9. No architecture expansion

This contract does not create W07+, new runtime planes, new capabilities, new providers, or new product features. Its sole purpose is to close the development-admission boundary.

## 10. Post-closure rule

Once this contract is accepted and Code Development Admission is issued, governance documents are no longer expanded merely to delay implementation. New governance requirements must be justified as a discovered defect, security/reliability requirement, or explicit architecture change and must follow the normal change-control process.
