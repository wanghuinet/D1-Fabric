# D1-Fabric 3.0 Normalization Audit Manifest v1.0

**Status:** ACTIVE AUDIT PLAN / NON-RUNTIME

## Priority order

| ID | Audit | Gate |
|---|---|---|
| A01 | Master Contract vs W01-W06 architecture authority | P0 |
| A02 | Worker ownership and duplicate capabilities | P0 |
| A03 | Cross-Worker dependency graph and cycles | P0 |
| A04 | Contract -> implementation traceability | P1 |
| A05 | Implementation -> tests bidirectional coverage | P1 |
| A06 | Budget/deadline/retry/idempotency invariants | P1 |
| A07 | Security and tenant-isolation boundaries | P1 |
| A08 | Error/failure/recovery semantics | P1 |
| A09 | Runtime/code health and dead-code review | P2 |
| A10 | Zero-downtime rollout and rollback readiness | P1 |
| A11 | Telemetry completeness and AI-readiness | P2 |
| A12 | Final architecture/contract/scope/evidence gate | P0 |

## Rules

- No production behavior is changed merely to make an audit PASS.
- Findings are classified P0/P1/P2/P3 and tracked to an exact file and contract.
- P0 findings block release.
- P1 findings block the affected capability's production promotion.
- A cleanup must not silently become a feature.
- Every fix is independently tested and reviewed against the exact pushed commit.

## Evidence

Each audit result must include:

```text
commitSha
filesReviewed
contractsReviewed
testsReviewed
findingIds
classification
verificationCommands
result
remainingRisk
```

## Current blocker

The main branch Master Contract currently defines W01-W04 as the exact approved execution boundaries, while repository code contains W05 and W06 contracts. This is a normative architecture conflict. W05/W06 must not be treated as production-authoritative architecture until the Master Contract is explicitly amended and the amendment itself passes the architecture/contract gate.
