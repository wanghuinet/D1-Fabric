# D1-Fabric 2.0 Blueprint

**Status:** APPROVED ARCHITECTURE BASELINE
**Scope:** middleware only; no business semantics

## 1. Mission

D1-Fabric 2.0 is an Edge/Serverless data-execution fabric built by adapting production-proven distributed-systems ideas to Cloudflare Workers + D1 + AI-generated applications.

The design rule is strict: do not invent a distributed-systems primitive without an established industrial basis. Innovation is limited to small, measurable adaptations for Edge, D1 resource limits, and AI-native contracts.

## 2. Industrial basis → Fabric micro-innovation

| Proven idea | Fabric adaptation | Required evidence |
|---|---|---|
| Distributed sharding/routing | Stable logical→physical shard contract | deterministic mapping tests |
| Query planning | Bounded execution planner | plan snapshots + adversarial tests |
| Resource quotas/admission control | Global request budget | sum-of-budgets invariants |
| Multi-level caching | Cache termination | cache hit produces zero D1 execution |
| Distributed top-k/merge | Global limit with bounded per-shard allocation | rows-read upper bound |
| Deadlines/retries/isolation | Execution Guard | deadline and failure tests |
| Schema/API contracts | Fabric Data Contract | schema validation |
| SRE observability | Fabric Trace | per-request resource accounting |
| IDL/tooling | AI-readable Data Contract | generated-call validation |

## 3. Runtime planes

2.0 uses four runtime boundaries, not one Worker per feature:

- W01 Fabric Gateway: authentication-independent request normalization, contract selection, admission, response envelope.
- W02 Execution Fabric: routing, bounded fan-out, query planning, global budget allocation, merge, execution guard.
- W03 Write Fabric: idempotent write admission, shard-targeted writes, write budget, atomicity/error semantics.
- W04 Control Plane: shard metadata, contract versions, recovery state, policy/configuration publication.

Cache is a capability of the read execution path, not a mandatory standalone network hop. Observability is emitted by the executing boundary, not a synchronous telemetry Worker.

## 4. Core execution contract

Every operation must declare, directly or through a versioned contract:

- operation identity
- shard key / routing rule
- maximum fan-out
- statement budget
- rows-read budget
- rows-write budget
- deadline
- consistency mode
- cache policy
- cache-termination policy
- failure policy
- retry policy

No unbounded value is legal on a production execution path.

## 5. Budget law

For every execution:

`sum(shard_rows_budget) <= global_rows_budget`

`sum(shard_write_budget) <= global_write_budget`

`sum(statement_budget) <= global_statement_budget`

`actual_fanout <= global_fanout_budget`

The planner may allocate uneven budgets; it must never exceed the global contract.

## 6. Adaptive execution

The planner must prefer the smallest execution plan that can satisfy the operation:

`cache-hit → terminate`

`exact shard → single-shard execution`

`bounded multi-shard → parallel bounded fan-out`

`unsupported/unbounded → reject`

Fan-out is a cost, not a default behavior.

## 7. Cache termination

A cache hit is an execution termination point. A successful hit must not invoke D1, shard fan-out, or downstream database RPCs.

## 8. Failure semantics

Failure behavior is explicit per operation: strict or partial. Retries are bounded by both retry count and deadline. Partial failure may never create a partially committed write.

## 9. AI-native contract

AI-generated data operations must be validated against the same contract used at runtime. AI is not trusted to invent shard topology, budgets, physical D1 identifiers, or internal Worker calls.

## 10. Non-goals

2.0 does not create a new SQL dialect, ORM, general-purpose distributed database, message queue, or business service layer. It must not add Workers merely for conceptual separation.

## 11. Acceptance gates

2.0 is not considered complete because code compiles. Each capability requires:

1. contract tests;
2. adversarial boundary tests;
3. resource-accounting evidence;
4. failure/deadline evidence where applicable;
5. cost/performance measurements;
6. no business semantics in middleware;
7. deployable per-Worker package boundaries;
8. documentation and evidence synchronized before release.

## 12. Migration

The verified 1.0 six-Worker implementation is preserved under `workers/old1.0/`. 2.0 is developed beside it until its acceptance gates pass. No production behavior is silently replaced by the migration.
