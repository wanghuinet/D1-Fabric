# P07 — Read Execution + Cache Termination v1.0

**Status:** ACTIVE / EXECUTABLE / LOCKED
**phaseId:** P07
**taskId:** P07.1
**contractId:** D1F-3.0-MASTER-v1.0
**architectureId:** D1F-3.0-ARCH-v1.0
**implementationOwner:** W02 Execution Fabric
**verificationId:** P07.1-GATE-v1.0

## 1. Objective

Implement the first bounded read-execution path after P04 plan compilation, P05 routing/placement, and P06 bounded scheduling.

P07 has exactly two capabilities:

1. execute an already validated, routed, bounded read against an approved logical target;
2. terminate on a valid cache HIT when the operation contract explicitly permits `cacheTermination=true`, producing zero D1 work for that execution.

P07 MUST NOT implement writes, mutation idempotency, retry policy, control-plane authority, business semantics, or a new runtime primitive.

## 2. Fixed architecture

```text
W01 Fabric Gateway
    ↓ validated request
W02 Execution Fabric
    ├─ plan
    ├─ routing / placement
    ├─ bounded scheduling
    └─ P07 read execution / cache termination

W03 Write Fabric
    └─ write execution only

W04 Control Plane
    └─ authoritative placement / epoch / LKG / fencing
```

No new Worker, queue, Durable Object, service mesh, ORM, replication protocol, distributed transaction system, or other runtime primitive is permitted.

## 3. Ownership

### W02 owns

- read-operation execution orchestration;
- consumption of an already approved logical target and placement result;
- bounded read dispatch;
- read resource accounting;
- cache-termination decision using contract-provided cache state;
- terminal response construction without topology disclosure.

### W04 owns

- authoritative control snapshots;
- routing/placement epoch and LKG fencing;
- publication and validation of placement state.

### W03 owns

- write execution only;
- mutation-side idempotency and authoritative write transaction semantics in later phases.

### Application/business layer owns

- domain meaning;
- query semantics beyond the generic operation contract;
- article/feed/comment/game/commerce/AI/etc. business behavior.

## 4. Allowed files

For implementation task P07.1:

```text
workers/v2/W02-Execution-Fabric/**
docs/phases/P07-READ-EXECUTION-CACHE-TERMINATION-v1.0.md
docs/phases/evidence/P07.1-EVIDENCE.md
.github/workflows/w02-p07-validation.yml
```

No other file may change without an explicit Change Manifest update and architecture approval.

## 5. Forbidden files / capabilities

P07.1 MUST NOT modify:

```text
workers/v2/W01-Fabric-Gateway/**
workers/v2/W03-Write-Fabric/**
workers/v2/W04-Control-Plane/**
```

P07.1 MUST NOT implement:

```text
writes / mutations
idempotency state
retry loops or retry policy
business-domain logic
new routing algorithms
new placement authority
control-plane publication
cross-shard transactions
replication
ORM/query builder
unbounded fan-out
Promise.all(N)
mandatory cache network hop
public physical D1 identifiers
```

## 6. Input contract

P07 accepts only work that has already passed the preceding gates.

Required upstream state:

```text
validated request
compiled execution plan
resolved logical target
validated placement snapshot
single admissible execution epoch
bounded scheduler admission
```

The read executor MUST fail closed if any required upstream state is absent, malformed, expired, fenced, or inconsistent.

P07 MUST NOT recreate or guess routing/placement.

## 7. Read operation boundary

A read execution request MUST carry only generic execution data required by the contract, including as applicable:

```text
requestId
tenantId
principal/authorization scope
operationId
contractVersion
logicalTargetId
executionEpoch
bounded query/read payload
statement budget
rows-read budget
payload-byte budget
deadline
consistency mode
cache policy
```

Physical D1 database IDs, physical shard IDs, SQL topology, and internal Worker graph identifiers MUST NOT be exposed through the public API.

P07 MAY use internal placement information only at the execution boundary and MUST NOT return it to callers.

## 8. Cache termination contract

Cache is optional.

If the operation contract declares:

```text
cacheAllowed=true
cacheTermination=true
```

