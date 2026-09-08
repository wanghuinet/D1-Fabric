# D1-Fabric 1.0 Reliability and Recovery Contract

**Status:** ARCHITECTURE BASELINE  
**Version:** 1.0  
**Authority:** Architecture Contract + Data and State Contract + Runtime Execution Contract + Performance and Cost Contract + AI Governance Contract  

## 1. Purpose

This contract defines how D1-Fabric remains correct under failure and how it returns to a valid operating state after failure.

Reliability is not the absence of errors. Reliability means that failures are **bounded, observable, isolated, recoverable, and unable to silently corrupt authoritative state**.

Core law:

> **A failure may reduce availability or performance; it must not silently create an invalid state.**

The runtime MUST preserve:

- authoritative ownership;
- routing correctness;
- epoch/fencing correctness;
- idempotency;
- consistency semantics;
- committed-state integrity;
- tenant/security isolation;
- bounded resource consumption;
- recoverability;
- auditability.

## 2. Reliability Priority

Reliability decisions follow this order:

```text
Data correctness
→ State integrity
→ Ownership integrity
→ Security isolation
→ Consistency contract
→ Failure containment
→ Recoverability
→ Availability
→ Latency
→ Cost
```

No availability or performance optimization may violate a higher-priority property.

## 3. Failure Model

D1-Fabric MUST explicitly model at least:

```text
request failure
Worker failure
process/runtime interruption
network failure
D1 transient failure
D1 unavailable/overloaded state
transaction failure
stale routing
stale control metadata
partial fan-out failure
migration interruption
shard hotspot
queue overload
cache corruption/staleness
control-plane failure
deployment interruption
schema/migration failure
operator error
AI optimization failure
```

Unknown failures MUST default to the safest bounded behavior rather than assuming success.

## 4. Failure Classification

Errors SHOULD be classified into:

```text
REJECTED
CANCELLED
TIMEOUT
OVERLOADED
STALE_ROUTE
CONFLICT
TRANSIENT
PERMANENT
PARTIAL_FAILURE
INTERNAL
RECOVERY_REQUIRED
```

Only explicitly classified retryable failures may be retried.

A failure classification MUST NOT cause a permanent error to be retried indefinitely.

## 5. Failure Containment

Every execution unit MUST have a bounded blast radius.

A failure in one:

- request;
- shard;
- tenant;
- query plan;
- batch;
- migration;
- cache entry;
- Worker instance;

MUST NOT unnecessarily fail unrelated work.

The runtime SHOULD prefer isolation and partial degradation over global failure when the requested consistency semantics allow it.

## 6. Request Deadline

Every request MUST have a deadline.

The deadline MUST propagate to:

```text
child operations
D1 queries
cross-shard work
retries
merge operations
background continuation
```

A child operation MUST NOT extend the parent deadline.

When the deadline is exhausted, new work MUST NOT be admitted for that request.

Already committed state MUST remain committed and MUST NOT be rolled back merely because the response deadline expired.

## 7. Cancellation

Cancellation MUST stop unnecessary uncommitted work where the execution environment permits it.

Cancellation MUST NOT create a second mutation.

Cancellation after a successful authoritative commit MUST be treated as:

```text
COMMITTED_BUT_RESPONSE_CANCELLED
```

rather than as an automatic rollback.

The operation's idempotency identity MUST allow a later retry to determine whether the mutation already committed.

## 8. Retry Contract

Retries are a recovery mechanism, not a correctness mechanism.

Every retry policy MUST define:

```text
retryable errors
max attempts
remaining deadline
backoff
jitter
retry budget
```

Retries MUST stop when:

- the error is non-retryable;
- the deadline is exhausted;
- the retry budget is exhausted;
- cancellation occurs;
- the operation is known to have committed;
- continued retry would violate overload policy.

Cloudflare D1 automatically retries read-only queries for retryable errors, while application-level write retries may be appropriate for transient errors; D1 guidance recommends exponential backoff with jitter. D1-Fabric MUST therefore account for provider-level read retries when calculating its own retry budget and MUST avoid multiplicative retry storms. citeturn0search8

## 9. Retry Amplification Control

Retry amplification MUST be bounded.

Conceptually:

```text
request budget
→ operation budget
→ retry budget
→ D1/provider retry behavior
```

