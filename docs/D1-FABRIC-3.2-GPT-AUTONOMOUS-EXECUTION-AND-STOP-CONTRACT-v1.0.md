# D1-Fabric 3.2 GPT Autonomous Execution and Stop Contract

Version: 1.0  
Status: ACTIVE / GPT EXECUTION ROUTER  
Scope: GPT-led repository work for D1-Fabric 3.2  
Authority: This document governs execution behavior only. It cannot override the 3.2 architecture, hardening, proof or machine-governance contracts.

## 0. Purpose

GPT SHALL be able to continue a declared D1-Fabric 3.2 workstream without repeated user prompting, but SHALL stop automatically at the first safe architectural boundary.

The required behavior is:

`READ → DETERMINE CURRENT STATE → SELECT ONLY THE NEXT DECLARED ACTION → IMPLEMENT/VERIFY → REPAIR CONTRACT-PRESERVING DEFECTS → RECORD EVIDENCE → RE-EVALUATE GATE → CONTINUE ONLY WHILE AUTHORIZED → STOP AT CODE-DEVELOPMENT-READY BOUNDARY`

The goal is autonomous continuity without autonomous scope expansion.

## 1. Authority Order

GPT SHALL resolve authority in exactly this order:

```text
AGENTS.md
→ D1-Fabric 3.2 Infrastructure Architecture Contract
→ 3.2 Architecture Hardening Amendment
→ 3.2 Architecture Proof and Enforcement Contract
→ 3.2 Machine Governance Enforcement Contract
→ this GPT Autonomous Execution and Stop Contract
→ current phase/task packet
→ current registries
→ minimum relevant source/tests
```

Machine-readable governance under `.governance/3.2/` is authoritative within its declared registry scope. Historical files are reference-only.

If two active documents conflict, GPT MUST NOT choose by intuition. GPT MUST STOP and identify the exact conflict.

## 2. Current Baseline

The active 3.2 deployment topology is exactly:

`W01 Gateway | W02 Execution | W03 Write | W04 Data | W05 Reliability | W06 Control`

Logical planes MUST NOT be converted into additional Workers without the Worker Admission Gate.

3.2 architecture remains non-ACTIVE until the final architecture gates and required evidence pass. Governance implementation does not itself authorize runtime feature implementation.

## 3. Automatic Continuation Rule

When the user says to continue, GPT SHALL first determine the repository's actual state from GitHub and the active governance documents.

GPT MAY automatically continue only when all of the following are true:

1. The current objective is already declared by an active contract, phase packet, approved ADR, or machine-governed task.
2. The next action is a direct completion step toward that declared objective.
3. The action does not change architecture, ownership, security authority, public semantics, Worker topology, provider strategy or product scope.
4. The Change Manifest scope can be stated before editing.
5. The Diff Scope Gate can classify the expected changes.
6. The required verification method is known before implementation.

Otherwise GPT MUST STOP rather than infer missing scope.

## 4. Allowed Autonomous Work

Without additional user approval, GPT may:

- inspect the repository, contracts, registries, source and tests;
- identify incomplete or contradictory implementation of an already-approved contract;
- implement the minimum code required by an already-approved task;
- add or repair tests required by that task;
- perform contract-preserving refactoring needed for correctness;
- repair deterministic CI/governance failures caused by the current declared change;
- generate required machine-readable evidence;
- update state/change/evidence records required by the governing contract;
- run the prescribed verification sequence;
- repeat implementation and verification when a failure is clearly within the same declared scope;
- stop at the first boundary that requires new architectural judgment.

## 5. Forbidden Autonomous Expansion

GPT MUST NOT, merely to keep progress moving:

- invent a new feature;
- invent a new task or phase;
- add, remove, split or merge a Worker;
- change Worker ownership;
- change semantic ownership;
- introduce a new provider or multi-cloud abstraction;
- redefine a public API or protocol;
- weaken a contract to fit existing code;
- remove or weaken tests;
- suppress a CI gate;
- create a hidden allowlist/waiver;
- reinterpret historical 1.x/2.x material as current authority;
- make a high-risk or destructive production mutation;
- let AI approve its own high-risk action;
- bypass Change Manifest, Diff Scope, ownership, generation, policy, security or recovery gates;
- claim PASS from incomplete evidence;
- continue into the next architectural phase solely because the current phase appears easy.

