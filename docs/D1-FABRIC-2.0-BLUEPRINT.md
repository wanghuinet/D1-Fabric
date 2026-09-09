# D1-Fabric 2.0 Blueprint

**Status:** APPROVED ARCHITECTURE BASELINE
**Scope:** middleware only; no business semantics
**Long-term position:** designed so the architecture can remain relevant for ~5 years while implementation evolves continuously

## 1. Mission

D1-Fabric 2.0 is an Edge/Serverless data-execution fabric built by adapting production-proven distributed-systems ideas to Cloudflare Workers + D1 + AI-generated applications.

The design rule is strict: do not invent a distributed-systems primitive without an established industrial basis. Innovation is limited to small, measurable adaptations for Edge, D1 resource limits, and AI-native contracts.

The long-term objective is **not** to freeze today's D1 topology for five years. It is to create a stable execution abstraction above changing storage and compute primitives.

## 2. Why developers should use D1-Fabric

D1-Fabric must provide a capability that is difficult and expensive for an individual application team to reproduce correctly:

> **The developer writes what data operation is required; Fabric controls how much infrastructure the operation is allowed to consume, where it executes, how it degrades, and when it must stop.**

This creates a strong developer value proposition:

1. **Developers do not need to become distributed-systems experts.** Sharding, fan-out limits, retries, deadlines, cache termination, placement, replica selection, and resource accounting are infrastructure concerns owned by Fabric.
2. **AI-generated applications get a safety boundary.** AI can generate an operation contract, but cannot freely invent physical databases, unlimited fan-out, arbitrary retries, or hidden internal Worker calls.
3. **Performance is bounded by design.** Every production operation carries explicit resource budgets instead of relying on optimistic application code.
4. **Costs become part of execution semantics.** D1 statement, rows-read, rows-write, fan-out, retry, and downstream concurrency budgets can be measured and enforced.
5. **Failure handling is standardized.** Applications do not each implement their own retry, timeout, degradation, and partial-result rules.
6. **The application is insulated from infrastructure evolution.** Logical data placement is separated from physical storage, allowing the underlying Cloudflare data capabilities to evolve without forcing every application to redesign its data layer.
7. **The common path can remain extremely small.** Cache termination, exact-shard execution, and bounded plans avoid unnecessary Worker hops and D1 work.
8. **Production evidence is part of the product.** A capability is not considered complete merely because code compiles; it must have contract tests, adversarial tests, resource-accounting evidence, failure evidence, and performance/cost measurements.

The intended developer experience is therefore:

`Application / AI → Fabric Contract → Fabric Execution → Result`

rather than:

`Application → custom shard logic + custom retry logic + custom cache logic + custom quota logic + custom failure handling → database`

## 3. Why developers should feel it will not become obsolete quickly

D1-Fabric does **not** claim that today's implementation will remain unchanged for five years. The architectural claim is stronger and more realistic:

> **The stable part is the execution contract and resource-governance model; the replaceable part is the storage, placement, cache, replica, and execution implementation underneath it.**

The architecture is therefore deliberately divided into long-lived abstractions and replaceable mechanisms.

### 3.1 Long-lived abstractions

These are expected to remain useful even as infrastructure changes:

- Data Contract
- Admission and QoS
- Resource budgets
- Execution planning
- Concurrency scheduling
- Deadline enforcement
- Retry budgets
- Failure isolation
- Cache consistency policy
- Logical shard identity
- Placement abstraction
- Primary/replica consistency semantics
- Result merge and termination
- Trace/resource accounting
- Last-known-good control state

These represent persistent distributed-system problems rather than temporary Cloudflare product features.

### 3.2 Replaceable mechanisms

These must remain implementation details behind the Fabric contract:

- exact number of logical shards
- exact number of physical databases
- D1 primary/replica topology
- cache technology and hierarchy
- placement algorithm
- storage adapter
- Worker runtime details
- future Cloudflare database/storage capabilities

Therefore the architecture must never permanently encode `64 logical shards / 8 physical D1 databases` as the definition of D1-Fabric 2.0. That configuration may be a deployment profile, not the architectural identity.

## 4. Industrial basis → Fabric micro-innovation

| Proven idea | Fabric adaptation | Required evidence |
|---|---|---|
| Distributed sharding/routing | Stable logical→placement contract | deterministic mapping tests |
| Query planning | Bounded execution planner / compiler | plan snapshots + adversarial tests |
| Resource quotas/admission control | Multi-level request resource budgets | sum-of-budgets invariants |
| Multi-level caching | Cache termination + explicit consistency policy | cache-hit zero-D1 evidence |
| Distributed top-k/merge | Global limit with bounded per-shard allocation | rows-read upper bound |
| Deadlines/retries/isolation | Execution Guard + retry budget | deadline/failure/retry tests |
| Schema/API contracts | Fabric Data Contract | schema validation |
| SRE observability | Fabric Trace + resource accounting | per-request accounting |
| IDL/tooling | AI-readable Data Contract | generated-call validation |
| Load shedding / backpressure | Admission + bounded scheduler + degradation | overload tests |
| Workload isolation | tenant/operation/shard budgets + hotspot protection | noisy-neighbor tests |
| Primary/replica consistency | consistency-aware placement and bookmark propagation | read-after-write tests |
| Disconnected/edge operation | last-known-good control state | control-plane outage tests |

