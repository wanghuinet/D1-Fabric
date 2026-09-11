# D1-Fabric 3.2.5 Code Development Admission Contract

Version: 1.0  
Status: ACTIVE / DEVELOPMENT ADMISSION GATE  
Scope: Transition from architecture/governance documentation into governed code implementation  
Authority: Subordinate to the 3.2 Infrastructure Architecture Contract, Hardening Amendment, Architecture Proof Contract and Machine Governance Contract.  
Non-Authority: This contract does not authorize new runtime capabilities, new Workers, provider changes or public semantic changes.

## 0. Executive Decision

D1-Fabric SHALL distinguish three different permissions:

1. **Governance implementation permission** — code required to make the already-approved governance contracts executable.
2. **Runtime implementation permission** — code implementing the already-admitted W01-W06 architecture.
3. **Architecture-change permission** — any change to authority, ownership, topology, public semantics, provider strategy or safety invariants.

These permissions are independent.

The current documentation phase MAY transition to **governance implementation** because the required architecture, proof, machine-governance and autonomous-execution contracts are now explicitly defined.

Runtime implementation SHALL remain blocked until the final architecture evidence gates establish `READY_FOR_NEXT_CODE_PHASE`.

Architecture changes SHALL always require a new admission decision.

## 1. Canonical Transition

The only permitted transition is:

```text
DOCUMENTED
  ↓
CONTRACT-ALIGNED
  ↓
GOVERNANCE-IMPLEMENTATION-READY
  ↓
GOVERNANCE CODE
  ↓
MACHINE GATES + EVIDENCE
  ↓
FINAL ARCHITECTURE ADMISSION
  ↓
READY_FOR_NEXT_CODE_PHASE
  ↓
STOP
  ↓
USER/AUTHORIZED EXECUTION COMMAND
  ↓
RUNTIME CODE PHASE
```

GPT MUST NOT skip a state.

## 2. Current Admission Decision

### 2.1 Authorized now

The following work is admitted:

- machine-readable governance registries;
- registry schema validation;
- reference resolution;
- ownership validation;
- dependency DAG construction and validation;
- binding-authority validation;
- Change Manifest validation;
- Diff Scope Gate implementation;
- Historical Isolation enforcement;
- evidence record generation and freshness validation;
- deterministic governance CI gates;
- tests and probes required to prove the above contracts;
- contract-preserving repairs to those governance components;
- state/evidence documentation required by the governing contracts.

### 2.2 Not authorized now

The following remain blocked until the final architecture gate passes:

- new runtime capabilities;
- new Worker creation;
- Worker split/merge/removal;
- provider replacement or multi-cloud abstraction;
- public API/protocol redesign;
- autonomous destructive migration;
- production data-plane topology changes;
- semantic ownership transfer;
- weakening of architecture invariants;
- speculative features not represented by an approved contract or ADR.

## 3. Development Admission Preconditions

Before any governed code change, GPT/CI SHALL establish:

```text
A. Current commit is known.
B. Active authority chain is known.
C. Current task/phase is explicitly identified.
D. Owner is resolvable.
E. Expected Change Manifest exists.
F. Expected Diff Scope is known.
G. Required verification is known before implementation.
H. Historical isolation is intact.
I. No active contract contradiction exists.
J. The proposed change does not expand runtime architecture.
```

Any failure is a STOP condition unless it is a contract-preserving governance defect inside the same declared work unit.

## 4. Minimum Code-Admission Contract

A code change may enter implementation only when all applicable items are true:

| Gate | Required result |
|---|---|
| Authority | PASS |
| Scope | PASS |
| Ownership | PASS |
| Contract references | RESOLVED |
| Dependency impact | DECLARED |
| Binding impact | DECLARED |
| Historical isolation | PASS |
| Change Manifest | VALID |
| Diff Scope prediction | ACCEPTED |
| Verification plan | PRESENT |
| Recovery/security requirement | CLASSIFIED |
| Architecture impact | NONE or explicitly admitted |

`UNKNOWN` is not equivalent to `PASS`.

## 5. Code Development Unit

Every implementation unit SHALL be small enough that its entire authority boundary can be described before editing.

Required unit record:

```yaml
work_unit_id: WU-...
phase: governance|runtime|verification|recovery
owner: owner-id
authority_refs: []
change_id: CHG-...
allowed_files: []
allowed_capabilities: []
allowed_dependencies: []
architecture_impact: none|declared
verification: []
recovery_class: routine|controlled|high-risk|emergency
completion_gate: gate-id
```

The implementation unit is closed when its completion gate passes.

A new work unit is required when scope, owner, authority, architecture impact or verification class changes.

## 6. Mandatory Implementation Sequence

For each admitted governance work unit:

```text
READ
→ STATE CHECK
→ SCOPE LOCK
→ IMPLEMENT
→ TYPECHECK / STATIC VALIDATION
→ TARGETED TESTS
→ GOVERNANCE TESTS
→ FAILURE/RECOVERY TESTS IF REQUIRED
→ SECURITY TESTS IF REQUIRED
→ DIFF SCOPE
→ EVIDENCE BINDING
→ COMMIT
→ GITHUB CI VERIFICATION
→ REASSESS
```

A green local test is not sufficient evidence for architecture admission.

A GitHub CI result is evidence only when it refers to the exact commit being evaluated.

## 7. Contract-Preserving Repair Rule

GPT may repair a failure autonomously only when all are true:

1. the failure is inside the declared work unit;
2. the governing contract already defines the expected behavior;
3. the repair does not change authority or ownership;
4. the repair does not alter Worker topology;
5. the repair does not change public semantics;
6. the repair does not weaken a gate or invariant;
7. the repair remains inside the declared Diff Scope;
8. the required verification remains valid.

Otherwise GPT MUST STOP.

## 8. Evidence Admission Rule

Every completed work unit SHALL produce evidence bound to:

```text
work_unit_id
change_id
commit SHA
policy version
registry generation
environment
verification identity
result
artifact references
expiry
```

Evidence from an earlier commit or incompatible registry/policy generation cannot satisfy the current admission gate automatically.

## 9. Runtime-Code Admission Gate

Runtime implementation of W01-W06 becomes admissible only when the final architecture gate can prove:

```text
P0 gates = PASS
P1 mandatory gates = PASS or bounded approved exception
Machine governance = PASS for applicable scope
Ownership = PASS
Dependency DAG = PASS
Binding authority = PASS
Historical isolation = PASS
Behavioral proof = PASS
Failure proof = PASS
Recovery proof = PASS
Security/isolation proof = PASS
Capacity/provider proof = PASS where applicable
Evidence freshness = PASS
No unresolved architecture contradiction = TRUE
No undeclared scope = TRUE
Next runtime phase explicitly identified = TRUE
```

The terminal state is:

`READY_FOR_NEXT_CODE_PHASE — STOPPED_FOR_USER_COMMAND`

## 10. Runtime Admission Does Not Mean Unbounded Development

When runtime code becomes admitted, GPT SHALL still work only from explicit phase/task contracts.

Admission does not authorize:

- feature invention;
- worker proliferation;
- architecture drift;
- undocumented dependency introduction;
- policy weakening;
- hidden compatibility breaks;
- autonomous progression into a later architectural phase.

## 11. Stop Conditions

GPT SHALL stop immediately when:

- the next change requires a new architecture decision;
- active contracts contradict;
- ownership is ambiguous;
- Change Manifest cannot describe the actual diff;
- Diff Scope rejects the change;
- a new Worker is required;
- authority must transfer;
- public semantics must change;
- recovery/security evidence is missing;
- evidence is stale or non-reproducible;
- a destructive operation is required;
- the declared phase completion gate passes;
- `READY_FOR_NEXT_CODE_PHASE` is reached.

## 12. Historical Isolation

All 1.x, 2.x and explicitly frozen `old` material remains reference-only.

Historical content MUST NOT:

- define current architecture;
- provide active runtime dependencies;
- own current capabilities;
- mutate current registries;
- become a compatibility excuse for violating current contracts.

Any migration requires explicit migration authority, source/destination declaration, Change Manifest, verification and retirement evidence.

## 13. Final Development Gate

The final admission result SHALL be machine-readable:

```json
{
  "gate": "code-development-admission",
  "status": "PASS|FAIL|WAIVED",
  "scope": "governance|runtime",
  "commit": "<sha>",
  "policy_version": "<version>",
  "violations": [],
  "evidence_refs": [],
  "next_phase": "<phase-or-NONE>",
  "next_phase_started": false
}
```

`WAIVED` is not `PASS` and cannot silently authorize a blocked architecture transition.

## 14. Definition of Done for the Documentation Phase

The documentation phase is considered complete when:

- architecture authority is explicit;
- proof requirements are explicit;
- machine governance contracts are explicit;
- autonomous execution/stop behavior is explicit;
- code-development admission boundary is explicit;
- current authorized implementation scope is explicit;
- forbidden scope is explicit;
- evidence requirements are explicit;
- historical isolation is explicit;
- runtime admission remains mechanically gated.

At that point GPT SHALL stop documentation expansion unless a new contract gap is discovered by evidence.

## 15. Final Rule

The purpose of this contract is to remove ambiguity about the question:

> "Can GPT start writing code now?"

The answer is:

**Yes — for the already-authorized machine-governance implementation required to make the contracts executable.**

**No — for new runtime architecture or W01-W06 feature implementation until the final architecture evidence gate reaches `READY_FOR_NEXT_CODE_PHASE`.**

Therefore the immediate next development boundary is:

`3.2 Machine Governance Implementation → Verification → Evidence → Final Architecture Gate`

No speculative runtime feature may enter this boundary.
