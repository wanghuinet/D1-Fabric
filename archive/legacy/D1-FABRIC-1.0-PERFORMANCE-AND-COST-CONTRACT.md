# D1-Fabric 1.0 Performance and Cost Contract

**Status:** ARCHITECTURE BASELINE  
**Version:** 1.0  
**Authority:** Architecture Contract + Data and State Contract + Runtime Execution Contract  

## 1. Purpose

This contract makes performance and cost measurable, observable, verifiable, and optimizable.

Targets:

- high concurrency;
- low latency;
- minimum D1 I/O;
- low cost per useful operation;
- predictable P50/P95/P99;
- bounded fan-out;
- bounded concurrency and retries;
- hotspot isolation;
- experimentally verified horizontal scale;
- AI-driven continuous optimization.

Core principle:

> **Do not make the system do more work. Make it do less work to produce more useful results.**

## 2. Performance Priority

```text
Correctness
→ Data Safety
→ Consistency
→ Reliability
→ Resource Bounds
→ Useful Throughput
→ Tail Latency
→ D1 Cost
→ Operational Simplicity
```

No performance optimization may weaken a higher-priority property.

## 3. D1 I/O Is a First-Class Resource

D1-Fabric MUST treat:

```text
rows_read
rows_written
query_count
query_duration
```

as first-class planning, budgeting, telemetry, benchmark, and AI-optimization signals.

Current D1 pricing is based on rows read and rows written, while D1 query metadata exposes those counts for individual queries. citeturn0search0turn0search7

## 4. Unified Cost Model

Each important request SHOULD produce:

```text
RequestCost =
    D1RowsRead
  + D1RowsWritten
  + D1Queries
  + ShardFanout
  + RetryWork
  + NetworkWork
  + CPUWork
  + MemoryWork
```

Rows read must be distinguished from rows returned. A query that scans many rows and returns one row is still expensive. citeturn0search0

## 5. Request Resource Budget

Every request MUST have finite:

```text
deadline
max_rows_read
max_rows_written
max_queries
max_shards
max_parallelism
max_retries
max_payload
max_memory
```

Child work consumes parent budget. Budget exhaustion results in stop, controlled degradation, or rejection.

## 6. Minimum-Work Principle

The planner SHOULD minimize:

```text
D1 reads
D1 writes
D1 queries
shards
network hops
serialization
retries
memory
CPU
```

Preferred path:

```text
Zero-I/O
→ Single-Shard
→ Small Fan-out
→ Large Fan-out
→ Global / Analytical
```

Production Hot Path MUST NOT perform unbounded Full Scan.

## 7. Single-Shard Fast Path

The dominant path should be:

```text
Request
→ Route
→ Single Shard
→ D1
→ Result
```

Global coordination or extra Workers require a real architectural boundary.

## 8. Read Efficiency

Measure:

```text
rows_read
rows_returned
useful_rows
```

Core indicators:

```text
Read Amplification = rows_read / useful_rows
Result Efficiency = rows_returned / rows_read
```

High amplification queries must enter optimization review.

Indexes and query plans should be verified with real query plans; Cloudflare recommends `EXPLAIN QUERY PLAN` to distinguish full scans from index searches. citeturn0search6

## 9. Write Efficiency

Measure:

```text
logical_rows_changed
rows_written
```

with:

```text
Write Amplification = rows_written / logical_rows_changed
```

Analyze amplification from indexes, metadata, idempotency records, derived state, and audit state.

## 10. Index Economics

Indexes MUST be evaluated by:

```text
read reduction
write amplification
storage
latency
query frequency
```

More indexes are not automatically better. Current D1 documentation confirms indexes can reduce rows read while writes involving indexed columns add write work. citeturn0search0turn0search6

## 11. Latency Model

End-to-end latency SHOULD be decomposed into:

```text
Admission
+ Queue
+ Routing
+ Planning
+ Network
+ D1 SQL
+ Merge
+ Serialization
```

At minimum measure:

```text
P50
P95
P99
```

Important paths SHOULD additionally measure P99.9.

D1 SQL duration must be distinguished from end-to-end latency because SQL timing does not include network communication. citeturn0search11

## 12. Tail Latency

Optimization MUST consider P95/P99, not only averages.

Cross-shard latency is affected by the slowest participating shard, queueing, retry, and merge work. Fan-out is therefore both a performance and reliability multiplier.

## 13. Concurrency and Capacity

D1-Fabric MUST distinguish:

```text
Request Concurrency
Shard Concurrency
D1 Concurrency
Background Concurrency
```

All are bounded.

Current D1 documentation states that an individual D1 database is single-threaded and processes queries one at a time, so query duration directly affects throughput. Horizontal capacity must therefore come primarily from distributing work across shards/databases rather than trying to make one D1 execute unlimited concurrent queries. citeturn0search8

