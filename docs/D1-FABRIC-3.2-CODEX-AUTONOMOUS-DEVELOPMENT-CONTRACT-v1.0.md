# D1-Fabric 3.2 Codex Autonomous Development Contract v1.0

**Status:** DRAFT FOR CODE-DEVELOPMENT ADMISSION

## 1. Purpose

This contract defines Codex as the execution agent for D1-Fabric after the 3.2 architecture/governance boundary is admitted. It does not authorize new architecture, workers, capabilities, providers, public APIs, or product scope.

The repository remains the authority. Codex executes repository-authorized work; it does not create authority.

## 2. Authority order

1. `AGENTS.md`
2. 3.2 Infrastructure Architecture Contract
3. 3.2 Architecture Hardening Amendment
4. 3.2 Architecture Proof and Enforcement Contract
5. 3.2 Machine Governance Enforcement Contract
6. 3.2 GPT/Codex autonomous execution and stop contract
7. Current phase/task packet and approved ADRs
8. Machine governance registries
9. Source code and tests

A lower layer MUST NOT override a higher layer.

## 3. Execution loop

Codex SHALL execute this loop:

`READ → STATE CHECK → SCOPE LOCK → IMPLEMENT → VERIFY → EVIDENCE → GOVERNANCE → REASSESS → CONTINUE or STOP`

A successful task completion does not itself authorize the next phase. The next action must be explicitly authorized by repository state.

## 4. Autonomous continuation

Codex MAY continue without another user message only while all conditions hold:

- the current phase is already authorized;
- the next action is directly declared by the active task/roadmap/contract;
- ownership is unambiguous;
- the dependency DAG remains valid;
- the Change Manifest can describe the complete change;
- the Diff Scope Gate can classify the complete diff;
- required tests and evidence are known;
- no public compatibility, architecture, worker, provider, security, or destructive-data decision is introduced.

## 5. Automatic repair

Codex MAY automatically repair defects that remain inside the authorized scope:

- compilation/type errors;
- deterministic test failures caused by the current change;
- contract-preserving implementation defects;
- deterministic governance-validator defects;
- CI failures whose correction does not expand scope.

Every repair MUST be re-verified and re-enter the evidence/gate loop.

## 6. Mandatory STOP conditions

Codex MUST STOP when any of the following occurs:

- architecture or ownership conflict;
- unresolved ADR decision;
- new Worker or deployment boundary;
- new provider or multi-cloud scope;
- public API/compatibility semantics change not already authorized;
- destructive migration or irreversible data operation;
- security boundary or tenant-isolation semantics change;
- missing or stale required evidence;
- Change Manifest or Diff Scope cannot represent the change;
- governance gate rejects the change and correction would require scope expansion;
- repository state is unreliable;
- user decision is required;
- `READY_FOR_NEXT_CODE_PHASE` is reached.

## 7. Historical isolation

Material classified as 1.x/2.x/old/legacy/reference-only MUST NOT be used as active implementation authority. Historical files remain immutable unless a separately authorized migration explicitly admits them.

## 8. Six-worker baseline

The active deployment topology remains exactly:

`W01 Gateway → W02 Execution → W03 Write → W04 Data → W05 Reliability → W06 Control`

Codex MUST NOT create W07 or any additional Worker without explicit architecture admission, ADR, Change Manifest, ownership, dependency, security, observability, cost, rollback, and verification evidence.

## 9. Evidence rule

A claim of PASS MUST be backed by machine-readable evidence bound to the evaluated commit, registry generation, policy version, environment, probe, verifier, and freshness window. Codex MUST NOT claim GitHub CI green without an observed successful run for the evaluated commit.

## 10. Code-development admission gate

Runtime development begins only after the 3.2 final architecture/governance gate records:

- architecture contracts aligned;
- machine governance gates passing;
- ownership and dependency DAG passing;
- binding authority passing;
- Change Manifest and Diff Scope passing;
- behavioral, failure, recovery, security, capacity, and evidence-freshness gates passing;
- required external/provider evidence either satisfied or explicitly classified as a later production-admission requirement;
- no unresolved architecture contradiction;
- next runtime phase explicitly authorized.

At that point the state is:

`READY_FOR_NEXT_CODE_PHASE — STOPPED_FOR_USER_COMMAND`

Codex MUST NOT automatically start W01-W06 runtime development in the same autonomous run.

## 11. Final report

Every autonomous run MUST leave an auditable state containing:

- `STATE`
- `CURRENT_VERSION`
- `CURRENT_COMMIT`
- `COMPLETED_SCOPE`
- `GATES`
- `EVIDENCE`
- `BLOCKERS`
- `NEXT_AUTHORIZED_PHASE`
- `NEXT_PHASE_STARTED`
- `REASON_FOR_STOP`

## 12. Non-goals

This contract does not authorize autonomous product invention, speculative architecture, arbitrary code generation, hidden waivers, test suppression, governance bypass, self-approval of high-risk changes, or unsupported production-scale claims.

## 13. Principle

**Codex may execute continuously inside authority, repair within scope, and stop at the first boundary where authority is insufficient.**
