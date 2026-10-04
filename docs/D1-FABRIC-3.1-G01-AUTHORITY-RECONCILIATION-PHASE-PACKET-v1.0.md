# D1-Fabric 3.1-G01 Authority Reconciliation Phase Packet v1.0

**Status:** READY / GOVERNANCE-ONLY / NON-RUNTIME
**Phase:** `3.1-G01`
**Capability:** `CAP-GOV-AUTHORITY-RECONCILIATION`
**Purpose:** resolve the W01-W06 topology versus 3.0 normative-authority conflict without changing runtime behavior.

## 1. Authority

This packet is subordinate to:

```text
AGENTS.md
→ docs/D1-FABRIC-3.0-MASTER-CONTRACT-v1.0.md
→ docs/D1-FABRIC-3.1-GOVERNANCE-AND-EVOLUTION-CONTRACT-v1.0.md
→ this phase packet
```

The 3.0 Master Contract remains authoritative until an explicit promotion decision is completed.

Current 3.0 authority defines exactly W01-W04. Repository evidence shows W05 and W06 implementation boundaries. Therefore the current state is `FAIL_CONTRACT_AUTHORITY` for any claim that W05/W06 are already normative 3.0 architecture.

## 2. Objective

Produce one reproducible architecture-authority decision and mapping for W01-W06.

The decision MUST choose exactly one:

```text
OPTION-A: promote W05/W06 as explicit normative boundaries
OPTION-B: fold W05/W06 responsibilities back into W01-W04
```

The recommended target from the existing reconciliation proposal is Option A, but this packet does not authorize the decision by itself.

## 3. Preconditions

Required inputs:

- current `AGENTS.md`;
- current 3.0 Master Contract;
- current 3.1 Governance Contract;
- current 3.1 Capability Registry;
- current 3.1 Roadmap and Phase Gates;
- existing 3.0 architecture-authority reconciliation proposal;
- W04 source/contract;
- W05 source/contract;
- W06 source/contract;
- open P0 architecture issue #2.

Any missing or contradictory authority document causes STOP.

## 4. Allowed files

Governance-only target set:

```text
docs/D1-FABRIC-3.0-MASTER-CONTRACT-v1.0.md
docs/D1-FABRIC-3.0-ARCHITECTURE-AUTHORITY-RECONCILIATION-PROPOSAL-v1.0.md
docs/D1-FABRIC-3.0-BIDIRECTIONAL-AUDIT-v1.0.md
docs/D1-FABRIC-3.1-GOVERNANCE-AND-EVOLUTION-CONTRACT-v1.0.md
docs/D1-FABRIC-3.1-CAPABILITY-REGISTRY-v1.0.md
docs/D1-FABRIC-3.1-ROADMAP-AND-PHASE-GATES-v1.0.md
AGENTS.md
```

Additional governance evidence files are allowed only if explicitly declared before implementation.

## 5. Forbidden files / operations

This phase MUST NOT modify:

```text
workers/v2/** runtime source
workers/v2/** tests
workers/v2/** package.json
workers/v2/** wrangler.toml
D1 schemas
migration scripts
public API handlers
routing behavior
runtime configuration
production data
R2 objects
KV state
D1 data
```

No Worker may be added, removed, split, merged, renamed on disk, or redeployed by this phase.

## 6. Required decision matrix

The phase must produce a matrix containing:

```text
Worker
runtime responsibility
semantic owner
contract
architecture ID
public surface
mutable state owner
dependencies
forbidden responsibilities
verification evidence
3.0 authority status
3.1 target status
```

Minimum W01-W06 mapping:

```text
W01 = Gateway
W02 = Execution
W03 = Write + authoritative idempotency state
W04 = Runtime Control + epoch/LKG/fencing
W05 = Reliability policy boundary
W06 = Topology Control boundary
```

W05/W06 mappings are target mappings until Option A is explicitly promoted.

## 7. Required bidirectional proof

The evidence must prove both directions:

```text
Architecture
→ Contract
→ Owner
→ Code boundary
→ Tests/Evidence
```

and:

```text
Contract
→ Architecture
→ Owner
→ Code boundary
→ Tests/Evidence
```

