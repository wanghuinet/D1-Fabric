# D1-Fabric 3.2 Governance Closure Roadmap

Version: 1.0  
Status: DRAFT — CONTROLLED CLOSURE PLAN  
Scope: G1 through G6 only

## 1. Objective

Close 3.2 governance without expanding runtime architecture. The deployment baseline remains W01–W06.

## 2. Controlled Phases

### G1 — Architecture Authority

Exit criteria:
- one forward 3.2 architecture contract;
- canonical 16-registry matrix accepted;
- historical 1.x/2.x/old material mechanically reference-only;
- W01–W06 deployment baseline identified;
- no unresolved authority contradiction.

### G2 — Machine Governance

Exit criteria:
- all canonical registries have schemas and reference rules;
- ownership and authority are deterministic;
- dependency and binding rules are executable;
- Change Manifest and Diff Scope are enforced;
- CI fail-closed ordering is operational.

### G3 — Adversarial Acceptance

Exit criteria:
- GOV-001..GOV-020 executed by CI;
- every prohibited mutation deterministically rejected;
- legitimate negative-control path produces PASS;
- no adversarial case can bypass the same authoritative gate by alternate path.

### G4 — Evidence and Recovery

Exit criteria:
- current evidence binds commit, registry generation, policy and environment;
- old/replayed/expired/forged evidence is rejected;
- recovery registry validates;
- P0 recovery scenarios have executable or formally simulated proof;
- evidence retention/expiry semantics are explicit.

### G5 — Final Architecture Admission

Exit criteria:
- P0-01..P0-10 PASS with current evidence;
- mandatory P1 gates PASS or explicit bounded exceptions;
- provider constraints represented as executable governance inputs;
- red-team mandatory scenarios covered;
- no architecture contradiction remains.

### G6 — Development Admission

Exit criteria:
- development boundary is explicit;
- W01–W06 remain the admitted deployment baseline;
- AI/GPT/Codex autonomous execution rules are active;
- STOP condition is machine- or contract-enforced;
- governance enters maintenance mode rather than feature expansion.

## 3. STOP Rule

At `READY_FOR_NEXT_CODE_PHASE`, governance work stops. The system must not invent a G7 or add a new Worker or architecture plane merely to continue governance work.

Code work after G6 is a separate controlled phase and remains subject to the same machine governance.

## 4. Non-Goal

This roadmap does not authorize implementation of runtime capabilities. It authorizes closure and verification of architecture governance only.