## 6. Required Execution Loop

For every autonomous work unit GPT SHALL execute:

```text
A. READ
   AGENTS → active 3.2 authority → task/phase → registries → relevant code/tests

B. STATE CHECK
   Identify current commit, current status, current gate, unresolved failures,
   current owner, current scope and exact next declared action.

C. SCOPE LOCK
   Produce/validate Change Manifest before architecture-affecting edits.
   Define expected files, dependencies, contracts and evidence.

D. IMPLEMENT
   Make the smallest correct change inside the declared boundary.

E. VERIFY
   Typecheck → targeted tests → integration tests → governance gates →
   failure/recovery/security tests required by risk.

F. REVIEW
   Check architecture ownership, contract conformance, diff scope, correctness,
   failure behavior, security, resource bounds and regression risk.

G. EVIDENCE
   Bind result to exact commit/config/policy/registry generation.

H. REASSESS
   Determine whether another action is still part of the same declared work unit.

I. STOP OR CONTINUE
   Continue only if the next action is already authorized by the same boundary.
```

## 7. Defect-Recovery Rule

A failed test or gate does not automatically authorize redesign.

GPT SHALL classify a failure as one of:

`EXPECTED_IMPLEMENTATION_DEFECT | TEST_DEFECT | GOVERNANCE_DEFECT | CONTRACT_CONTRADICTION | SCOPE_EXPANSION`

Only the first three may normally be repaired autonomously when the repair remains inside the declared scope.

`CONTRACT_CONTRADICTION` or `SCOPE_EXPANSION` requires STOP.

A test failure that requires changing an architecture rule, ownership rule, public semantic, provider strategy or worker topology is a STOP condition.

## 8. Stop Conditions

GPT MUST stop immediately when any of the following occurs:

1. The next action needs a new architectural decision.
2. Two active authoritative documents contradict each other.
3. No declared task owns the next proposed change.
4. The required Change Manifest cannot truthfully describe the proposed diff.
5. The Diff Scope Gate would reject the proposed change.
6. The change would add/remove/split/merge a Worker.
7. The change would transfer authority or ownership.
8. A public compatibility contract would change without an approved transition.
9. A destructive migration or irreversible action would be required.
10. Required recovery or security evidence is unavailable.
11. The current state cannot be established reliably.
12. Evidence is stale, mismatched or non-reproducible.
13. A failure crosses the declared work boundary.
14. The task has reached its declared completion gate.
15. The repository is now ready for the next code-development phase.

## 9. Mandatory Stop at Next-Code-Development Boundary

The most important terminal condition is:

> When architecture/governance/proof work has produced the complete evidence package required to authorize the next declared code-development phase, GPT MUST STOP and MUST NOT begin that next phase in the same autonomous run.

The terminal status MUST be represented as:

`READY_FOR_NEXT_CODE_PHASE — STOPPED_FOR_USER_COMMAND`

GPT SHALL report:

- completed gate(s);
- exact commit SHA(s);
- verified evidence references;
- remaining blockers, if any;
- the exact next authorized phase/task identifier;
- the fact that no code from the next phase was started.

This is a hard boundary, not a recommendation.

## 10. Phase Promotion Rule

A phase can become `READY_FOR_NEXT_CODE_PHASE` only when its declared exit criteria are satisfied.

At minimum:

```text
Architecture / Contract alignment = PASS
Machine governance = PASS for required scope
Ownership = PASS
Dependency DAG = PASS
Binding authority = PASS
Change Manifest = PASS
Diff Scope = PASS
Required tests = PASS
Required failure/recovery/security evidence = PASS
Evidence freshness = PASS
No unresolved architecture contradiction = TRUE
No undeclared scope = TRUE
```

A phase is NOT ready merely because:

- code compiles;
- unit tests pass;
- CI is green;
- documentation exists;
- a dashboard looks healthy;
- GPT believes the architecture is correct.

## 11. Next-Phase Selection Rule

GPT SHALL select the next phase only from explicit repository authority.

Priority order:

1. explicit active task packet;
2. approved roadmap/phase contract;
3. current TODO/state document explicitly authorized for continuation;
4. approved ADR whose implementation scope is already admitted.

If none identifies the next phase, GPT MUST STOP.

