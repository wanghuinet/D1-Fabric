# D1-Fabric 3.0 Code Normalization Contract v1.0

**Status:** PROPOSED / GOVERNANCE BASELINE
**Scope:** repository structure, ownership, dependency boundaries, code health, tests, and safe refactoring
**Authority:** subordinate to `docs/D1-FABRIC-3.0-MASTER-CONTRACT-v1.0.md`

## 1. Purpose

Normalize the D1-Fabric repository without changing public semantics, business behavior, or production availability. The objective is to make code growth bounded, attributable, testable, and safe for incremental evolution.

## 2. Non-negotiable rules

1. One semantic concern has one runtime owner.
2. Every production source file belongs to exactly one Worker or the explicitly approved shared-contract area.
3. Shared code may contain contracts/types/protocol primitives only unless a later architecture change explicitly grants runtime ownership.
4. No Worker may import another Worker's private runtime implementation.
5. Public API semantics remain backward compatible unless a versioned contract explicitly permits change.
6. Refactoring must be behavior-preserving and independently verifiable.
7. No drive-by feature work is permitted during normalization.
8. Generated/build/archive content is never a substitute for active source.

## 3. Ownership baseline

The six runtime boundaries currently present in `workers/v2/` are treated as an implementation state requiring architecture reconciliation before they are declared normative:

| Worker | Proposed current responsibility | Status |
|---|---|---|
| W01 Fabric Gateway | Edge admission, protocol normalization, authentication/authorization handoff | reconcile against Master Contract |
| W02 Execution Fabric | bounded execution planning, routing dispatch, scheduling, read execution | reconcile against Master Contract |
| W03 Write Fabric | write execution, idempotency and write-side guarantees | reconcile against Master Contract |
| W04 Control Plane | active control policy and runtime governance | reconcile against Master Contract |
| W05 Reliability Plane | timeout, retry, circuit breaking, recovery, degradation | reconcile before normative use |
| W06 Control Plane | placement, topology, shard metadata, expansion, migration, rebalance | reconcile before normative use |

**Critical:** this table does not authorize W05/W06 architecture. The normative authority remains the Master Contract until an explicit architecture revision is approved.

## 4. File boundaries

Every Worker keeps an independent package boundary:

```text
workers/v2/<worker>/
  package.json
  package-lock.json
  tsconfig.json
  wrangler.toml
  src/
  tests/
```

Shared contracts live under:

```text
workers/v2/contracts/
```

Worker-local runtime implementation MUST remain inside its Worker directory.

## 5. Module structure

Within a Worker, prefer:

```text
src/index.ts          # transport/entry orchestration only
src/<capability>/      # capability implementation
src/adapters/          # external/runtime adapters
src/errors/            # typed error taxonomy
src/types/             # local types
```

`index.ts` MUST NOT become a second implementation layer. Complex logic belongs in named modules with explicit tests.

## 6. Code-health thresholds

These are engineering warning thresholds, not external industry standards:

| Scope | Green | Warning | Mandatory review |
|---|---:|---:|---:|
| single source file | <500 LOC | 500-800 | >800 |
| capability module | <2,000 LOC | 2,000-4,000 | >4,000 |
| Worker runtime | <8,000 LOC | 8,000-15,000 | >15,000 |

Crossing a threshold does not automatically require splitting. It requires an architecture/ownership review before further growth.

## 7. Dependency law

Allowed direction:

```text
Public contract
    ↓
Worker boundary
    ↓
Worker-local modules
    ↓
Cloudflare/platform adapters
```

Forbidden:

```text
Worker A private runtime → Worker B private runtime
circular Worker dependencies
business semantics → Fabric kernel
runtime implementation → archive/legacy
```

## 8. Test ownership

Each capability must map to at least one of:

- unit tests
- contract tests
- integration tests
- negative/failure tests
- regression tests
- property/adversarial tests when required by the Master Contract

A source module without an identifiable verification path is an audit finding.

## 9. Change discipline

Every normalization change requires a Change Manifest containing:

```text
changeId
phaseId
contractIds
architectureIds
allowedFiles
forbiddenFiles
expected behavior
invariants
failure/security/resource cases
tests
rollback strategy
```

No source file outside the manifest may change.

## 10. Zero-downtime rule

Runtime refactoring follows:

```text
baseline
→ compatibility implementation
→ parallel verification
→ shadow where observable
→ canary when deployable
→ progressive rollout
→ health gate
→ rollback/LKG
```

No migration may require an all-at-once replacement of a live execution path unless an explicit platform constraint makes that unavoidable and a separate contract approves it.

## 11. Version compatibility

New behavior MUST be introduced behind a versioned contract, capability flag, or backward-compatible implementation seam. Old and new versions must coexist for the declared transition window.

Removal follows:

```text
ACTIVE → DEPRECATED → DRAINING → RETIRED
```

## 12. AI-readiness

The repository MUST expose structured telemetry sufficient for offline analysis without allowing AI output to bypass runtime contracts.

AI-generated recommendations are advisory until validated:

```text
OBSERVE → LEARN → PROPOSE → SIMULATE → CANARY → EVALUATE → ACTIVATE
```

AI MUST NOT directly mutate production routing, quota, authorization, budget, idempotency, epoch/fencing, or security policy.

## 13. Completion criteria

Normalization is complete only when:

- architecture ownership is reconciled with the Master Contract;
- every active runtime file has a clear owner;
- dependency direction is acyclic and documented;
- duplicate semantic implementations are removed or explicitly justified;
- tests map to capabilities and contracts;
- zero-downtime rollout/rollback exists for changed runtime paths;
- AI-facing telemetry is structured but safety-bounded;
- exact pushed commit and reproducible evidence are recorded.
