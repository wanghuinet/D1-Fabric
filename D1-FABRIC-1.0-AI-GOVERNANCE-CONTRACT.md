# D1-Fabric 1.0 AI Governance Contract

**Status:** GOVERNANCE BASELINE
**Version:** 1.1
**Authority:** D1-FABRIC-1.0-CONTRACT-BASELINE.md

## 1. Purpose

AI is a governed optimization participant in D1-Fabric, never an unrestricted administrator.

Two AI domains exist:

- **Development AI:** implements approved repository contracts.
- **Runtime AI:** observes production behavior and proposes or performs governed optimization.

> D1-Fabric must remain safe when AI is wrong and become better when AI is right.

## 2. Data-Plane Independence

Ordinary requests MUST remain correct when AI is unavailable, slow, wrong, rejected, or rolled back. AI inference MUST NOT be a mandatory hot-path dependency.

## 3. Authority Levels

- **L0 Observe:** telemetry and analysis only.
- **L1 Recommend:** recommendations require human/policy approval.
- **L2 Governed Auto-Optimize:** pre-approved classes within hard bounds.
- **L3 Controlled Runtime Optimization:** explicitly authorized control envelopes with verification, bounded blast radius, and rollback.

Authority MUST be automatically reduced when defined failure, regression, security, or evidence-quality thresholds are exceeded.

AI MUST never bypass immutable safety boundaries.

## 4. Immutable Safety Boundaries

AI cannot override:

- authoritative state ownership;
- routing correctness, epoch, or fencing;
- authentication, authorization, or tenant isolation;
- declared consistency semantics;
- idempotency requirements;
- resource limits and admission controls;
- recovery invariants;
- compatibility/schema contracts;
- audit/evidence requirements.

## 5. AI Decision Record

Every material automated decision MUST record, at minimum:

```text
decision_id
timestamp
model_or_agent
model_version
authority_level
contract_version
observed_evidence
detected_condition
hypothesis
candidate_action
expected_benefit
affected_resources
risk
confidence
policy_result
verification_plan
canary_plan
rollback_plan
resource_budget
expiration
actual_result
final_status
```

AI confidence is an input, never proof.

## 6. Contract Semantic Map

Before implementation or material runtime optimization, the applicable contracts MUST be reduced to a machine-checkable Semantic Contract Map.

The map MUST identify:

```text
capability
contract/version
semantic owner for each concern
authoritative state
state owner
untrusted vs verified inputs
routing identity
epoch/fencing
security boundary
consistency
idempotency
resource budgets
failure/recovery obligations
compatibility obligations
verification obligations
forbidden behavior
```

The implementation or candidate action MUST be checked against this map before completion or promotion.

A passing test suite does not prove semantic compliance if a contract obligation was not tested.

## 7. Evidence Before Authority

The production optimization progression is:

```text
Observe
→ Analyze
→ Hypothesize
→ Candidate
→ Parse
→ Validate
→ Security Check
→ Ownership/Epoch Check
→ Consistency Check
→ Resource Check
→ Compatibility Check
→ Policy
→ Benchmark
→ Canary
→ Measure
→ Promote / Reject
→ Learn
```

No production optimization may be promoted solely from model confidence or predicted benefit.

## 8. Optimization Objective

Optimization MUST consider, in priority order:

```text
correctness
security/isolation
reliability
useful throughput
latency
D1 I/O and cost
resource consumption
operational complexity
AI decision cost
```

A single-metric improvement is invalid when it creates unacceptable regression in a higher-priority property.

## 9. Cost and Optimization Budget

D1 rows read/written, compute, latency, memory, network, and AI inference are first-class costs.

Every material experiment MUST have bounded:

```text
AI inference budget
experiment duration
D1 budget
compute/resource budget
latency budget
change frequency
blast radius
canary scope
```

The optimization system itself MUST be subject to resource limits. An optimizer whose total cost exceeds its measured value is a failed optimization.

## 10. Query and Hotspot Optimization

AI may identify expensive query shapes, hot shards, hot keys, hot tenants, and workload shifts using measured evidence.

Candidate responses may include:

```text
query/index optimization
cache/coalescing
admission control
load shaping
batching
split/rebalance
```

Shard ownership changes MUST follow the Data and State Contract.

## 11. Predictive Operations

Predictions MAY cover traffic, cost, storage, hotspots, failures, and workload changes. Predictions MUST record horizon, input evidence, model/version, confidence, and expiration. A prediction is never authoritative state.

## 12. Experiment Contract

Every material experiment MUST define:

```text
contract_version
baseline
candidate
workload
scope
success metrics
failure thresholds
resource budget
canary size
rollback action
expiration
```

Experiments SHOULD be isolated from unrelated workloads where practical.

## 13. Canary, Rollback, and Auto-Downgrade

Material automatic changes MUST use a bounded canary unless architecture explicitly classifies them as low-risk.

Rollback triggers MUST include applicable:

- correctness/invariant violation;
- security/tenant-isolation violation;
- error regression;
- P95/P99 regression;
- D1 I/O/cost regression;
- retry amplification;
- resource-limit violation;
- compatibility failure.

Every automatic change MUST be reversible unless explicitly classified as irreversible by architecture review.

Authority downgrade MUST be deterministic and fail closed:

```text
L3 → L2 → L1 → L0
```

Security or correctness violations MAY immediately force L0 and block further automation until revalidation.

Promotion back to a higher authority level requires fresh evidence, not elapsed time alone.