## 14. Shard Capacity and Scaling

Each shard SHOULD have a capacity profile:

```text
QPS
read rows/s
write rows/s
P95
P99
queue depth
error rate
storage
```

Fabric capacity MUST be derived from real multi-shard benchmarks. It MUST NOT be claimed as simply:

```text
single-shard benchmark × shard count
```

Scaling efficiency SHOULD be measured as:

```text
Useful Throughput Growth / Resource Growth
```

## 15. Fan-out and Cross-Shard Cost

Cross-shard requests MUST bound:

```text
max_shards
max_parallelism
max_intermediate_result
max_merge_memory
deadline
```

Fan-out can amplify D1 work, network work, memory, tail latency, and failure probability.

## 16. Batch Economics

Batching SHOULD reduce round trips and duplicate work but MUST be bounded by:

```text
payload
memory
execution time
transaction size
failure blast radius
```

Adaptive batch size, flush interval, and parallelism MAY be AI-controlled within hard bounds.

## 17. Queue and Backpressure

Every queue MUST define:

```text
max_depth
max_age
admission_policy
overflow_policy
```

Unbounded queues are prohibited.

Overload should produce:

```text
Bounded Queue
→ Backpressure
→ Early Rejection / Degradation
```

rather than timeout storms.

## 18. Retry Economics

Retry cost includes:

```text
additional reads
additional writes
additional latency
additional CPU
```

Retry MUST have finite attempts, deadlines, backoff, and idempotency where required.

The runtime SHOULD detect retry amplification and reduce retry pressure when retry itself becomes an overload source.

## 19. Cache Economics

Cache value MUST consider:

```text
access_frequency
D1_work_avoided
latency_saved
payload_size
mutation_frequency
staleness_tolerance
memory_cost
invalidation_cost
```

Cache hit rate alone is insufficient.

The most important value metric is D1 work avoided.

## 20. Workload Isolation and Hotspots

Runtime SHOULD distinguish:

```text
READ_HOT
READ_COLD
WRITE_HOT
WRITE_COLD
BATCH
ANALYTICAL
MAINTENANCE
MIGRATION
```

System SHOULD detect:

```text
Hot Shard
Hot Key
Hot Tenant
Hot Query
Hot Index
```

Preferred response:

```text
Cache
→ Coalescing
→ Admission Control
→ Load Shaping
→ Split / Rebalance
```

## 21. Cost Attribution

Important requests SHOULD be attributable to:

```text
tenant
request
query_shape
plan
shard
```

with:

```text
rows_read
rows_written
queries
fanout
retries
latency
cache_hit
```

D1 exposes row counts and analytics for usage/cost analysis, so the runtime should build its own request-level attribution on top of those signals. citeturn0search0turn0search7

## 22. Regression Detection

Code, schema, index, query, plan, routing, cache, batch, or configuration changes SHOULD be evaluated for:

```text
P50
P95
P99
rows_read
rows_written
query_count
fanout
retry_rate
cache_hit_rate
error_rate
```

An improvement in P50 with a serious P99 or D1-cost regression is not automatically successful.

## 23. Benchmark Contract

Benchmarks MUST record:

```text
dataset
dataset_version
workload
workload_version
request_mix
concurrency
shard_count
cache_state
consistency
runtime_version
schema_version
configuration_version
plan_version
```

Required workloads include:

```text
Single-Shard Read
Single-Shard Write
Hot-Key Read
Hot-Key Write
Batch Read
Batch Write
Cross-Shard Read
Cross-Shard Write
Mixed Read/Write
High Concurrency
Overload
Failure
Recovery
```

Required outputs:

```text
QPS
P50
P95
P99
Error Rate
D1 Rows Read
D1 Rows Written
D1 Query Count
Shard Fan-out
Retry Rate
Cache Hit Rate
Queue Depth
CPU
Memory
```

## 24. Capacity Headroom

Production MUST retain measurable capacity headroom.

Autoscaling SHOULD consider:

```text
D1 latency
queue
rows_read
rows_written
shard utilization
error rate
tail latency
```

CPU alone is insufficient.

## 25. Cost Forecast and Anomaly Detection

Governance SHOULD forecast:

```text
D1 rows/day
D1 rows/month
storage growth
hot shard growth
cost trend
```

It SHOULD detect:

```text
rows_read spike
rows_written spike
query spike
fanout spike
retry spike
storage spike
```

AI should distinguish traffic growth from efficiency regression.

## 26. AI Performance Optimization

AI MAY optimize:

```text
Query Plans
Indexes
Cache Policy
Batch Size
Parallelism
Shard Placement
Shard Split
Shard Merge
Admission Thresholds
Retry Parameters
```

