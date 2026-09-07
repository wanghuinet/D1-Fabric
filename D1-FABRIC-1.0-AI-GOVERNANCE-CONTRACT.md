# D1-Fabric 1.0 AI Governance Contract

**Status:** GOVERNANCE BASELINE  
**Version:** 1.0  
**Authority:** Architecture Contract  

## 1. Purpose

AI is a governed optimization participant in D1-Fabric, not an unrestricted administrator.

The system contains two AI domains:

- **Development AI:** designs and implements changes under repository contracts.
- **Runtime AI:** observes production behavior and proposes or performs governed optimization.

The central rule is:

> D1-Fabric must remain safe when AI is wrong and become better when AI is right.

## 2. Data Plane Independence

Ordinary requests MUST remain correct when:

- AI is unavailable;
- AI is slow;
- a model is wrong;
- an optimization is rejected;
- an optimization is rolled back.

AI inference MUST NOT be a mandatory hot-path dependency.

## 3. Authority Levels

### L0 — Observe

AI may inspect telemetry and identify patterns.

### L1 — Recommend

AI may produce recommendations for human or policy review.

### L2 — Governed Auto-Optimize

AI may automatically apply pre-approved optimization classes within hard bounds.

### L3 — Controlled Runtime Optimization

AI may perform limited runtime changes inside explicitly authorized control envelopes, with verification and rollback.

AI MUST never bypass immutable safety boundaries at any level.

## 4. Immutable Safety Boundaries

AI cannot override:

- authoritative state ownership;
- routing correctness;
- routing epochs;
- fencing;
- tenant isolation;
- authentication and authorization;
- declared consistency semantics;
- idempotency requirements;
- resource limits;
- recovery invariants;
- audit requirements.

## 5. AI Decision Contract

Every material automated decision SHOULD record:

```text
 decision_id
 timestamp
 model_or_agent
 authority_level
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
 expiration
 actual_result
 final_status
```

AI confidence is an input, never proof.

## 6. Evidence Before Authority

The minimum progression is:

```text
Observe
→ Analyze
→ Hypothesize
→ Verify
→ Canary
→ Promote / Reject
→ Learn
```

No production optimization should be promoted merely because a model predicts improvement.

## 7. Optimization Objective

AI optimization SHOULD jointly consider:

- correctness;
- reliability;
- useful throughput;
- latency;
- D1 cost;
- resource consumption;
- operational complexity.

Optimizing a single metric while causing unacceptable regression elsewhere is not a valid optimization.

## 8. Cost-Aware AI

AI MUST treat D1 rows read and rows written as first-class optimization signals.

It may optimize:

- query plans;
- indexes;
- cache policy;
- batch size;
- shard placement;
- fan-out;
- admission control;
- retry policy.

It must not optimize latency by blindly increasing storage, replication, Workers, or writes.

## 9. Query Optimization

AI may identify expensive Query Shapes using:

- rows read;
- rows returned;
- query duration;
- frequency;
- index usage;
- fan-out;
- error rate.

A candidate query optimization MUST pass the same runtime plan validation as a deterministic plan.

## 10. Hotspot Optimization

AI may detect:

- hot shards;
- hot keys;
- hot tenants;
- hot queries.

Candidate responses may include:

```text
cache
→ coalescing
→ admission control
→ load shaping
→ split / rebalance
```

Shard ownership changes MUST follow the Data and State Contract.

## 11. Predictive Operations

AI MAY predict:

- traffic growth;
- cost growth;
- storage growth;
- hotspot formation;
- failure risk;
- workload changes.

Predictions MUST record their horizon, input evidence, and confidence.

A prediction is not authoritative state.

## 12. Experiment Engine

AI experiments MUST define:

```text
baseline
candidate
workload
scope
success metrics
failure thresholds
canary size
rollback action
expiration
```

Experiments MUST be isolated from unrelated workloads where practical.

## 13. Canary and Rollback

Automatic optimization SHOULD use canary deployment when risk is material.

Rollback triggers SHOULD include:

- error regression;
- P95/P99 regression;
- D1 I/O regression;
- retry amplification;
- consistency violation;
- security violation;
- resource-limit violation.

