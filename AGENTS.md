# D1-Fabric AI Engineering Instructions

**Version:** 1.2
**Status:** ACTIVE
**Authority:** `D1-FABRIC-1.0-CONTRACT-BASELINE.md`
**Primary implementation language:** TypeScript

## 1. Mission

Build the minimum amount of correct code that provides complete, runnable, verifiable, maintainable, scalable, secure, recoverable, and deployable distributed-data capability.

Code should be minimal; contracts and proof obligations remain rigorous. AI context should also be minimal: load only the contracts needed for the current task.

D1-Fabric is domain-neutral infrastructure for Cloudflare D1. Product semantics belong above the core.

## 2. Authoritative Source Order

```text
1. D1-FABRIC-1.0-CONTRACT-BASELINE.md
2. Applicable versioned D1-FABRIC-1.0-* contracts
3. AGENTS.md
4. DEVELOPMENT-PROTOCOL.md
5. Existing verified implementation
6. Execution Packet / Change Manifest
7. Chat discussion
```

The repository, not chat history, is the source of truth.

Historical A00.x and superseded documents are non-authoritative and MUST NOT be used to derive implementation semantics.

## 3. AI DOCUMENT ROUTER — DEFAULT READING POLICY

`AGENTS.md` is the routing entry point. An implementation agent MUST NOT load every repository document by default.

### Always read

```text
AGENTS.md
D1-FABRIC-1.0-CONTRACT-BASELINE.md
```

### Read by task

| Task | Required contracts | Usually omit unless directly affected |
|---|---|---|
| Shard / routing / migration | ARCHITECTURE + DATA-AND-STATE + RUNTIME-EXECUTION | PERFORMANCE, AI-GOVERNANCE |
| Read / write execution | DATA-AND-STATE + RUNTIME-EXECUTION + PERFORMANCE-AND-COST | RELIABILITY unless failure semantics change |
| Security / tenant / auth | SECURITY-AND-COMPATIBILITY + DATA-AND-STATE | PERFORMANCE, AI-GOVERNANCE |
| Failure / retry / recovery | RELIABILITY-AND-RECOVERY + DATA-AND-STATE + RUNTIME-EXECUTION | PERFORMANCE unless budgets change |
| Performance / cost optimization | PERFORMANCE-AND-COST + RUNTIME-EXECUTION + ARCHITECTURE | SECURITY unless boundary changes |
| Compatibility / schema / public API | SECURITY-AND-COMPATIBILITY + DATA-AND-STATE + RUNTIME-EXECUTION | AI-GOVERNANCE |
| Runtime AI / optimizer | AI-GOVERNANCE + PERFORMANCE-AND-COST + SECURITY-AND-COMPATIBILITY | Other contracts unless affected |
| Verification-only task | VERIFICATION-AND-EVIDENCE + contracts named by the change | Unrelated contracts |
| Pure refactor with no semantic change | Relevant implementation/tests + BASELINE | Other contracts not touched by semantics |

### Read on demand

```text
D1-FABRIC-1.0-CONTRACT-AUDIT.md
D1-FABRIC-1.0-FULL-REPOSITORY-CONSISTENCY-AUDIT.md
D1-FABRIC-CLOUDFLARE-DOCUMENTATION-MAPPING.md
D1-FABRIC-ARTIFACT-TYPE-CONTRACT.md
verification/ and report documents
```

These are evidence/audit/supporting documents, not first-line implementation authority.

### Loading rule

Start with the smallest relevant contract set. Expand only when the Semantic Contract Map proves another contract is affected. Never omit a contract merely to avoid a difficult requirement.

## 4. Mandatory Semantic Contract Map

Before coding a non-trivial capability, create a compact map from the routed contracts:

```text
capability
contract/version
semantic owner per concern
authoritative state/state owner
untrusted vs verified input
routing identity
epoch/fencing
authorization/tenant boundary
consistency/idempotency
resource budgets
failure/recovery
compatibility
verification obligations
forbidden behavior
```

The map is a traceability artifact, not authority. Every applicable MUST obligation MUST map to verification evidence.

If authoritative requirements conflict, STOP and resolve the contract. Never invent a semantic compromise in code.

