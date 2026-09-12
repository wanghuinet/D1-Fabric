# D1-Fabric 3.2.6 Evidence DAG / Kernel Validator Contract

Version: 1.0  
Status: DRAFT FOR ARCHITECTURE REVIEW — EVIDENCE INTEGRITY REMEDIATION  
Scope: Evidence Registry, Evidence DAG construction, Kernel Validator and architecture gate truthfulness  
Parent Governance: `docs/D1-FABRIC-3.2.4-MACHINE-GOVERNANCE-ENFORCEMENT-CONTRACT-v1.0.md`  
Proof Layer: `docs/D1-FABRIC-3.2.3-ARCHITECTURE-PROOF-AND-ENFORCEMENT-CONTRACT-v1.0.md`  
Architecture Gate: `docs/D1-FABRIC-3.2-FINAL-ARCHITECTURE-GATE-v1.0.md`

## 0. Decision

The Evidence DAG and Kernel Validator are the final anti-false-PASS boundary for governed architecture claims.

A validator MUST NOT return `PASS` merely because:

- a contract exists;
- a test command succeeded;
- CI is green;
- a gate has no recorded failures;
- a dashboard reports healthy state;
- an evidence reference was syntactically declared;
- a previous generation produced PASS.

A gate result is true only when its mandatory evidence closure is present, valid, current, trusted and attributable to the exact governed generation.

## 1. Evidence Non-Emptiness Invariant

### EVD-I01 — Empty Registry Cannot PASS

For every mandatory gate, the validator MUST first resolve the Evidence Registry scope for:

- gate ID
- change ID
- governed commit/configuration generation
- policy version
- registry generation
- environment

If the resolved Evidence Registry set is empty, the validator MUST return `FAIL`.

There is no implicit PASS, default PASS, inherited PASS or vacuous PASS for an empty evidence set.

### EVD-I02 — Missing Mandatory Evidence Is FAIL

If any evidence item required by the gate's declared evidence class is absent, the validator MUST return `FAIL`.

### EVD-I03 — Unresolved Evidence Reference Is FAIL

A gate referencing evidence that cannot be resolved to an immutable/tamper-evident record MUST return `FAIL`.

### EVD-I04 — Orphan Evidence Is Not Gate Evidence

Evidence not reachable from the current gate/change DAG MUST NOT satisfy that gate.

### EVD-I05 — Wrong Generation Is FAIL

Evidence bound to another source commit, configuration generation, registry generation, policy version, authority epoch or environment MUST NOT satisfy the current gate.

### EVD-I06 — Expired Evidence Is FAIL

Evidence past its declared freshness/expiry boundary MUST NOT satisfy a current gate.

### EVD-I07 — Untrusted Verifier Is FAIL

Evidence produced by an untrusted or unresolved verifier identity MUST NOT satisfy a mandatory gate.

### EVD-I08 — Waiver Is Not PASS Evidence

A waiver MAY explain an exception but MUST NOT be converted into `PASS` evidence. P0 safety invariants cannot use a permanent waiver.

## 2. Evidence DAG Contract

The validator SHALL construct an explicit DAG linking:

`Requirement → Contract → Machine Rule → Test/Probe → Evidence → Gate Decision → Audit`

Every mandatory production architecture claim MUST have a complete path through the required nodes.

The validator MUST reject:

- missing required node;
- unresolved edge;
- cycle where the evidence graph requires acyclicity;
- evidence attached to the wrong subject;
- evidence attached to the wrong generation;
- evidence claiming PASS without the required predecessor evidence;
- gate decision that has no inbound valid evidence closure.

## 3. Mandatory Gate Closure

Each mandatory gate SHALL declare an evidence class matrix.

Example:

```yaml
gate: G-P0-02
evidence_requirements:
  - bootstrap-dag-static
  - recovery-root-validation
  - stale-state-negative-test
  - generation-fencing-test
  - recovery-verification-test
  - degraded-serving-test
  - high-risk-fail-closed-test
```

The validator MUST require every mandatory item to resolve to a valid evidence record for the current governed generation.

One missing item = gate `FAIL`.

## 4. Kernel Validator Algorithm Contract

The conceptual evaluation order is fixed:

```text
1. Load gate definition
2. Load current governance generation
3. Resolve Change Manifest
4. Resolve mandatory evidence requirements
5. Resolve Evidence Registry records
6. Reject empty evidence set
7. Reject unresolved/orphan evidence
8. Validate subject/change binding
9. Validate commit/config generation
10. Validate registry generation
11. Validate authority/epoch
12. Validate policy version
13. Validate environment
14. Validate freshness/expiry
15. Validate trusted verifier
16. Validate each evidence result == PASS where PASS is required
17. Validate Evidence DAG closure
18. Validate no forbidden contradictions/failures
19. Produce deterministic gate result
20. Persist immutable audit result
```