Every automatic change MUST be reversible unless explicitly classified as irreversible by architecture review.

## 14. AI Memory

The Governance Plane SHOULD retain structured optimization memory:

```text
observation
hypothesis
change
workload
result
accepted/rejected
rollback
```

The purpose is to prevent repeated failed experiments and allow future decisions to build on evidence.

## 15. Policy Engine

AI decisions MUST pass a policy layer that evaluates:

- authority level;
- resource bounds;
- security;
- tenant scope;
- blast radius;
- consistency impact;
- migration impact;
- reversibility.

## 16. Blast Radius

Automatic optimization MUST have a bounded blast radius.

Preferred progression:

```text
single request
→ single Query Shape
→ single shard
→ small shard group
→ controlled global rollout
```

The system should not jump directly from experiment to global production.

## 17. Multi-Tenancy

AI optimization MUST preserve tenant isolation.

AI must not infer that a high-volume tenant can consume unlimited shared resources.

Tenant-specific optimization must remain within global safety limits.

## 18. Prompt and Model Isolation

Runtime correctness MUST NOT depend on a model following an instruction correctly.

AI output is untrusted input and must be:

```text
parsed
validated
policy-checked
bounded
observed
```

## 19. AI Failure Handling

When AI fails:

```text
AI unavailable
→ deterministic baseline
```

When AI proposes an invalid action:

```text
candidate
→ validation
→ reject
```

When AI optimization regresses production:

```text
regression
→ rollback
→ record
→ learn
```

## 20. Development AI Governance

Development AI MUST follow:

```text
Authoritative Contract
→ Execution Packet
→ Frozen Scope
→ Implementation
→ Targeted Verification
→ Full Verification
→ Evidence
→ Capability Status
```

AI MUST NOT invent architecture by silently expanding scope.

Adding an abstraction, dependency, queue, Worker, persistent state, or network hop requires a concrete requirement, invariant, measurable benefit, and real boundary.

## 21. AI Cost Governance

AI itself consumes resources.

The Governance Plane SHOULD measure:

- inference frequency;
- inference latency;
- model cost;
- optimization success rate;
- avoided D1 cost;
- avoided compute;
- avoided incidents.

An AI optimization system that costs more than the resources it saves is a failed optimization.

## 22. Decision Value

A useful decision should satisfy:

```text
Expected Benefit
>
Decision Cost + Risk + Complexity
```

Simple decisions SHOULD be preferred over complex decisions when both achieve equivalent outcomes.

## 23. Mandatory AI Invariants

- **AI-01:** AI cannot bypass correctness.
- **AI-02:** AI cannot bypass ownership/fencing.
- **AI-03:** AI cannot bypass security.
- **AI-04:** AI cannot bypass consistency.
- **AI-05:** AI cannot bypass resource limits.
- **AI-06:** AI cannot make unbounded changes.
- **AI-07:** Production optimization requires measurable evidence.
- **AI-08:** Material automatic changes are observable.
- **AI-09:** Material automatic changes are reversible where technically possible.
- **AI-10:** AI failure cannot break ordinary Data Plane correctness.
- **AI-11:** AI decisions are auditable.
- **AI-12:** AI complexity must produce measurable value.

## 24. Forbidden AI Behavior

Prohibited:

- direct arbitrary D1 mutation by AI;
- AI-generated SQL executed without runtime validation;
- AI bypass of authorization;
- AI bypass of routing/fencing;
- AI-created unbounded fan-out;
- AI-created unbounded retry;
- AI-created unbounded queues;
- AI-required hot-path inference;
- global rollout without verification;
- treating confidence as evidence;
- hiding failed experiments;
- silently changing architecture.

## 25. Governance Maturity

The system evolves through:

```text
L0 Observe
→ L1 Recommend
→ L2 Governed Auto-Optimize
→ L3 Controlled Runtime Optimization
```

Higher authority requires stronger evidence, tighter blast-radius control, and stronger rollback.

## 26. Final AI Governance Law

> **AI should make D1-Fabric more capable without making the runtime proportionally more complex.**

The Data Plane remains simple.
The Governance Plane becomes increasingly intelligent.
The contracts remain the boundary that neither may cross.
