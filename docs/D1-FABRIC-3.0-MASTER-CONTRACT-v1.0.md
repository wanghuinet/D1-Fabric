# D1-Fabric 3.0 Master Contract v1.0

**Status:** ACTIVE / NORMATIVE / LOCKED
**Authority:** SINGLE NORMATIVE AUTHORITY for 3.0
**Scope:** D1-Fabric middleware kernel, execution governance, generic extension contracts, verification and release gates
**Implementation target:** `workers/v2/`
**Business code:** FORBIDDEN in Fabric kernel

## 0. Master Authority Lock

This document is the single normative authority for 3.0 semantics.

Authority order for 3.0:

```text
AGENTS.md
→ this Master Contract
→ explicitly referenced non-conflicting annexes
→ phase packet
→ implementation/tests
→ AI proposal
```

No other document named `3.0-*CONTRACT*` may independently override this document. Legacy or duplicated 3.0 contracts are compatibility/reference documents only. If any active document conflicts with this Master Contract, execution MUST STOP and the conflict MUST be recorded as `FAIL_CONTRACT_AUTHORITY`.

Chat messages are never repository authority.

## 1. Fixed Architecture

The approved execution boundaries are exactly:

```text
W01 Fabric Gateway
W02 Execution Fabric
W03 Write Fabric
W04 Control Plane
```

Cache is a read-path capability. Observability is emitted by the executing boundary. A new Worker, queue, Durable Object, service mesh, ORM, custom replication protocol, distributed transaction system, or other runtime primitive requires an explicit architecture change and approval.

Business semantics MUST remain outside W01-W04.

## 2. Eight Hardening Locks

The following eight controls are mandatory and independently release-blocking.

### H01 — Single Master Contract Authority

Every normative requirement MUST have exactly one authoritative contract location and a stable `contractId`.

Required trace fields:

```text
contractId
contractVersion
normativeOwner
architectureId
phaseId
implementationOwner
verificationId
```

Duplicate normative definitions are prohibited. A duplicate may only reference the Master Contract and MUST NOT redefine semantics.

### H02 — Budget Reservation / Consumption / Hard-Stop Protocol

Budgets are runtime controls, not documentation fields.

Every execution owns a budget ledger with:

```text
DECLARED → RESERVED → IN_FLIGHT → CONSUMED
                         ↘ RELEASED
```

For every resource:

```text
reserved + consumed + newly admitted work <= parent ceiling
```

Before downstream dispatch, required budget MUST be reserved. After completion, actual usage MUST be consumed and unused reservation released. If remaining budget is insufficient, no new work or retry may be admitted. Already admitted work may finish only within its reserved budget and deadline.

Hard limits apply to:

```text
fanout
concurrency
D1 statements
rows read
rows written
payload bytes
retries
wall-clock deadline
batch items
response items
cursor bytes
```

No execution path may bypass the ledger.

### H03 — Atomic Idempotency Contract

A retryable mutation MUST have an idempotency key and a defined result-replay contract.

For single-shard mutations, the idempotency state and authoritative business mutation MUST share the same atomic D1 transaction boundary whenever the underlying operation requires exactly-once effect semantics.

A timeout/unknown outcome MUST NOT be interpreted as failure merely because the response was lost.

Required states:

```text
ABSENT → IN_FLIGHT → COMMITTED
                 ↘ FAILED
```

A repeated committed key MUST replay the recorded committed result without repeating the mutation.

Cross-shard retryable mutations are forbidden unless a separate versioned contract explicitly defines their atomicity/recovery protocol.

The system MUST never report COMMITTED when authoritative commit did not occur.

### H04 — Distributed Quota Guarantee Levels

Every quota/rate limit MUST declare its guarantee class:

```text
INVOCATION_HARD
WORKER_LOCAL_HARD
EDGE_LOCAL_HARD
DISTRIBUTED_BEST_EFFORT
DISTRIBUTED_HARD
```

The system MUST NOT describe a local counter as a global hard limit.

Tenant/application/caller/object isolation MUST declare its scope and failure behavior. If a global hard guarantee cannot be provided without a prohibited global coordinator, the contract MUST downgrade the guarantee explicitly rather than claim strict global enforcement.

Noisy-neighbor protection MUST remain bounded under concurrent independent invocations.

### H05 — Control-Plane Epoch + LKG Fencing

Every control snapshot has:

```text
configVersion
epoch
activationTime
expiryTime
validationStatus
source
```

An execution MUST capture one immutable control epoch.

A Last-Known-Good snapshot is usable only while:

```text
validated = true
now < expiryTime
snapshot is not revoked/fenced
routing epoch is admissible
```

Writes using stale, retired, revoked, or incompatible routing epochs MUST be rejected rather than guessed.