Optimization flow:

```text
Observe
→ Analyze
→ Hypothesize
→ Candidate
→ Validate
→ Benchmark
→ Canary
→ Measure
→ Promote / Reject
```

AI cannot bypass hard safety, cost, consistency, or resource constraints.

## 27. AI Objective

AI SHOULD jointly optimize:

```text
Correctness
Reliability
Useful Throughput
Latency
D1 Cost
Resource Consumption
Complexity
```

A change that lowers latency but materially increases D1 cost or complexity is not automatically successful.

## 28. AI and Hot Path

The production Hot Path MUST NOT require real-time AI inference.

Approved AI-derived plans/configuration MAY be consumed by the Hot Path.

When AI is unavailable, the deterministic baseline plan remains valid.

## 29. Optimization Memory

Important optimization decisions SHOULD record:

```text
optimization_id
baseline
candidate
workload
change
result
decision
rollback
```

This prevents repeating failed experiments.

## 30. Complexity Tax

Adding a:

```text
Worker
Queue
Cache
Index
Replica
Coordinator
Protocol
Persistent State
Background Job
```

requires a measurable performance, cost, reliability, or correctness benefit that justifies its complexity and failure surface.

## 31. Minimum-Code Performance Rule

Performance problems should first be attacked through:

```text
Better Routing
Better Query
Better Index
Better Batching
Better Cache
Better Shard Distribution
```

not by default through more Workers, services, queues, replicas, or abstractions.

## 32. Performance Evidence

Claims such as:

```text
faster
cheaper
higher QPS
lower latency
more scalable
lower D1 cost
```

require reproducible evidence containing at least:

```text
Before
After
Workload
Dataset
Concurrency
Shard Count
D1 I/O
P50
P95
P99
Error Rate
Environment
Runtime Version
```

Without evidence:

```text
Performance Claim = UNKNOWN
```

## 33. Mandatory Performance Invariants

- **PC-01:** Every request has a bounded resource budget.
- **PC-02:** D1 rows read is observable.
- **PC-03:** D1 rows written is observable.
- **PC-04:** Production Hot Path cannot perform unbounded Full Scan.
- **PC-05:** Shard Fan-out is bounded.
- **PC-06:** Concurrency is bounded.
- **PC-07:** Queues are bounded.
- **PC-08:** Retry amplification is bounded.
- **PC-09:** P95/P99 are first-class metrics.
- **PC-10:** Cost regression is detectable.
- **PC-11:** Performance claims require reproducible evidence.
- **PC-12:** Horizontal scaling must be experimentally verified.
- **PC-13:** AI cannot bypass hard resource limits.
- **PC-14:** AI confidence cannot replace verification evidence.
- **PC-15:** Optimization cannot weaken correctness or consistency.
- **PC-16:** Complexity added for performance requires measurable justification.

## 34. Forbidden Performance Architecture

Prohibited:

```text
Unbounded Full Scan
Unbounded Fan-out
Unbounded Retry
Unbounded Queue
Unbounded Batch
Unbounded Concurrency
Unbounded Cache
Global Coordinator on Hot Path
AI Required for Every Request
AI Direct D1 Mutation
AI Bypass of Plan Validation
CPU-Only Autoscaling
Average-Latency-Only Optimization
QPS-Only Capacity Claims
Cache-Hit-Only Optimization
D1-Cost Claims Without I/O Attribution
Scaling Claims Without Benchmark Evidence
Adding Workers Without a Proven Boundary
Adding Indexes Without Write-Cost Analysis
```

## 35. North-Star Metrics

```text
P99 Latency
D1 Rows Read / Request
D1 Rows Written / Mutation
Useful QPS
Cost / Useful Operation
Shard Utilization
Error Rate
Retry Amplification
Cache Avoided D1 Work
```

Long-term target:

```text
P99 ↓
D1 I/O / Request ↓
Cost / Useful Operation ↓
Useful QPS ↑
Reliability ↑
Complexity → stable
```

## 36. Final Performance Law

> **D1-Fabric performance is achieved by eliminating unnecessary work, not by hiding unnecessary work behind more infrastructure.**

The preferred path is:

```text
Request
→ Deterministic Route
→ Cache / Local State
→ Single-Shard Fast Path
→ Indexed Query
→ Minimum D1 Rows Read
→ Minimum D1 Rows Written
→ Bounded Execution
→ Result
```

When Cross-Shard work is unavoidable:

```text
Bounded Fan-out
→ Bounded Parallelism
→ Bounded Merge
→ Bounded Result
```

The Governance Plane continuously searches for a better plan while the Data Plane remains simple, deterministic, and safe.