The runtime MUST NOT assume that one logical request equals one physical attempt.

The retry controller SHOULD use:

```text
exponential backoff
jitter
attempt cap
time budget
load-aware admission
```

Retries MUST NOT be admitted when the system is already beyond a defined overload threshold unless the operation is explicitly classified as recovery-critical.

## 10. Idempotent Mutation Recovery

Every retryable mutation MUST have an idempotency identity.

Conceptually:

```text
operation_id
idempotency_key
owner_shard
routing_epoch
```

A repeated mutation MUST resolve to exactly one logical outcome:

```text
NOT_COMMITTED
COMMITTED
CONFLICTING
INVALID
```

The implementation MUST NOT rely on the client remembering whether a previous attempt succeeded.

## 11. Commit Boundary

The runtime MUST distinguish:

```text
before commit
commit in progress
committed
response delivered
```

Response delivery is not the authoritative commit boundary.

Once authoritative state is committed, a later transport failure MUST NOT cause the runtime to execute the mutation again as a new logical operation.

## 12. Transaction Failure

Within a single D1 transaction boundary, the runtime MUST use the actual transaction semantics provided by D1.

If the transaction fails before commit:

```text
no committed mutation may be assumed
```

If the outcome is ambiguous:

```text
do not blindly retry
→ resolve using idempotency / authoritative state
```

The runtime MUST prefer outcome resolution over duplicate mutation.

## 13. Partial Failure

Cross-shard execution MUST assume partial failure is normal.

For a request targeting multiple shards, the execution plan MUST define:

```text
required shards
optional shards
failure policy
merge policy
retry policy
timeout
partial-result semantics
```

The runtime MUST NOT silently convert partial results into complete results.

A response marked successful MUST satisfy the declared consistency and completeness contract.

## 14. Cross-Shard Recovery

Cross-shard operations MUST NOT pretend to have global atomicity unless an explicit protocol actually provides it.

When a cross-shard operation partially commits, recovery MUST use an explicit operation state such as:

```text
PLANNED
EXECUTING
PARTIALLY_COMMITTED
COMMITTED
COMPENSATING
COMPENSATED
FAILED
RECOVERY_REQUIRED
```

Recovery MUST be idempotent.

Compensation, when supported, is a domain-level semantic operation and MUST NOT be confused with database rollback.

## 15. Shard Failure

A shard MAY enter a failure state when its physical D1 database, routing state, execution path, or control dependencies are unavailable.

The logical shard lifecycle MUST preserve ownership semantics:

```text
ACTIVE
→ DEGRADED
→ FAILED
→ RECOVERING
→ VERIFYING
→ ACTIVE
```

A failed shard MUST NOT silently accept authoritative mutations from an unknown or stale owner.

## 16. Ownership During Failure

Failure MUST NOT create multiple authoritative owners.

When an owner becomes unavailable, the runtime MUST choose one of:

```text
wait
retry against the same owner
fence the old owner
transfer ownership through the migration protocol
serve a permitted degraded read
reject
```

The system MUST NOT use speculative ownership takeover without fencing.

## 17. Epoch and Fencing Recovery

Every ownership transition MUST preserve the routing epoch or equivalent fencing version.

Recovery MUST follow:

```text
Detect failure
→ establish new valid ownership
→ advance epoch
→ fence obsolete owner
→ verify authoritative state
→ resume service
```

An obsolete request, worker, migration process, or delayed message MUST NOT regain write authority after ownership changes.

## 18. Stale Request Handling

A request carrying an obsolete routing epoch MUST NOT silently mutate state.

The valid responses are conceptually:

```text
refresh and reroute
or
safe rejection
```

The runtime MUST prefer deterministic rejection over an ambiguous mutation.

## 19. Control-Plane Failure

Control metadata is authoritative distributed-system state.

Control-plane failure MUST be treated as a first-class reliability event.

When routing/control metadata cannot be trusted, the runtime MUST NOT invent ownership or routing decisions from stale local guesses.

Safe behavior may include:

```text
serve already-safe local reads
reject authoritative writes
use a verified cached control snapshot within its validity window
enter recovery mode
```

A stale control snapshot MUST have an explicit expiration or validity boundary.

## 20. Control-Plane Recovery

Recovery of control metadata MUST restore:

- shard ownership;
- routing epoch;
- lifecycle state;
- migration state;
- placement mapping;
- fencing state;
- recovery state.

Control recovery MUST be verified before normal mutation traffic resumes.

## 21. Migration Failure

Migration is an ownership transition, not a copy-only operation.

The canonical lifecycle is:

```text
Plan
→ Prepare
→ Copy
→ Verify
→ Fence
→ Commit Ownership
→ Advance Epoch
→ Serve
→ Retire Source
```

At every interruption point, the system MUST know whether the source or destination remains authoritative.

Source retirement MUST NOT occur before successful ownership transition and verification.

## 22. Migration Recovery Matrix

| Failure point | Required recovery behavior |
|---|---|
| Before copy | Cancel safely; source remains owner |
| During copy | Resume/restart bounded copy; source remains owner |
| After copy, before verify | Verify or discard candidate; source remains owner |
| During verify | Retry verification; source remains owner |
| After fence | Prevent old owner writes; complete controlled cutover |
| After ownership commit | New owner is authoritative; recover from new owner |
| After epoch advance | Reject obsolete source operations |
| During source retirement | Keep authoritative destination; retire source only after verification |

No ambiguous state may be resolved by guessing.

## 23. Split and Merge Recovery

Shard split and merge MUST be recoverable at every phase.

A failed split or merge MUST leave one of:

```text
old topology valid
new topology valid
explicit recovery state requiring completion
```

It MUST NOT leave two competing routing interpretations.

## 24. Cache Failure

Cache is not authoritative unless explicitly classified as authoritative state.

Cache failure MUST therefore degrade to:

```text
cache miss
→ authoritative read
```

Cache corruption MUST NOT corrupt authoritative state.

Cache invalidation failure MUST be handled according to the declared consistency contract.

The runtime MUST NOT require cache availability for correctness.

## 25. Queue Failure and Backpressure

Queues MUST be bounded.

Every queue MUST define:

```text
maximum depth
maximum age
admission policy
overflow policy
retry policy
drain policy
```

When queues exceed safe limits, the runtime MUST prefer:

```text
backpressure
controlled degradation
load shedding
safe rejection
```

over unbounded accumulation.

Recovery MUST drain work at a rate that does not recreate the original overload.

## 26. Overload Recovery

Overload is a reliability condition, not merely a performance condition.

The runtime MUST detect and bound:

```text
request concurrency
D1 concurrency
fan-out
queue depth
retry pressure
batch size
memory pressure
CPU pressure
```

Recovery MUST proceed gradually.

The system MUST NOT immediately reopen full admission after a transient overload merely because one health check succeeds.

## 27. Graceful Degradation

Degradation MUST be explicit and contract-aware.

Possible modes include:

```text
NORMAL
DEGRADED_READ
CACHE_ONLY
PARTIAL_READ
WRITE_RESTRICTED
RECOVERY
READ_ONLY
EMERGENCY_REJECT
```

A degraded mode MUST define which operations remain legal.

The runtime MUST NOT silently weaken a declared consistency guarantee.

## 28. Read Recovery

Reads SHOULD follow the cheapest safe recovery path:

```text
local/cache
→ authoritative shard
→ permitted replica/read location
→ bounded retry
→ safe degradation/rejection
```

A replica or read location MUST NOT be treated as authoritative merely because it is reachable.

When stronger consistency is required, the runtime MUST use the appropriate D1 consistency/session mechanism rather than assuming replica freshness.

## 29. Write Recovery

Writes MUST prefer:

```text
validate
→ ownership check
→ idempotency check
→ authoritative transaction
→ commit
→ derived/cache update
```

A failed post-commit response MUST be recoverable through idempotency lookup.

A failed pre-commit operation MUST NOT be reported as committed without evidence.

## 30. D1 Time Travel and Database Recovery

D1 Time Travel is a storage recovery mechanism, not a replacement for D1-Fabric distributed ownership recovery.

Current Cloudflare D1 production databases support point-in-time restoration through Time Travel; the documented retention is up to 30 days on Workers Paid and 7 days on Workers Free, with restore operations overwriting the database in place and cancelling in-flight queries. citeturn0search0turn0search10

D1-Fabric MUST therefore treat a Time Travel restore as a **distributed recovery event** requiring:

```text
freeze affected traffic
→ identify restore target
→ preserve previous/current bookmarks
→ restore database
→ verify schema/data invariants
→ reconcile routing epoch
→ reconcile ownership
→ reconcile idempotency state
→ invalidate unsafe derived/cache state
→ resume traffic gradually
```

The D1 restore API returns both the resulting bookmark and the previous bookmark, allowing an explicit restore rollback path. citeturn0search1

## 31. Restore Safety

A database restore MUST NOT automatically cause the runtime to resume normal traffic.

After restore, the runtime MUST verify at minimum:

- schema version;
- control metadata integrity;
- shard ownership;
- routing epoch;
- required uniqueness constraints;
- idempotency state;
- migration state;
- data invariants;
- application compatibility.

If verification fails, the shard remains in `RECOVERING` or `RECOVERY_REQUIRED`.

## 32. Recovery and Idempotency State

A storage restore may move authoritative data backward in time.

Therefore idempotency state MUST be evaluated together with restored business state.

The runtime MUST NOT assume that an idempotency record exists merely because a pre-restore request once succeeded.

After restore, recovery MUST establish a consistent interpretation of:

```text
operation_id
idempotency_key
business mutation
commit state
routing epoch
```

Duplicate prevention takes precedence over blindly replaying uncertain mutations.

## 33. Recovery Verification

Every recovery MUST have a verification phase.

Minimum verification layers:

```text
L1 Process health
L2 Storage reachability
L3 Schema validity
L4 Control metadata validity
L5 Ownership validity
L6 Routing/epoch validity
L7 Data invariants
L8 Idempotency validity
L9 Representative reads/writes
L10 Concurrency and error-rate stability
```

Normal admission MUST resume only after required layers pass.

## 34. Recovery Readiness

The system MUST continuously maintain enough evidence to recover.

Required operational evidence includes:

```text
current routing epoch
shard ownership
physical placement
migration state
control metadata version
recent health state
request/error metrics
D1 bookmarks where relevant
idempotency state
recovery events
```

Recovery information MUST NOT exist only in ephemeral process memory.

## 35. Recovery Objectives

Each deployment MUST define measurable:

```text
RTO — Recovery Time Objective
RPO — Recovery Point Objective
```

RTO and RPO MUST be specified per state class or capability where requirements differ.

The system MUST NOT claim zero RPO or zero RTO unless reproducible evidence supports the claim.

## 36. Health Model

Health MUST be multidimensional.

A component MUST NOT be declared healthy solely because it responds to a ping.

Health SHOULD consider:

```text
request success
D1 success
latency
queue pressure
error rate
ownership validity
routing freshness
recovery state
resource saturation
```

Health status SHOULD distinguish:

```text
HEALTHY
DEGRADED
UNAVAILABLE
RECOVERING
UNKNOWN
```

`UNKNOWN` MUST NOT be treated as `HEALTHY` for safety-critical ownership decisions.

## 37. Observability for Failure

Every reliability event MUST be observable without logging sensitive payloads.

Minimum dimensions:

```text
request_id
operation_id
shard_id
routing_epoch
failure_class
attempt
retry_count
latency
D1 operation metadata
recovery_state
```

Logs, metrics, traces, and audit records SHOULD share stable correlation identifiers.

## 38. Recovery Audit

Material recovery actions MUST be auditable.

At minimum record:

```text
recovery_id
time
trigger
affected_resource
previous_state
action
new_state
operator_or_automation
verification_result
rollback_path
```

Recovery audit data MUST NOT be silently deleted as part of the recovery operation it describes.

## 39. AI and Reliability

Runtime AI MAY:

- predict failures;
- detect anomalies;
- identify hotspots;
- recommend recovery actions;
- tune retry/backpressure thresholds;
- optimize recovery sequencing;
- propose migration or placement changes.

AI MUST NOT:

- bypass fencing;
- invent ownership;
- override recovery invariants;
- declare recovery successful without evidence;
- restore data without policy authorization;
- replay uncertain mutations blindly;
- disable resource limits to improve availability;
- turn off auditability.

AI failure MUST degrade optimization, not recovery correctness.

## 40. Recovery Automation Levels

Recovery automation SHOULD follow the same authority model as AI governance:

```text
L0 Observe
L1 Recommend
L2 Governed Auto-Recover
L3 Controlled Runtime Recovery
```

