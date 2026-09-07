# D1-Fabric Engineering Constitution v3.1 Addendum

**Project:** D1-Fabric  
**Base Constitution:** `D1-FABRIC-ENGINEERING-CONSTITUTION-V3.0.md`  
**Effective Constitution:** v3.0 + this addendum  
**Status:** MANDATORY  
**Purpose:** Cloudflare-inspired engineering governance improvements

---

## 0. Authority and Precedence

This addendum is normative and extends Constitution v3.0. If this addendum conflicts with v3.0, this addendum governs for the specific topic it addresses.

It incorporates engineering patterns observed in Cloudflare's public projects and documentation, including:

- explicit invariants and local `AGENTS.md` guidance
- configuration as source of truth
- architecture/design records
- explicit component boundaries
- reference-architecture documentation
- deliberate separation of user-facing documentation and AI/development instructions

These patterns are adopted as engineering ideas, not as copied implementation or proprietary code.

---

## 1. Architecture Is Executable Governance

Architecture documentation is not historical prose. It is a constraint on implementation.

Every architectural capability MUST have an authoritative record covering:

```text
Purpose
Owns
Does NOT Own
Inputs
Outputs
Dependencies
Invariants
Failure Model
Recovery Model
Scale Model
Cost Model
Verification Model
```

If implementation changes an architectural invariant, the architecture record MUST be updated in the same change.

A code change that invalidates documented architecture without updating the architecture record is incomplete.

---

## 2. Configuration Source of Truth

D1-Fabric MUST have one authoritative configuration model for each deployable environment.

Configuration MUST NOT be silently split between:

```text
Repository
Dashboard
Environment Variables
Runtime Defaults
Hidden Code Constants
Manual Production Changes
```

Where multiple configuration surfaces exist, one MUST be explicitly designated as the source of truth and all other surfaces MUST be derived or synchronized from it.

Runtime behavior MUST be reproducible from versioned source, configuration, and deployment metadata.

---

## 3. Control Plane / Data Plane Separation

The D1-Fabric architecture MUST distinguish control-plane work from hot-path data-plane work.

```text
Control Plane
    ↓
Topology / Metadata / Policy / Epoch
    ↓
Data Plane
    ↓
Shard-local Read / Write / Query
```

The control plane MUST NOT become a mandatory global bottleneck for normal data-plane traffic.

Hot-path operations SHOULD use locally available routing and metadata whenever correctness permits.

Any design that sends every request through a single coordinator requires explicit architecture approval and a measured capacity justification.

---

## 4. Capability Boundary, Not Task Boundary

A Worker/module is a capability boundary.

Do not split a capability merely to create more AI tasks, files, workers, or PASS records.

Prefer:

```text
One coherent capability
    ↓
One contract
    ↓
One implementation boundary
    ↓
One verification closure
```

over artificial micro-services or micro-modules with cross-boundary overhead and no independent operational value.

---

## 5. Explicit Invariants

Every critical subsystem MUST define explicit invariants.

Examples:

```text
Shard identity is stable for a routing epoch.
A committed write is idempotently recoverable.
A cache entry cannot outlive its invalidation contract.
A query cannot silently read from an incompatible shard epoch.
Control-plane metadata cannot corrupt data-plane state.
```

Invariants MUST be:

1. written in documentation;
2. represented in tests where practical;
3. checked during code review;
4. included in independent verification.

The phrase "should be true" is not an invariant.

---

## 6. ADR / Architecture Decision Record

Non-trivial architectural decisions MUST be recorded as ADRs.

Minimum ADR structure:

```text
Decision ID
Status
Context
Problem
Decision
Alternatives Considered
Why Rejected
Consequences
Verification
Revisit Trigger
```

An ADR exists to prevent AI or developer sessions from repeatedly reopening already-settled architectural decisions without new evidence.

Suggested directory:

```text
architecture/adr/
```

Do not create an ADR for trivial implementation details.

---

## 7. AI Agent Operating Contract

Repository-local AI instructions MUST be available through `AGENTS.md` or an equivalent authoritative agent instruction file.

The AI instruction layer MUST tell an agent at minimum:

```text
Repository purpose
Architecture entry points
Authoritative documents
Build command
Test command
Lint / format command
Benchmark command
Verification command
Forbidden changes
Required evidence
Definition of done
```

Development instructions belong in the agent-development contract; end-user instructions belong in README/user documentation.

The AI MUST read authoritative project instructions before modifying code.

---

## 8. Documentation Change Gate

Behavioral or architectural changes MUST trigger a documentation impact check.

At minimum review:

```text
Architecture documentation
Contracts
AGENTS.md
ADRs
Verification protocol
Operational documentation
```

Not every code change requires all documents to change. The review MUST explicitly determine whether each affected document requires an update.

A reviewer MUST flag undocumented architectural drift.

---

## 9. Simplicity Before Abstraction

D1-Fabric MUST prefer the simplest architecture that satisfies the current contract.

Before introducing a new abstraction, the implementation MUST answer:

```text
What current requirement needs it?
What complexity does it remove?
What runtime cost does it add?
Can the current capability be implemented without it?
```

No abstraction is justified solely because a future feature might need it.

---

## 10. Data Locality and Hybrid Storage

When a capability uses more than one storage system, the design MUST document the locality rationale.

Prefer the storage path that minimizes unnecessary network round trips and cross-boundary operations while preserving correctness.

For every storage tier, document:

```text
What data belongs here?
Why here?
Size threshold, if any
Read path
Write path
Consistency
Failure behavior
Eviction / lifecycle
Cost impact
```

A hybrid design MUST NOT be introduced merely for architectural fashion.

---

## 11. Hot Path Budget

Every critical request path MUST identify:

```text
Network hops
Storage operations
Coordination operations
Serialization / deserialization
Cache lookups
Retries
```

The design target is:

> **Minimum necessary operations on the hot path.**

Particularly for D1-Fabric, unnecessary D1 reads/writes and centralized coordination are treated as architectural cost, not micro-optimizations.

---

## 12. Evidence-Driven Performance

Performance claims MUST identify the workload and environment.

A benchmark result without:

```text
Dataset
Concurrency
Duration
Warm/Cold State
Runtime Version
Configuration
Baseline
```

is informational only and cannot establish a performance contract.

Performance optimization MUST NOT weaken correctness, consistency, durability, security, or observability without an explicit approved trade-off.

---

## 13. Design Review Checklist

Before implementation of a non-trivial capability, the AI MUST answer:

```text
1. What is the smallest complete design?
2. What is the hot path?
3. What is the cold/control path?
4. What state is authoritative?
5. What are the invariants?
6. What happens on duplicate execution?
7. What happens on timeout/failure?
8. What is the recovery path?
9. What is the scaling boundary?
10. What is the cost driver?
11. What existing contract is affected?
12. What evidence will prove completion?
```

If these cannot be answered, implementation is not ready.

---

## 14. Definition of Done v3.1

A capability is complete only when:

```text
Requirement
  ↓
Design
  ↓
Contracts
  ↓
Invariants
  ↓
Implementation
  ↓
Tests
  ↓
Runtime
  ↓
Failure / Recovery
  ↓
Performance / Cost
  ↓
Regression
  ↓
Documentation Impact Check
  ↓
Independent Verification
  ↓
Evidence
  ↓
CAPABILITY_PASS
```

Code existence is never sufficient evidence of completion.

---

## 15. Explicit Non-Adoption

D1-Fabric does NOT automatically adopt Cloudflare's product architecture, APIs, limits, naming, implementation, or service-specific assumptions.

Only general engineering patterns are adopted when they satisfy D1-Fabric requirements.

The following are explicitly rejected:

```text
Copying Cloudflare implementation without need
Adding components merely because Cloudflare has them
Increasing module count for documentation symmetry
Introducing dependencies for architectural fashion
Treating public examples as proof of D1-Fabric correctness
```

D1-Fabric remains optimized for its own requirements: minimum correct code, high concurrency, deterministic sharding, low D1 I/O, low coordination overhead, strong verification, and controlled AI development.

---

## 16. Effective Rule

From v3.1 onward:

> **Architecture, contracts, invariants, source-of-truth configuration, AI instructions, verification, and evidence form one engineering control system.**

No single document is sufficient by itself.
