# D1-Fabric 3.0 Adaptive Intelligence Contract v1.0

**Status:** PROPOSED / NON-RUNTIME / FUTURE CAPABILITY
**Authority:** subordinate to the Master Contract

## 1. Objective

Enable D1-Fabric to learn from operational telemetry and propose safe runtime optimizations without allowing AI to bypass deterministic safety controls.

## 2. Closed loop

```text
OBSERVE
  -> FEATURE
  -> DETECT
  -> PROPOSE
  -> SIMULATE/SHADOW
  -> CANARY
  -> EVALUATE
  -> ACTIVATE
  -> OBSERVE
```

AI output is a recommendation or policy candidate until it passes deterministic validation and the release gate.

## 3. AI cannot own

AI MUST NOT directly control:

- authentication/authorization;
- tenant isolation;
- idempotency atomicity;
- budget hard limits;
- deadline enforcement;
- security bindings;
- epoch/LKG fencing;
- data-loss prevention;
- destructive schema/data operations;
- production traffic promotion without the release gate.

## 4. Learning inputs

The intelligence layer may consume bounded, privacy-safe operational telemetry including:

- latency distributions;
- error classes;
- retry amplification;
- cache hit/miss outcomes;
- fan-out and concurrency;
- D1 statement and row consumption;
- admission/rejection rates;
- topology and placement observations;
- capacity saturation and recovery signals.

Telemetry collection MUST NOT become a mandatory synchronous hot-path dependency.

## 5. Candidate policy

Every AI-generated candidate MUST contain:

```text
candidateId
sourceModel/version
inputWindow
observedEvidence
proposedChange
expectedBenefit
riskClass
resourceImpact
safetyConstraints
rollbackTarget
expiry
```

Candidates expire and MUST NOT remain implicitly active.

## 6. Validation

Before activation:

1. deterministic schema validation;
2. contract compatibility check;
3. architecture ownership check;
4. budget/safety check;
5. simulation or shadow evaluation;
6. bounded canary;
7. health evaluation;
8. progressive rollout.

Any failed gate blocks promotion.

## 7. Zero-downtime rollout

Runtime policy changes MUST support:

`stable -> shadow -> canary -> progressive -> active`

Rollback MUST be possible to the last known-good policy without stopping healthy traffic. Canary health must compare at minimum error rate, P95/P99 latency, retry amplification, resource consumption, and contract violations.

Google SRE recommends canarying with monitoring and rapid rollback; Meta describes progressive configuration rollout with health checks and increasingly automated detection; Alibaba Cloud documents weight- and content-based canary and end-to-end traffic lanes. These are engineering patterns informing this contract, not normative dependencies.

## 8. Learning safety

The model MUST NOT self-modify its own safety constraints. Training/evaluation data and deployed policy are separate artifacts. A model update is a release and follows the same verification and rollback gates as code/configuration changes.

## 9. Explainability and evidence

Every promoted optimization MUST retain enough evidence to answer:

- what changed;
- why it changed;
- which observations caused the proposal;
- what validation was run;
- what traffic was exposed;
- what metrics changed;
- what rollback target was used.

## 10. Failure behavior

If the intelligence layer is unavailable, stale, uncertain, or contradictory, the Fabric MUST continue using the last valid deterministic policy. AI is an optimization layer, never a required availability dependency.

## 11. Future moat

The intended moat is not generic chatbot functionality. It is the accumulated operational feedback loop:

```text
Fabric execution data
-> normalized telemetry
-> workload fingerprints
-> failure/performance patterns
-> validated policy candidates
-> production outcomes
-> better future recommendations
```

This capability becomes valuable only after correctness, reliability, observability, and safe rollout are already proven.
