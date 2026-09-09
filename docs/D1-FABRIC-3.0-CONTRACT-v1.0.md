# D1-Fabric 3.0 Contract v1.0

**Status:** EXECUTABLE CONTRACT / ARCHITECTURE-CONFORMANCE GATE
**Scope:** D1-Fabric middleware only
**Authority:** subordinate to repository constitutional authority; this document becomes the 3.0 execution contract only when explicitly selected by the repository router.
**Primary implementation agent:** DeepSeek
**Independent verification agent:** Worker verification pass

---

## 0. Purpose

D1-Fabric 3.0 must preserve the approved middleware architecture while making the implementation executable by an AI implementation agent and independently verifiable after the code is pushed to GitHub.

The contract has two independent gates:

```text
3.0 Contract + Architecture
        ↓
DeepSeek implementation
        ↓
local tests / adversarial verification
        ↓
DeepSeek commit + PUSH TO GITHUB
        ↓
Worker verification pass
        ↓
architecture diff + contract diff + tests + resource evidence
        ↓
PASS → accept/refactor only inside contract
FAIL → return defects to DeepSeek; do not silently broaden scope
```

**A local implementation is not considered delivered until it is pushed to GitHub and the pushed commit is independently verified.**

---

# 1. Authority and precedence

When documents disagree, use this precedence:

1. Repository constitutional/AI authority files.
2. Approved architecture ownership contract.
3. This 3.0 Contract.
4. Applicable API/data/domain contracts.
5. Phase/Execution Packet.
6. Existing verified implementation and tests.
7. Agent interpretation.

If two authoritative documents conflict and no explicit precedence resolves the conflict:

```text
STOP → report exact conflict → do not invent semantics → wait for versioned resolution.
```

DeepSeek is an implementation agent, not an architecture authority.
Worker verification is an independent conformance/quality gate, not permission to redesign the architecture.

---

# 2. Architecture lock

3.0 preserves the core principle already established in the repository:

```text
Application / AI
      ↓
Fabric Contract
      ↓
Admission
      ↓
Plan
      ↓
Schedule
      ↓
Placement
      ↓
Execute
      ↓
Merge
      ↓
Terminate
```

The middleware owns generic execution capability only.

Business semantics remain outside the Fabric kernel.

No implementation agent may independently:

- add, split, merge, or rename runtime Workers;
- change Worker ownership;
- move business semantics into middleware;
- introduce a queue, Durable Object, service mesh, ORM, transaction engine, or new storage system;
- change shard semantics;
- change public protocol semantics;
- change consistency guarantees;
- introduce an unbounded retry/fan-out path;
- create a mandatory synchronous global coordinator;
- add infrastructure solely for conceptual separation.

A proposed architecture change must be a versioned change to the architecture contract before implementation.

---

# 3. Runtime boundary

The current approved 2.0 baseline uses four execution boundaries:

```text
workers/v2/
  w01-fabric-gateway/
  w02-execution-fabric/
  w03-write-fabric/
  w04-control-plane/
```

3.0 does not create additional Workers merely to host the new interfaces in this document.

Existing cache and observability rules remain:

- cache is a read-execution capability, not a mandatory network hop;
- observability is emitted by the executing boundary, not a synchronous telemetry Worker.

Any Worker topology change requires an explicit architecture change record and independent approval.

---

# 4. Kernel / extension separation

3.0 adds extensibility without turning the kernel into an application framework.

```text
                    Applications
        ┌──────────────┼──────────────┐
        │              │              │
       Game          Social          AI
        │              │              │
        └──────────────┼──────────────┘
                       ↓
              Application Interface
                       ↓
             Commercial Extension
                       ↓
                Iteration Interface
                       ↓
                D1-Fabric Kernel
```

The kernel must not contain branches such as:

```ts
if (game) ...
if (commerce) ...
if (social) ...
if (ai) ...
```

unless the branch is a generic Fabric capability explicitly covered by a contract.

---

# 5. Stable Kernel Interface

The kernel exposes generic capabilities only:

- operation admission;
- routing/placement abstraction;
- bounded planning;
- scheduling;
- fan-out control;
- statement/row/write budgets;
- deadline enforcement;
- retry budget;
- consistency policy;
- cache policy and cache termination;
- failure/degradation policy;
- result merge/early termination;
- resource accounting;
- security boundary enforcement;
- execution trace.

Applications must not receive physical D1 identifiers, internal Worker call graphs, SQL topology, or internal routing implementation details.

---

# 6. Iteration Interface

The Iteration Interface is the controlled mechanism for application evolution.

It may represent:

- versioned operation contracts;
- additive schema evolution;
- additive indexes;
- new application-facing data operations;
- new contract versions;
- capability registration;
- compatibility metadata;
- migration state;
- deprecation state.

It must not silently change:

- shard identity semantics;
- placement ownership;
- resource ceilings;
- consistency guarantees;
- security boundaries;
- Worker ownership;
- public compatibility guarantees.

Every iteration must carry:

```text
change_id
contract_version
compatibility_mode
owner
scope
resource_budget
security_policy
migration_state
rollback_rule
acceptance_tests
```

---

# 7. Application Interface

Application functionality is expressed through versioned contracts rather than hard-coded business logic in Fabric.

Example domains include:

```text
Game
Social
Content
Commerce
AI
```

The examples are capability domains, not permission to implement them in middleware.

Application code owns business meaning.
Fabric validates and executes the generic data operation under its resource, consistency, security, and failure contracts.

---

# 8. Commercial Extension Interface

3.0 provides a stable extension boundary for future commercial capabilities without placing commercial logic in the kernel.

Permitted extension categories include:

```text
billing
subscription
quota
usage metering
promotion
advertising
marketplace
developer API
enterprise API
paid capability
plugin/capability registration
```

The extension contract must define:

- extension ID;
- semantic version;
- capability ID;
- input/output contract;
- authorization scope;
- tenant scope;
- resource budget;
- data ownership;
- consistency requirement;
- failure policy;
- compatibility policy;
- lifecycle state;
- observability fields.

Commercial extensions are application/platform capabilities. They are not Fabric kernel semantics.

---

# 9. Extension Capability Registry

Extensions must be addressable by stable identifiers rather than ad-hoc code paths.

Canonical conceptual shape:

```ts
interface ExtensionCapability {
  extensionId: string;
  version: number;
  capabilityId: string;
  inputContract: string;
  outputContract: string;
  authorizationScope: string;
  resourceBudget: FabricBudget;
  consistency: Consistency;
  failurePolicy: FailurePolicy;
  compatibility: "backward-compatible" | "breaking";
  lifecycle: "active" | "deprecated" | "disabled";
}
```

The registry describes an extension. It does not execute business logic.

---

# 10. Operation execution contract

Every production operation must declare or inherit a versioned contract containing:

- operation identity;
- contract version;
- shard key/routing rule;
- maximum fan-out;
- downstream concurrency ceiling;
- tenant budget;
- operation budget;
- request budget;
- shard budget;
- statement budget;
- rows-read budget;
- rows-write budget;
- deadline;
- consistency mode;
- primary/replica eligibility;
- bookmark/session policy where applicable;
- cache policy;
- cache termination policy;
- failure policy;
- degradation policy;
- retry policy;
- retry budget.

No production path may use an unbounded value.

---

# 11. Resource invariants

For every execution:

```text
sum(shard_rows_budget)   <= global_rows_budget
sum(shard_write_budget)  <= global_write_budget
sum(statement_budget)    <= global_statement_budget
actual_fanout            <= global_fanout_budget
actual_concurrency       <= concurrency_budget
actual_retries           <= retry_budget
```

A planner may allocate uneven budgets, but no child allocation can increase a parent ceiling.

A previously identified W03 class of error is explicitly prohibited:

```text
ceil(globalRows / fanout)
```

must not be used in a way that makes the sum of per-shard limits exceed the global limit.

Use a deterministic allocation whose total never exceeds the global budget.

---

# 12. Cache termination

