# D1-Fabric 3.0 Final Contract v1.0

**Status:** ACTIVE / REFACTOR-VALIDATION BASELINE  
**Authority:** Repository source of truth  
**Scope:** D1-Fabric middleware kernel + generic extension contracts  
**Implementation target:** `workers/v2/`  
**Business code:** FORBIDDEN in Fabric kernel

## 0. Purpose

3.0 is a contract evolution over the approved 2.0 execution architecture. It does **not** authorize a new Worker topology. The stable kernel remains the four execution boundaries:

- W01 Fabric Gateway
- W02 Execution Fabric
- W03 Write Fabric
- W04 Control Plane

Cache remains a read-execution capability. Observability remains emitted by the executing boundary. A new Worker requires an explicit architecture change, evidence, and approval.

The 3.0 objective is:

```text
stable execution kernel
+ bidirectional architecture/contract verification
+ deterministic AI execution rules
+ versioned iteration interfaces
+ generic application/commercial extension interfaces
```

The extension interfaces are deliberately generic. They do not place game, social, content, commerce, advertising, billing, or AI business semantics inside the kernel.

## 1. Authority and precedence

Order of authority:

1. Repository `AGENTS.md`
2. This 3.0 Final Contract
3. Approved architecture baseline and architecture contract
4. Applicable data/API/implementation contracts
5. Phase contract
6. Existing verified implementation/tests
7. AI-generated proposal

If two active contracts conflict, AI MUST STOP. It must not choose a convenient interpretation.

Chat instructions are not repository authority unless committed into the active contract set.

## 2. AI implementation authority

DeepSeek/AI is an **implementation executor and verifier**, not an architecture or product authority.

AI MUST:

- implement only declared contract behavior;
- preserve Worker ownership;
- preserve public protocol semantics;
- preserve resource ceilings;
- add tests for every changed invariant;
- report contradictions before coding;
- stop when the declared phase is complete.

AI MUST NOT:

- invent a new Worker;
- split/merge Workers;
- introduce a queue, Durable Object, service mesh, ORM, custom replication protocol, or distributed transaction system without an approved architecture change;
- add business semantics to middleware;
- add speculative future-phase functionality;
- weaken tests or delete tests to obtain a pass;
- change a contract merely to match its implementation;
- add code whose justification cannot be mapped to a contract/invariant/failure/security/test requirement.

Code volume is **not** constrained. Correctness, safety, consistency, boundedness, and maintainability are constrained.

## 3. Architecture lock

The following are architecture invariants:

```text
A-001  W01/W02/W03/W04 are the approved 2.0 execution boundaries.
A-002  One semantic concern has one owner.
A-003  Business owns business meaning; Fabric owns generic execution capability.
A-004  Public APIs never expose physical D1, shard, SQL, or internal Worker topology.
A-005  Cache is a read-path capability, not a mandatory network hop.
A-006  Observability is emitted by the executing boundary.
A-007  Logical placement is abstracted from physical storage.
A-008  No production execution path has unbounded fan-out, D1 I/O, retries, payloads, or synchronous side-effect cascades.
A-009  Control state is versioned and last-known-good capable.
A-010  New runtime boundaries require evidence and explicit architecture approval.
```

Any violation is an architecture failure even if functional tests pass.

## 4. Bidirectional consistency gate

Every release/phase must verify both directions:

```text
Architecture → Contract → Code → Tests
Contract → Architecture → Code → Tests
```

Each architecture item must have at least one contract ID and verification evidence. Each normative contract item must map to an architecture item or be explicitly classified as implementation-only.

Required audit states:

- `PASS`: exact semantic match with evidence.
- `FAIL_ARCH_DRIFT`: implementation changes architecture.
- `FAIL_CONTRACT_DRIFT`: implementation violates contract.
- `FAIL_ORPHAN_ARCH`: architecture item has no contract/evidence.
- `FAIL_ORPHAN_CONTRACT`: normative contract item has no architecture/implementation owner.
- `FAIL_SCOPE`: undeclared capability or file changed.
- `FAIL_EVIDENCE`: behavior claimed without reproducible evidence.

## 5. Negative contract

The absence of a feature is intentional unless explicitly authorized.

The following are prohibited in 3.0 kernel work:

```text
N-001 business-domain entities or rules in W01-W04
N-002 per-domain routing branches such as if(game), if(shop), if(feed)
N-003 domain-specific billing/payment/ads/recommendation logic
N-004 domain-specific schema ownership in the kernel
N-005 unbounded retry/fan-out/concurrency
N-006 hidden Worker-to-Worker calls
N-007 silent API or data-contract changes
N-008 speculative migration infrastructure
N-009 compatibility shims for nonexistent consumers
N-010 architecture changes disguised as refactoring
```

## 6. Core execution contract

Every production operation must declare or inherit a versioned contract containing:

- operation identity/version;
- routing/shard-key rule;
- max fan-out;
- downstream concurrency ceiling;
- tenant/operation/request/shard budgets;
- statement budget;
- rows-read budget;
- rows-write budget;
- deadline;
- consistency mode;
- primary/replica eligibility;
- bookmark/session policy where applicable;
- cache policy and TTL/version/stale rules;
- cache-termination behavior;
- failure/degradation policy;
- retry policy and finite retry budget.

No production operation may use an unbounded value.

## 7. Budget invariants

For every execution:

```text
sum(shard_rows_budget)    <= global_rows_budget
sum(shard_write_budget)   <= global_write_budget
sum(statement_budget)     <= global_statement_budget
actual_fanout             <= global_fanout_budget
actual_concurrency        <= scheduler_concurrency_budget
actual_retries            <= retry_budget
```

Budget allocation may be uneven. It may never exceed a parent ceiling.

The planner must stop or reject when the remaining budget cannot satisfy the contract.

## 8. Adaptive execution

Preferred plan order:

```text
cache-hit + permitted termination → zero D1
exact-shard → single-shard execution
bounded multi-shard → scheduled bounded fan-out
replica-eligible → consistency-aware replica execution
sufficient result → terminate remaining work
unsupported/unbounded → reject
```

`fanout=N` MUST NOT imply `Promise.all(N)`.

## 9. Failure, deadline, retry and idempotency

Retry consumes the original deadline and resource budgets. Retryable writes require an idempotency contract. Retry behavior must be finite and deadline-aware.

Failure policy must explicitly be one of the supported contract modes. Partial read results may be permitted only where the operation contract says so. A write may never be reported committed when the authoritative commit did not occur.

Recovery must restore required invariants before normal admission.

## 10. Control-plane resilience

Execution may use a validated last-known-good control snapshot during temporary control-plane unavailability, subject to its validity/safety contract.

Control configuration must be:

- versioned;
- validated before activation;
- immutable for an execution epoch;
- recoverable as last-known-good state.

## 11. Security contract

All external inputs are untrusted.

The kernel must enforce:

- authentication context where required by the public contract;
- authorization boundaries;
- schema/type validation;
- operation allow-listing;
- budget validation;
- payload limits;
- safe error envelopes;
- no SQL/internal-topology disclosure;
- no tenant data crossing;
- no privilege escalation through extension metadata.

Extension metadata is data, not executable authority.

## 12. Iteration Interface

`Iteration Interface` is the stable evolution boundary for adding new application capabilities without modifying kernel semantics.

Allowed categories:

```text
new application data contract
new application operation
new application fields
new application indexes
new versioned API surface
new extension capability
new event/capability type
```

An iteration MUST NOT change:

```text
routing semantics
shard ownership
budget law
consistency guarantees
security boundary
Worker ownership
internal execution semantics
```

A breaking change requires a new versioned contract and architecture/change approval.

### 12.1 Iteration lifecycle

```text
PROPOSED
→ CONTRACTED
→ VALIDATED
→ ACTIVE
→ DEPRECATED
→ RETIRED
```

No implementation may consume a `PROPOSED` capability.

### 12.2 Compatibility

Existing active consumers must continue to receive the previous contract semantics until an explicit version transition occurs. New optional fields/capabilities must not silently change old behavior.

## 13. Application Interface

The Application Interface exposes generic data-operation capability to application services. It carries **intent and bounded data contracts**, not physical database instructions.

An application operation may specify:

```text
operation id/version
input schema
output schema
routing intent
consistency requirement
resource budget
failure/degradation mode
cache policy
extension capability references
```

It MUST NOT specify:

```text
physical D1 database
physical shard id as an implementation directive
SQL execution topology
internal Worker call graph
unbounded retry/fan-out
```

## 14. Commercial Extension Interface

Commercial features are supported through generic versioned extension contracts, not business code inside Fabric.

Supported capability families may include, when separately approved:

```text
usage metering
quota
subscription
entitlement
billing reference
promotion
advertising reference
marketplace reference
developer-plan limits
enterprise policy
paid capability flags
```

The kernel only provides generic execution/governance for these capabilities. It does not own payment processing, advertising decisions, game economies, product pricing, recommendation policy, or business eligibility rules.

### 14.1 Domain examples

The interface must be capable of serving domains such as:

```text
Game:
  player / inventory / ranking / guild / match / event

Social:
  follow / like / comment / relationship / notification

Content:
  post / media / topic / creator / history

Commerce:
  product / cart / order / promotion / inventory

AI:
  agent / task / memory / tool / workflow / usage
```

These are **examples of consumers**, not permission to implement them in the Fabric kernel.

## 15. Extension Capability Contract

Every extension capability must declare:

```text
capabilityId
version
inputSchema
outputSchema
dataOwnership
consistencyRequirement
resourceBudget
securityPolicy
compatibilityPolicy
lifecycleState
```