Higher levels require stronger evidence, smaller blast radius, explicit rollback, and policy authorization.

Critical recovery actions SHOULD default to the lowest authority level that can meet the RTO requirement.

## 41. Recovery State Machine

The global recovery state SHOULD be representable as:

```text
NORMAL
→ DETECTED
→ ISOLATED
→ DIAGNOSING
→ RECOVERING
→ VERIFYING
→ CANARY
→ RESTORING_ADMISSION
→ NORMAL
```

Failure of verification returns to `RECOVERING` or `ISOLATED` rather than `NORMAL`.

## 42. Recovery Must Be Idempotent

Running the same recovery step more than once MUST NOT create a second ownership transition, duplicate mutation, or inconsistent state.

Recovery operations SHOULD have explicit identities and state transitions.

The implementation MUST prefer:

```text
check current state
→ apply only required transition
```

over blindly replaying the entire recovery procedure.

## 43. Recovery Must Be Bounded

Recovery itself MUST have resource budgets:

```text
maximum duration
maximum retries
maximum concurrency
maximum D1 I/O
maximum affected shards
maximum repair batch
maximum fan-out
```

Recovery traffic MUST NOT consume all resources required by healthy production traffic unless the system is explicitly in an emergency recovery mode.

## 44. Failure Isolation Domains

D1-Fabric SHOULD isolate failures by the smallest practical unit:

```text
request
→ operation
→ shard
→ tenant/workload
→ physical D1
→ Worker/runtime
→ control plane
```

A larger isolation domain may be used only when the smaller boundary cannot provide correctness or operational safety.

## 45. Dependency Failure

For every external or internal dependency, the runtime MUST define:

```text
failure detection
fallback
retry policy
timeout
circuit/open state
recovery condition
```

A dependency that is not required for correctness SHOULD fail open or degrade according to its declared semantics.

A dependency required for authoritative correctness MUST fail closed when its state cannot be trusted.

## 46. Deployment and Rollback Safety

Deployments MUST be compatible with in-flight requests and recovery paths.

A deployment MUST NOT:

- invalidate existing authoritative ownership without a migration protocol;
- change routing interpretation without epoch/version control;
- make persisted state unreadable without a compatibility path;
- remove recovery metadata before the new version is verified.

Rollback MUST be possible without silently corrupting newer valid state.

## 47. Schema and Migration Safety

Schema changes MUST distinguish:

```text
backward-compatible
expand
migrate
contract
```

Destructive schema changes MUST NOT occur before all readers/writers that depend on the old form are safely removed or migrated.

A failed schema migration MUST have an explicit recovery path.

## 48. Recovery Testing

Reliability cannot be established by normal-path tests alone.

The verification suite MUST include:

```text
Worker interruption
D1 transient failure
D1 unavailable
request timeout
request cancellation
retry storm
partial fan-out failure
stale route
stale epoch
cache failure
queue overflow
hot shard
migration interruption
split interruption
merge interruption
control-plane failure
restore from Time Travel
post-restore verification
deployment interruption
rollback
```

Each test MUST verify both:

```text
expected external behavior
internal invariants
```

## 49. Soak and Chaos Verification

Before a release claims production reliability, the system SHOULD execute controlled failure injection and soak testing.

Required measurements SHOULD include:

```text
error rate
recovery time
failed requests
duplicate mutations
lost mutations
stale writes
queue depth
retry amplification
D1 I/O amplification
P95/P99 latency
resource recovery
```

A chaos test passes only when the defined invariants remain true.

## 50. Reliability Evidence

A reliability claim MUST be supported by reproducible evidence.

Evidence SHOULD include:

```text
failure scenario
initial conditions
fault injected
expected invariants
observed behavior
recovery duration
D1 effects
final state
verification result
artifact/version
```

A green health check alone is not reliability evidence.

## 51. Mandatory Reliability Invariants

The following invariants are mandatory:

- **RR-01** — Failure MUST NOT silently corrupt authoritative state.
- **RR-02** — Every retryable mutation MUST be idempotent.
- **RR-03** — Retry attempts MUST be bounded.
- **RR-04** — Retry MUST NOT amplify overload without bound.
- **RR-05** — Request deadlines MUST propagate to child work.
- **RR-06** — Committed mutations MUST remain committed even if response delivery fails.
- **RR-07** — Ambiguous commit outcomes MUST be resolved before replay.
- **RR-08** — Cross-shard partial failure MUST be explicit and recoverable.
- **RR-09** — Failure MUST NOT create multiple authoritative owners.
- **RR-10** — Stale epochs MUST NOT authorize mutation.
- **RR-11** — Migration recovery MUST preserve one authoritative ownership interpretation.
- **RR-12** — Recovery MUST be idempotent.
- **RR-13** — Recovery MUST be bounded.
- **RR-14** — Control-plane uncertainty MUST NOT produce invented ownership.
- **RR-15** — Cache failure MUST NOT break authoritative correctness.
- **RR-16** — Recovery completion MUST require evidence-based verification.
- **RR-17** — AI MUST NOT bypass reliability invariants.
- **RR-18** — A failed recovery verification MUST NOT return the system to normal admission.

## 52. Forbidden Reliability Architecture

The following are prohibited:

- infinite retries;
- retrying every error indiscriminately;
- retrying a mutation without idempotency;
- treating response delivery as commit confirmation;
- speculative ownership takeover;
- stale-worker mutation after fencing;
- uncontrolled dual-write recovery;
- unbounded recovery queues;
- restoring a database without ownership reconciliation;
- treating Time Travel as complete distributed recovery;
- declaring recovery successful without verification;
- AI-controlled recovery without authority limits;
- using cache as an implicit source of truth;
- hiding partial failure as a successful response;
- unbounded repair or replay;
- global recovery locks that unnecessarily stop healthy shards.

## 53. Minimal-Code Reliability Rule

Reliability mechanisms MUST be introduced only when they protect a real failure boundary.

Every additional:

```text
retry layer
queue
state machine
Worker
lock
persistent record
recovery worker
replication mechanism
circuit breaker
```

MUST have:

1. a concrete failure mode;
2. a protected invariant;
3. a bounded operating model;
4. a measurable reliability benefit;
5. a verification method.

Otherwise it MUST NOT be added.

## 54. Reliability and Cost

Reliability mechanisms have cost.

The runtime MUST measure the cost of:

```text
retries
repair reads
repair writes
reconciliation
replication
recovery scans
replay
health checks
control metadata
```

The system MUST NOT improve availability by creating uncontrolled D1 I/O amplification.

Recovery should be designed to use the smallest authoritative evidence necessary to restore correctness.

## 55. Reliability and Performance

Normal operation MUST remain the fast path.

Recovery logic MUST NOT add unnecessary hot-path work.

Preferred architecture:

```text
Normal Request
→ deterministic fast path

Failure
→ bounded detection
→ isolated recovery path
→ verification
→ gradual return to fast path
```

Recovery complexity belongs primarily outside the normal Data Plane hot path.

## 56. Release Gate

A release MUST NOT be `RELEASE_READY` unless applicable reliability verification demonstrates:

```text
correct failure classification
bounded retry
idempotent mutation recovery
ownership/fencing correctness
partial-failure safety
migration recovery
control-plane recovery
D1 recovery behavior
post-restore verification
backpressure behavior
recovery observability
rollback safety
```

Any unresolved P0/P1 reliability defect blocks release.

## 57. Final Reliability Law

> **D1-Fabric must fail small, recover deterministically, verify before trusting, and never trade correctness for availability.**

Combined with the other 1.0 contracts:

```text
Simple Data Plane
+
Powerful Governance Plane
+
Deterministic Ownership
+
Bounded Execution
+
Evidence-Based Recovery
=
Advanced Distributed Runtime
```

---

## Cloudflare D1 Reference Basis

This contract is aligned with the current D1 platform behavior relevant to recovery:

- D1 Time Travel provides point-in-time recovery and is always enabled on supported production storage; documented retention is 30 days on Workers Paid and 7 days on Workers Free. citeturn0search0turn0search10
- D1 restore is destructive to the target database, cancels in-flight queries/transactions, and returns a previous bookmark that can be used to undo the restore. citeturn0search0turn0search1
- D1 documents application-level retries for transient write failures and recommends exponential backoff with jitter; read-only queries may already be retried by D1 itself. citeturn0search8

These provider behaviors are implementation inputs. They do not replace D1-Fabric's ownership, fencing, idempotency, recovery, or verification contracts.