GPT MUST NOT invent a next phase from feature desirability.

## 12. Historical Isolation

Anything under `archive/`, historical 1.x/2.x material, or explicitly frozen legacy paths is reference-only.

Historical material may be inspected for migration/evidence analysis but cannot determine current scope, ownership, architecture or implementation behavior unless an explicit migration authority admits it.

## 13. Evidence and Commit Rule

A completed autonomous work unit MUST identify the exact Git commit used for verification.

Evidence MUST bind, where applicable:

`contract ID + architecture ID + change ID + files + tests/probes + commit SHA + policy version + registry generation + environment + result + verifier + expiry`

A local-only result does not satisfy repository delivery.

GPT MUST never state that GitHub CI is green unless an actual current GitHub result confirms it.

## 14. AI Self-Limitation Rule

GPT is an executor and verifier, not the authority for architecture.

When the repository says:

`NO-GO`

GPT cannot convert that to PASS through interpretation.

When the repository says:

`DRAFT`

GPT cannot silently treat it as ACTIVE.

When the machine gate says:

`FAIL`

GPT may repair only a contract-preserving defect that is demonstrably within the declared change scope.

## 15. Anti-Drift Checklist

Before every autonomous continuation decision GPT SHALL verify:

```text
[ ] Am I still in 3.2?
[ ] Am I using current authority, not historical material?
[ ] Is this action already authorized?
[ ] Is ownership unchanged?
[ ] Is Worker topology unchanged?
[ ] Is public semantic unchanged?
[ ] Is provider strategy unchanged?
[ ] Is security authority unchanged?
[ ] Can the Change Manifest describe the exact diff?
[ ] Can the Diff Scope Gate accept it?
[ ] Is verification known before implementation?
[ ] Is recovery/security evidence sufficient?
[ ] Is the next action still inside the same declared boundary?
[ ] Have I reached the next-code-development boundary?
```

Any `NO` that affects authority, scope, architecture, security or recovery SHALL cause STOP.

## 16. Canonical Autonomous State Machine

```text
IDLE
 ↓
READ_AUTHORITY
 ↓
ESTABLISH_STATE
 ↓
SELECT_DECLARED_ACTION
 ↓
SCOPE_LOCKED
 ↓
IMPLEMENTING
 ↓
VERIFYING
 ↓
REVIEWING
 ↓
EVIDENCE_BOUND
 ↓
 ┌─────────────────────────────────────┐
 │ Same authorized boundary remains?  │
 └─────────────────────────────────────┘
      │ YES                    │ NO
      ↓                        ↓
   CONTINUE                STOP / ESCALATE
      │
      ↓
  READY_FOR_NEXT_CODE_PHASE?
      │ YES                    │ NO
      ↓                        ↓
   STOP                 SELECT_DECLARED_ACTION

Terminal states:

`STOPPED_FOR_USER_COMMAND`
`STOPPED_ON_CONTRADICTION`
`STOPPED_ON_SCOPE_EXPANSION`
`STOPPED_ON_GOVERNANCE_FAILURE`
`STOPPED_ON_MISSING_EVIDENCE`
`READY_FOR_NEXT_CODE_PHASE`
```

## 17. Required Final Report for an Autonomous Run

When GPT stops, it MUST produce a compact machine-oriented summary:

```text
STATE: READY_FOR_NEXT_CODE_PHASE | BLOCKED | STOPPED_ON_CONTRADICTION | ...
CURRENT_VERSION: <repository state>
CURRENT_COMMIT: <sha>
COMPLETED_SCOPE: <declared work unit>
GATES: <pass/fail list>
EVIDENCE: <refs>
BLOCKERS: <exact blockers or none>
NEXT_AUTHORIZED_PHASE: <identifier or NONE>
NEXT_PHASE_STARTED: NO
REASON_FOR_STOP: <exact terminal rule>
```

## 18. Final Rule

GPT SHALL be proactive inside the contract and conservative at the boundary.

The desired behavior is:

`AUTOMATIC CONTINUATION INSIDE AUTHORIZED SCOPE + AUTOMATIC STOP AT ARCHITECTURAL/CODE-PHASE BOUNDARY`

The repository, not the chat, decides what is authorized. The machine gates, not GPT confidence, decide whether a change passes. The next code phase is never started automatically after reaching its admission boundary.
