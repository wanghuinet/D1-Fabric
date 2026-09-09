# D1-Fabric 3.0 Final Contract v1.0

**Status:** COMPATIBILITY REDIRECT / NON-NORMATIVE
**Normative authority:** `docs/D1-FABRIC-3.0-MASTER-CONTRACT-v1.0.md`

This file is retained only for compatibility with existing references. It is no longer an independent normative contract and MUST NOT redefine or override 3.0 semantics.

## Mandatory rule

For all 3.0 implementation, architecture, security, resilience, capacity, extension, phase, and release decisions:

```text
AGENTS.md
→ D1-FABRIC-3.0-MASTER-CONTRACT-v1.0.md
→ applicable non-conflicting annex / phase packet
```

If any text in this compatibility file, an older 3.0 contract, an annex, implementation, or test conflicts with the Master Contract, the Master Contract wins. If the conflict cannot be mechanically resolved, AI MUST STOP and report `FAIL_CONTRACT_AUTHORITY`.

The four-Worker architecture remains W01/W02/W03/W04 unless the Master Contract is explicitly versioned and architecture approval is recorded.

The Master Contract closes the eight release-blocking areas: H01 Single Master Contract Authority; H02 Budget Reservation/Consumption/Hard-Stop; H03 Atomic Idempotency; H04 Distributed Quota Guarantee Levels; H05 Control-Plane Epoch + LKG Fencing; H06 Cache/Cursor/Extension Security Binding; H07 Numeric Capacity Envelope; H08 Executable Phase Packets + Machine-Verifiable Evidence.

See the Master Contract for the complete normative text.