When `cacheTermination=true`, a valid cache hit is a terminal execution state:

```text
cache HIT → return → 0 D1 → 0 database fan-out
```

A cache hit must not invoke downstream database work merely to revalidate unless the contract explicitly requires validation.

Cache semantics must define TTL, version/validation token, consistency mode, stale policy, invalidation/write coupling, and degradation behavior.

---

# 13. Failure, retry, concurrency and idempotency

Retries are bounded by both retry count and the original request resource/deadline budgets.

Retryable writes require an idempotency contract.

The scheduler must distinguish logical fan-out from physical concurrency and must not implement unbounded `Promise.all()` over downstream work.

Partial read failure may return partial results only when the operation contract explicitly permits it.

A write may never become partially committed merely because one downstream step failed.

Recovery must restore required invariants before normal admission resumes.

---

# 14. AI implementation authority

DeepSeek must follow this exact execution model:

```text
READ repository authority
→ READ applicable architecture/contract
→ inspect target Worker files
→ build Contract → Code → Test mapping
→ implement only missing contract items
→ run typecheck/build
→ run unit tests
→ run adversarial tests
→ run resource-budget tests
→ run architecture-boundary tests
→ run regression tests
→ inspect diff
→ verify file/package layout
→ commit
→ PUSH TO GITHUB
→ report commit SHA and evidence
→ STOP
```

DeepSeek must not continue into the next phase after a successful push unless the next phase is explicitly assigned.

---

# 15. DeepSeek code-generation restrictions

Code volume is **not** artificially limited. Correctness, robustness, security, consistency, maintainability, and production safety take priority over line count.

However, every non-test implementation change must map to at least one explicit contract requirement, invariant, failure rule, security rule, resource rule, or acceptance test.

Allowed supporting code is limited to:

1. input validation;
2. invariant/state validation;
3. error handling;
4. concurrency/idempotency protection;
5. consistency protection;
6. security enforcement;
7. required observability/resource accounting;
8. tests and test fixtures.

Forbidden without an explicit architecture change:

- speculative future features;
- generic frameworks added for hypothetical reuse;
- unrelated refactors;
- new dependencies without contract authorization;
- new Worker boundaries;
- new persistence systems;
- new queues or coordinators;
- hidden compatibility layers;
- code whose only purpose is to make an acceptance test pass without satisfying the underlying contract.

If the contract is ambiguous, DeepSeek stops instead of deciding product or architecture semantics.

---

# 16. Required Worker file/package format

All independently deployable Workers must retain isolated package boundaries.

Required layout:

```text
workers/v2/
  w01-fabric-gateway/
    package.json
    wrangler.toml
    src/
      index.ts
      ...
    tests/
      ...

  w02-execution-fabric/
    package.json
    wrangler.toml
    src/
      index.ts
      ...
    tests/
      ...

  w03-write-fabric/
    package.json
    wrangler.toml
    src/
      index.ts
      ...
    tests/
      ...

  w04-control-plane/
    package.json
    wrangler.toml
    src/
      index.ts
      ...
    tests/
      ...

  contracts/
    *.ts
```

Rules:

- Each deployable Worker owns its own `package.json`.
- Dependencies must not be collapsed into one giant root package merely for convenience.
- Shared semantics belong in versioned contract files.
- Worker source files must be UTF-8 text.
- TypeScript is the implementation language for Worker runtime code.
- Do not output PowerShell scripts as a substitute for Worker implementation.
- Build/runtime configuration belongs in the Worker directory that deploys it.
- Tests belong beside the Worker they qualify unless a contract test is explicitly shared.
- A file may not silently change role merely to avoid creating the correct file.
- Do not create duplicate contract definitions in multiple Workers.

A Phase delivery must state every added/changed file using repository-relative paths.

---

# 17. Delivery manifest

Every DeepSeek delivery must produce a machine-readable change manifest in the commit description or an execution report containing:

```text
phase_id
change_id
base_commit
result_commit
files_added
files_modified
files_deleted
tests_run
tests_passed
architecture_checks
resource_checks
security_checks
regression_checks
known_defects
scope_status
```