The innovation principle remains **adaptation, not invention**: use established distributed-systems patterns, then optimize their composition for Edge, D1 constraints, cost visibility, and AI-generated workloads.

## 5. Runtime planes

2.0 uses four runtime boundaries, not one Worker per feature:

- W01 Fabric Gateway: request normalization, contract selection, admission entry, response envelope.
- W02 Execution Fabric: plan compilation, plan cache, scheduling, routing, bounded fan-out, read cache, budget enforcement, retry budget, hotspot protection, merge, termination, execution trace.
- W03 Write Fabric: idempotent write admission, primary-targeted writes, write budget, atomicity/error semantics, write-side consistency coupling.
- W04 Control Plane: placement metadata, contract versions, capacity policy, recovery state, configuration publication, and last-known-good snapshots.

Cache is a capability of the read execution path, not a mandatory standalone network hop. Observability is emitted by the executing boundary, not a synchronous telemetry Worker.

No additional Worker is justified merely because a concept has a separate name. New runtime boundaries require evidence of an actual deployment, isolation, scaling, or failure-domain benefit.

## 6. Core execution contract

Every operation must declare, directly or through a versioned contract:

- operation identity
- shard key / routing rule
- maximum fan-out
- maximum downstream concurrency
- tenant budget
- operation budget
- request budget
- shard budget
- statement budget
- rows-read budget
- rows-write budget
- deadline
- consistency mode
- primary/replica eligibility
- bookmark/session policy where applicable
- cache policy
- cache TTL/version/stale policy
- cache-termination policy
- failure policy
- degradation policy
- retry policy
- retry budget

No unbounded value is legal on a production execution path.

## 7. Budget law

For every execution:

`sum(shard_rows_budget) <= global_rows_budget`

`sum(shard_write_budget) <= global_write_budget`

`sum(statement_budget) <= global_statement_budget`

`actual_fanout <= global_fanout_budget`

`actual_downstream_concurrency <= scheduler_concurrency_budget`

`actual_retries <= retry_budget`

The planner may allocate uneven budgets; it must never exceed the global contract.

Budgets are hierarchical:

`tenant → operation → request → shard`

A lower-level allocation can never override a higher-level ceiling.

## 8. Execution Scheduler and overload protection

Logical fan-out and physical concurrency are different concepts. The scheduler must not equate `fanout=N` with `Promise.all(N)`.

The scheduler must:

- cap concurrent downstream database work;
- execute bounded waves when fan-out exceeds concurrency capacity;
- account for deadline consumption;
- stop work when the result is already sufficient;
- apply admission/backpressure before overload propagates;
- isolate noisy tenants and hot shards;
- refuse work when the remaining budget cannot satisfy the operation contract.

This makes the execution layer a **resource scheduler**, not merely a request router.

## 9. Adaptive execution

The planner must prefer the smallest execution plan that can satisfy the operation:

`cache-hit → terminate`

`exact shard → single-shard execution`

`bounded multi-shard → scheduled bounded fan-out`

`read-replica eligible → consistency-aware replica execution`

`result satisfied → terminate remaining work`

`unsupported/unbounded → reject`

Fan-out is a cost, not a default behavior.

## 10. Cache termination and consistency

A cache hit is an execution termination point. A successful hit must not invoke D1, shard fan-out, or downstream database RPCs.

However, zero-D1 execution is valid only when the cache contract permits it. Cache policy must explicitly define:

- TTL;
- version/validation token;
- consistency mode;
- stale-read policy;
- invalidation/write coupling;
- whether stale data may be returned under degradation.

The goal is not simply a high cache-hit ratio. The goal is **correctly terminating expensive execution as early as possible**.

## 11. Read replicas and consistency

D1-Fabric must treat primary and replica storage as placement roles rather than hard-coded database identities.

Reads may use replicas only when the operation's consistency contract permits it. Writes target the primary. Where sequential consistency/read-after-write semantics require it, the execution plan must propagate the appropriate session/bookmark state.

This prevents 2.0 from being coupled to a single-generation D1 topology and allows future Cloudflare storage capabilities to fit behind the same placement abstraction.

## 12. Hot-shard and noisy-neighbor protection

A stable logical shard mapping alone does not solve production hotspots. 2.0 must protect the system before attempting complex live migration.

Required capabilities:

- per-shard admission and throttling;
- hotspot detection signals;
- tenant isolation;
- cache preference where semantically valid;
- bounded degradation;
- blast-radius containment;
- versioned placement metadata.

Live shard migration/clone is not a mandatory 2.0 primitive. The placement contract must remain extensible so migration can be introduced later when operational evidence justifies it.

## 13. Retry budget and failure semantics

`maxRetries` is not sufficient by itself. A retry must consume a finite retry budget and the original request's deadline/resource budget.

Retry policy must support:

- bounded retry count;
- bounded retry resource budget;
- deadline-aware cancellation;
- exponential backoff with jitter;
- downstream-health-aware retry suppression;
- idempotency requirements for retryable writes;
- protection against retry storms.

Failure behavior is explicit per operation: strict, partial, or controlled degradation. Partial failure may never create a partially committed write.

## 14. Last-known-good control state

W02 must not become unusable merely because W04 is temporarily unavailable.

Control configuration must be:

- versioned;
- validated before activation;
- immutable for an execution epoch;
- locally usable after publication;
- recoverable as a last-known-good snapshot.

During temporary control-plane disruption, execution may continue under the last validated safe policy until its validity window or safety rules require rejection.

This is especially important for edge/serverless environments where connectivity and control-plane availability cannot be assumed to be perfect.

## 15. AI-native contract

AI-generated data operations must be validated against the same contract used at runtime. AI is not trusted to invent:

- shard topology;
- physical D1 identifiers;
- unlimited fan-out;
- arbitrary retry behavior;
- internal Worker call graphs;
- resource ceilings.

AI should generate **intent and a bounded data contract**. Fabric decides whether and how that intent can execute.

This creates a durable boundary between fast-changing AI application generation and the slower-changing infrastructure safety model.

## 16. Why this remains relevant as AI changes application development

Traditional applications usually have human-written data access paths. AI-generated applications can create large numbers of new data operations quickly, and those operations may be poorly optimized or unexpectedly expensive.

D1-Fabric turns the middleware into a common safety and execution boundary:

`AI-generated intent → validated contract → bounded plan → governed execution`

This means developers can adopt AI aggressively without giving every generated application unrestricted access to the database topology and resource budget.

The strategic value is therefore not merely faster database access. It is **making high-speed AI application generation compatible with production-grade resource governance**.

## 17. Long-term evolution rule

The five-year strategy is:

**Keep the contract stable; evolve the execution engine.**

The following may evolve without changing the application-facing model:

- placement algorithms;
- number and type of shards;
- primary/replica topology;
- cache hierarchy;
- scheduler policy;
- admission policy;
- storage adapters;
- Cloudflare platform capabilities;
- AI tooling and contract generation.

A future storage system should be able to replace D1 behind the placement/storage boundary without requiring applications to rewrite their business data semantics.

Therefore the correct 2031 question is not “does D1 still look exactly like D1 in 2026?” but:

> **Can the same bounded execution contract still govern changing edge data infrastructure?**

If yes, D1-Fabric remains relevant even when its underlying storage mechanisms evolve.

## 18. Non-goals

2.0 does not create:

- a new SQL dialect;
- an ORM;
- a general-purpose distributed database;
- a message queue;
- a business service layer;
- a custom replication protocol;
- a distributed transaction engine;
- a service mesh;
- a private storage system merely for architectural completeness.

It must not add Workers merely for conceptual separation.

## 19. Acceptance gates

2.0 is not considered complete because code compiles. Each capability requires:

1. contract tests;
2. adversarial boundary tests;
3. resource-accounting evidence;
4. failure/deadline evidence where applicable;
5. overload and retry-storm evidence;
6. hotspot/noisy-neighbor evidence;
7. cache-consistency evidence;
8. primary/replica/bookmark consistency evidence where applicable;
9. cost/performance measurements;
10. no business semantics in middleware;
11. deployable per-Worker package boundaries;
12. documentation and evidence synchronized before release.

### Required benchmark matrix

At minimum compare Native D1 against D1-Fabric for:

- exact-shard read;
- cache hit;
- cache miss;
- bounded multi-shard read;
- global-limit read;
- primary write;
- retryable failure;
- timeout/deadline;
- hot-shard load;
- overloaded dependency;
- control-plane unavailable;
- global budget exhaustion.

Measure at minimum:

- p50/p95/p99 latency;
- error rate;
- D1 statements;
- rows read;
- rows written;
- actual fan-out;
- actual downstream concurrency;
- retry count;
- cache hit ratio;
- Worker duration;
- cost-relevant resource consumption.

The goal is not to prove that Fabric is always faster than native D1. The goal is to prove that Fabric provides **predictable bounded execution, safe scale-out, lower unnecessary work, and operational controls** without introducing unjustified overhead.

## 20. Migration

The verified 1.0 six-Worker implementation is preserved under `workers/old1.0/`. 2.0 is developed beside it until its acceptance gates pass. No production behavior is silently replaced by the migration.

## 21. Architecture conclusion

D1-Fabric 2.0 is intentionally designed to remain at the leading edge by separating **durable distributed-systems principles** from **replaceable infrastructure mechanisms**.

It does not attempt to win by having the most features. It attempts to win by combining a small number of proven ideas into a strict execution model:

`Contract → Admission → Compile → Schedule → Place → Execute → Merge → Terminate`

with governance across every stage:

`Budget + Deadline + Retry Budget + Consistency + Isolation + Trace`

The intended developer reaction after adoption is:

> **“I no longer need to rebuild distributed data infrastructure inside every application, and I am not locking my application to today's database topology.”**

That is the reason D1-Fabric should remain valuable even as Cloudflare, D1, edge compute, storage systems, and AI-generated applications continue to evolve.
