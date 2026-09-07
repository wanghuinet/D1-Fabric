# D1-Fabric AI Engineering Instructions

**Authority:** D1-Fabric Engineering Constitution v3.0 + v3.1 + v3.2 Addenda + Open-Source / Commercial Boundary Contract + Platform Infrastructure Contract + Open Infrastructure Moat Contract + Engineering Documentation Standard + Contract Execution & Evidence Standard  
**Project:** D1-Fabric  
**Primary language:** TypeScript

## Mission

Build the minimum amount of correct code that provides complete, runnable, verifiable, maintainable, scalable, and deployable distributed-data capability.

Do not optimize for code volume or number of tasks. **Code shall be minimal; contracts and proof obligations shall be rigorous.**

D1-Fabric is a **general-purpose distributed data infrastructure layer for Cloudflare D1**, not a self-media database. Business domains such as content, APP marketplaces, finance, commerce, games, communities, and AI agents are application-layer schemas over the same infrastructure.

## Read Before Coding

Before modifying code, read the applicable:

1. `D1-FABRIC-ENGINEERING-CONSTITUTION-V3.0.md`
2. `D1-FABRIC-ENGINEERING-CONSTITUTION-V3.1-ADDENDUM.md`
3. `D1-FABRIC-ENGINEERING-CONSTITUTION-V3.2-ADDENDUM.md`
4. `D1-FABRIC-1.0-DEVELOPMENT-CONTRACT.md`
5. `D1-FABRIC-ARTIFACT-TYPE-CONTRACT.md`
6. `D1-FABRIC-FIRST-PASS-VERIFICATION-PROTOCOL.md`
7. `D1-FABRIC-WORLD-CLASS-SCALE-AND-RELIABILITY-GATE.md`
8. `D1-FABRIC-OPEN-SOURCE-COMMERCIAL-BOUNDARY.md`
9. `D1-FABRIC-PLATFORM-INFRASTRUCTURE-CONTRACT.md`
10. `D1-FABRIC-OPEN-INFRASTRUCTURE-MOAT-CONTRACT.md`
11. `D1-FABRIC-ENGINEERING-DOCUMENTATION-STANDARD.md`
12. `D1-FABRIC-A00.7-CONTRACT-EXECUTION-EVIDENCE-STANDARD.md`
13. applicable architecture and capability contracts
14. applicable ADRs

Do not infer an architecture or distribution rule from chat history when an authoritative repository document exists.

## Before Implementation

Answer these questions and record the result in the task/change record for non-trivial work:

```text
Requirement / REQ-IDs
Scope
Non-Goals
Smallest complete design
Inputs / Outputs
Terminology
State Model
Authoritative Owner for every mutable state
Invariants / INV-IDs
Hot Path
Control / Cold Path
Concurrency Boundary
Duplicate / Idempotency Semantics
Timeout / Cancellation / Failure Semantics
Recovery and return-to-service condition
Consistency Model
Overload / Backpressure behavior
Resource budgets: D1 I/O / fan-out / retries / queue / batch / memory / payload
Scaling boundary
Security / Trust boundary
Observability
Compatibility / versioning
Verification matrix / TEST-IDs
Evidence format / EVIDENCE-IDs
Distribution target: OPEN / COMMERCIAL / MIXED
IP / proprietary-risk classification
Documentation impact
Change Manifest / allowed files
Rejected alternatives where material
```

If a correctness-critical question cannot be answered precisely, stop and update the design/contract before coding. If an unknown affects only an internal implementation choice and does not change the contract, use the smallest conventional implementation rather than reopening architecture.

## A00.7 AI Execution Rule

`D1-FABRIC-A00.7-CONTRACT-EXECUTION-EVIDENCE-STANDARD.md` is mandatory.

The implementation agent SHALL execute the approved repository contract rather than redesign it during coding.

```text
Authoritative Contract
 ↓
Execution Packet
 ↓
Frozen Scope / Change Manifest
 ↓
Implementation
 ↓
Targeted Verification
 ↓
Full Verification
 ↓
Evidence
 ↓
Capability Status
```

Before implementation establish:

```text
CONTRACT_RESOLVED
SCOPE_FROZEN
DEPENDENCIES_VERIFIED
STATE_OWNERSHIP_RESOLVED
ARCHITECTURE_DECISIONS_FROZEN
INVARIANTS_RESOLVED
RESOURCE_BUDGETS_RESOLVED
CHANGE_MANIFEST_FROZEN
```

Distinguish:

- **Architecture Decision:** affects correctness, protocol, state ownership, routing, consistency, failure/recovery, resource bounds, security, distribution, or public interface. Once frozen, it MUST NOT be changed inside an implementation task without an explicit contract/ADR change.
- **Implementation Choice:** internal mechanism that preserves the frozen contract. The agent MAY choose the simplest correct implementation.

