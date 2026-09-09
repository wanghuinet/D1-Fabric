# D1-Fabric 3.0 API Capability & Extreme Traffic Resilience Contract v1.0

**Status:** ACTIVE 3.0 CONTRACT ADDENDUM / IMPLEMENTATION GATE
**Parent contract:** `docs/D1-FABRIC-3.0-CONTRACT-v1.0.md`
**Scope:** Generic D1-Fabric middleware capability only
**Implementation agent:** DeepSeek
**Independent verification:** Worker verification pass
**Authority:** This document extends the 3.0 Contract. It does not authorize a new Worker topology, new storage system, queue, Durable Object, coordinator, or business logic in the Fabric kernel.

---

## 0. Purpose

D1-Fabric 3.0 must be capable of serving as a generic API execution substrate for application classes represented by large-scale social, video, content, search, game, commerce, and AI applications.

This contract is derived by reverse-engineering the **common infrastructure requirements** of those application classes, not by copying their proprietary business logic or architecture.

The goal is not to promise mathematically unlimited traffic or zero failures. The goal is stronger and testable:

> Within the declared platform limits, configured capacity, attack model, and dependency-availability assumptions, one API, user, tenant, hot object, shard, database, retry path, or malformed request must not be able to consume unbounded resources or cause uncontrolled global cascading failure.

The system must prefer **controlled rejection, bounded degradation, cache termination, isolation, and recovery** over unbounded execution.

---

# 1. Reverse-engineering principles from large application APIs

The following observations are treated as infrastructure design evidence, not as permission to implement those products' business semantics.

### 1.1 API operations have explicit resource cost

Large API platforms commonly distinguish operations by resource cost and quota. YouTube Data API, for example, assigns different quota costs to different operations and uses quotas to protect service quality; it also supports partial resources and ETags to reduce unnecessary transfer and processing. See official documentation:

- https://developers.google.com/youtube/v3/getting-started
- https://developers.google.com/youtube/v3/docs/videos/list

D1-Fabric therefore treats every production API operation as a **resource-bearing operation**, not as an unlimited function call.

### 1.2 Edge traffic protection is separate from application resource accounting

Cloudflare provides edge/WAF rate limiting and a Workers Rate Limiting API. These capabilities are useful for admission protection, but D1-Fabric must not assume that an edge limiter is an exact global billing or consistency counter.

References:

- https://developers.cloudflare.com/waf/rate-limiting-rules/
- https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/

D1-Fabric therefore requires both:

```text
Edge / perimeter protection
+
Fabric admission + resource accounting
```

### 1.3 Worker scalability does not imply unlimited D1 scalability

Cloudflare Workers scale across the global network, but each individual D1 database is inherently single-threaded. Excess concurrent work can queue and eventually return an overloaded error. D1 is explicitly designed to scale horizontally across multiple smaller databases.

Reference:

- https://developers.cloudflare.com/d1/platform/limits/

Therefore D1-Fabric must prevent Internet-scale concurrency from being converted into unbounded concurrency against a single D1 database.

---

# 2. API Capability Completeness Contract

Every production API operation that uses D1-Fabric must be representable by the following generic capability envelope:

```text
Authentication / caller identity
        ↓
Authorization
        ↓
Tenant / application isolation
        ↓
Input contract validation
        ↓
Admission control
        ↓
Rate / quota decision
        ↓
Idempotency decision where applicable
        ↓
Resource budget admission
        ↓
Cache / early termination
        ↓
Bounded planning
        ↓
Bounded execution
        ↓
Bounded retry / deadline
        ↓
Failure / degradation policy
        ↓
Result shaping / pagination
        ↓
Resource accounting + trace
```

A production API is **CAPABILITY-INCOMPLETE** if any mandatory generic boundary is bypassed without an explicit contract exemption.

The Fabric does not implement application business semantics such as posts, videos, comments, recommendations, products, orders, game inventories, or AI agents. It provides the generic execution controls required by those application APIs.

---

# 3. API operation contract

Every operation must declare or inherit:

