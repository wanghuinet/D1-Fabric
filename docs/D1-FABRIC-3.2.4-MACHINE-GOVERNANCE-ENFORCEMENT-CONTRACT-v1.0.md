# D1-Fabric 3.2.4 Machine Governance Enforcement Contract

Version: 1.0  
Status: DRAFT FOR ARCHITECTURE REVIEW — MACHINE ENFORCEMENT SPECIFICATION  
Scope: Capability Registry, ADR Registry, Ownership Map, Dependency DAG, Binding Ownership, Change Manifest, Diff Scope Gate and historical isolation  
Precondition: 3.2 remains non-ACTIVE until this contract is implemented and its mandatory gates produce evidence.

## 0. Executive Decision

D1-Fabric governance SHALL become executable repository policy.

The following are authoritative machine-governed registries:

1. Capability Registry
2. ADR Registry
3. Ownership Map
4. Dependency DAG
5. Binding Ownership Registry
6. Change Manifest Registry
7. Diff Scope Gate
8. Historical Isolation Registry
9. Evidence Registry

A registry entry is not authoritative because it exists in documentation. It is authoritative only when its schema validates, its owner is resolvable, its references resolve, and the corresponding CI gate accepts it.

The governance pipeline is:

`Repository → Parse → Schema Validate → Resolve References → Build DAG → Evaluate Invariants → Compare Change Manifest → Produce Evidence → Gate`

## 1. Authority Model

Machine governance SHALL distinguish:

- Source of Truth: authoritative registry or contract.
- Projection: generated representation that MUST NOT become authoritative.
- Evidence: immutable/tamper-evident result tied to a generation.
- Historical Material: frozen reference content that cannot affect active topology.

Generated files, dashboards, cached registries and AI summaries SHALL never become authoritative merely by being newer.

## 2. Canonical Registry Location

The active 3.2 governance registry SHOULD live under a dedicated machine-readable namespace, for example:

```text
.governance/3.2/
  capabilities/
  adrs/
  ownership/
  dependencies/
  bindings/
  changes/
  policies/
  evidence/
  historical-isolation/
```

The exact physical directory may be changed only through an ADR because path ownership itself is governed.

## 3. Capability Registry Contract

Each capability SHALL have a stable identifier and explicit ownership.

Minimum fields:

```yaml
id: capability.<stable-name>
version: semver
status: proposed|active|deprecated|retired
owner: team-or-owner-id
provider: cloudflare-d1|cloudflare-r2|cloudflare-kv|cloudflare-do|cloudflare-queues|internal
consistency: eventual|read-your-writes|sequential|strong|serializable
criticality: low|medium|high|critical
failure_domains: []
input_contract: contract-id
output_contract: contract-id
policy_refs: []
dependency_refs: []
binding_refs: []
verification_refs: []
recovery_class: routine|controlled|high-risk|emergency
```

CI SHALL reject:

- duplicate stable IDs;
- missing owner;
- unresolved provider;
- unresolved contract;
- unresolved dependency;
- invalid lifecycle transition;
- active capability without verification evidence;
- capability claiming a stronger consistency class than its provider contract permits.

## 4. ADR Registry Contract

Every architecture-level decision SHALL have:

```yaml
id: ADR-3.2-XXXX
status: proposed|accepted|superseded|rejected|expired
owner: owner-id
scope: []
context: text
decision: text
invariants: []
consequences: []
supersedes: []
superseded_by: []
expiry: timestamp|null
evidence_refs: []
```

CI SHALL reject an implementation that contradicts an accepted ADR unless the change manifest explicitly declares the ADR transition.

Expired or superseded ADRs SHALL NOT silently govern new code.

## 5. Ownership Map Contract

Every active architectural object SHALL have exactly one primary owner.

Objects include:

- worker
- module
- capability
- provider binding
- authoritative data object
- control-state object
- schema
- event producer
- event consumer
- migration state machine
- recovery procedure
- governance registry

Ownership invariants:

`0 owners = FAIL`  
`1 owner = VALID`  
`>1 primary owners = FAIL`

Supporting owners MAY exist, but SHALL NOT imply authority.

Ownership changes are architecture-affecting changes and require a Change Manifest.

## 6. Dependency DAG Contract

Every declared dependency SHALL contain:

```yaml
from: object-id
kind: runtime|build|control|data|event|recovery|security
via: capability-id
criticality: required|degraded|optional
bootstrap_required: true|false
recovery_required: true|false
stale_behavior: reject|degrade|cache|continue|unknown
owner: owner-id
```

CI SHALL construct a directed graph and reject:

- forbidden cycles;
- unresolved nodes;
- undeclared runtime dependencies discovered by governed manifests;
- recovery dependencies that are unavailable during the recovery state they are required to establish;
- control-plane self-dependency without an explicit bootstrap exception.

A runtime dependency may be allowed while a recovery dependency is forbidden. The two graphs SHALL be evaluated independently.

## 7. Binding Ownership Contract

Provider/resource bindings SHALL identify the sole authority allowed to change the binding.

Example:

```yaml
binding_id: binding.d1.primary
resource_type: d1.database
provider: cloudflare
authority: W06-Control
owner: control-plane-owner
mutable: true
generation_source: authoritative-control-state
change_policy: controlled
```

W04 may consume the binding but cannot silently mutate the authoritative binding.

A stale binding proposal SHALL fail closed when its expected generation differs from the authoritative generation.

## 8. Change Manifest Contract

Every architecture-affecting PR SHALL contain or reference a machine-readable change manifest.

Minimum fields:

```yaml
change_id: CHG-YYYYMMDD-XXXX
actor:
  type: human|automation|ai
  id: stable-actor-id
target_environment: dev|test|staging|production
risk: routine|controlled|high-risk|emergency
owners: []
capabilities: []
resources: []
files: []
dependency_edges_added: []
dependency_edges_removed: []
authority_objects: []
expected_generations: []
policy_version: policy-id@version
verification_plan: []
recovery_class: routine|controlled|high-risk|emergency
expiry: timestamp
```

Missing manifest = hard failure for governed changes.

## 9. Diff Scope Gate

The Diff Scope Gate SHALL compute:

`Declared Scope Δ Actual Diff`

The result SHALL classify every changed artifact as:

- declared;
- generated;
- permitted incidental;
- undeclared;
- forbidden historical;
- ownership-sensitive;
- architecture-sensitive.

Hard failures:

1. undeclared architecture-sensitive file;
2. undeclared dependency edge;
3. ownership mutation without ownership transition;
4. worker topology mutation without explicit admission;
5. provider binding mutation without binding authority;
6. contract mutation without compatibility classification;
7. historical material mutation;
8. generated artifact becoming source of truth;
9. policy weakening without approval;
10. evidence deletion or replacement without retention authority.

The gate output SHALL be deterministic JSON suitable for CI consumption.

## 10. Historical Isolation Contract

Legacy 1.x, 2.x and explicitly marked `old` material SHALL be reference-only.

The historical isolation gate SHALL reject:

- imports from historical implementation directories;
- runtime dependency edges to historical directories;
- active registry references to historical mutable state;
- modification of frozen historical files without an explicit migration authority;
- using historical documents as implicit current contracts.

Allowed use:

`historical → review/reference/migration evidence`

Forbidden use:

`historical → active runtime authority`

A migration from historical material MUST declare the source, destination, transformation and retirement evidence.

## 11. Dependency Drift Detection

CI SHALL compare the declared DAG with the repository's detectable dependency surface.

At minimum, drift detection SHOULD inspect:

- imports;
- package manifests;
- Worker bindings;
- environment/config references;
- SQL/schema references;
- event producer/consumer declarations;
- provider bindings;
- generated deployment manifests.

Detection is evidence of a possible drift. The gate SHALL distinguish false positives from confirmed undeclared dependencies through explicit allowlist rules.

Allowlist entries require owner, reason, scope and expiry.

## 12. Worker Admission Gate

The baseline deployment topology remains:

`W01 Gateway → W02 Execution → W03 Write → W04 Data → W05 Reliability → W06 Control`

Logical planes do not automatically become Workers.

Adding, removing, or splitting a Worker requires:

- ownership;
- failure-domain justification;
- dependency analysis;
- bootstrap analysis;
- cost analysis;
- observability impact;
- security boundary justification;
- deployment/rollback plan;
- Change Manifest;
- ADR.

A new Worker without these artifacts is a hard CI failure.

## 13. Policy Compatibility Gate

Every change that modifies policy SHALL identify:

- previous policy version;
- new policy version;
- compatibility mode;
- affected capabilities;
- affected tenants/resources;
- rollout mode;
- rollback semantics.

A policy change SHALL NOT silently weaken an existing safety invariant.

## 14. Evidence Registry Contract

Every mandatory gate result SHALL produce:

```yaml
evidence_id: EVD-...
change_id: CHG-...
commit: git-sha
registry_generation: generation
policy_version: policy-id@version
environment: ...
probe: ...
result: pass|fail|waived
started_at: ...
finished_at: ...
artifacts: []
verifier: ...
expires_at: ...
```

Evidence from a different commit, policy generation or registry generation SHALL not automatically satisfy the current gate.

## 15. CI Gate Ordering

CI SHALL evaluate governance in this order:

```text
1. Historical Isolation
2. Registry Schema
3. Ownership
4. ADR Resolution
5. Dependency DAG
6. Binding Authority
7. Change Manifest
8. Diff Scope
9. Contract Compatibility
10. Static/Behavioral Tests
11. Failure/Recovery Evidence
12. Security Evidence
13. Evidence Freshness
14. Release Decision
```

Failure SHALL stop the pipeline before downstream gates claim PASS.

## 16. Gate Output Contract

The machine result SHALL use a stable structure:

```json
{
  "gate": "diff-scope",
  "status": "PASS|FAIL|WAIVED",
  "commit": "<sha>",
  "policy_version": "<version>",
  "violations": [],
  "evidence_refs": [],
  "owner": "<owner>",
  "expires_at": null
}
```

Human-readable logs MAY supplement this result but SHALL NOT replace it.

## 17. Waiver Contract

A waiver is not a PASS.

Every waiver SHALL contain:

- exact invariant waived;
- reason;
- owner;
- compensating control;
- affected scope;
- start time;
- expiry;
- review/renewal rule.

Expired waiver = FAIL.

Permanent waiver = prohibited for P0 safety invariants.

## 18. AI Governance

AI-generated code is treated exactly like human-generated code for governance purposes.

AI SHALL NOT:

- create authority by implication;
- bypass ownership;
- modify an accepted ADR without a governed transition;
- expand Diff Scope silently;
- add Workers without admission;
- approve its own high-risk mutation;
- reuse stale evidence;
- treat historical documents as current authority.

AI may generate a proposal. The machine gates decide whether the proposal is admissible.

## 19. CI Enforcement Maturity

### Level 0 — Documentation
Rules exist only in prose.

### Level 1 — Schema
Registries validate structurally.

### Level 2 — Reference Resolution
Owners, ADRs, capabilities and dependencies resolve.

### Level 3 — Diff Enforcement
CI rejects undeclared or forbidden changes.

### Level 4 — Behavioral Enforcement
CI validates state, authority and compatibility invariants.

### Level 5 — Recovery Enforcement
CI executes recovery/bootstrap proofs.

### Level 6 — Production Admission
Release is impossible without current evidence and mandatory gates.

3.2 SHALL target Level 6 before ACTIVE.

## 20. Standard of Proof

The governance system SHALL prefer deterministic, repeatable machine evidence over institutional memory.

This is aligned with Google SRE's production-readiness model, which treats architecture, dependencies, monitoring, emergency response, capacity, change management and performance as production concerns rather than merely code correctness. citeturn1search0

It also follows Meta's demonstrated practice of continuously testing recovery dependencies in CI/CD and using explicit recovery tooling to expose circular dependencies before production. citeturn1search1turn1search2

Alibaba's current reliability guidance similarly treats failure-oriented design, fine-grained operability, emergency recovery, change management and fault drills as architectural concerns. citeturn0search0turn0search2

Apple's security model reinforces the need for explicit entitlements and least privilege rather than ambient authority. citeturn0search36turn0search12

## 21. Final Rule

D1-Fabric governance is considered effective only when a developer can make a prohibited architectural change and GitHub CI deterministically rejects it without requiring an architect to notice the violation manually.

The target state is:

`Policy → Machine Registry → Static Analysis → Diff Gate → Test → Evidence → Release Decision`

No silent bypass.
No implicit authority.
No undocumented dependency.
No historical contamination.
No unowned mutation.

This contract authorizes implementation of governance enforcement only. It does not authorize new runtime capabilities or additional Workers.