## 14. AI Memory and Knowledge Lifecycle

Governance memory MUST retain structured records of:

```text
observation
hypothesis
candidate/change
contract_version
workload
result
accepted/rejected
rollback
```

Every learned decision MUST have applicability and lifecycle metadata:

```text
VALID
EXPIRED
INVALIDATED
SUPERSEDED
REGRESSED
REVALIDATION_REQUIRED
```

A historical success MUST NOT be reused as current authority when workload, contract, model, schema, runtime, or resource conditions have materially changed.

Repeated failed experiments MUST be detected and suppressed unless a new hypothesis or materially changed conditions justify re-execution.

## 15. Policy Engine

All material AI decisions MUST pass policy evaluation for:

- authority level;
- contract/version;
- resource bounds;
- security;
- tenant scope;
- blast radius;
- consistency;
- migration impact;
- compatibility;
- reversibility;
- evidence quality;
- experiment frequency/budget.

## 16. Multi-Tenancy

AI optimization MUST preserve tenant isolation and global resource ceilings. A high-volume tenant cannot consume unlimited shared resources merely because optimization predicts benefit.

## 17. Prompt and Model Isolation

Runtime correctness MUST NOT depend on a model following instructions correctly. AI output is untrusted input and MUST be parsed, schema-validated, policy-checked, bounded, audited, and observed.

Model/version changes are governance events. Prior evidence does not automatically transfer to a materially different model or agent.

## 18. AI Failure Handling

```text
AI unavailable → deterministic baseline
invalid candidate → reject
verification failure → reject
production regression → rollback → downgrade if threshold met → record
stale knowledge → revalidate
policy failure → reject
```

## 19. Development AI Governance

Development AI MUST follow:

```text
Authoritative Contract
→ Semantic Contract Map
→ Execution Packet
→ Frozen Change Manifest
→ Implementation
→ Targeted Verification
→ Contract-driven Adversarial Verification
→ Full Verification
→ Evidence
→ Independent Review
→ Capability Status
```

Development AI MUST NOT silently expand scope, redefine semantics, or treat chat history as architecture authority.

## 20. Contract Evolution Governance

A frozen contract is immutable for its declared version. Any change to a `MUST`, invariant, semantic owner, protocol meaning, schema compatibility rule, security boundary, routing/epoch meaning, recovery rule, or AI authority boundary MUST use a contract revision.

The evolution lifecycle is:

```text
Change Proposal
→ Reason / Evidence
→ Semantic Impact Analysis
→ Compatibility Analysis
→ Migration / Rollback Plan
→ Adversarial Verification
→ Review / Approval
→ New Contract Version
→ Implementation
→ Revalidation
→ Deprecate / Retire Old Version
```

No implementation agent may modify frozen semantics as an implementation convenience.

## 21. Contract-Driven Adversarial Verification

Independent verification MUST derive critical negative tests from contract obligations, not only from implementation tests.

At minimum, applicable cases include:

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
expired AI knowledge
authority downgrade
```

The verifier MUST be able to reject a change even when source code compiles and implementation-authored tests pass.

## 22. Decision Value

A decision is valid only when:

```text
Expected Benefit
>
Decision Cost + Risk + Complexity
```

AND the candidate satisfies all higher-priority safety, correctness, security, compatibility, and resource constraints.

## 23. Mandatory AI Invariants

- **AI-01:** AI cannot bypass correctness.
- **AI-02:** AI cannot bypass ownership/fencing.
- **AI-03:** AI cannot bypass security or tenant isolation.
- **AI-04:** AI cannot bypass consistency or idempotency.
- **AI-05:** AI cannot bypass resource limits.
- **AI-06:** AI cannot make unbounded changes or experiments.
- **AI-07:** Production optimization requires reproducible evidence.
- **AI-08:** Material automatic changes are observable and auditable.
- **AI-09:** Material automatic changes are reversible where technically possible.
- **AI-10:** AI failure cannot break ordinary Data Plane correctness.
- **AI-11:** AI knowledge has version, applicability, expiration, and revalidation semantics.
- **AI-12:** AI complexity must produce measurable value.
- **AI-13:** AI authority automatically decreases after defined unsafe/regressive behavior.
- **AI-14:** Contract semantics cannot be silently changed by implementation AI.
- **AI-15:** Contract-driven verification is independent of implementation-authored tests.

## 24. Forbidden AI Behavior

Prohibited:

- arbitrary D1 mutation by AI;
- AI-generated SQL executed without deterministic runtime validation;
- bypass of authorization, routing, fencing, consistency, or resource limits;
- unbounded fan-out, retry, queue, experiment, or rollout;
- mandatory hot-path inference;
- global rollout without required verification;
- treating confidence or historical success as proof;
- reusing expired/superseded knowledge as authority;
- hiding failed experiments or rollbacks;
- silently changing contracts or architecture;
- promoting authority after failure without fresh evidence.

## 25. Governance Maturity

```text
L0 Observe
→ L1 Recommend
→ L2 Governed Auto-Optimize
→ L3 Controlled Runtime Optimization
```

Higher authority requires stronger evidence, tighter bounds, and stronger rollback. Authority can move downward automatically.

## 26. Final AI Governance Law

> **AI may improve D1-Fabric, but contracts, deterministic enforcement, bounded resources, and evidence remain stronger than AI judgment.**

The Data Plane remains simple. The Governance Plane becomes increasingly intelligent. Governance knowledge evolves only through evidence and revalidation.
