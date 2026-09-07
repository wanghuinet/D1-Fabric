# D1-Fabric AI Engineering Instructions

**Authority:** D1-Fabric Engineering Constitution v3.0 + v3.1 + v3.2 Addenda + Open-Source / Commercial Boundary Contract + Platform Infrastructure Contract  
**Project:** D1-Fabric  
**Primary language:** TypeScript

## Mission

Build the minimum amount of correct code that provides complete, runnable, verifiable, maintainable, scalable, and deployable distributed-data capability.

Do not optimize for code volume or number of tasks.

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
10. applicable architecture and capability contracts
11. applicable ADRs

Do not infer an architecture or distribution rule from chat history when an authoritative repository document exists.

## Before Implementation

Answer these questions:

```text
What requirement am I implementing?
What is explicitly out of scope?
What is the smallest complete design?
What are the inputs and outputs?
What are the invariants?
What is the hot path?
What is the control/cold path?
What state is authoritative?
What happens on duplicate execution?
What happens on timeout/failure?
How does recovery work?
What is the concurrency boundary?
What is the overload/backpressure behavior?
What is the scaling boundary?
What is the D1 I/O budget?
What is the distribution target: OPEN / COMMERCIAL / MIXED?
Does the implementation contain proprietary algorithms, heuristics, security-sensitive details, or IP risk?
Does this change couple core infrastructure to a specific business domain?
Can the same capability operate over materially different application schemas?
What evidence will prove completion?
```

If a non-trivial question cannot be answered, stop and update the design/contract before coding.

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

## Verification Rules

Never report PASS from source inspection alone.

For applicable capabilities:

```text
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
Concurrency
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
Independent Verification
 ↓
Reproducible Evidence
```

Unknown is not PASS. UNPROVEN is not PASS.

## World-Class Scale Gate

Before `RELEASE_READY`, read and satisfy:

`D1-FABRIC-WORLD-CLASS-SCALE-AND-RELIABILITY-GATE.md`

The evidence must record actual D1 reads/writes, concurrency, latency distribution, errors/rejections, queue peak, shard count, workload, duration, runtime, configuration, and commit/version where applicable.

A screenshot, successful single request, or source inspection is not scale proof.

## Documentation Rules

If a change affects architecture, contracts, invariants, commands, deployment, recovery, verification, distribution boundaries, or business-domain neutrality, perform a documentation impact check.

Update only the affected authoritative documents. Do not generate documentation churn.

Non-trivial architecture decisions belong in ADRs.

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

Do not continue to the next capability until the current capability reaches its required PASS state.