```text
operation_id
contract_version
caller_scope
tenant_scope
resource_class
request_bytes_limit
response_bytes_limit
max_batch_items
pagination_mode
max_page_size
max_fanout
max_concurrency
statement_budget
rows_read_budget
rows_write_budget
retry_budget
deadline_budget
cache_policy
cache_termination
idempotency_policy
consistency_policy
failure_policy
degradation_policy
observability_policy
```

No production operation may inherit an unlimited value.

If a field is not applicable, the contract must explicitly say `none`/`disabled`; omission must not mean unlimited.

---

# 4. Admission Control

Admission is a first-class execution state and occurs before expensive downstream work.

Conceptually:

```text
request
  ↓
identity/security check
  ↓
admission
  ├── reject
  ├── cache terminal
  └── continue
```

Admission decisions may consider:

- caller identity;
- tenant/application;
- API operation;
- configured rate limit;
- quota;
- request size;
- concurrency budget;
- resource budget;
- current overload state;
- deadline feasibility;
- security/risk signal when supplied by the surrounding platform.

Admission must fail closed for security-critical resource boundaries when required by the contract.

Admission must never invoke D1 merely to decide that a request should be rejected.

---

# 5. Rate limit and quota separation

3.0 must distinguish:

```text
Rate limit = short-window request admission control
Quota      = longer-window resource allocation / usage budget
```

Both may be scoped by:

```text
platform
tenant
application
API operation
caller
credential
resource/object
```

A single global counter must not be required for all requests.

The contract must permit layered controls so one noisy tenant cannot exhaust another tenant's budget.

External edge rate limiting may provide coarse protection. Fabric quota accounting owns the middleware resource contract.

---

# 6. Resource-class / quota-cost model

Each operation must have a declared resource class or cost profile.

Example conceptual classes:

```text
READ_SMALL
READ_LIST
READ_FANOUT
WRITE_SINGLE
WRITE_BATCH
SEARCH_LIKE
HOT_OBJECT_READ
ASYNC_SUBMIT
```

These are generic resource classes, not application endpoints.

The implementation must not hard-code product-specific names such as `youtube`, `tiktok`, `toutiao`, `baidu`, `game`, or `commerce` into the kernel.

A quota cost may be composed from:

```text
request cost
+ estimated D1 statement cost
+ estimated row-read cost
+ estimated row-write cost
+ fanout cost
+ downstream concurrency cost
```

Actual usage must be accounted after execution where measurable. Admission must use conservative declared/estimated cost when exact cost is not yet known.

---

# 7. Pagination and result bounding

Unbounded offset pagination is prohibited for production high-volume paths unless a specific contract proves it safe.

Preferred model:

```text
cursor + bounded page size
```

Every list operation must define:

```text
pagination_mode
max_page_size
max_cursor_size
maximum returned rows
```

The server must enforce the maximum even when the client requests a larger value.

Cursor contents must not expose physical D1/shard topology.

A malformed, oversized, expired, or incompatible cursor must terminate before expensive fanout.

---

# 8. Payload and structural-abuse protection

The Fabric boundary must enforce finite limits for:

```text
request bytes
header bytes where applicable
field bytes
array items
batch items
nested structure depth
cursor bytes
response items
```

The implementation must not parse or materialize an unbounded collection merely to reject it later.

Where platform limits are stricter than the Fabric contract, the platform limit wins.

---

# 9. Fanout attack protection

A client must not be able to transform one logical API request into uncontrolled physical work.

Required invariant:

```text
actual_fanout <= operation_fanout_budget <= parent_fanout_budget
```

Logical fanout and physical concurrency must remain distinct.

No unbounded `Promise.all()` or equivalent fanout pattern is permitted.

A request that exceeds its fanout budget must be rejected or degraded according to its contract; it must not silently expand the budget.

---

# 10. Hot-object protection

High-volume reads against the same logical object must not create an uncontrolled thundering herd against D1.

For cacheable operations:

```text
request
  ↓
cache
  ├── HIT → terminal response
  └── MISS
        ↓
bounded miss coordination
        ↓
bounded D1 execution
```

Where the architecture provides a single-flight/coalescing mechanism, it must have a finite wait/participant budget and must not become a mandatory global coordinator.

If no such mechanism is authorized by the architecture, the implementation must still enforce bounded downstream concurrency and may reject excess misses rather than multiplying D1 load.

