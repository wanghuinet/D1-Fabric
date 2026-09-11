# D1-Fabric 3.2 Governance Master Matrix

Version: 1.0  
Status: DRAFT — G2/G3/G4/P0 ADMISSION CONTROL  
Scope: governance execution order from registry validation through final architecture admission

## 0. Single Control Chain

```text
16 Canonical Registries
→ Schema / Reference Resolution
→ G2 Machine Governance
→ G3 Adversarial Acceptance
→ G4 Evidence + Recovery
→ P0-01..P0-10 Final Architecture Gates
→ mandatory P1
→ Development Admission
```

The chain SHALL fail closed. No downstream status may override a failed upstream gate.

## 1. State Model

`DRAFT → HARDENED → CONDITIONAL PASS → PASS / ACTIVE`

`NO-GO` is a terminal decision for the evaluated change until blocking findings are closed.

## 2. G3 Adversarial Acceptance

The adversarial suite SHALL prove that prohibited mutations are rejected by machine governance. Minimum coverage:

GOV-001 owner deletion; GOV-002 duplicate primary owner; GOV-003 unauthorized owner change; GOV-004 accepted ADR violation; GOV-005 dependency cycle; GOV-006 undeclared dependency; GOV-007 binding privilege escalation; GOV-008 stale generation; GOV-009 unauthorized Worker addition; GOV-010 Worker removal/split without admission; GOV-011 historical import/activation; GOV-012 historical mutation; GOV-013 evidence replay; GOV-014 forged evidence; GOV-015 policy downgrade; GOV-016 diff-scope escape; GOV-017 AI self-approval; GOV-018 recovery without owner; GOV-019 governance blind spot; GOV-020 registry self-authorization.

Each case MUST have a deterministic expected FAIL outcome except the negative-control case needed to establish a legitimate PASS path.

## 3. G4 Evidence and Recovery

Evidence MUST bind:

- exact commit;
- exact canonical registry generation;
- active policy version;
- evaluation environment;
- independent verifier;
- validity window.

Recovery validation MUST cover registry presence and schema as well as executable or formally simulated recovery proof for every P0-relevant recovery path. Registry existence alone is insufficient for a P0 PASS.

Minimum evidence rejection tests:

- old commit;
- old registry generation;
- old policy version;
- wrong environment;
- expired evidence;
- forged/self verifier.

## 4. P0 Proof Requirements

Each P0 gate SHALL map to at least one authoritative registry, one deterministic probe, one failure scenario and one current evidence record.

P0-01 Authority → Authority / Ownership / Binding registries → uniqueness + generation probe.

P0-02 Bootstrap Independence → Dependency / Authority / Recovery registries → control-plane unavailable and restart bootstrap scenario.

P0-03 SLO/RPO/RTO → Policy / Provider Constraint / Release registries → objective and budget evaluation.

P0-04 Failure Domains → Failure-Domain / Dependency / Recovery registries → bounded retry/fan-out and correlated-failure scenario.

P0-05 Tenant Isolation → Capability / Policy / Authority / Dependency registries → cross-tenant access and noisy-neighbor scenario.

P0-06 Admission/Backpressure → Policy / Provider Constraint / Failure-Domain registries → overload and retry-amplification scenario.

P0-07 Idempotency → Capability / Policy / Recovery registries → duplicate transport/concurrent retry scenario.

P0-08 Event Semantics → Capability / Dependency / Compatibility / Recovery registries → duplicate, poison, replay and schema-version scenarios.

P0-09 Migration Safety → Authority / Compatibility / Recovery / Provider Constraint / Change registries → cutover failure and restore-before-destructive-transition scenario.

P0-10 Disaster Recovery → Recovery / Dependency / Failure-Domain / Provider Constraint registries → corruption/restore/reverification scenario.

## 5. Development Admission

Development admission is allowed only when:

1. all 16 canonical registries are structurally valid;
2. G2 machine governance is green;
3. GOV-001..GOV-020 are proven by CI;
4. G4 evidence freshness, replay and forgery checks are green;
5. P0-01..P0-10 are PASS with current evidence;
6. mandatory P1 gates are PASS or have bounded, expiring exceptions;
7. no architecture contradiction exists;
8. W01–W06 remain the admitted deployment baseline;
9. the autonomous execution contract requires GPT/Codex to stop at the development boundary and not invent the next phase.

## 6. W01–W06 Freeze

The governance chain SHALL NOT add, remove, split or merge Workers as part of governance implementation.

The admitted topology remains:

`W01 Gateway → W02 Execution → W03 Write → W04 Data → W05 Reliability → W06 Control`

Any topology change is a separate architecture change requiring the Worker Admission Gate.

## 7. Final Control Rule

Documents define the contract; registries define machine state; CI proves the contract; evidence proves the CI result; P0 gates authorize the architecture; Development Admission authorizes code implementation.
