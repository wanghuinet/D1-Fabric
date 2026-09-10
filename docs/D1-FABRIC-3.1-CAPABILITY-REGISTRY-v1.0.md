# D1-Fabric 3.1 Capability Registry v1.0

**Status:** ACTIVE / GOVERNANCE / NON-RUNTIME
**Authority:** subordinate to the 3.0 Master Contract and 3.1 Governance Contract
**Purpose:** single inventory for implemented, blocked, ready, and future capabilities
**Runtime change:** NONE

## 1. Registry law

A capability is not considered part of the approved runtime merely because code exists.

```text
idea → registered → owned → contracted → ready → implementing → verified → canary → active
```

A capability without a stable `capabilityId` is not eligible for implementation.

## 2. Current authority state

The current 3.0 Master Contract authorizes W01-W04. W05 and W06 are present in repository history/implementation but remain blocked from normative 3.0 promotion until the architecture-authority reconciliation is completed.

## 3. Capability ledger

| ID | Capability | Owner target | Current state | Next gate |
|---|---|---|---|---|
| CAP-W01-GATEWAY | Gateway | W01 | ACTIVE* | 3.0 verification |
| CAP-W02-EXECUTION | Execution | W02 | ACTIVE* | 3.0 verification |
| CAP-W03-WRITE | Write | W03 | ACTIVE* | 3.0 verification |
| CAP-W03-IDEMPOTENCY | Atomic idempotency | W03 | ACTIVE* | 3.0 verification |
| CAP-W04-EPOCH | Runtime epoch | W04 | ACTIVE* | 3.0 verification |
| CAP-W04-LKG | LKG fencing | W04 | ACTIVE* | 3.0 verification |
| CAP-W05-RETRY | Bounded retry | W05 | BLOCKED | Authority reconciliation |
| CAP-W05-DEADLINE | Deadline | W05 | BLOCKED | Authority reconciliation |
| CAP-W05-TIMEOUT | Timeout/cancellation | W05 | BLOCKED | Authority reconciliation |
| CAP-W05-CIRCUIT | Circuit breaker | W05 | BLOCKED | Authority reconciliation |
| CAP-W05-RECOVERY | Recovery policy | W05 | BLOCKED | Authority reconciliation |
| CAP-W06-PLACEMENT | Placement | W06 | BLOCKED | Authority reconciliation |
| CAP-W06-TOPOLOGY | Topology | W06 | BLOCKED | Authority reconciliation |
| CAP-W06-SHARD-META | Shard metadata | W06 | BLOCKED | Authority reconciliation |
| CAP-W06-EXPANSION | Expansion planning | W06 | BLOCKED | Authority reconciliation |
| CAP-W06-MIGRATION | Migration planning | W06 | BLOCKED | Authority reconciliation |
| CAP-W06-REBALANCE | Rebalance planning | W06 | BLOCKED | Authority reconciliation |

`*` ACTIVE means active under the current 3.0 authority, not a claim that production readiness has been independently re-proven by this registry.

## 4. Next approved development queue

### G — Governance closure

```text
3.1-G01 Authority Reconciliation
3.1-G02 Capability Registry verification
3.1-G03 Ownership Registry
3.1-G04 Dependency DAG verification
3.1-G05 Bidirectional architecture audit
3.1-G06 Change impact / blast-radius gate
3.1-G07 Executable phase packet normalization
```

### R — Reliability

```text
3.1-R01 Admission Control
3.1-R02 Backpressure
3.1-R03 Load Shedding
3.1-R04 Retry Amplification Guard
3.1-R05 Dependency Isolation
3.1-R06 Graceful Degradation
3.1-R07 Recovery Verification
3.1-R08 Overload Protection
```

### S — Scale / Topology

```text
3.1-S01 Shard Expansion Execution
3.1-S02 Migration Safety / Execution Boundary
3.1-S03 Rebalance Execution Boundary
3.1-S04 Hotspot Detection
3.1-S05 Capacity Planning
3.1-S06 Noisy-Neighbor Isolation
```

### T — Security / Tenancy

```text
3.1-T01 Tenant Isolation Hardening
3.1-T02 Replay Protection
3.1-T03 Control-Plane Auditability
3.1-T04 State-Binding Unification
3.1-T05 Privilege Boundary Verification
```

### C — Cost / Performance

```text
3.1-C01 Cost-aware Execution
3.1-C02 D1 Read/Write Cost Modeling
3.1-C03 Cache Economics
3.1-C04 Adaptive Query/Execution Planning
3.1-C05 Capacity-cost Forecasting
```

### A — Adaptive Intelligence

```text
3.1-A01 Workload Fingerprinting
3.1-A02 Anomaly Detection
3.1-A03 Capacity Prediction
3.1-A04 Policy Recommendation
3.1-A05 Simulation / Shadow Evaluation
3.1-A06 Adaptive Routing Candidate Policies
3.1-A07 Adaptive Cache Candidate Policies
3.1-A08 Adaptive Retry Candidate Policies
3.1-A09 AI-assisted Root Cause Analysis
3.1-A10 Bounded Autonomous Optimization
```

## 5. Readiness gate

A capability cannot enter READY unless all fields exist:

```text
capabilityId
purpose
unique semantic owner
worker/boundary
contractId + version
architectureId
dependencies
state owner
public/private surface
security boundary
finite resource budget
failure model
rollback target
verification plan
evidence schema
phase packet
```

## 6. Promotion gate

Promotion requires:

```text
IMPLEMENT
→ TEST
→ FAILURE/SECURITY/RESOURCE TEST
→ SCOPE + ARCHITECTURE AUDIT
→ COMMIT
→ PUSH
→ EXACT SHA VERIFY
→ GPT INDEPENDENT REVIEW
→ FIX ONLY CONTRACT-PRESERVING DEFECTS
→ RE-TEST
→ RE-REVIEW
→ REPRODUCIBLE EVIDENCE
→ CANARY/PROGRESSIVE RELEASE WHEN APPLICABLE
→ ACTIVE
```

No capability skips the gate because it is small, urgent, AI-generated, or already implemented elsewhere.

## 7. Forbidden registry transitions

The following are invalid:

```text
PROPOSED → ACTIVE
IMPLEMENTED → ACTIVE
TESTED → ACTIVE
AI_RECOMMENDED → ACTIVE
CODE_PRESENT → ARCHITECTURE_APPROVED
```

All require the missing contract, ownership, verification, and evidence gates.

## 8. Incident feedback

Every serious incident must update the registry when it exposes a missing capability, invariant, test, or governance rule.

```text
incident
→ root cause
→ missing control
→ capability/invariant update
→ negative test
→ audit rule
→ registry revision
```

## 9. Final rule

> The Capability Registry is an inventory and gate, not an architecture authority. The 3.0 Master Contract remains authoritative until an explicit, reviewed promotion changes that authority.
