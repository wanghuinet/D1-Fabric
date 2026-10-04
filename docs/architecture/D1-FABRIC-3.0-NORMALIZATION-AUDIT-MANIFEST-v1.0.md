# D1-Fabric 3.0 Normalization Audit Manifest v1.0

**Status:** ACTIVE GOVERNANCE WORK ITEM
**Branch:** `governance/normalization-ai-evolution`
**Production impact:** none by design

## 1. Audit objective

Normalize the active repository against the 3.0 Master Contract while preserving production behavior and public compatibility. This work is intentionally staged before runtime refactoring.

## 2. Current findings

### P0 — Architecture/contract authority drift

`workers/v2/` currently contains W01-W06 while the Master Contract and AGENTS currently define exactly W01-W04 as normative 3.0 execution boundaries.

Tracking: GitHub issue #2.

### P1 — Worker growth / boundary risk

W02 currently has multiple substantial runtime modules (`index.ts`, `plan.ts`, `read.ts`, `routing.ts`, `scheduler.ts`). This is not itself a defect, but future changes must be constrained by explicit capability ownership and module-level tests.

### P1 — Governance gap

Ownership and dependency rules must be machine-auditable rather than inferred from filenames or conversations.

### P1 — Zero-downtime evolution gap

Runtime changes need an explicit coexistence, progressive rollout, health-gate and rollback contract.

### P1 — AI safety gap

Any future adaptive optimization capability needs a formal boundary between model recommendations and deterministic runtime authority.

## 3. Audit order

```text
A01 authority reconciliation
A02 Worker/capability ownership map
A03 dependency graph and cycle check
A04 contract↔implementation mapping
A05 test↔capability mapping
A06 runtime code health / duplication audit
A07 zero-downtime readiness audit
A08 telemetry / AI readiness audit
A09 adversarial and failure-path audit
A10 final bidirectional architecture/contract audit
```

## 4. Non-goals

This manifest does not authorize:

- new business functionality;
- public API redesign;
- automatic architecture expansion;
- direct AI control of production;
- replacing the Master Contract by chat discussion;
- destructive refactoring of active state;
- stopping production traffic.

## 5. Change classification

Each finding must receive one of:

```text
P0 release/architecture blocking
P1 correctness/architecture boundary
P2 maintainability/governance
P3 optimization
INFO observation
```

Each finding must also declare:

```text
contractId
architectureId
owner
affected files
production risk
verification method
rollback method
```

## 6. Completion gate

Do not start broad runtime refactoring until A01 is resolved. Do not activate AI-controlled optimization until A01-A10 are complete for the affected runtime surface and the Adaptive Intelligence Contract has been promoted from proposed to normative authority.
