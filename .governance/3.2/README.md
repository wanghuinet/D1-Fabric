# D1-Fabric 3.2 Machine Governance

This directory is the machine-readable governance source for 3.2.

## Authority

The authoritative governance model is defined by:

- `docs/D1-FABRIC-3.2-INFRASTRUCTURE-ARCHITECTURE-CONTRACT-v1.0.md`
- `docs/D1-FABRIC-3.2-ARCHITECTURE-HARDENING-AMENDMENT-v1.2.md`
- `docs/D1-FABRIC-3.2.3-ARCHITECTURE-PROOF-AND-ENFORCEMENT-CONTRACT-v1.0.md`
- `docs/D1-FABRIC-3.2.4-MACHINE-GOVERNANCE-ENFORCEMENT-CONTRACT-v1.0.md`
- `docs/D1-FABRIC-3.2-GPT-AUTONOMOUS-EXECUTION-AND-STOP-CONTRACT-v1.0.md`

The GPT execution contract governs AI continuity and stop behavior. It does not override architecture or governance authority.

Machine-readable files under this directory are authoritative only within their declared registry scope.

Generated reports, dashboards, AI summaries and CI artifacts are projections/evidence and MUST NOT become source of truth.

## Registry layout

- `config.json` — enforcement configuration and historical isolation rules
- `capabilities/registry.json` — capability authority
- `adrs/registry.json` — architecture decision authority
- `ownership/registry.json` — primary ownership authority
- `dependencies/registry.json` — dependency DAG authority
- `bindings/registry.json` — provider/resource binding authority
- `changes/schema.json` — change manifest schema
- `evidence/schema.json` — evidence schema

## Enforcement level

Target: Level 6 — Production Admission.

Until all mandatory gates have executable checks and current evidence, 3.2 remains `DRAFT FOR ARCHITECTURE REVIEW`.

## GPT Continuity Terminal Rule

GPT may continue autonomously inside an already-authorized scope. It MUST stop when the repository reaches:

`READY_FOR_NEXT_CODE_PHASE — STOPPED_FOR_USER_COMMAND`

The next code-development phase may be reported but MUST NOT be started automatically.
