# D1-Fabric 3.0 Adaptive Intelligence Contract v1.0

**Status:** PROPOSED / GOVERNANCE BASELINE
**Authority:** subordinate to the 3.0 Master Contract

## 1. Goal

Provide a safe learning and optimization layer that improves generic Fabric execution behavior over time without introducing business semantics or allowing AI output to bypass runtime safety contracts.

## 2. Intelligence boundary

AI/ML components are not authoritative runtime controllers. They may observe telemetry, derive models, detect anomalies, rank optimization candidates, and propose bounded policy changes.

Authoritative runtime enforcement remains in the deterministic contract/runtime path.

```text
Telemetry
  ↓
Feature extraction
  ↓
Model / rule analysis
  ↓
Recommendation
  ↓
Policy validation
  ↓
Simulation / shadow
  ↓
Canary
  ↓
Measured evaluation
  ↓
Activation
```

## 3. What may be learned

The intelligence layer may learn generic infrastructure behavior such as:

- operation latency and error distributions;
- cache effectiveness;
- shard/key hotness signals;
- fan-out and concurrency patterns;
- retry amplification and timeout patterns;
- resource consumption patterns;
- saturation and recovery behavior;
- anomaly signatures.

Business semantics, authorization meaning, billing decisions, content ranking, game rules, or other application policy are outside this contract.

## 4. Safe state model

Recommendations follow:

```text
OBSERVED
→ CANDIDATE
→ VALIDATED
→ SHADOW
→ CANARY
→ ACTIVE
→ REJECTED / ROLLED_BACK
```

A candidate is never authoritative merely because a model has high confidence.

## 5. Protected controls

AI MUST NOT directly change or bypass:

```text
authorization
customer/tenant isolation
budget reservation or hard-stop
idempotency semantics
control epoch / LKG fencing
security bindings
public contract semantics
Cloudflare platform limits
```

Any candidate affecting these areas requires an explicit versioned contract change and normal release governance.

## 6. Bounded optimization

Every recommendation must declare:

```text
candidateId
model/rule version
input window
baseline metrics
expected effect
risk class
resource impact
affected operations
rollback condition
observation window
```

Optimization must be rejected when the expected gain cannot be measured or the rollback condition cannot be enforced.

## 7. Shadow evaluation

New scheduling, routing, caching, or placement strategies should first execute as a non-authoritative shadow decision where the platform can support it. Shadow decisions must not cause writes, quota changes, or security changes.

## 8. Canary evaluation

A validated candidate may affect a bounded traffic cohort only after required contract checks pass. Exposure increases only while health gates remain within declared limits.

A canary must automatically halt on relevant regression, including:

```text
error increase
P95/P99 regression
retry amplification
budget violations
D1 overload indicators
cross-tenant/security violation
idempotency anomaly
```

## 9. Learning data quality

Telemetry used for learning must preserve the same tenant and authorization boundaries required by the runtime. Sensitive payloads should not be required when aggregate or structured signals are sufficient.

The learning pipeline must distinguish:

```text
observed fact
inferred signal
model prediction
recommended action
```

Predictions must never be represented as runtime facts.

## 10. Model failure

AI availability or model quality failure must degrade to deterministic runtime behavior. The Fabric must remain operable without an active model.

```text
AI unavailable
    ↓
deterministic safe policy
    ↓
normal contract enforcement
```

## 11. Versioning

Models, feature schemas, recommendation policies, and learned profiles are versioned artifacts. A runtime must identify the versions used for any activated adaptive decision.

## 12. Evidence

Every activation requires evidence binding:

```text
candidateId
modelVersion
baseline
experiment/cohort
health metrics
decision
rollback status
runtime/contract version
commit or deployment identity
```

## 13. Long-term moat

The intended differentiator is not autonomous code modification. It is a reusable feedback system in which diverse workloads continuously improve generic infrastructure policy while deterministic contracts preserve safety.

```text
more workloads
→ more telemetry
→ better behavior models
→ better safe recommendations
→ validated optimization
→ improved generic runtime
→ stronger operational knowledge
```