Every orphan or duplicate normative item is a failure.

## 8. Ownership invariants

The following must remain true:

```text
W03 owns authoritative idempotency state.
W04 owns runtime control epoch/LKG/fencing.
W05 does not own routing, placement, schema, or idempotency state.
W06 does not own SQL execution, application writes, retry, timeout, or circuit policy.
```

No two Workers may become authoritative owners of the same semantic concern.

## 9. Dependency invariants

Target semantic direction:

```text
W01 → W02 → W05 → W03
      ↓
      W04
      ↓
      W06
```

This is not permission for private implementation imports.

Any circular dependency, hidden ownership transfer, or future-phase leakage is a blocking defect.

## 10. Compatibility and safety proof

The reconciliation MUST prove:

```text
public API unchanged
runtime hot path unchanged
data semantics unchanged
security guarantees unchanged
quota guarantees unchanged
capacity claims unchanged
no migration
no data movement
rollback target unchanged
```

If any of these changes, this phase becomes invalid and a separate contract change is required.

## 11. Option A promotion requirements

If Option A is selected, all of the following are mandatory before PASS:

1. Master Contract explicitly defines W01-W06 authority.
2. `AGENTS.md` matches the same topology.
3. W04/W05/W06 ownership boundaries are explicitly mapped.
4. Architecture IDs and contract IDs are bidirectionally mapped.
5. Capability Registry changes W05/W06 from `BLOCKED` only after authority is updated.
6. P0 issue #2 is resolved with the exact decision and evidence.
7. Public API compatibility is verified.
8. Runtime code is unchanged by the reconciliation itself.
9. Exact commit SHA is recorded.
10. Independent GPT review passes.

## 12. Option B requirements

If Option B is selected, the repository must explicitly identify the target W01-W04 owner for every W05/W06 capability before any code movement is authorized.

No source code is moved during G01 merely to make the four-Worker topology appear consistent.

A separate implementation phase must be created for any fold-back refactor.

## 13. Tests / verification

Governance verification must include:

```text
contract authority consistency check
architecture↔contract mapping check
contract↔architecture mapping check
ownership uniqueness check
dependency cycle check
public API compatibility check
runtime file diff check
scope/allowed-files check
registry state consistency check
P0 issue evidence check
```

No runtime behavior test may be weakened or deleted.

## 14. Evidence schema

Required evidence:

```text
phaseId
optionSelected
baseCommitSHA
resultCommitSHA
masterContractSHA
agentsSHA
w05ContractSHA
w06ContractSHA
architectureProposalSHA
registrySHA
roadmapSHA
changedFiles
runtimeFilesChanged
publicAPIChanged
architectureDecision
ownershipMatrix
bidirectionalAuditResult
compatibilityResult
CIResult
independentGPTReview
rollbackTarget
```

Expected runtimeFilesChanged:

```text
0
```

## 15. Stop conditions

Immediate STOP on:

```text
unresolved authority conflict
runtime source modification
public API change
ownership ambiguity
dependency cycle
scope drift
missing bidirectional mapping
incompatible contract change
missing evidence
non-reproducible evidence
failed independent review
```

Failure state:

```text
FAIL_CONTRACT_AUTHORITY
```

or the more specific applicable failure class.

## 16. Definition of PASS

G01 is PASS only when:

```text
one architecture decision is recorded
+ Master Contract is consistent with that decision
+ AGENTS is consistent with that decision
+ W01-W06 ownership is unique and explicit
+ architecture↔contract mapping is bidirectional
+ capability registry is consistent
+ public API is unchanged
+ runtime behavior is unchanged
+ runtime files changed = 0
+ exact SHA is verified
+ evidence is reproducible
+ independent GPT review = PASS
= 3.1-G01 PASS
```

After PASS:

```text
STOP
```

Do not start G02 or any runtime feature automatically.

## 17. Current expected result

Before the explicit architecture decision and authority update, the expected state remains:

```text
3.1-G01 = READY
W05 = BLOCKED
W06 = BLOCKED
3.1-R* = NOT READY
3.1-S* = BLOCKED by G01
```

This deliberate blocking is a safety feature, not missing implementation.
