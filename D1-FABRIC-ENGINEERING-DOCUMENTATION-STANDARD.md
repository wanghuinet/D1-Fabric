# D1-Fabric Engineering Documentation Standard

**Status:** ACTIVE GOVERNANCE CONTRACT  
**Scope:** A00–A07 and all future core capabilities  
**Authority:** Supplements the Engineering Constitution, Development Contract, Platform Infrastructure Contract and Open Infrastructure Moat Contract.  
**Purpose:** Make architecture, implementation obligations, verification requirements and operational guarantees precise enough that an implementation can be independently reviewed without relying on chat history or developer intent.

---

## 1. Documentation Is an Engineering Control

D1-Fabric documentation is not explanatory prose written after implementation.

For every non-trivial capability, the authoritative document SHALL define the behavior that code is required to implement and the evidence required to prove it.

A capability is therefore governed by:

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

If the contract cannot be stated precisely, implementation SHALL NOT begin.

---

## 2. Normative Language

Governance documents SHALL use normative terms consistently:

- **MUST / SHALL** — mandatory; violation blocks PASS.
- **MUST NOT / SHALL NOT** — prohibited.
- **SHOULD** — strong engineering default; deviation requires rationale.
- **SHOULD NOT** — strong negative default.
- **MAY** — permitted but not required.
- **UNKNOWN** — insufficient evidence.
- **UNPROVEN** — requirement exists but evidence is incomplete.

Words such as "probably", "normally works", "should be fine", "high performance", "scalable", or "production-ready" SHALL NOT be used as substitutes for measurable requirements.

---

## 3. Capability Specification Standard

Every A01–A07 capability contract SHALL contain, where applicable:

1. **Purpose** — exact problem solved.
2. **Scope** — included behavior.
3. **Non-Goals** — explicitly excluded behavior.
4. **Terminology** — authoritative definitions.
5. **Inputs** — accepted forms and limits.
6. **Outputs** — response/result semantics.
7. **State Model** — mutable and immutable state.
8. **Authoritative Owner** — exactly one owner for each mutable state.
9. **Invariants** — properties that must never be violated.
10. **Execution Model** — normal request path and control/cold path.
11. **Concurrency Model** — serialization, parallelism, races and ownership boundaries.
12. **Failure Model** — timeout, retry, partial failure, restart and recovery.
13. **Idempotency Model** — duplicate execution semantics.
14. **Consistency Model** — visibility/order/atomicity guarantees.
15. **Resource Budgets** — D1 I/O, fan-out, retries, queue depth, memory, CPU/time where relevant.
16. **Overload Model** — admission, rejection, degradation and recovery.
17. **Security Model** — trust boundaries, authorization and data exposure.
18. **Observability** — required metrics, logs, traces and audit evidence.
19. **Compatibility** — versioning and migration requirements.
20. **Verification Matrix** — exact tests proving each obligation.
21. **Evidence Format** — reproducible evidence required for PASS.
22. **Distribution Classification** — OPEN / COMMERCIAL / MIXED.
23. **Rejected Alternatives** — important designs considered and why rejected.
24. **Exit Criteria** — objective conditions for completion.

A document missing a correctness-critical section SHALL mark that section `NOT SPECIFIED`, not silently assume behavior.

---

## 4. Requirement Traceability

Every non-trivial requirement SHALL have a traceable chain:

```text
REQ-ID
  ↓
CONTRACT-CLAUSE
  ↓
IMPLEMENTATION-SURFACE
  ↓
TEST-ID
  ↓
EVIDENCE-ID
```

Example:

```text
REQ-A02-ROUTE-001
→ A02 §6 deterministic routing
→ runtime/router.ts
→ A02-T-017
→ A02-E-017
```

A requirement without implementation or verification mapping is incomplete.

A test without a requirement or invariant is not sufficient proof of architectural correctness.

---

## 5. Invariant Standard

Critical invariants SHALL be stated as falsifiable properties.

Weak:

> Routing should be reliable.

Strong:

> For a fixed routing epoch, the same valid partition identity SHALL resolve to the same authoritative shard unless the request is explicitly participating in an approved ownership transition.

Each invariant SHOULD identify:

- invariant ID;
- precondition;
- required property;
- forbidden state;
- owner;
- verification method;
- recovery requirement if violated.

An invariant that cannot be tested, inspected, or otherwise evidenced SHALL be marked `UNPROVEN`.

---

## 6. State Ownership Standard

For every mutable state, documentation SHALL answer:

```text
What is the state?
Who owns it?
Where is it stored?
Who may mutate it?
What version/epoch identifies it?
What happens on stale access?
How is it recovered?
How is ownership transferred?
```

Two components MUST NOT independently believe they are authoritative for the same mutable state.

Caches, replicas, snapshots and derived indexes SHALL be explicitly classified as authoritative or non-authoritative.

---