Control recovery MUST validate the new snapshot before normal admission resumes.

### H06 — Security Binding of Cache / Cursor / Extension Context

Security context MUST be bound to all reusable state.

Cache keys and cursor tokens MUST be scoped by the minimum required set of:

```text
tenant
principal/authorization scope
operationId
contractVersion
query/response shape version
```

Cursors MUST additionally enforce integrity protection and bounded lifetime. Cross-tenant, cross-principal, cross-operation, tampered, expired, or downgraded tokens MUST be rejected.

Extension metadata is data only and can never become executable authority.

Cache HIT MUST still pass required authorization semantics before terminal return.

### H07 — Numeric Capacity Envelope

Capacity acceptance MUST be numeric and reproducible. `1x/2x/5x/10x` without a baseline is not acceptance evidence.

Every qualification run MUST declare:

```text
baselineRps
burstRps
concurrency
duration
request mix
cache hit ratio
payload distribution
P50/P95/P99 latency targets
max error rate
max retry amplification
max fanout
max D1 statements
max rows read/write
max memory/CPU where observable
```

Acceptance MUST prove:

```text
no budget violation
no unbounded retry amplification
no cross-tenant spill
bounded degradation at saturation
recovery to normal admission after overload
```

The contract MUST never promise infinite throughput or zero failure under arbitrary attack.

### H08 — Executable Phase Packets + Machine-Verifiable Evidence

P01-P16 are executable delivery gates, not descriptive labels.

Every phase MUST have a committed packet containing:

```text
phaseId
objective
allowedFiles
forbiddenFiles
inputs
contractIds
architectureIds
exact invariants
failure matrix
security cases
resource cases
test commands
acceptance thresholds
evidence schema
stop condition
```

Every PASS MUST bind:

```text
phaseId
contractId
architectureId
source files
changed files
test files/test IDs
commit SHA
CI/result reference
evidence artifact
```

A manually asserted PASS without reproducible evidence is `FAIL_EVIDENCE`.

## 3. Core Execution Contract

Every production operation MUST declare or inherit a versioned contract containing:

```text
operation identity/version
routing/shard-key rule
max fan-out
concurrency ceiling
request/tenant/shard budgets
statement budget
rows-read budget
rows-write budget
payload limits
deadline
consistency mode
primary/replica eligibility
bookmark/session policy
cache policy + TTL/version/stale rules
cache termination
failure/degradation policy
finite retry policy
idempotency policy where mutation
security scope
```

All values are finite and validated before execution.

## 4. Budget Laws

For every execution:

```text
sum(shard_rows_budget) <= global_rows_budget
sum(shard_write_budget) <= global_write_budget
sum(statement_budget) <= global_statement_budget
actual_fanout <= global_fanout_budget
actual_concurrency <= scheduler_concurrency_budget
actual_retries <= retry_budget
```

`fanout=N` MUST NOT imply `Promise.all(N)`.

The planner MUST reject or terminate when the remaining budget cannot safely satisfy the contract.

## 5. Admission / Backpressure

Admission MUST validate both declared demand and current executable limits.

Admission is not a guarantee of future capacity. Downstream scheduling MUST re-check remaining budget before every dispatch/retry boundary.

At overload:

```text
admit bounded work
→ reject excess work early
→ avoid retry amplification
→ preserve tenant isolation
→ allow recovery
```

## 6. Failure / Deadline / Retry

Retries consume the original deadline and resource budget. Retry delay is included in deadline feasibility.

No retry may create a new budget or reset the original deadline.

Partial reads are allowed only when the operation contract explicitly permits them. Writes MUST be strict unless an explicit contract defines safe partial semantics.

## 7. Control Plane

Control state is versioned, validated, immutable within an execution epoch, and recoverable through a fenced LKG mechanism.

A control-plane outage MUST NOT silently authorize unsafe routing or writes.

## 8. Public API and Middleware Boundary

Public APIs MUST NOT expose:

```text
physical D1 database IDs
physical shard IDs as implementation directives
SQL topology
internal Worker graph
internal control-plane state
```

Application interfaces carry intent and bounded data contracts only.

Business domains such as game, social, content, commerce, advertising, billing and AI are consumers of generic capabilities, not Fabric kernel semantics.

## 9. Cache / Cursor

Cache is optional and never a mandatory network hop.

A valid cache HIT with `cacheTermination=true` MUST terminate database execution and produce zero D1 work for that execution.

Cursor tokens are opaque, integrity protected, bounded, version scoped, authorization scoped, and topology independent.

## 10. Iteration / Extension

Capabilities follow:

```text
PROPOSED → CONTRACTED → VALIDATED → ACTIVE → DEPRECATED → RETIRED
```

No runtime may consume a `PROPOSED` capability.

