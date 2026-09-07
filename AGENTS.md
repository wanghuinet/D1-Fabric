# D1-Fabric AI Engineering Instructions

**Version:** 1.3
**Status:** ACTIVE
**Authority:** `D1-FABRIC-1.0-CONTRACT-BASELINE.md`
**Primary implementation language:** TypeScript

## 1. Mission

Build the minimum amount of correct code that provides complete, runnable, verifiable, maintainable, scalable, secure, recoverable, and deployable distributed-data capability.

Code and AI context should both be minimal: load only what the task needs; keep proof obligations rigorous.

## 2. Authority and Document Routing

The repository is the source of truth:

```text
Contract Baseline
→ Applicable contracts
→ AGENTS.md
→ DEVELOPMENT-PROTOCOL.md
→ Existing verified implementation
→ Execution Packet / Change Manifest
→ Chat
```

`AGENTS.md` is the AI routing entry point. Do not load every document by default.

### Always read

```text
AGENTS.md
D1-FABRIC-1.0-CONTRACT-BASELINE.md
```

### Route by task

```text
Shard/routing/migration      → Architecture + Data/State + Runtime
Read/write execution        → Data/State + Runtime + Performance/Cost
Security/tenant/auth        → Security/Compatibility + Data/State
Failure/retry/recovery      → Reliability/Recovery + Data/State + Runtime
Performance/cost            → Performance/Cost + Runtime + Architecture
Schema/public compatibility → Security/Compatibility + Data/State + Runtime
Runtime AI/optimizer        → AI Governance + Performance/Cost + Security/Compatibility
Verification-only           → Verification/Evidence + contracts named by change
Pure non-semantic refactor  → relevant code/tests + Baseline
```

Load more only when the Semantic Contract Map proves the boundary is affected.

## 3. Development Modes

Choose the smallest safe mode:

```text
T0 Trivial     → inspect → change → targeted verify → record
T1 Local       → contract route → boundary card → manifest → implement → targeted verify → scope gate
T2 Material    → full Semantic Map + Packet + Boundary Card + Manifest → implement → adversarial/full applicable verification → evidence → Capability Gate
```

Never downgrade a task when it touches security, state ownership, routing/epoch, recovery, public compatibility, or cross-shard correctness.

## 4. Required Artifacts

For T1/T2 work use:

```text
Semantic Contract Map
Execution Packet
Module Boundary Card
Change Manifest
Diff Scope Gate
Verification Record
```

T2 also requires `Capability Gate` before `CAPABILITY_PASS` / `RELEASE_READY`.

## 5. Module Boundary Rule

Every non-trivial module/capability MUST have a `templates/MODULE-BOUNDARY-CARD.md` defining:

```text
responsibility / non-responsibility
semantic owner
inputs/outputs/errors
state read/write and authoritative owner
dependencies and forbidden dependencies
D1/network/resource bounds
security/trust/tenant boundary
failure/recovery ownership
verification obligations
```

The implementation MUST NOT move semantics across module boundaries silently.

## 6. Scope Rule

The Change Manifest is the declared implementation boundary. Before completion, the actual diff MUST pass `templates/DIFF-SCOPE-GATE.md`.

Out-of-scope files, dependencies, schema, public APIs, runtime behavior, or new semantic owners are `SCOPE_DRIFT` unless the manifest is explicitly revised with reason and verification.

## 7. Core Invariants

```text
I-01 No global coordinator is mandatory on the data-plane hot path.
I-02 Every mutable state has exactly one authoritative owner.
I-03 Every retryable operation has explicit idempotency semantics.
I-04 Retry MUST NOT amplify overload without bound.
I-05 Shard ownership MUST be unambiguous for a routing epoch.
I-06 Routing decisions MUST be versioned/fenced where migration can race with traffic.
I-07 No request may cause unbounded D1 I/O.
I-08 No queue may grow without bounded admission/backpressure policy.
I-09 No single shard may be an unavoidable global bottleneck.
I-10 Partial failure MUST NOT corrupt committed state.
I-11 Recovery MUST restore routing/state invariants before normal traffic resumes.
I-12 Scalability claims require reproducible evidence.
I-13 Contract semantics MUST NOT be silently redefined by agents.
I-14 AI authority MUST be bounded, observable, and able to downgrade.
I-15 AI knowledge MUST have version, applicability, expiration, and revalidation semantics.
```

## 8. Implementation Rule

Implement the smallest complete solution. No speculative Workers, queues, caches, coordinators, retries, persistent state, dependencies, or abstractions without requirement + protected invariant + measurable benefit + real boundary + verification.

For protected operations preserve:

```text
Authenticate
→ Authorize
→ Resolve authorized scope
→ Canonical routing identity
→ Route
→ Epoch
→ Ownership
→ Resource/consistency policy
→ Idempotency
→ Execute
→ Commit
→ Derived/cache state
```

## 9. Verification and Completion

Never report PASS from compilation, source inspection, model confidence, or implementation-authored tests alone.

Use the smallest applicable verification set:

```text
V0 Static
V1 Unit
V2 Integration
V3 Runtime
V4 Contract/Invariant
V5 Concurrency/Overload
V6 Failure/Recovery
V7 Security/Isolation
V8 Performance/Cost/Regression
V9 Soak/Operational
```

T2 capabilities MUST pass `templates/CAPABILITY-GATE.md`. The implementation agent cannot self-certify completion without evidence.

Critical negative paths where applicable include wrong tenant, unauthorized request, stale epoch, wrong owner, duplicate mutation, ambiguous commit, partial failure, migration interruption, schema mismatch, cache poisoning, resource exhaustion, invalid AI candidate, expired knowledge, and authority downgrade.

## 10. Evidence

Evidence MUST identify the exact evaluated commit, contracts/version, environment, commands, inputs/outputs, results, metrics, limitations, and status. Evidence from another commit is invalid.

## 11. Stop Conditions

STOP on contract conflict, ambiguous ownership, authorization bypass, cross-tenant leakage, stale writer acceptance, data corruption/loss risk, unbounded resource behavior, unproven recovery, schema incompatibility, scope drift, fabricated/wrong-commit evidence, P0/P1 defect, critical regression, or architecture/semantic drift.

## 12. AI Rule

DeepSeek is an implementation agent, not architecture authority. It MUST:

```text
route required context
→ build semantic map
→ define module boundary
→ freeze packet/manifest
→ implement smallest complete change
→ verify immediately
→ pass diff scope gate
→ run adversarial/applicable verification
→ generate evidence
→ pass Capability Gate when required
```

DeepSeek MUST NOT redesign architecture, create a second semantic owner, silently expand scope, fabricate evidence, or mark complete from compilation.

## 13. Contract Evolution

Changes to MUSTs, invariants, semantic ownership, protocol meaning, schema compatibility, security boundaries, routing/epoch semantics, recovery rules, or AI authority require versioned contract evolution before implementation.

## 14. Final Law

> **Contracts define truth. AGENTS.md routes the minimum context. Boundary Cards define module responsibility. The Manifest defines scope. The Diff Scope Gate proves what changed. Independent verification proves semantics. The Capability Gate decides whether the capability is actually complete.**
