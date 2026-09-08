# D1-Fabric Cloudflare Documentation Mapping

**Status:** ACCEPTED  
**Purpose:** Record which public Cloudflare engineering-documentation patterns D1-Fabric adopts, adapts, or rejects.

## 1. Sources Reviewed

The review focused on public Cloudflare engineering material including:

- Wrangler configuration and source-of-truth guidance
- `workerd` repository and local `AGENTS.md` guidance
- Cloudflare Workers reference architectures
- Cloudflare Agents design/RFC documents
- Cloudflare Sandbox architecture documentation

The objective is not to copy Cloudflare implementation. The objective is to extract durable engineering-documentation patterns.

## 2. Adopt

### A. Source of truth

Adopt:

> One authoritative configuration/contract source; other surfaces derive from it.

D1-Fabric application:

```text
Versioned repository
      ↓
Authoritative contract/configuration
      ↓
Runtime / deployment
```

This prevents undocumented dashboard/manual/runtime drift.

### B. Local AI engineering instructions

Adopt repository-local `AGENTS.md` guidance.

It must contain:

- project purpose
- architecture entry points
- authoritative documents
- commands
- forbidden changes
- verification requirements
- evidence requirements
- definition of done

### C. Explicit invariants

Adopt the practice of writing non-negotiable invariants next to architecture/component documentation.

An invariant must be testable or reviewable.

### D. Architecture + implementation + documentation coupling

Adopt the rule that architecture-changing code cannot land without reviewing the corresponding architecture documentation.

### E. Reference architectures

Adopt concise diagrams showing:

```text
Control Plane
      ↓
Routing / Metadata
      ↓
Data Plane
      ↓
Shard-local operations
```

The diagram is a design constraint, not decoration.

### F. Explicit design decisions

Adopt lightweight ADRs for non-trivial decisions so future AI sessions do not repeatedly reopen settled decisions without new evidence.

### G. Capability boundaries

Adopt the principle that boundaries should correspond to real isolation, lifecycle, ownership, scaling, or operational value—not arbitrary task decomposition.

### H. Experimental status

Adopt explicit maturity labels where architecture is intentionally unstable:

```text
EXPERIMENTAL
STABLE
DEPRECATED
REMOVED
```

Do not silently expose experimental behavior as stable.

## 3. Adapt

### A. Cloudflare Binding concept → D1-Fabric Contract/Handle

Cloudflare bindings provide a stable resource interface. D1-Fabric should use the same idea conceptually:

```text
Business capability
      ↓
Typed contract / handle
      ↓
Shard / cache / storage implementation
```

Upper layers must not depend on provider-specific connection details.

### B. Durable Object isolation → shard isolation

The useful pattern is structural isolation of state and responsibility. D1-Fabric applies this to shard boundaries without copying Durable Objects as a product primitive.

### C. Hybrid storage rationale

Cloudflare's public Workspace design demonstrates documenting why small objects can stay local while larger objects spill to another storage tier. D1-Fabric adopts the decision-writing pattern, not the specific threshold or storage implementation.

### D. Code-mode / agent boundary → AI development boundary

The useful principle is to expose narrow typed interfaces rather than broad unrestricted access. D1-Fabric applies this to development tooling and internal capability contracts.

## 4. Reject / Do Not Copy Automatically

D1-Fabric will not adopt:

- Cloudflare-specific APIs merely because they exist
- Durable Objects as a substitute for the D1-Fabric shard model
- Cloudflare service limits as D1-Fabric limits
- additional Workers solely to match Cloudflare terminology
- extra abstractions for future possibilities
- Cloudflare implementation code
- Cloudflare product-specific operational assumptions

## 5. D1-Fabric Documentation Model

The resulting documentation hierarchy is intentionally compact:

```text
Constitution
    ↓
Development Contract
    ↓
Architecture / ADR
    ↓
Capability Contract
    ↓
AGENTS.md
    ↓
Implementation
    ↓
Verification Protocol
    ↓
Evidence
```

The hierarchy is a control loop:

```text
Design
 ↓
Build
 ↓
Verify
 ↓
Evidence
 ↓
Document drift
 ↓
Update contract/architecture when required
```

## 6. Required Documentation Impact Check

Every non-trivial change must ask:

| Area | Question |
|---|---|
| Architecture | Did topology or responsibility change? |
| Contract | Did an input/output/invariant change? |
| AGENTS | Did agent instructions or commands change? |
| ADR | Was a new architectural decision made? |
| Verification | Did required evidence/tests change? |
| Operations | Did deployment/recovery/observability change? |

Only affected documents are updated; unnecessary documentation churn is prohibited.

## 7. Target Outcome

The goal is not "more documentation".

The goal is:

> **Less ambiguity per AI session, fewer architectural regressions, fewer unnecessary modules, fewer D1 operations, and fewer repair cycles.**

A document is valuable only when it constrains decisions, accelerates verification, prevents repeated mistakes, or makes operation reproducible.