## 7. Hot-Path Specification

Every data-plane capability SHALL explicitly document its hot path.

The specification SHALL identify, in order:

- request parsing;
- routing lookup;
- cache access;
- query/write execution;
- D1 operations;
- serialization;
- response generation;
- retry boundaries;
- network boundaries.

The documentation SHALL distinguish:

```text
MANDATORY HOT PATH
OPTIONAL FAST PATH
CONTROL / COLD PATH
BACKGROUND WORK
RECOVERY PATH
```

The normal hot path MUST NOT silently depend on control-plane availability when correctness permits local/versioned state.

---

## 8. Resource-Budget Standard

Every capability that can consume bounded infrastructure resources SHALL declare explicit budgets.

At minimum, D1-Fabric core capabilities SHALL consider:

- maximum D1 reads/request;
- maximum D1 writes/request;
- maximum cross-shard fan-out;
- maximum retry attempts;
- maximum retry amplification;
- maximum queue/admission depth;
- maximum batch size;
- timeout/deadline;
- cache behavior;
- memory growth;
- payload/input limits.

The contract SHALL define what happens when a budget is exceeded:

```text
ALLOW
DEGRADE
PARTIAL
REJECT
SHED
```

A budget that exists only as an implementation convention is not a contract.

---

## 9. Failure and Recovery Specification

Failure handling SHALL be documented before implementation for stateful or distributed capabilities.

At minimum, consider:

- duplicate request;
- timeout;
- retry;
- cancellation;
- stale routing;
- shard unavailable;
- D1 unavailable/error;
- partial multi-shard failure;
- concurrent conflicting operation;
- process/Worker restart;
- migration race;
- corrupted/incomplete local state;
- queue/resource exhaustion.

For each failure, document:

```text
Detection
  ↓
Containment
  ↓
Client-visible behavior
  ↓
State safety
  ↓
Retry / recovery
  ↓
Return-to-service condition
```

"Retry later" is not a recovery specification.

---

## 10. Concurrency Specification

Every capability involving shared mutable state SHALL define its concurrency boundary.

Documentation SHALL state:

- what can execute concurrently;
- what must serialize;
- what key defines serialization;
- where races can occur;
- how stale state is detected;
- how duplicate work is prevented or tolerated;
- how lock/lease/epoch ownership is represented;
- what happens during concurrent migration or recovery.

Concurrency correctness SHALL be demonstrated with adversarial tests, not inferred from single-threaded unit tests.

---

## 11. API and Data Contract Standard

Public interfaces SHALL specify:

- request/response shape;
- required/optional fields;
- validation rules;
- error classes;
- idempotency behavior;
- timeout semantics;
- version compatibility;
- size/rate limits where relevant.

Schemas SHALL distinguish:

```text
required
optional
nullable
defaulted
computed
deprecated
forbidden
```

Ambiguous field semantics are a contract defect.

---

## 12. Architecture Diagram Standard

Architecture diagrams SHALL show behavior, not merely component names.

A meaningful diagram SHOULD show:

```text
Caller
  ↓
Boundary
  ↓
Data Plane
  ↓
Shard / Storage

Control Plane
  ↕
Data Plane
```

Arrows SHALL indicate meaningful dependency or data flow.

If a component is mandatory on the hot path, the diagram SHALL make that dependency visible.

If a component is control-plane only, it SHALL NOT be drawn as though every request synchronously depends on it.

---

## 13. Decision and Rejection Records

Important architectural decisions SHALL record both:

- the selected design;
- credible alternatives rejected.

A rejection record SHOULD include:

```text
Alternative
Expected Benefit
Failure / Cost
Why It Violates Current Constraints
Evidence
Decision
Revisit Condition
```

This prevents future developers or AI agents from repeatedly reopening already-resolved architectural questions.

---

## 14. AI Implementation Contract

AI agents SHALL treat authoritative documentation as executable engineering constraints.

Before coding, the agent SHALL produce internally or in the task record:

```text
Requirement
Scope
Non-Goals
Contract
Invariants
State Ownership
Hot Path
Failure Model
Concurrency Model
Budgets
Change Manifest
Verification Plan
```

The agent SHALL NOT:

- invent missing requirements;
- infer permission from existing code;
- expand scope because an abstraction appears convenient;
- rewrite correct code merely to match personal style;
- create code before resolving correctness-critical ambiguity;
- use passing tests to justify violation of a higher-level contract.

When documentation and code disagree, the disagreement SHALL be surfaced as a contract issue rather than silently resolved by whichever is easier to edit.

---

## 15. Change Manifest Standard

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

---

## 16. Verification Matrix Standard

Verification SHALL map obligations to evidence.

Minimum structure:

| Requirement / Invariant | Test | Expected Result | Evidence | Status |
|---|---|---|---|---|
| REQ-ID | TEST-ID | measurable result | EVIDENCE-ID | PASS/FAIL/UNKNOWN |