and a cache entry is present, valid, integrity-protected, authorization-compatible, tenant-compatible, operation-compatible, contract-version-compatible, shape-version-compatible, and unexpired, the execution MUST terminate at the cache boundary.

Terminal cache HIT MUST produce:

```text
cacheResult=HIT
cacheTermination=true
D1 statements=0
rowsRead=0
rowsWritten=0
```

A cache HIT MUST still pass required authorization/security semantics before terminal return.

A cache miss MUST continue through the already-approved read path without changing routing or budgets.

A malformed, tampered, expired, cross-tenant, cross-principal, cross-operation, or version-downgraded cache entry MUST be treated as a miss or explicit security failure according to the operation contract; it MUST NEVER be returned as authoritative data.

Cache is never a mandatory synchronous network hop. Cache failure MUST NOT silently authorize unsafe execution.

## 9. D1 read execution

P07 is the first phase permitted to execute bounded D1 reads through the approved execution boundary.

The executor MUST:

1. validate the execution request again at the execution boundary;
2. verify deadline before D1 dispatch;
3. reserve required statement/row/payload resources before dispatch;
4. dispatch only to the already-approved target;
5. account actual statement/row/payload usage;
6. release unused reservations;
7. reject work when remaining budget cannot safely satisfy the contract;
8. return a bounded generic result.

No read path may bypass the budget ledger.

## 10. Budget laws

For every read execution:

```text
reserved + consumed + newly admitted work <= parent ceiling
```

Required hard limits:

```text
fanout
concurrency
D1 statements
rows read
payload bytes
wall-clock deadline
response items
```

For P07 single-target execution:

```text
actualFanout <= 1
```

If a future operation requires multi-shard reads, that capability requires an explicit contract extension and MUST NOT be inferred from P07.1.

## 11. Deadline semantics

The original execution deadline is authoritative.

Before D1 dispatch:

```text
now < deadline
```

If the deadline is expired, no D1 work may begin.

D1 work MUST NOT create a new deadline or extend the caller's deadline.

P07 does not retry a timed-out or failed read.

## 12. Failure matrix

| Condition | Required result |
|---|---|
| missing logical target | `READ_TARGET_MISSING` |
| invalid execution epoch | `CONTROL_EPOCH_INCOMPATIBLE` |
| fenced/expired placement | `CONTROL_EPOCH_FENCED` or `CONTROL_SNAPSHOT_EXPIRED` |
| missing/invalid read budget | `BUDGET_INVALID` |
| insufficient statement/row/payload budget | `BUDGET_EXCEEDED` |
| deadline expired before dispatch | `DEADLINE_EXCEEDED` |
| cache security binding invalid | `CACHE_BINDING_INVALID` or contract-defined miss |
| cache HIT and valid terminal permission | `CACHE_TERMINATED` |
| cache miss | continue to bounded D1 read |
| D1 read failure | `READ_EXECUTION_FAILED` |
| D1 read succeeds | `READ_EXECUTED` |
| downstream read failure | propagate bounded failure; no retry |

Errors MUST be safe and MUST NOT disclose physical topology.

## 13. Security invariants

P07 MUST enforce:

```text
tenant isolation
principal/authorization binding
operation allow-list
contract-version binding
cache security binding
payload bounds
budget bounds
deadline bounds
safe errors
no topology disclosure
```

A caller MUST NOT be able to alter the logical target, execution epoch, or budget after the upstream gate has approved them.

Cache state is untrusted input and MUST be validated before use.

## 14. Resource accounting invariants

For every terminal path, the evidence MUST show:

```text
requested budget
reserved budget
actual consumption
released unused reservation
D1 statement count
rows read
payload bytes
fanout
cache result
outcome
```

For cache termination:

```text
D1 statements = 0
rows read = 0
rows written = 0
```

For a rejected read before dispatch:

```text
D1 dispatch attempts = 0
```

No resource reservation may remain in-flight after terminal completion.

## 15. Concurrency / fan-out invariants

P07.1 consumes only the bounded work admitted by P06.

It MUST NOT:

```text
create one unbounded promise per input
use Promise.all(N) for unbounded work
expand fan-out beyond the scheduler contract
create hidden parallel D1 work
retry failed reads
```

Single-target P07.1 has no implicit parallelism.

## 16. Response contract

