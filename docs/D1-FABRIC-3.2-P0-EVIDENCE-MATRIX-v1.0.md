# D1-Fabric 3.2 P0 Evidence Matrix

Version: 1.0  
Status: DRAFT — P0 EXECUTION BASELINE  
Scope: P0-01 through P0-10 final architecture admission

## 1. Rule

A P0 gate is PASS only when the mapped authoritative registries validate, the required deterministic probe passes, the required failure scenario is exercised, and current evidence binds the result to the evaluated commit, registry generation, policy version and environment.

## 2. Matrix

| Gate | Authoritative registries | Required proof | Minimum failure scenario | PASS evidence |
|---|---|---|---|---|
| P0-01 Authority | Authority, Ownership, Binding | unique writer + generation proof | competing writer / authority mutation | current authority evidence |
| P0-02 Bootstrap | Dependency, Authority, Recovery | bootstrap graph + degraded mode + recovery | W06 unavailable/restart | bootstrap/recovery evidence |
| P0-03 SLO/RPO/RTO | Policy, Provider Constraint, Release | measurable objectives + budget consequences | objective exhaustion | SLO/error-budget evidence |
| P0-04 Failure Domains | Failure-Domain, Dependency, Recovery | bounded blast radius and retry scope | correlated failure | fault-boundary evidence |
| P0-05 Tenant Isolation | Capability, Policy, Authority | namespace/resource/event/cache isolation | cross-tenant access/noisy neighbor | isolation evidence |
| P0-06 Admission | Policy, Provider Constraint, Failure-Domain | overload + pressure control | retry/queue amplification | admission evidence |
| P0-07 Idempotency | Capability, Policy, Recovery | dedup authority + replay semantics | duplicate concurrent mutation | idempotency evidence |
| P0-08 Events | Capability, Dependency, Compatibility, Recovery | delivery/order/replay/schema semantics | duplicate + poison + replay | event evidence |
| P0-09 Migration | Authority, Compatibility, Recovery, Change, Provider Constraint | migration classification + rollback/restore proof | cutover failure | migration evidence |
| P0-10 DR | Recovery, Dependency, Failure-Domain, Provider Constraint | restore + corruption + verification | corrupted control/data state | DR restore evidence |

## 3. Evidence Freshness

P0 evidence is invalid when:

- commit differs from evaluated commit;
- registry generation differs from current generation;
- policy version differs from active policy;
- environment differs from declared target;
- verifier is missing or is the change actor for a proof requiring independent verification;
- expiration has passed.

## 4. Exceptions

An exception cannot silently convert FAIL to PASS. Any exception requires owner, rationale, compensating control, affected scope, start time, expiry and review rule. Permanent exceptions for P0 safety invariants are forbidden.

## 5. Final Admission Condition

`P0-01..P0-10 = PASS` is necessary but not sufficient for Development Admission. Mandatory P1, historical isolation, machine governance, adversarial acceptance and evidence freshness must also be green.
