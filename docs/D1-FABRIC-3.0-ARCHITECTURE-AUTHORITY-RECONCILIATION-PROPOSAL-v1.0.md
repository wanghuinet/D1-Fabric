# D1-Fabric 3.0 Architecture Authority Reconciliation Proposal v1.0

**Status:** PROPOSED / GOVERNANCE-ONLY / NOT NORMATIVE
**Purpose:** Resolve the P0 authority conflict between the current six-Worker repository topology and the four-Worker Master Contract without changing runtime behavior.

## 1. Evidence

The repository currently contains six independently packaged Worker directories under `workers/v2/`:

- W01 Fabric Gateway
- W02 Execution Fabric
- W03 Write Fabric
- W04 Control Plane
- W05 Reliability Plane
- W06 Control Plane

`AGENTS.md` and `docs/D1-FABRIC-3.0-MASTER-CONTRACT-v1.0.md` currently authorize exactly W01-W04. Therefore W05/W06 are implementation-present but not yet normative architecture.

## 2. Observed ownership boundaries

### W04 Runtime Control

W04 currently owns control snapshot publication, LKG retrieval, epoch validation, revocation, and control-store access. It is therefore consistent with runtime control metadata rather than topology lifecycle management.

### W05 Reliability

W05 currently owns bounded retry, deadline enforcement, timeout/cancellation signaling, failure classification, circuit state, and recovery-safe execution policy. Its contract explicitly excludes routing, placement, idempotency storage, schema, and control-plane metadata.

### W06 Topology Control

W06 currently owns placement, topology representation, logical-to-physical shard metadata, expansion planning, migration lifecycle planning, and rebalance planning. Its contract explicitly excludes request routing, SQL execution, application writes, retry, timeout, circuit breaking, and business-domain data.

## 3. Recommended target authority model

Subject to explicit architecture approval, the least-ambiguity model is:

```text
W01 Fabric Gateway
W02 Execution Fabric
W03 Write Fabric
W04 Runtime Control Plane
W05 Reliability Plane
W06 Topology Control Plane
```

The semantic rename of W06 from generic `Control Plane` to `Topology Control Plane` is a documentation/naming proposal only. The filesystem name is not changed by this proposal.

## 4. Ownership rules

| Capability | Authoritative owner |
|---|---|
| External admission / public API envelope | W01 |
| Planning / bounded scheduling / execution | W02 |
| Authoritative mutation / idempotency state | W03 |
| Control snapshots / epoch / LKG / fencing | W04 |
| Deadline / retry / circuit / failure recovery policy | W05 |
| Placement / topology / shard lifecycle / migration / rebalance planning | W06 |

No capability may have two authoritative runtime owners.

## 5. Dependency direction

The intended direction is:

```text
W01 → W02 → W05 → W03
      ↓
      W04
      ↓
      W06
```

This diagram is a semantic dependency target, not permission to create direct private implementation imports. Cross-Worker interactions MUST remain contract-mediated.

### Forbidden

- W03 importing W05 private implementation
- W05 owning W03 idempotency state
- W02 implementing topology lifecycle rules duplicated from W06
- W06 implementing retry/deadline logic duplicated from W05
- W04 silently implementing placement/migration semantics duplicated from W06
- circular Worker dependencies

## 6. Promotion gate

W05/W06 MUST NOT become normative merely because source directories exist or their workflows are green.

Promotion requires:

1. explicit architecture decision;
2. Master Contract update;
3. AGENTS update;
4. worker contract authority mapping;
5. phase/architecture bidirectional mapping;
6. public API compatibility check;
7. exact pushed SHA verification;
8. full regression and evidence;
9. independent GPT review PASS.

## 7. No-downtime rule

This governance reconciliation must not alter production request semantics.

Required rollout sequence for any later runtime restructuring:

```text
stable
→ shadow validation
→ canary
→ progressive rollout
→ full activation
```

Rollback target MUST remain the last known-good release.

No Worker removal, merge, split, public API change, routing change, schema migration, or data movement is authorized by this document.

## 8. Decision options

### Option A — Promote W05/W06

Adopt the six-boundary topology above and make the Master Contract/AGENTS consistent with the actual runtime architecture.

Advantages:
- explicit separation of reliability and topology lifecycle concerns;
- clearer single-owner semantics;
- less pressure to overload W02/W04;
- easier independent verification and deployment.

Risks:
- larger runtime topology;
- more deployment surfaces;
- stronger need for contract-mediated integration.

### Option B — Fold W05/W06 back into W01-W04

Move their responsibilities into existing Workers while preserving the same semantic ownership rules.

Advantages:
- fewer Worker deployment surfaces;
- preserves the current four-Worker topology rule.

Risks:
- higher internal complexity;
- greater risk of ownership mixing;
- reliability and topology concerns become harder to independently verify.

## 9. Current recommendation

**Do not decide by line count or feature count.** Decide by single ownership, failure isolation, deployment isolation, and verification boundaries.

Based on the currently visible contracts and source boundaries, Option A is the cleaner semantic decomposition, but it remains a proposal until explicitly promoted through the Master Contract authority process.

## 10. Stop condition

Until a promotion decision is recorded and the normative authority is updated consistently, the repository MUST remain in:

`FAIL_CONTRACT_AUTHORITY`

for any release that claims W05/W06 as normative 3.0 architecture.

No production runtime change is authorized by this proposal.
