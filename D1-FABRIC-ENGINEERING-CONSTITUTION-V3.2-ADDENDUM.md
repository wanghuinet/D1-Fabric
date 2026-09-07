# D1-Fabric Engineering Constitution v3.2 Addendum

**Project:** D1-Fabric  
**Base:** v3.0 + v3.1 Addendum  
**Status:** MANDATORY  
**Purpose:** Close the remaining concurrency, overload, failure, capacity, and proof gaps before further capability expansion.

---

## 0. Authority

This addendum is normative. For topics covered here, v3.2 governs over v3.0/v3.1. It does not authorize new product scope by itself.

**Effective Constitution:** v3.0 + v3.1 + v3.2.

---

## 1. Non-Negotiable System Invariants

The following invariants are mandatory:

```text
I-01 No global coordinator is mandatory on the data-plane hot path.
I-02 Every mutable state has exactly one authoritative owner.
I-03 Every retryable operation has explicit idempotency semantics.
I-04 Retry MUST NOT amplify overload.
I-05 Shard ownership MUST be unambiguous for a routing epoch.
I-06 Routing decisions MUST be versioned/fenced where migration can race with traffic.
I-07 No request may cause unbounded D1 I/O.
I-08 No queue may grow without bounded admission/backpressure policy.
I-09 No single shard may be an unavoidable global bottleneck.
I-10 Partial failure MUST NOT corrupt committed state.
I-11 Recovery MUST restore routing/state invariants before normal traffic resumes.
I-12 Every scalability claim MUST have reproducible evidence.
```

A capability that cannot prove applicable invariants is **NOT PASS**.

---

## 2. Hot-Path Contract

Every production request path MUST declare a budget for:

```text
network hops
D1 reads
D1 writes
cross-shard operations
coordination calls
cache operations
serialization/deserialization
retries
```

The implementation MUST use the smallest necessary sequence. Any unbounded loop, fan-out, retry chain, or hidden storage access is prohibited on a critical hot path.

A benchmark or review MUST identify actual operations, not only source-level intent.

---

## 3. Concurrency Contract

Each capability MUST define:

```text
parallelism boundary
per-shard concurrency behavior
shared mutable state
serialization points
lock/queue behavior, if any
maximum intended in-flight work
idempotency behavior under duplicate execution
```

Concurrency correctness MUST be tested at the boundary where contention occurs. A single-request unit test is insufficient evidence for concurrency safety.

Prefer shard-local parallelism and independent work. Avoid global locks and global queues unless explicitly justified and bounded.

---

## 4. Admission, Backpressure, and Overload

D1-Fabric MUST fail predictably under overload rather than accumulate unbounded work.

Every queue, batch, retry mechanism, and fan-out operation MUST have:

```text
bounded capacity
admission rule
backpressure behavior
timeout/deadline
retry policy
load-shed behavior
observable rejection signal
```

When capacity is exceeded, the system MUST prefer bounded rejection/degradation over uncontrolled latency growth or memory growth.

Retries MUST include a bound and MUST NOT turn one failed request into an unbounded amplification event.

---

## 5. D1 I/O Budget

D1 is a constrained persistence substrate, not an unlimited coordination mechanism.

Each hot-path capability MUST declare an expected D1 operation budget per logical request or batch.

The budget MUST distinguish:

```text
read count
write count
rows touched
batch size
transaction count
cross-shard amplification
retry amplification
```

Any design whose worst-case D1 work grows without a declared bound is BLOCKED until redesigned.

Where batching, caching, denormalization, or shard-local state can safely remove repeated D1 work, the simpler lower-I/O design is preferred.

---

## 6. Hot-Shard Protection

The architecture MUST assume skewed traffic, not only uniform traffic.

Capacity analysis MUST include:

```text
uniform workload
single-key hotspot
hot shard
hot partition
bursty workload
read-heavy workload
write-heavy workload
mixed workload
```

A system is not considered horizontally scalable merely because additional shards can be created. The design must demonstrate that traffic concentration does not create an unavoidable bottleneck.

Hotspot mitigation MUST preserve ownership and consistency invariants.

---

## 7. Consistency and Commit Semantics

Every mutable capability MUST explicitly define:

```text
consistency model
commit point
visibility point
duplicate behavior
ordering requirement
lost-update behavior
partial-failure behavior
recovery behavior
```

The system MUST NOT use vague terms such as "eventually consistent" as a substitute for an operational contract.

If ordering is required, the ordering domain MUST be explicit: request, key, shard, partition, or global.

---

## 8. Failure and Recovery Contract