No fabricated evidence is allowed.

---

# 18. GitHub push gate

The implementation agent must push immediately after completing and verifying the assigned implementation boundary.

Required order:

```text
implementation complete
→ verification complete
→ diff scope check
→ commit
→ PUSH TO GITHUB
→ record exact commit SHA
→ STOP
```

Do not keep verified code only in a local working tree while starting additional unrelated work.

Do not rewrite the pushed commit merely to hide a defect discovered by verification.

If verification fails:

```text
FAIL → do not claim completion → fix within scope → rerun verification → push corrected commit
```

---

# 19. Worker independent verification gate

After the DeepSeek commit is pushed, the Worker verification pass must inspect the pushed repository state rather than trusting the DeepSeek report.

Verification order:

```text
fetch exact commit
→ inspect changed files
→ inspect package boundaries
→ inspect architecture conformance
→ inspect Contract → Code → Test mapping
→ run/review tests
→ adversarial boundary checks
→ resource-budget checks
→ security checks
→ regression checks
→ architecture diff
→ PASS / FAIL
```

Worker verification may perform a **contract-preserving refactor** when it improves:

- correctness;
- determinism;
- testability;
- resource accounting;
- security;
- maintainability;
- explicit boundary enforcement.

Worker verification may NOT use “refactor” as permission to add new features, alter architecture, move business semantics into middleware, or change public behavior.

Any required architectural change becomes a separate versioned change proposal.

---

# 20. Architecture ↔ Contract bidirectional audit

Every 3.0 verification must check both directions.

### Architecture → Contract

Every architecture component, ownership rule, invariant, data boundary, API boundary, and runtime behavior must have an explicit contract mapping.

### Contract → Architecture

Every contract capability must have a valid architectural owner and implementation boundary.

Unmapped items are failures:

```text
ARCHITECTURE_ORPHAN
CONTRACT_ORPHAN
OWNER_ORPHAN
TEST_ORPHAN
RESOURCE_ORPHAN
```

Architecture conformance failure remains FAIL even when functional tests pass.

---

# 21. Phase boundary

3.0 work is divided into executable phases, but phases must remain coarse enough to preserve coherent implementation boundaries.

Each Phase Contract must specify:

```text
Phase ID
Objective
Allowed files
Allowed Workers
Input contract
Implementation contract
Invariants
Failure matrix
Resource limits
Security requirements
Tests
Acceptance evidence
Forbidden changes
Commit requirement
Push requirement
Stop condition
Handoff
```

A Phase may not silently consume a later Phase.

---

# 22. Zero-drift gate

A Phase fails if any of the following occurs:

- unauthorized Worker change;
- unauthorized file change;
- unauthorized dependency;
- unauthorized schema change;
- unauthorized API change;
- business logic enters middleware;
- resource ceiling changes without authorization;
- test is removed/weakened to obtain PASS;
- error is swallowed to obtain PASS;
- architecture semantics change without a versioned proposal;
- verification evidence is missing or fabricated.

---

# 23. Definition of Done

A 3.0 implementation boundary is DONE only when:

```text
contract mapped
+ architecture conformance PASS
+ code implemented
+ typecheck/build PASS
+ unit tests PASS
+ adversarial tests PASS where applicable
+ resource accounting PASS
+ security boundary PASS
+ regression PASS
+ file/package layout PASS
+ diff scope PASS
+ commit created
+ commit pushed to GitHub
+ exact SHA recorded
+ independent Worker verification PASS
```

A local PASS without the GitHub push and independent verification is **NOT DONE**.

---

# 24. Final operating law

```text
Contract defines WHAT
Architecture defines WHERE / OWNER
DeepSeek implements HOW within the boundary
Tests prove behavior
GitHub commit proves delivery
Worker verification proves conformance

No agent may silently change WHAT or WHERE while implementing HOW.
```

The purpose of 3.0 extensibility is to allow games, social applications, content applications, commerce, AI applications, and future commercial capabilities to evolve rapidly **without destabilizing the Fabric kernel**.
