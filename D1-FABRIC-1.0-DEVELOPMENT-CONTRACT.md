# D1-Fabric 1.0 Development Contract

**Project:** D1-Fabric  
**Release Target:** D1-Fabric 1.0  
**Status:** MANDATORY  
**Authority:** D1-Fabric Engineering Constitution v3.0  
**Engineering Goal:** Minimum complete production-capable distributed data infrastructure with minimum unnecessary code and minimum development cycle.

---

## 0. Purpose

D1-Fabric 1.0 is the first complete core distributed-data-infrastructure release.

Version 1.0 is **not** a single-node MVP and is **not** required to contain every future advanced capability.

The objective is:

> **Implement the complete approved D1-Fabric core with the minimum amount of correct production code, minimum artificial task decomposition, and a development cycle targeted at approximately 30% of the previous process duration without weakening verification, reliability, security, or release gates.**

The 30% target is an engineering efficiency target, not permission to skip tests, runtime verification, independent verification, or evidence.

---

## 1. D1-Fabric 1.0 Scope

The 1.0 core is limited to the approved core capability chain:

```text
A00 Constitution
    ↓
A01 Architecture / Foundation
    ↓
A02 Shard Engine
    ↓
A03 Query Engine
    ↓
A04 Cache Layer
    ↓
A05 Write Engine
    ↓
A06 Storage Engine
    ↓
A07 Control / Cluster
    ↓
Integration / Verification
    ↓
D1-Fabric 1.0
```

A08 and later capabilities are **out of scope for the 1.0 release** unless a formal scope change is approved.

A08+ functionality must not be introduced indirectly through hidden dependencies, speculative interfaces, placeholder implementations, or scope expansion inside A01-A07.

---

## 2. Seven Delivery Workers

The project must not be decomposed into dozens or hundreds of independently gated micro-tasks.

The primary delivery boundaries are:

| Worker | Capability | Primary Responsibility |
|---|---|---|
| W01 | Foundation | Runtime, API, data model, common errors, config, observability, test harness |
| W02 | Shard | Shard map, routing, split, move, rebalance, ownership |
| W03 | Query | Parse, plan, route, execute, parallel execution, merge, pagination |
| W04 | Cache | Get/set, TTL, eviction, invalidation, hot-key and stampede protection |
| W05 | Write | Batch, WAL, idempotency, deduplication, retry, backpressure, flush |
| W06 | Storage + Control | Persistence, recovery, node health, membership, cluster state, coordination |
| W07 | Integration / Verification | Full integration, E2E, failure, recovery, security, benchmark, regression, independent verification, release evidence |

W07 must not introduce unrelated production business logic.

---

## 3. Worker Is the Primary AI Context Boundary

A Worker is a **Capability Boundary**, not a task boundary.

Internal implementation steps may be decomposed by the Coding Agent as needed, but they are not separate approval gates unless a critical architecture or contract decision requires review.

Correct model:

```text
Worker
 ├── Internal Step 1
 ├── Internal Step 2
 ├── Internal Step 3
 ├── Internal Step N
 ↓
Worker Verification
 ↓
CAPABILITY_PASS
```

Incorrect model:

```text
100 micro-tasks
 ↓
100 context switches
 ↓
100 partial approvals
 ↓
Repeated integration and rework
```

---

## 4. Minimal Complete Implementation

Every capability must use the simplest implementation that satisfies its frozen contracts.

The optimization target is **not minimum line count**. It is:

```text
Minimum Correct Code
+
Minimum Necessary Abstractions
+
Minimum Necessary Dependencies
+
Minimum Necessary State
+
Minimum Necessary Network Hops
+
Minimum Duplicate Paths
```

No code may be removed merely to make the LOC number smaller if that weakens correctness, safety, observability, testing, recovery, or maintainability.

---

## 5. Architecture Simplicity Rules

The following rules are mandatory unless architecture review documents a concrete need:

### 5.1 No speculative abstraction

Do not create an abstraction for a future implementation that does not currently exist.

### 5.2 No duplicate execution path

A capability should have one primary production execution path unless multiple paths are required by the contract.

### 5.3 No wrapper without behavior

A wrapper must provide a real boundary, policy, transformation, safety property, or observable behavior.

### 5.4 No adapter without a real boundary

Do not create adapters merely to make the architecture look extensible.

### 5.5 No unused interface

Unused interfaces and type layers must not be introduced for speculative future use.

### 5.6 No premature generalization

Generalize only after a real requirement requires it.