A cache HIT with `cacheTermination=true` must remain:

```text
0 D1
0 database fanout
```

---

# 11. Retry amplification protection

Retries must be budgeted as resource consumption.

Required relationship:

```text
retry work <= retry budget
retry work <= remaining deadline budget
retry work <= remaining statement/row/fanout budgets
```

Retry eligibility must be explicit by operation type and error class.

Writes must not be blindly retried without idempotency protection.

A retry must never reset the original request's resource budget.

Backoff must not create an unbounded delayed retry population.

---

# 12. Idempotency contract

Retryable mutation operations must define one of:

```text
idempotency key
natural unique operation identity
explicitly non-retryable
```

An idempotency mechanism must define:

```text
key scope
key lifetime
request fingerprint
result replay behavior
conflict behavior
storage ownership
failure behavior
```

The Fabric kernel must not invent business meaning for an idempotency key.

---

# 13. Noisy-neighbor isolation

The following scopes must be independently budgetable where the deployment contract requires it:

```text
application
tenant
caller
credential
API operation
resource/object
```

One scope exhausting its budget must not automatically consume another scope's reserved capacity.

At minimum, overload behavior must distinguish:

```text
local operation overload
local tenant overload
global Fabric overload
D1/shard overload
```

The implementation must not introduce a global synchronous coordinator merely to enforce this separation.

---

# 14. D1 overload protection

D1-Fabric must treat D1 overloaded responses as a controlled failure state, not as permission to retry indefinitely.

When a D1 target is overloaded:

```text
stop expansion
→ consume no new fanout
→ respect deadline
→ bounded retry only if explicitly eligible
→ degrade/reject according to operation contract
```

The system must never convert D1 overload into retry amplification.

The shard/router contract must allow healthy targets to continue serving when one target is overloaded, subject to consistency and placement rules.

---

# 15. Backpressure

Backpressure is mandatory for every path that can create downstream concurrency.

The implementation must have a finite bound for:

```text
queued work
in-flight work
fanout
concurrency
retry population
batch size
response accumulation
```

When a bound is reached, the contract must define one of:

```text
reject
partial/degraded response
cache response
shed optional work
return overload
```

The system must not hide backpressure by allocating unbounded memory or promises.

---

# 16. Graceful degradation

Every high-volume read path must declare whether it can degrade.

Permitted generic degradation mechanisms include:

```text
cache response
partial result
stale-but-valid result
omit optional enrichment
reduce page size
shed optional fanout
reject expensive request
```

Writes must not be silently converted into partial success merely to preserve availability.

If degradation is not semantically safe, the operation must reject rather than return misleading data.

---

# 17. Async boundary

Operations whose work cannot safely fit within the synchronous request budget may expose an asynchronous application contract.

The generic Fabric contract may support:

```text
submit → operation_id → poll/status/result
```

but 3.0 does **not** authorize the Fabric kernel to introduce a new queue, scheduler service, Durable Object, or business job system merely to implement this interface.

The business/application layer owns the job semantics. Fabric only enforces generic request/resource/security contracts where it participates.

---

# 18. Security abuse model

The adversarial test model must include at least:

```text
request flood
credential flood
large payload
large batch
oversized page
invalid cursor
cursor replay/abuse
fanout amplification
hot-key amplification
retry amplification
idempotency abuse
noisy-neighbor exhaustion
slow dependency
D1 overload
partial shard failure
cache stampede
malformed input
unexpected concurrency spike
```

Tests must demonstrate bounded resource consumption for each applicable class.

The goal is not to simulate every possible Internet attack. The goal is to prove that the Fabric execution contract cannot be converted into an unbounded resource amplifier through ordinary API misuse.

---

# 19. Failure containment model

The following containment hierarchy is mandatory:

```text
Request
  ↓
Operation
  ↓
Tenant/Application
  ↓
Shard/Database target
  ↓
Worker execution boundary
  ↓
Fabric global state
```

Failure should be contained at the smallest applicable scope.

A local failure must not automatically invalidate unrelated healthy scopes.

Global failure may still occur due to platform-wide or dependency-wide outages; the contract must define the observable failure mode rather than claiming impossible zero downtime.