The matrix SHALL include negative and adversarial behavior where applicable.

A green unit-test count without requirement coverage is not an architecture PASS.

---

## 17. Performance Documentation Standard

Performance claims SHALL use measurable language.

Instead of:

> Very fast and highly scalable.

Use:

```text
Workload:
Concurrency:
Duration:
Shard count:
Read/write mix:
Payload distribution:
P50:
P95:
P99:
Throughput:
Error/rejection rate:
D1 reads/request:
D1 writes/request:
Cross-shard fan-out:
Retry amplification:
Queue peak:
Cache hit rate:
D1 read avoidance ratio:
Commit SHA:
Runtime/configuration:
```

Claims SHALL be scoped to the tested workload. No benchmark may imply universal capacity.

---

## 18. Security Documentation Standard

Every trust boundary SHALL identify:

- caller;
- authenticated identity where applicable;
- authorization decision;
- data boundary;
- secret boundary;
- untrusted input;
- serialization/deserialization boundary;
- abuse/rate-limit behavior;
- logging/redaction requirements.

Security-sensitive assumptions SHALL NOT be left implicit in code comments alone.

---

## 19. Documentation Change Control

Documentation SHALL be version-controlled together with the implementation it governs.

A change affecting any of the following requires documentation impact review:

- architecture;
- public interface;
- state ownership;
- routing;
- consistency;
- retry/idempotency;
- D1 I/O;
- concurrency;
- overload/backpressure;
- recovery;
- deployment;
- observability;
- security;
- open/commercial boundary.

Documentation MUST NOT be changed merely to make an implementation appear compliant.

If code cannot satisfy the existing contract, the correct sequence is:

```text
Detect Conflict
  ↓
Assess Impact
  ↓
Update Contract / ADR if justified
  ↓
Freeze New Contract
  ↓
Implement
  ↓
Verify
```

---

## 20. Review Severity

Documentation review SHALL classify findings:

- **P0** — correctness, data integrity, security, ownership, recovery or contract failure that blocks continuation/release.
- **P1** — material scalability, concurrency, failure, cost, compatibility or verification deficiency that blocks capability PASS.
- **P2** — important quality/debt issue that does not invalidate the capability but must be tracked.
- **P3** — editorial or low-impact improvement.

A documentation omission is P0/P1 when it hides or leaves ungoverned a corresponding correctness-critical behavior.

---

## 21. Infrastructure-Grade Review Questions

Before approving a major capability, an independent reviewer SHALL be able to answer without consulting chat history:

1. What exactly does this capability guarantee?
2. What does it explicitly not guarantee?
3. Who owns every mutable state?
4. What is the normal hot path?
5. How many D1 operations can one request cause?
6. What happens under concurrency?
7. What happens under retry and duplicate execution?
8. What happens when a shard or D1 fails?
9. How does the system recover?
10. What is bounded and what is unbounded?
11. Where is overload rejected or shed?
12. What evidence proves the claim?
13. What code is actually allowed to change?
14. Which parts are open and which are commercial?
15. Why was the chosen architecture preferred over credible alternatives?

If the reviewer cannot answer these from repository evidence, the capability is not documentation-complete.

---

## 22. Definition of Documentation-Complete

A capability is **DOCUMENTATION_COMPLETE** only when:

- requirements are explicit;
- scope and non-goals are explicit;
- terminology is unambiguous;
- state ownership is explicit;
- invariants are falsifiable;
- hot/control paths are explicit;
- concurrency is explicit;
- failure/recovery is explicit;
- resource budgets are explicit;
- verification obligations are mapped;
- evidence format is defined;
- distribution boundary is defined;
- important rejected alternatives are recorded;
- implementation scope is bounded.

`DOCUMENTATION_COMPLETE` does not mean implementation is correct. It means the implementation can now be judged objectively.

---

## 23. Definition of Infrastructure-Grade

A D1-Fabric capability SHOULD NOT be described as infrastructure-grade merely because it has sophisticated code.

It becomes infrastructure-grade only when:

```text
Precise Contract
      +
Minimal Correct Implementation
      +
Explicit Invariants
      +
Bounded Resources
      +
Defined Failure/Recovery
      +
Adversarial Verification
      +
Reproducible Evidence
      +
Stable Protocol
      +
Operational Knowledge
      =
Infrastructure-Grade Capability
```

Complexity without proof is not engineering strength.

The objective is not to make the source code intimidating by size. The objective is to make the **engineering standard difficult to imitate without actually understanding distributed systems**.

---

## 24. Final Principle

> **The code should be small enough to understand, while the contract should be rigorous enough that correctness, scale, failure behavior and cost cannot be hand-waved.**

> **Make the protocol open, the invariants explicit, the evidence reproducible, the implementation minimal, and the engineering bar difficult to fake.**