Every stateful capability MUST define behavior for at least:

```text
D1 timeout
D1 transient failure
Worker restart
duplicate request
partial batch failure
stale routing metadata
concurrent topology change
cache loss
network failure
recovery after interruption
```

Recovery MUST be idempotent and MUST converge to a valid state without manual data repair in the normal failure model.

The normal request path MUST NOT depend on an unavailable control-plane operation merely to prove that recovery is possible.

---

## 9. Epoch / Fencing Rule

Any topology or ownership change that can race with traffic MUST have a monotonic version, epoch, generation, or equivalent fencing mechanism.

A stale actor MUST NOT be able to commit state after ownership has moved unless the contract explicitly permits it and proves safety.

Migration is not complete when metadata changes; it is complete only when ownership, in-flight work, reads, writes, and recovery semantics satisfy the new epoch contract.

---

## 10. Capacity Envelope

Every release-capable system MUST publish a measurable capacity envelope rather than a single maximum number.

Minimum dimensions:

```text
concurrency
requests/sec
payload size
dataset size
shard count
D1 operations/request
p50 latency
p95 latency
p99 latency
error/rejection rate
```

Capacity claims are workload-specific. No benchmark result may be generalized into an unconditional system-wide capacity claim.

---

## 11. Failure Budget

Reliability targets MUST be measurable.

For each critical capability, define applicable limits for:

```text
allowed error rate
allowed timeout rate
maximum retry amplification
maximum recovery duration
maximum stale-routing window
maximum queue depth
maximum acceptable latency degradation
```

A capability that has no explicit failure budget cannot be classified as production-ready.

---

## 12. Chaos / Soak Gate

Before a production-capable release, applicable capabilities MUST survive bounded fault injection and sustained workload testing.

Minimum test classes:

```text
steady load
burst load
sustained load
hot-key skew
D1 failure/timeout simulation
Worker restart
duplicate delivery
partial operation failure
routing/topology change during traffic
```

The objective is not to prove that failure never occurs. It is to prove that failure remains bounded, observable, recoverable, and non-corrupting.

---

## 13. Proof-of-Scale Gate

Scaling claims require reproducible evidence containing at least:

```text
commit/version
runtime version
configuration
schema/index state
dataset generator/version
workload definition
concurrency
duration
warm/cold state
shard count
D1 I/O counts
latency distribution
error/rejection counts
resource observations
```

A screenshot, anecdotal successful request, or source inspection is not proof of scale.

---

## 14. Verification Classification

Every robustness property MUST be classified as one of:

```text
PROVEN      reproducible runtime evidence exists
PARTIAL     evidence covers only part of the contract
UNPROVEN    design exists but runtime proof is absent
FAILED      evidence contradicts the contract
NOT_APPLICABLE
```

`UNPROVEN` MUST NOT be silently converted to PASS.

---

## 15. AI Development Enforcement

Before coding a non-trivial change, the AI MUST produce internally or in the development record:

```text
Hot path
Authoritative state owner
Concurrency boundary
D1 I/O budget
Failure matrix
Recovery path
Overload behavior
Scaling boundary
Applicable invariants
Verification plan
```

The AI MUST inspect existing implementation before inventing a design. It MUST NOT assume that documentation equals implementation.

If the existing implementation cannot satisfy an applicable v3.2 invariant, the AI MUST STOP rather than patch around the violation.

---

## 16. No Patch-Piling Rule

A defect in architecture MUST NOT be addressed by accumulating local conditionals, retries, wrappers, or compatibility branches that obscure the ownership model.

If two or more patches are required to preserve the same invariant, the team MUST reassess the underlying design before adding further complexity.

Prefer one structural correction over multiple compensating patches.

---

## 17. Release Gate

A capability may enter `RELEASE_READY` only if:

```text
applicable invariants = PROVEN
hot-path budget = measured
D1 I/O budget = measured
concurrency = tested
failure/recovery = tested
backpressure/overload = tested
hotspot behavior = tested where applicable
capacity envelope = recorded
regression = PASS
evidence = reproducible
```

Missing evidence means `BLOCKED`, not `RELEASE_READY`.

---

## 18. Scope Protection

v3.2 is a robustness and engineering-quality gate. It does NOT authorize A08+ feature development or increase module/Worker count.

The priority order remains:

```text
correctness
→ data integrity
→ deterministic ownership
→ bounded concurrency
→ bounded D1 I/O
→ overload safety
→ recovery
→ performance
→ cost
→ feature expansion
```

**World-class status is earned by reproducible engineering evidence, not by architectural complexity or marketing claims.**