### 5.7 No duplicate state

Each authoritative piece of state should have one clear owner.

### 5.8 No unnecessary dependency

If TypeScript, the existing runtime, or an existing project dependency can solve the requirement adequately, do not add another dependency.

### 5.9 No placeholder production implementation

TODOs, FIXME markers, fake implementations, always-success paths, and test-only behavior are not production completion.

### 5.10 No unrelated refactor

Do not expand a Worker into unrelated cleanup or architecture changes.

---

## 6. Shared Execution Path

Common infrastructure must be reused instead of duplicated.

Where applicable, prefer one shared path for:

```text
Request Validation
Routing
Error Handling
Timeout
Cancellation
Observability
Recovery
```

Worker-specific behavior should be implemented at the actual capability boundary.

Do not create separate copies of the same logic for each Worker merely to reduce coupling on paper.

---

## 7. Worker Development Loop

Each Worker follows one complete engineering loop:

```text
READ
 ↓
UNDERSTAND
 ↓
REQUIREMENT
 ↓
DESIGN
 ↓
DESIGN REVIEW
 ↓
CONTRACT FREEZE
 ↓
IMPLEMENT
 ↓
TYPE CHECK
 ↓
TEST
 ↓
BUILD
 ↓
START
 ↓
REAL REQUEST
 ↓
FAILURE / RECOVERY
 ↓
SECURITY
 ↓
PERFORMANCE
 ↓
REGRESSION
 ↓
AI SELF REVIEW
 ↓
INDEPENDENT VERIFICATION
 ↓
EVIDENCE
 ↓
CAPABILITY_PASS
```

Only the Worker boundary is a mandatory progression gate. Internal implementation steps should not create unnecessary waiting or context switching.

---

## 8. 30% Cycle-Time Strategy

The cycle-time target must be achieved by eliminating waste, not by removing engineering controls.

Primary reductions:

```text
Reduce Task Fragmentation
Reduce Context Switching
Reduce Repeated Design
Reduce Interface Churn
Reduce Duplicate Code
Reduce Speculative Abstraction
Reduce Dependency Count
Reduce Repeated Integration
Reduce Manual Evidence Collection
Reduce Unnecessary AI Handoffs
```

The following must **not** be removed to meet the time target:

```text
Build Verification
Runtime Verification
Real Requests
Failure Testing
Recovery Testing
Security Verification
Performance Verification
Regression
Independent Verification
Evidence
Release Verification
```

---

## 9. Worker Integration Policy

A Worker should be integrated immediately after its capability reaches the required verification stage.

Do not develop all Workers independently and postpone integration until the end.

Required progression:

```text
W01 PASS
 ↓
W02 PASS
 ↓
W03 PASS
 ↓
W04 PASS
 ↓
W05 PASS
 ↓
W06 PASS
 ↓
W07 FINAL VERIFICATION
```

Each completed Worker must be runnable against the current system baseline before the next Worker begins.

---

## 10. Scope Protection

The Coding Agent must not silently expand 1.0.

When encountering an A08+ requirement during 1.0 implementation:

```text
Identify
 ↓
Record as OUT_OF_SCOPE
 ↓
Do not implement
 ↓
Continue approved 1.0 scope
```

If the requirement is critical to A01-A07 correctness, it must be raised as an explicit architecture/change request rather than silently implemented.

---

## 11. 1.0 Exit Criteria

D1-Fabric 1.0 may be released only when the approved A01-A07 capability chain is complete and the Constitution v3.0 gates are satisfied.

Minimum release proof:

```text
Foundation PASS
AND
Shard PASS
AND
Query PASS
AND
Cache PASS
AND
Write PASS
AND
Storage + Control PASS
AND
Integration PASS
AND
Failure / Recovery PASS
AND
Security PASS
AND
Performance PASS
AND
Regression PASS
AND
Independent Verification PASS
AND
Evidence COMPLETE
```

No A08+ functionality is required for the 1.0 release.

---

## 12. Final Rule

D1-Fabric 1.0 development follows this principle:

> **Do not build less. Build only what is required, build it completely, and avoid every unit of code, abstraction, dependency, task decomposition, context switch, and rework that does not increase the delivered capability.**

The desired result is:

```text
Fewer Workers
    ↓
Larger Complete Capabilities
    ↓
Less Context Switching
    ↓
Less Rework
    ↓
Less Code
    ↓
Same or Stronger Verification
    ↓
Faster D1-Fabric 1.0
```
