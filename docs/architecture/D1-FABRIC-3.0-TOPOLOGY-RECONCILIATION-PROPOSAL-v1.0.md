# D1-Fabric 3.0 W04-W06 Topology Reconciliation Proposal v1.0

**Status:** PROPOSAL / NOT YET NORMATIVE
**Tracking:** GitHub issue #2

## 1. Finding

The current implementation contains three distinct control-related boundaries whose names can be confused:

- W04 Control Plane
- W05 Reliability Plane
- W06 Control Plane

The active contracts show that the responsibilities are materially different. W04 owns generic runtime control metadata and fencing; W05 owns runtime resilience; W06 owns topology and shard lifecycle planning.

## 2. Proposed semantic names

To reduce ambiguity without changing deployed service identities:

```text
W01 Fabric Gateway
W02 Execution Fabric
W03 Write Fabric
W04 Runtime Control Plane
W05 Reliability Plane
W06 Topology Control Plane
```

Service directory names may remain unchanged until an explicit migration plan is approved.

## 3. Proposed ownership

| Boundary | Authoritative responsibility | Must not own |
|---|---|---|
| W01 | request ingress, admission envelope, protocol/auth context | execution internals, DB writes |
| W02 | execution planning/routing/scheduling/read dispatch | topology lifecycle, reliability policy |
| W03 | authoritative writes and idempotency state | topology planning, retry policy |
| W04 | runtime control metadata, capacity policy, config publication, LKG, epoch fencing | shard migration execution, retry/circuit logic |
| W05 | timeout, bounded retry, failure classification, circuit breaking, recovery-safe execution | routing ownership, idempotency storage, topology metadata |
| W06 | placement, topology, shard metadata, expansion, migration/rebalance planning | request execution, retry, SQL, business semantics |

## 4. Important separation

W04 and W06 are both control-plane components but MUST NOT share semantic ownership merely because both contain the phrase `Control Plane`.

```text
W04 = runtime execution safety/control state
W06 = topology and shard lifecycle state
```

W05 is a runtime reliability boundary and is not a general-purpose control plane.

## 5. Proposed architecture relationship

```text
W01 Gateway
   ↓
W02 Execution
   ├── W04 Runtime Control metadata/epoch
   ├── W05 Reliability boundary
   └── W06 Topology/placement metadata
   ↓
W03 Write
```

The exact synchronous call graph remains subject to the approved architecture and platform limits. This proposal does not authorize additional hot-path hops.

## 6. Authority transition

Before this proposal becomes normative:

1. audit W01-W06 contracts and implementations;
2. verify no duplicate ownership exists;
3. update the Master Contract and AGENTS in one controlled change;
4. update architecture↔contract mappings;
5. run full regression and deployment dry-runs;
6. verify the exact pushed commit;
7. perform the mandatory GPT review gate.

## 7. Compatibility rule

No rename or runtime topology migration is required to resolve the semantic naming ambiguity. Directory/service identities may remain stable while documentation uses the proposed semantic names.