---

# 20. Capacity envelope

Every production deployment must define an explicit capacity envelope.

At minimum:

```text
requests/sec target
requests/sec burst target
concurrent requests
max fanout
max downstream concurrency
max statements/request
max rows read/request
max rows write/request
max request bytes
max response items
max retry work
max queued work
```

The envelope is a contract, not a performance promise for arbitrary future hardware or Cloudflare limits.

Capacity tests must prove behavior at:

```text
1× expected
2× expected
5× expected
10× expected
```

and, where test infrastructure permits, an explicit saturation point.

The acceptance criterion at saturation is **bounded degradation**, not infinite throughput.

---

# 21. Extreme traffic acceptance model

The system must be tested using an adversarial traffic matrix.

| Scenario | Expected result |
|---|---|
| Normal load | normal service |
| Burst | bounded latency/resource growth |
| 10× burst | admission/backpressure/degradation |
| Hot object | cache/bounded miss load |
| One noisy tenant | tenant isolation |
| One overloaded shard | localized degradation |
| D1 overloaded | bounded rejection/degradation, no retry storm |
| Invalid oversized request | early rejection |
| Huge batch | bounded rejection |
| Fanout abuse | hard fanout ceiling |
| Retryable failure | bounded retry work |
| Non-idempotent write failure | no blind retry |
| Cache stampede | bounded database amplification |
| Partial read failure | contract-defined partial/degraded result |
| Global dependency failure | controlled error, no cascading amplification |

---

# 22. API surface completeness matrix

Before a 3.0 release candidate, the verification pass must classify representative API patterns from at least these application classes:

```text
Social / microblog
Video / media
News / feed
Search / discovery
Game / realtime-ish state
Commerce / transaction
AI / agent workflow
```

For each class, verify at least:

```text
single-object read
list/feed read
single mutation
batch mutation
hot-object read
paginated read
async operation
idempotent retry
authorization failure
quota/rate rejection
```

This is a **capability coverage test**, not a requirement to implement those businesses inside Fabric.

---

# 23. API anti-patterns explicitly forbidden

The following are contract violations unless separately authorized:

```text
unbounded fanout
unbounded Promise.all
unbounded retry
retry resets budget
D1 query before admission rejection
offset pagination without bounded proof
unbounded request body parsing
unbounded batch
single global quota counter for all tenants
business-specific branches in kernel
physical shard IDs in public API
cache miss stampede into D1
blind retry of writes
synchronous global coordinator for every request
```

---

# 24. Observability requirements

Every rejected, degraded, or overloaded execution must be attributable to a bounded reason code.

Minimum conceptual reason classes:

```text
RATE_LIMITED
QUOTA_EXCEEDED
ADMISSION_REJECTED
REQUEST_TOO_LARGE
PAGE_LIMIT_EXCEEDED
FANOUT_LIMIT_EXCEEDED
CONCURRENCY_LIMIT_EXCEEDED
D1_OVERLOADED
DEADLINE_EXCEEDED
RETRY_BUDGET_EXCEEDED
IDEMPOTENCY_CONFLICT
DEPENDENCY_UNAVAILABLE
DEGRADED
```

Observability must not itself become an unbounded synchronous dependency.

---

# 25. Contract-to-test mapping

Every requirement in this addendum must map to at least one test or explicit architectural evidence item.

Required test classes:

```text
unit
contract
property
adversarial
concurrency
resource-budget
failure-injection
regression
architecture-boundary
```

Where practical, property tests must prove monotonicity:

```text
input demand ↑
→ admitted work does not exceed configured ceiling
```

and budget conservation:

```text
child work sum <= parent budget
```

---

# 26. DeepSeek implementation phase

DeepSeek must implement this addendum in one explicit assigned phase without inventing application business features.

Execution order:

```text
READ parent 3.0 Contract
→ READ this API Resilience Contract
→ inspect current W01-W04 implementation
→ map every requirement to existing owner
→ identify missing capability only
→ implement generic capability
→ add/update tests
→ run typecheck/build
→ run contract tests
→ run adversarial tests
→ run concurrency/resource tests
→ run regression tests
→ inspect diff
→ verify Worker file/package format
→ commit
→ PUSH TO GITHUB
→ report exact commit SHA + evidence
→ STOP
```