Do not make the AI repeatedly reconsider approved architecture. Do not add abstractions, dependencies, queues, retries, network hops, persistent state, or Worker boundaries without a current requirement, invariant, measurable benefit, or real boundary.

If missing information can affect correctness, compatibility, ownership, security, resource bounds, failure semantics, or architecture: **STOP** and resolve it. If it only affects an internal implementation choice while the contract remains satisfied: choose the smallest conventional implementation.

## Documentation Is an Engineering Control

`D1-FABRIC-ENGINEERING-DOCUMENTATION-STANDARD.md` is mandatory governance. Documentation is not post-hoc explanation.

For every non-trivial capability:

```text
Requirement
 ↓
Contract
 ↓
Invariants
 ↓
State / Ownership
 ↓
Execution Model
 ↓
Failure Model
 ↓
Resource Budget
 ↓
Implementation
 ↓
Verification
 ↓
Evidence
```

Normative language SHALL be used consistently. `MUST/SHALL` is mandatory; `SHOULD` is the strong default; `MAY` is optional; `UNKNOWN/UNPROVEN` are not PASS.

Every non-trivial requirement SHALL be traceable:

```text
REQ-ID → CONTRACT-CLAUSE → IMPLEMENTATION-SURFACE → TEST-ID → EVIDENCE-ID
```

A test without a requirement/invariant mapping is not sufficient architectural proof. A requirement without verification mapping is incomplete.

## Mandatory v3.2 Invariants

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

If an applicable invariant is UNPROVEN or FAILED, do not report PASS and do not continue to the next dependent capability.

## Architecture Rules

- D1-Fabric core MUST remain business-domain neutral.
- Do not hard-code self-media/content, APP-marketplace, finance, commerce, or other product concepts into core infrastructure contracts unless explicitly approved as a generic primitive.
- Application schemas/entities belong above D1-Fabric.
- Partition keys may represent user_id, app_id, stock_id, product_id, agent_id, content_id, tenant_id, etc.; the router must operate on generic partition identity and shard metadata.
- Query/write engines optimize infrastructure execution characteristics, not business ranking or product semantics.
- Domain adapters SHOULD be thin and MUST NOT duplicate core routing/shard/cache/query/write/recovery logic.
- Do not create a Worker merely because a new application domain exists.
- Worker count is determined by real capability, ownership, scaling, security, lifecycle, or failure boundaries.
- Do not create a module merely to create a task boundary.
- Keep control-plane metadata out of the mandatory hot path when correctness permits.
- Prefer shard-local execution after deterministic routing.
- Minimize D1 reads, writes, cross-shard coordination, network hops, serialization, and retries on hot paths.
- Every hot path must have a bounded operation budget.
- Every queue/retry/fan-out mechanism must have bounded admission and overload behavior.
- Design for skewed traffic and hot shards, not only uniform traffic.
- Do not introduce future-proof abstractions without a current requirement.
- Do not copy Cloudflare architecture or code without an explicit D1-Fabric requirement.

## Source of Truth

Do not silently edit production/dashboard configuration when a versioned repository configuration is authoritative.

Any configuration model must have one declared source of truth.

For mutable distributed state, documentation MUST identify exactly one authoritative owner. Caches, replicas, snapshots and derived indexes are not authoritative unless explicitly declared.

## Commercial Boundary Rules

`D1-FABRIC-OPEN-SOURCE-COMMERCIAL-BOUNDARY.md` is mandatory governance.

- Every new capability MUST be classified as `OPEN`, `COMMERCIAL`, or `MIXED` before implementation is merged.
- Public contracts, correctness semantics, interoperability and conformance requirements should remain open unless an approved decision says otherwise.
- Proprietary optimization algorithms, production heuristics, advanced automation, commercial operational intelligence, secrets, customer data, and security-sensitive implementation details MUST NOT be published accidentally.
- AI agents MUST NOT decide licensing, IP publication, or commercial boundaries by inference.
- If the boundary is ambiguous, status is `BLOCKED` / `UNRESOLVED`; do not guess.
- Commercial separation must not justify artificial module or Worker fragmentation.
- Before release, verify that repository contents match the declared distribution boundary.

## Coding Rules

- Use TypeScript for application logic unless explicitly approved otherwise.
- Keep implementations small and direct.
- Prefer existing utilities and contracts over new abstractions.
- No speculative interfaces.
- No unused wrappers.
- No hidden side effects.
- No unrelated refactors.
- No silent contract changes.
- Prefer structural fixes over patch-piling.
- Never add a dependency or copied code without checking license compatibility.
- If a new core feature requires domain-specific semantics, STOP and classify it as application-layer behavior or an explicitly approved generic infrastructure primitive before implementation.
- Do not make code look sophisticated for its own sake. **Complexity requires a contract, a reason, and evidence.**

## Verification Rules

Never report PASS from source inspection alone.

