# D1-Fabric 3.2 Governance Kernel

This directory contains machine-readable governance records required by the 3.2.6 Governance Kernel.

## Authority

The governing contract is:

`docs/D1-FABRIC-3.2.6-GOVERNANCE-KERNEL-META-CONTRACT-v1.0.md`

The closure mapping is:

`docs/D1-FABRIC-3.2.6-ARCHITECTURE-CONTRACT-CLOSURE-MATRIX-v1.0.md`

## Registry order

```text
contract-metadata.schema.json
        ↓
contract-registry.json
        ↓
authority-record.schema.json
        ↓
authority-registry.json
        ↓
future lifecycle / evidence / capacity registries
```

## Fail-closed rules

- Missing authoritative contract: STOP.
- Duplicate authority for a mutable object: FAIL.
- Unresolved contract conflict: STOP.
- Historical material cannot become current authority implicitly.
- Empty authority registry is valid during bootstrap only; it is not evidence that runtime objects are governed.
- Registry existence is not proof of architecture closure.

## Current implementation boundary

The kernel registries are governance-plane artifacts only. They do not authorize runtime W01-W06 changes.

Runtime admission remains blocked until the Final Architecture Gate is satisfied with implementation and exact-commit evidence.