DeepSeek must not create a new Worker just because a capability is missing.

If the current architecture cannot satisfy a requirement without changing Worker ownership, storage topology, or public semantics, DeepSeek must STOP and report:

```text
ARCHITECTURE_CHANGE_REQUIRED
```

It must not silently redesign the architecture.

---

# 27. Required file format for implementation

All runtime implementation must remain TypeScript Worker code under the existing Worker boundaries.

Expected forms include:

```text
workers/v2/w01-fabric-gateway/src/*.ts
workers/v2/w02-execution-fabric/src/*.ts
workers/v2/w03-write-fabric/src/*.ts
workers/v2/w04-control-plane/src/*.ts
workers/v2/contracts/*.ts
```

Tests remain in the qualifying Worker `tests/` directory or explicitly shared contract-test location.

Do not implement runtime behavior as `.ps1`, shell scripts, notebook code, or generated one-off scripts.

PowerShell may be used only as an operator convenience script if separately authorized; it is never a substitute for the Worker implementation or tests.

---

# 28. GitHub push and Worker verification gate

The required lifecycle is immutable:

```text
DeepSeek implementation
        ↓
DeepSeek verification
        ↓
commit
        ↓
PUSH TO GITHUB
        ↓
exact commit SHA
        ↓
STOP
        ↓
Worker fetches exact pushed commit
        ↓
independent contract verification
        ↓
architecture/boundary audit
        ↓
adversarial/resource/security verification
        ↓
contract-preserving refactor if necessary
        ↓
final PASS / FAIL evidence
```

Worker verification must test the pushed repository state, not an unpushed local tree.

A Worker refactor must preserve:

```text
API semantics
resource ceilings
security boundaries
consistency guarantees
Worker ownership
shard semantics
public compatibility
```

Any violation becomes FAIL.

---

# 29. Zero-downtime claim policy

The project must never use the phrase **“guaranteed never to go down”** as a technical acceptance criterion.

The enforceable criterion is:

> **No uncontrolled cascading failure caused by an API-level resource amplifier within the declared capacity and attack envelope.**

A platform-wide Cloudflare outage, D1 platform outage, account suspension, network partition outside the system's control, or other external catastrophic dependency failure must be represented as an external availability assumption, not hidden as a Fabric defect.

---

# 30. Definition of Done for this addendum

This addendum is implemented only when:

```text
API capability matrix PASS
+ admission control PASS
+ rate/quota boundaries PASS
+ pagination bounds PASS
+ payload bounds PASS
+ fanout bounds PASS
+ hot-object protection PASS
+ retry amplification protection PASS
+ idempotency protection PASS
+ noisy-neighbor isolation PASS
+ D1 overload containment PASS
+ backpressure PASS
+ graceful degradation PASS
+ async boundary contract PASS where applicable
+ adversarial test matrix PASS
+ resource conservation PASS
+ security tests PASS
+ regression PASS
+ architecture ↔ contract audit PASS
+ DeepSeek push SHA recorded
+ Worker independent verification PASS
```

No known defect may remain in the implementation boundary.

Unknown defects are not claimed to be impossible; the evidence must support the stated capacity and attack envelope.

---

# 31. Final operating law

D1-Fabric 3.0 is not complete because it can execute an API under normal load.

It is complete only when it can answer, with a bounded contract and evidence:

```text
What is this API allowed to consume?
Who is allowed to consume it?
How much can one request consume?
How much can one tenant consume?
What happens at 10× demand?
What happens at saturation?
What happens when a shard is overloaded?
What happens when D1 is overloaded?
What happens when cache is cold?
What happens when cache is hot?
What happens when retry starts amplifying?
What happens when the request is maliciously large?
What happens when fanout is abused?
What happens when a write is retried?
What happens when one tenant becomes noisy?
What happens when a dependency fails?
What work is rejected before D1?
What work can terminate at cache?
What work may degrade?
What work must fail rather than lie?
Can the resource budget be proven conserved?
Can the exact pushed commit be independently verified?
```

If any answer is undefined, the relevant API capability is not production-complete.