## 5. Engineering Invariants

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
I-12 Every scalability claim MUST have reproducible evidence.
I-13 Contract semantics MUST NOT be silently redefined by implementation agents.
I-14 AI authority MUST be bounded, observable, and able to downgrade after unsafe/regressive behavior.
I-15 AI knowledge MUST have version, applicability, expiration, and revalidation semantics.
```

## 6. Minimal Execution Context

For a normal feature, the agent should carry only:

```text
AGENTS.md
BASELINE
3–5 routed contracts
relevant implementation files
relevant tests
current Execution Packet
current Change Manifest
```

Do NOT preload historical reports, duplicate v2 documents, unrelated gates, or unrelated domain documentation.

## 7. Before Coding

For every non-trivial capability establish:

```text
Capability / REQ IDs
Scope / Non-goals
Smallest complete design
Applicable routed contracts
Semantic Contract Map
Inputs / Outputs
State model
Authoritative owner for every mutable state
Invariants
Hot path / control path
Concurrency boundary
Idempotency / retry semantics
Timeout / cancellation / failure semantics
Recovery / return-to-service condition
Consistency model
Resource budgets
Scaling boundary
Security / trust / tenant boundary
Compatibility / versioning
Verification matrix
Evidence requirements
Distribution classification
Change manifest
Rejected alternatives where material
```

For trivial, non-semantic changes, use the smallest applicable subset and do not manufacture heavyweight artifacts.

## 8. Execution Protocol

All non-trivial implementation SHALL follow `DEVELOPMENT-PROTOCOL.md`:

```text
READ ROUTED CONTRACTS
→ RESOLVE CONTRACT
→ SEMANTIC CONTRACT MAP
→ EXECUTION PACKET
→ FREEZE CHANGE MANIFEST
→ IMPLEMENT
→ TARGETED VERIFY
→ CONTRACT-DRIVEN ADVERSARIAL VERIFY
→ FULL APPLICABLE VERIFY
→ EVIDENCE
→ INDEPENDENT REVIEW
→ STATUS
→ COMMIT
```

## 9. Architecture Boundary

The implementation agent is not an architecture authority.

Do not silently change:

```text
state ownership
routing / epoch / fencing
consistency semantics
failure/recovery semantics
security boundaries
tenant isolation
resource limits
public protocols
schema compatibility
Worker boundaries
AI authority
```

A material architecture or contract change requires the contract-evolution process and new versioned contract semantics.

## 10. Minimal-Code Rule

Prefer existing correct primitives, direct implementation, one authoritative owner, one primary execution path, shared validation/error/timeout infrastructure, minimal D1 operations, minimal network hops, and minimal dependencies.

Do not add speculative abstractions, queues, retries, caches, persistent state, coordinators, Workers, or dependencies without a current requirement, protected invariant, measurable benefit, real boundary, and verification method.

## 11. Data / Routing / Security Ordering

For protected operations preserve:

```text
Authenticate
→ Authorize
→ Resolve authorized tenant/scope
→ Construct canonical routing identity
→ Resolve route
→ Validate epoch
→ Validate ownership
→ Validate resource/consistency policy
→ Resolve idempotency
→ Execute
→ Commit
→ Update derived/cache state
```

Client-supplied tenant, shard, or routing information is not proof of authorization.

## 12. Hot Path and Resource Bounds

Hot-path execution MUST be deterministic and bounded. Runtime AI MUST NOT be required for correctness.

Every applicable request MUST have explicit budgets for:

```text
deadline
queries
rows read
rows written
shards/fan-out
parallelism
retries
payload
memory
queue work
```

## 13. Failure / Recovery

Retries MUST be idempotent and bounded. Recovery must restore ownership, epoch/fencing, migration, schema compatibility, authorization, idempotency, and data invariants where applicable.

## 14. Verification

Never report PASS from source inspection or compilation alone.

Use the smallest applicable verification levels:

```text
V0 Static
V1 Unit
V2 Integration
V3 Runtime
V4 Contract / Invariant
V5 Concurrency / Overload
V6 Failure / Recovery
V7 Security / Isolation
V8 Performance / Cost / Regression
V9 Soak / Operational
```

Do not run irrelevant heavyweight gates merely because they exist. Do run every gate required by the change's Semantic Contract Map.

Critical negative paths MUST be covered where applicable:

```text
wrong tenant
unauthorized request
stale epoch
wrong owner
duplicate mutation
ambiguous commit
partial shard failure
migration interruption
schema mismatch
cache poisoning
resource exhaustion
invalid AI candidate
expired knowledge
authority downgrade
```

Unknown and unproven are not PASS.

## 15. Evidence

Evidence MUST identify exact commit, contract/version, environment, commands, inputs, results, metrics, limitations, and status. AI confidence is not evidence.

## 16. Contract-Driven Adversarial Review

Independent review MUST derive critical tests from authoritative contract obligations and MUST be able to reject a change even if implementation-authored tests pass.

## 17. Development AI Rule

DeepSeek or another coding agent SHALL implement the approved contract, not redesign it during implementation.

Required loop:

```text
Routed Contract Set
→ Semantic Contract Map
→ Packet
→ Manifest
→ Implementation
→ Verification
→ Evidence
```

DeepSeek MUST NOT fabricate tests, metrics, benchmark results, recovery results, security results, or completion status.

## 18. AI Runtime Governance

Runtime AI may observe, analyze, propose, optimize, experiment, canary, and learn only within the AI Governance Contract.

Material changes require validation, policy, resource bounds, bounded blast radius, measurement, rollback, and evidence.

AI authority may only increase through fresh evidence and may automatically decrease on configured failures:

```text
L3 → L2 → L1 → L0
```

Security/correctness violations may force L0.

## 19. AI Knowledge

Optimization memory is evidence, not authority. Learned results MUST carry model/contract version, workload applicability, expiration, and revalidation state. Expired, invalidated, superseded, or regressed knowledge MUST NOT be treated as current authority.

## 20. Contract Evolution

Changes to MUSTs, invariants, semantic ownership, protocol semantics, schema compatibility, security boundaries, routing/epoch meaning, recovery rules, or AI authority require:

```text
Proposal
→ Evidence / Impact Analysis
→ Compatibility / Migration Analysis
→ Adversarial Verification
→ Review / Approval
→ New Contract Version
→ Implementation
→ Revalidation
→ Deprecate / Retire Old Version
```

## 21. Documentation

Documentation is an engineering control. Material behavior must remain traceable:

```text
REQ
→ CONTRACT
→ SEMANTIC MAP
→ IMPLEMENTATION
→ TEST
→ EVIDENCE
```

Do not change documentation merely to make code appear compliant.

## 22. Stop Conditions

STOP immediately for:

```text
contract conflict
ambiguous ownership
authorization bypass
cross-tenant leakage
stale writer acceptance
data corruption/loss risk
unbounded D1 I/O/fan-out/retry/queue
unproven recovery
schema incompatibility
fabricated evidence
wrong-commit evidence
P0/P1 defect
critical regression
architecture/semantic drift
unresolved IP/security boundary
```

## 23. Final Law

> **Contracts define what must be true. AGENTS.md routes the minimum required context. The Semantic Contract Map makes meaning explicit. The implementation agent chooses the simplest way to make it true. Independent verification proves whether it is true. AI may optimize, but never becomes the authority over safety or semantics.**
