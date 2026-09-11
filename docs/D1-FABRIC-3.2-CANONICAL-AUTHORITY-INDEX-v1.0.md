# D1-Fabric 3.2 Canonical Authority Index

Version: 1.0  
Status: DRAFT — ROOT INDEX  
Scope: resolution order for 3.2 governance documents and registries

## 1. Authority Order

When two governance artifacts appear to conflict, resolve them in this order:

1. `D1-FABRIC-3.2-INFRASTRUCTURE-ARCHITECTURE-CONTRACT-v1.1.md` — forward architecture boundary.
2. `D1-FABRIC-3.2-FINAL-ARCHITECTURE-GATE-v1.0.md` — production admission criteria.
3. `D1-FABRIC-3.2-REGISTRY-AUTHORITY-MATRIX-v1.0.md` — canonical 16-registry authority/owner/schema/gate/evidence mapping.
4. `D1-FABRIC-3.2-REGISTRY-SCHEMA-MATRIX-v1.0.md` — canonical schema requirements.
5. `D1-FABRIC-3.2-GOVERNANCE-MASTER-MATRIX-v1.0.md` — G1–G6 control sequence.
6. `D1-FABRIC-3.2-P0-EVIDENCE-MATRIX-v1.0.md` — P0 proof mapping.
7. Machine-readable `.governance/3.2/` state and validation outputs — executable current state.
8. Historical 1.x/2.x/old documents — reference only, never current authority.

## 2. Conflict Rule

No lower-order document may silently weaken a higher-order contract. A contradiction requires an explicit ADR transition and Change Manifest before implementation.

## 3. W01–W06 Rule

The admitted deployment baseline is fixed at:

`W01 Gateway → W02 Execution → W03 Write → W04 Data → W05 Reliability → W06 Control`

Governance documents define controls around this topology; they do not create additional Workers.

## 4. AI Rule

GPT/Codex must resolve current architecture from this authority chain and machine registries, not from conversational memory, stale summaries or historical documents.

## 5. Stop Rule

When G6 Development Admission reaches `READY_FOR_NEXT_CODE_PHASE`, governance expansion stops unless a separate architecture change is explicitly approved.