ACTIVE capability versions are immutable.

Extensions cannot bypass routing, budget, consistency, authorization, tenant isolation, or security enforcement.

## 11. Observability

Every execution MUST expose enough structured telemetry to reproduce resource and failure claims:

```text
requestId
operation/version
contractVersion
executionEpoch
budget requested/allocated/reserved/consumed
fanout
concurrency
D1 statements
rows read/written
retry count
cache result
outcome/error class
```

Telemetry MUST NOT be a mandatory synchronous Worker hop on the hot path.

## 12. Cloudflare Platform Ceiling Rule

Fabric-defined limits MUST remain below or equal to the currently supported Cloudflare runtime limits for the deployed plan.

Platform limits are external constraints, not invented language/runtime assumptions. A platform-limit change MUST trigger contract review before raising Fabric ceilings.

No contract may claim a resource ceiling that the deployed runtime cannot enforce.

## 13. Security

All external input is untrusted.

Mandatory controls:

```text
authentication context
authorization boundary
schema/type validation
operation allow-list
budget validation
payload limits
safe errors
no topology disclosure
tenant isolation
extension metadata non-executable
cache/cursor binding
```

## 14. Architecture / Contract Bidirectional Gate

Every release MUST prove both:

```text
Architecture → Contract → Code → Tests
Contract → Architecture → Code → Tests
```

Audit states:

```text
PASS
FAIL_ARCH_DRIFT
FAIL_CONTRACT_DRIFT
FAIL_ORPHAN_ARCH
FAIL_ORPHAN_CONTRACT
FAIL_CONTRACT_AUTHORITY
FAIL_SCOPE
FAIL_EVIDENCE
FAIL_CAPACITY
FAIL_SECURITY
FAIL_RESILIENCE
```

No release may PASS with an unresolved failure state.

## 15. Change Manifest / Scope Lock

Every T1/T2 change MUST record:

```text
changeId
phaseId
contractIds
architectureIds
allowedFiles
forbiddenFiles
expected behavior
invariants
failure cases
security cases
tests
resource impact
```

Every changed file MUST be justified by the manifest.

## 16. P01-P16 Release Model

```text
P01 Contract/Architecture Lock
P02 Runtime Types + Validation
P03 Gateway Admission + Envelope
P04 Execution Plan Compiler
P05 Routing + Placement Abstraction
P06 Bounded Scheduler + Fan-out
P07 Read Execution + Cache Termination
P08 Write Execution + Idempotency
P09 Consistency + Bookmark/Replica Policy
P10 Failure/Deadline/Retry/Degradation
P11 Control Plane + LKG Fencing
P12 Security + Tenant Isolation
P13 Iteration/Application/Extension Interfaces
P14 Commercial Extension Contract + Registry
P15 Adversarial/Property/Regression/Performance Qualification
P16 Bidirectional Audit + Release Gate
```

No phase may redesign architecture or consume a future-phase capability.

## 17. Definition of Done

A phase is complete only when:

```text
contract implemented
+ negative tests pass
+ failure tests pass
+ invariant/property tests pass
+ resource accounting proven
+ security boundary proven
+ capacity evidence proven where applicable
+ architecture mapping clean
+ contract mapping clean
+ scope diff clean
+ no known contract violation
+ reproducible evidence committed/referenced
+ commit created
+ pushed commit verified
```

Compilation alone is never acceptance.

## 18. Mandatory STOP Conditions

AI MUST STOP if:

```text
contract authority conflicts
architecture conflicts
required behavior is undefined
public compatibility is ambiguous
new Worker appears necessary
new infrastructure primitive appears necessary
business semantics enter the kernel
budget cannot be safely satisfied
idempotency atomicity is undefined
global quota guarantee is overstated
LKG is stale/unfenced
security binding is missing
capacity baseline is undefined
evidence cannot be reproduced
```

## 19. GPT Development Mode

For 3.0 implementation, GPT is the primary implementation and verification agent.

GPT MUST:

```text
read AGENTS.md
read this Master Contract
read only minimum relevant source
create/update the phase packet
implement contract behavior
run tests
run negative/failure/security/resource tests
run architecture + scope gates
commit
push to GitHub
verify the exact pushed commit
report evidence
stop
```

GPT MUST NOT:

```text
invent architecture
split/merge Workers
add business code to Fabric
use PowerShell as Worker runtime code
weaken tests
modify contracts to fit code
claim PASS without evidence
continue into the next phase automatically
```

## 20. Final Lock

The eight hardening controls H01-H08 are release-blocking. Any one of them failing means 3.0 is NOT production-ready.

This Master Contract is intentionally narrow: it closes governance, budget, idempotency, quota, epoch, security, capacity, and evidence loopholes without adding business functionality or changing the four-Worker architecture.