For applicable capabilities:

```text
Contract Review
 ↓
Type Check
 ↓
Lint / Format
 ↓
Unit Test
 ↓
Integration Test
 ↓
Build
 ↓
Runtime
 ↓
Real Request
 ↓
Concurrency / Race
 ↓
Overload / Backpressure
 ↓
Failure / Recovery
 ↓
Hotspot / Skew where applicable
 ↓
Security
 ↓
Performance / Regression
 ↓
Soak where applicable
 ↓
Distribution Boundary Audit
 ↓
Documentation Completeness Audit
 ↓
Independent Verification
 ↓
Reproducible Evidence
```

Verification MUST map critical requirements/invariants to tests and evidence. Unknown is not PASS. UNPROVEN is not PASS.

Evidence strength SHALL be understood as:

```text
E0 declaration
E1 static/type/lint
E2 unit
E3 integration
E4 build/runtime
E5 real request / end-to-end
E6 concurrency/failure/recovery
E7 performance/load/soak/scale
E8 independent/release-grade verification
```

Performance/scale claims require E7 or stronger as applicable. Critical release claims require E8 where applicable.

## Evidence Rules

Evidence MUST be sufficient for an independent engineer to reproduce or challenge the claim without chat history.

For scale/performance evidence, record where applicable:

```text
Capability / Requirement IDs
Commit SHA
Runtime / configuration
Dataset
Shard count
Request mix
Read/write ratio
Concurrency
Duration
P50 / P95 / P99
Throughput
Errors / rejections
D1 reads
D1 writes
Cross-shard fan-out
Retry amplification
Queue peak
Cache hit rate / D1 read avoidance ratio
Failure/recovery result
Known limitations
Proof debt
```

A screenshot, successful single request, green unit-test count, or source inspection is not scale proof.

Material requirements or invariants without sufficient evidence create explicit `PROOF_DEBT`; blocking proof debt prevents the required PASS state.

## World-Class Scale Gate

Before `RELEASE_READY`, read and satisfy:

`D1-FABRIC-WORLD-CLASS-SCALE-AND-RELIABILITY-GATE.md`

The evidence must record actual D1 reads/writes, concurrency, latency distribution, errors/rejections, queue peak, shard count, workload, duration, runtime, configuration, and commit/version where applicable.

A screenshot, successful single request, or source inspection is not scale proof.

## Change Manifest

Every non-trivial implementation SHALL have a bounded Change Manifest containing:

- capability ID;
- requirement IDs;
- allowed files/directories;
- interfaces changed;
- state changed;
- migrations/configuration changed;
- tests added/changed;
- documentation affected;
- distribution classification;
- explicitly forbidden unrelated changes.

The implementation SHALL remain inside the manifest unless a new contract decision is recorded.

## Documentation Rules

If a change affects architecture, contracts, invariants, commands, deployment, recovery, verification, distribution boundaries, state ownership, concurrency, D1 I/O, overload behavior, or business-domain neutrality, perform a documentation impact check.

Update only the affected authoritative documents. Do not generate documentation churn.

Non-trivial architecture decisions belong in ADRs and SHOULD record credible rejected alternatives when the choice affects scale, correctness, cost, reliability or operational complexity.

Documentation MUST NOT be changed merely to make an implementation appear compliant. If code conflicts with a contract, surface the conflict and resolve the contract before silently rewriting either side.

## Completion Rules

A capability is not complete because code exists.

It is complete only when the applicable contract, implementation, tests, runtime behavior, failure handling, performance evidence, regression evidence, distribution-boundary review, documentation impact review, and independent verification are closed.

Use explicit status values only:

```text
UNKNOWN
READY
IN_PROGRESS
LOCAL_PASS
CONTRACT_PASS
INTEGRATION_PASS
REGRESSION_PASS
CAPABILITY_PASS
RELEASE_READY
RELEASED
ROLLED_BACK
FAILED
BLOCKED
```

A capability SHALL NOT be promoted to `CAPABILITY_PASS` while a required P0/P1 obligation is `UNKNOWN`, `UNPROVEN`, or `FAILED`.

## Stop Conditions

STOP immediately for:

- unresolved P0/P1 defect
- data corruption or loss risk
- security boundary violation
- undocumented architecture drift
- contract violation
- missing authoritative requirement
- fabricated or incomplete verification evidence
- unexplained critical performance regression
- unbounded D1 I/O
- unbounded queue/retry/fan-out behavior
- ambiguous shard ownership
- unproven recovery for a stateful critical capability
- failed concurrency or overload gate
- unresolved commercial/IP boundary
- accidental exposure of proprietary or security-sensitive implementation
- unjustified coupling of core infrastructure to a specific business domain
- documentation that cannot state a correctness-critical behavior precisely enough to test

Do not continue to the next capability until the current capability reaches its required PASS state.
