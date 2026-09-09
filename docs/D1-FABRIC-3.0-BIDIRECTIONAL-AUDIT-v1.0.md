# D1-Fabric 3.0 Contract ↔ Architecture Bidirectional Audit v1.0

**Status:** ACTIVE REFACTOR GATE  
**Purpose:** deterministic audit before/after Worker refactoring

## 1. Audit authority

The repository is authoritative. This audit treats the approved 2.0 blueprint as the architecture baseline and the 3.0 Final Contract as the evolution contract. Therefore 3.0 does not silently replace the four-Worker topology.

## 2. Required directions

### Direction A: Architecture → Contract → Code

Every architecture invariant must map to:

```text
architecture ID
→ contract ID
→ implementation owner
→ test/evidence
```

Missing mapping = FAIL.

### Direction B: Contract → Architecture → Code

Every normative contract item must map to:

```text
contract ID
→ architecture ID or explicit implementation-only classification
→ implementation owner
→ test/evidence
```

An orphan normative contract item = FAIL.

## 3. Mandatory audit matrix

| Area | Architecture IDs | Contract IDs | Required evidence |
|---|---|---|---|
| Worker topology | A-001,A-010 | CORE-ARCH | topology/file diff |
| Ownership | A-002,A-003 | OWN-* | ownership tests |
| Public boundary | A-004 | SEC/API-* | protocol tests |
| Cache termination | A-005 | EXEC/CACHE-* | zero-D1 hit test |
| Observability | A-006 | OBS-* | trace evidence |
| Placement | A-007 | ROUTE/PLACE-* | deterministic mapping |
| Bounded execution | A-008 | BUDGET/EXEC-* | adversarial budget tests |
| Control state | A-009 | CONTROL-* | LKG/failure tests |
| Iteration | EXT-* | ITER-* | compatibility tests |
| Application | EXT-* | APP-* | schema/boundary tests |
| Commercial extension | EXT-* | COMM-* | registry/security tests |

## 4. Drift classifications

```text
D0 PASS
D1 implementation drift
D2 contract drift
D3 architecture drift
D4 ownership drift
D5 security drift
D6 resource-bound drift
D7 compatibility drift
D8 evidence drift
D9 scope drift
```

Any D3-D7 failure blocks release.

## 5. Refactor verification procedure

```text
1. Read AGENTS.md.
2. Read 3.0 Architecture Contract.
3. Read 3.0 Final Contract.
4. Read only affected W01-W04 files.
5. Build contract→architecture→code→test mapping.
6. Identify violations before changing code.
7. Refactor only declared violations.
8. Run unit/contract/negative/failure/resource/security tests.
9. Run architecture topology and ownership diff.
10. Run scope diff.
11. Verify extension interfaces remain domain-neutral.
12. Record evidence.
13. Commit/push only after all gates pass.
```

## 6. Mandatory extension audit

For every iteration or commercial capability, verify:

```text
Does it add business meaning to W01-W04?       → must be NO
Does it bypass admission/budget?               → must be NO
Does it expose physical D1/shards?             → must be NO
Does it introduce a new Worker?                → must be NO unless approved
Does it alter existing contract semantics?     → must be versioned/approved
Can metadata execute arbitrary code?          → must be NO
Can it cross tenant/security boundaries?       → must be NO
```

## 7. Resource audit

For every changed operation:

```text
fan-out bounded
concurrency bounded
statements bounded
rows-read bounded
rows-write bounded
retries bounded
deadline bounded
```

For shard allocation:

```text
sum(shard_rows_budget) <= global_rows_budget
sum(shard_write_budget) <= global_write_budget
sum(statement_budget) <= global_statement_budget
```

## 8. Release decision

```text
PASS = all mandatory mappings exist + tests/evidence pass + no architecture/scope drift
FAIL = any mandatory invariant, boundary, security, resource, compatibility, or evidence gate fails
```

Functional correctness cannot override architecture conformance.