The validator MUST fail closed if any mandatory validation step cannot be evaluated.

## 5. Deterministic Result Contract

The Kernel Validator output SHALL have at least:

```json
{
  "gate": "G-P0-02",
  "status": "PASS|FAIL|WAIVED",
  "subject": "...",
  "change_id": "...",
  "commit": "...",
  "configuration_generation": "...",
  "registry_generation": "...",
  "policy_version": "...",
  "environment": "...",
  "required_evidence": ["..."],
  "resolved_evidence": ["..."],
  "missing_evidence": [],
  "invalid_evidence": [],
  "orphan_evidence": [],
  "violations": [],
  "verifier": "...",
  "decision_reason": "..."
}
```

`PASS` is legal only when:

`missing_evidence == []`

`invalid_evidence == []`

`orphan_evidence == []`

`violations == []`

and every mandatory evidence requirement is satisfied by a valid current record.

## 6. Evidence Registry Integrity Rules

The Evidence Registry SHALL preserve evidence records as immutable or tamper-evident objects for their required retention period.

An evidence record MUST contain:

- evidence ID
- gate ID
- requirement ID
- change ID
- subject/resource
- source commit
- configuration generation
- registry generation
- policy version
- environment
- authority/epoch where relevant
- probe/test identity
- verifier identity
- result
- timestamps
- freshness/expiry
- artifact references

Updates SHALL create a new evidence generation rather than silently mutating an already-consumed PASS record.

## 7. Evidence Provenance Trust

The validator SHALL distinguish:

- declared provenance;
- cryptographically or machine-verifiably bound provenance where available;
- trusted CI identity;
- untrusted/manual claims.

Manual or untrusted assertions MAY be recorded for audit context but MUST NOT satisfy a mandatory architecture gate requiring trusted machine evidence.

## 8. No Evidence, No Promotion

The promotion chain is:

`DRAFT → REVIEWED → VERIFIED → ACTIVE`

A promotion step MUST be rejected when its mandatory evidence scope is empty or incomplete.

Specifically:

`Evidence Registry = ∅  ⇒  Gate = FAIL  ⇒  Promotion = BLOCKED`

and:

`Mandatory evidence unresolved ⇒ Gate = FAIL ⇒ Promotion = BLOCKED`

## 9. Negative Test Matrix

The validator test suite MUST prove all of the following:

| Scenario | Required result |
|---|---|
| Empty Evidence Registry | FAIL |
| Evidence Registry contains unrelated records only | FAIL |
| Mandatory evidence reference missing | FAIL |
| Evidence reference unresolved | FAIL |
| Evidence record orphaned from current DAG | FAIL |
| Evidence from old commit | FAIL |
| Evidence from wrong configuration generation | FAIL |
| Evidence from wrong registry generation | FAIL |
| Evidence from wrong policy version | FAIL |
| Evidence expired | FAIL |
| Evidence verifier untrusted | FAIL |
| Evidence result is FAIL | FAIL |
| One mandatory evidence item missing | FAIL |
| Waiver only, no valid evidence | FAIL |
| All mandatory evidence valid and current | PASS, subject to all other gates |

These tests MUST execute in CI and produce evidence records themselves.

## 10. P0-02 Integration

G-P0-02 MUST declare evidence requirements for at minimum:

- bootstrap DAG acyclicity;
- Recovery Root validity;
- authoritative recovery source resolution;
- last-known-good freshness enforcement;
- stale generation rejection;
- equal-generation conflict rejection;
- policy mismatch rejection;
- W06-unavailable safe degraded serving;
- W06-unavailable high-risk mutation rejection;
- post-recovery verification;
- stale concurrent recovery fencing.

P0-02 cannot be marked PASS without a non-empty, complete and current evidence closure for all of the above.

## 11. Contradiction Handling

If two valid-looking evidence records contradict one another for the same gate subject and generation, the validator MUST NOT choose arbitrarily.

The gate MUST be `FAIL` or `FENCED` until the declared authority resolves the contradiction and a new evidence generation is produced.

## 12. Auditability

Every validator decision SHALL itself produce an audit record containing:

- validator version;
- governance commit;
- gate definition version;
- resolved evidence IDs;
- missing/invalid/orphan evidence IDs;
- final status;
- decision reason;
- timestamp;
- trusted validator identity.

The audit record MUST be sufficient to reproduce why a gate passed or failed.

## 13. Final Invariant

The system MUST satisfy:

> **No evidence closure, no PASS.**

More strictly:

`PASS ⇔ mandatory evidence closure is complete ∧ current ∧ trusted ∧ generation-bound ∧ contradiction-free ∧ all other gate predicates PASS`

The validator MUST never infer truth from absence of failure.

This contract is a hard safety boundary and does not authorize runtime feature expansion.