A successful response MUST contain only generic, bounded execution information and data permitted by the operation contract.

Minimum outcome classes:

```text
CACHE_TERMINATED
READ_EXECUTED
```

The response MUST NOT contain:

```text
physical D1 database ID
physical shard ID
SQL topology
internal Worker routing graph
control-plane internals
```

## 17. Test requirements

P07.1 MUST include deterministic tests for at least:

### Positive

```text
valid bounded D1 read
valid cache HIT with cacheTermination=true
valid cache miss continuing to D1
```

### Negative / failure

```text
missing target
invalid epoch
expired deadline
insufficient statement budget
insufficient row budget
payload budget exceeded
D1 failure without retry
```

### Security

```text
cross-tenant cache rejection
cross-principal cache rejection
cross-operation cache rejection
contract-version mismatch
expired cache
invalid/tampered cache binding
physical topology not exposed
```

### Resource

```text
cache HIT => zero D1 work
rejected request => zero D1 dispatch
reservation consumed/released correctly
no residual in-flight reservation
```

## 18. Forbidden implementation shortcuts

The implementation MUST NOT:

- use cache as an authorization bypass;
- trust caller-supplied physical shard/database identifiers;
- perform D1 before budget reservation;
- convert D1 failure into an automatic retry;
- hide additional D1 statements inside helper functions without accounting;
- create a second routing source of truth;
- silently use stale placement state;
- expose SQL or topology in errors;
- add business-specific query branches;
- add a new Worker merely to host cache or reads.

## 19. Change Manifest

```text
changeId: P07.1-READ-CACHE-TERMINATION
phaseId: P07
taskId: P07.1
contractIds: D1F-3.0-MASTER-v1.0
architectureIds: D1F-3.0-ARCH-v1.0
allowedFiles:
  - workers/v2/W02-Execution-Fabric/**
  - docs/phases/P07-READ-EXECUTION-CACHE-TERMINATION-v1.0.md
  - docs/phases/evidence/P07.1-EVIDENCE.md
  - .github/workflows/w02-p07-validation.yml
forbiddenFiles:
  - workers/v2/W01-Fabric-Gateway/**
  - workers/v2/W03-Write-Fabric/**
  - workers/v2/W04-Control-Plane/**
expectedBehavior:
  - bounded single-target read execution
  - cache HIT terminal path with zero D1 work
  - cache miss continues to approved D1 read
  - strict deadline and budget enforcement
  - no retry
  - no topology disclosure
resourceImpact:
  - bounded D1 statements
  - bounded rows read
  - bounded response payload
```

## 20. Evidence schema

`docs/phases/evidence/P07.1-EVIDENCE.md` MUST bind:

```text
phaseId
 taskId
contractId
architectureId
source files
changed files
test files and test IDs
implementation SHA
validation SHA
GitHub Actions run ID / job ID
npm ci result
npm run typecheck result
npm test result
npm run dry-run result
forbidden-capability scan result
cache HIT zero-D1 evidence
read budget accounting evidence
security test evidence
GPT independent review result
final result
```

No manual PASS is valid.

## 21. Acceptance thresholds

P07.1 is PASS only when all are true:

```text
npm ci = PASS
npm run typecheck = PASS
npm test = PASS
npm run dry-run = PASS
forbidden-capability scan = PASS
cache HIT => zero D1 = PASS
budget accounting = PASS
security cases = PASS
failure cases = PASS
scope/architecture gate = PASS
exact pushed SHA verified = PASS
GPT independent review = PASS
reproducible evidence committed = PASS
```

No performance/capacity claim is accepted in P07.1 without the numeric H07 qualification inputs. P15 owns full adversarial/performance qualification.

## 22. Mandatory STOP condition

After the P07.1 implementation, validation, exact pushed-SHA verification, and independent GPT review are complete:

```text
PASS → STOP
FAIL → fix only the identified contract-preserving defect → retest → re-review
```

Do NOT continue automatically to P08.

## 23. Authority

This packet is subordinate to `AGENTS.md` and `docs/D1-FABRIC-3.0-MASTER-CONTRACT-v1.0.md`.

If any conflict exists, STOP with `FAIL_CONTRACT_AUTHORITY` and do not implement until the authoritative contract is resolved.