Rules:

1. Capability IDs are opaque to the kernel.
2. Capability metadata cannot execute code.
3. Capability ownership remains outside the kernel unless explicitly assigned to a generic Fabric primitive.
4. A capability cannot bypass routing, budget, consistency, or security enforcement.
5. Capability versions are immutable once ACTIVE.
6. Removing an ACTIVE capability requires a deprecation period and compatibility evidence.

## 16. Capability registry

The registry is a contract registry, not a business service.

Example identifiers:

```text
GAME.RANKING.v1
SOCIAL.FEED.v1
COMMERCE.ORDER.v1
AI.AGENT.v1
BILLING.SUBSCRIPTION.v1
```

The kernel must not contain domain-specific branches for these identifiers.

## 17. Observability

Every execution must be traceable to:

```text
request id
operation/version
contract version
execution epoch
budget requested/allocated/consumed
fan-out
concurrency
D1 statements
rows read/written
retry count
cache result
outcome/error class
```

Telemetry must not become a mandatory synchronous Worker hop.

## 18. Testing and verification

Every changed capability requires:

1. contract tests;
2. boundary/negative tests;
3. failure/deadline tests where applicable;
4. concurrency tests where applicable;
5. resource-accounting tests;
6. security tests;
7. regression tests;
8. architecture conformance evidence.

For resource planners, property tests MUST verify global budget sums. For public contracts, compatibility tests MUST verify unchanged behavior for existing versions.

Tests must test the invariant, not merely the happy path.

AI may not modify a test assertion solely to make an implementation pass.

## 19. Phase model

3.0 retains a coarse 16-phase delivery model. Phases are execution boundaries, not invitations to redesign architecture.

```text
P01 Contract/Architecture Lock
P02 Contract Runtime Types + Validation
P03 Gateway Admission + Envelope
P04 Execution Plan Compiler
P05 Routing + Placement Abstraction
P06 Bounded Scheduler + Fan-out
P07 Read Execution + Cache Termination
P08 Write Execution + Idempotency
P09 Consistency + Bookmark/Replica Policy
P10 Failure/Deadline/Retry/Degradation
P11 Control Plane + Last-Known-Good
P12 Security + Tenant Isolation
P13 Iteration/Application/Extension Interfaces
P14 Commercial Extension Contract + Registry
P15 Adversarial/Property/Regression/Performance Qualification
P16 Architecture Bidirectional Audit + Release Gate
```

Each phase MUST have: objective, allowed files, forbidden changes, inputs, exact invariants, failure matrix, tests, acceptance evidence, and stop condition.

## 20. Refactor rules for the existing workers

The existing implementation is the object of verification, not the authority over the contract.

During refactor:

- preserve behavior that is explicitly contractually valid;
- remove behavior that violates the middleware boundary;
- do not copy 1.0 business semantics into 2.0/3.0;
- do not add business services to W01-W04;
- keep shared semantics in versioned contract modules;
- each independently deployable Worker retains its own `package.json` and dependency boundary;
- do not create a giant root dependency bundle merely for convenience;
- TypeScript implementation must target the repository's configured/runtime-supported current toolchain, not an invented language version;
- do not create PowerShell as a substitute for Worker runtime code;
- scripts are allowed only for development/CI automation when explicitly scoped.

## 21. Change manifest and scope gate

Before any T1/T2 change, record:

```text
changeId
phase
contract IDs
architecture IDs
allowed files
forbidden files
expected behavior
invariants
failure cases
tests
resource impact
```

Every changed file must be justified by the manifest.

## 22. Definition of Done

A phase is complete only when:

```text
contract implemented
+ tests pass
+ negative tests pass
+ invariants proven
+ failure behavior proven
+ resource accounting proven
+ security boundary proven where applicable
+ architecture diff clean
+ scope diff clean
+ no known contract violation
+ evidence recorded
+ commit created
```

Compilation alone is never acceptance.

## 23. Mandatory STOP conditions

AI MUST STOP instead of guessing when:

- architecture and contract conflict;
- a required behavior is undefined;
- a public compatibility decision is ambiguous;
- a new Worker appears necessary;
- a new infrastructure primitive appears necessary;
- business semantics are requested inside the kernel;
- a budget cannot be satisfied safely;
- a test contradicts the contract;
- evidence cannot be reproduced.

## 24. Final execution command to AI

```text
Read AGENTS.md and this contract.
Read only the minimum existing worker files needed for the current phase.
Build Contract → Architecture → Code → Test traceability.
Implement missing contract behavior without changing architecture.
Run positive, negative, failure, concurrency, resource and security tests required by the phase.
Run architecture and scope diff gates.
If any ambiguity or architecture conflict exists: STOP and report it.
If all gates pass: commit, push, record evidence, and stop.
Do not continue into an unapproved phase.
```
