# D1-Fabric AI Engineering Instructions

**Version:** 3.0
**Status:** ACTIVE
**Role:** AI唯一入口 / Router；不重复定义领域合同。

## 1. Repository authority

The repository is the source of truth. Chat is never an authority.

### Active core contracts

```text
AGENTS.md                                  ← AI唯一入口 / Router
 docs/C00-CONSTITUTION-v1.0.md             ← 总宪法 / AI权限 / 合同优先级
 docs/C01-ARCHITECTURE-OWNERSHIP-v1.0.md   ← 架构 / Worker / Owner / 数据与API边界
 docs/C02-ENGINEERING-OPERATIONS-v1.0.md   ← 开发 / 验证 / 成本 / 性能 / 部署 / 证据
```

Domain/data contracts remain active only for their declared domain (for example `workers/shard-schema/CONTENT-PLATFORM-SCHEMA-V1-CONTRACT.md`). Historical contracts under `archive/legacy/` have **NO ACTIVE AUTHORITY**.

## 2. Mandatory read order

For every non-trivial task:

```text
AGENTS.md
→ C00
→ C01 when architecture/ownership/deployment/API/data boundaries are relevant
→ C02
→ applicable domain/data contract
→ existing verified implementation/tests
→ Change Manifest / Execution Packet
```

Do NOT preload the repository or historical documents. Load the minimum context required by the task.

## 3. AI authority boundary

AI agents are implementation agents, not architecture, product, database, security-policy, ownership, or scope authorities.

AI MUST NOT independently redesign architecture; add, split, or merge Workers; create speculative infrastructure; change semantic ownership; invent competing protocol semantics; put business meaning into middleware; implement future-phase features; delete functionality to reduce code; or fabricate evidence.

Conflict or genuine architecture defect: **STOP → report → versioned proposal → approval → implement.**

## 4. Frozen 1.0 topology pointer

C01 is authoritative for topology. Current middleware is W01-W06: W01 Runtime Gateway; W02 Shard Router; W03 Query Engine; W04 Write Engine; W05 Cache; W06 Control & Recovery.

Business ownership is B01-B14 for defined 1.0/V2 boundaries; B15-B21 are reserved logical boundaries only. No empty future Worker is created merely because a boundary is reserved.

Known pre-1.0 blocker: business semantics in W04 `publish.ts` and W06 content-specific integrity logic must be migrated according to C01 before the affected middleware is considered pure.

## 5. Core engineering law

```text
Contract → Owner → Data Contract → Schema/Index → Implementation
→ Targeted Test → Adversarial/Boundary Test → Cost/Performance Check
→ Diff Scope Gate → Commit → Push → CI PASS → Evidence
```

## 6. Non-negotiable invariants

- One semantic concern has one owner.
- One authoritative mutable state has one owner.
- Business owns meaning; middleware owns generic capability.
- No unbounded D1 I/O, fan-out, retries, payloads, or synchronous side-effect cascades.
- No mandatory global coordinator on the hot path without an approved contract.
- Partial failure must not corrupt committed state.
- Recovery must restore invariants before normal admission.
- Public compatibility cannot be silently changed.

## 7. Scope discipline

Every T1/T2 task requires a Change Manifest and Diff Scope Gate. No drive-by refactor, dependency, schema, API, Worker, or infrastructure change.

T0 = trivial mechanical; T1 = bounded local semantic; T2 = cross-boundary/security/state/routing/epoch/recovery/schema/public protocol/migration/material performance or cost. Never downgrade a real T2 task.

## 8. 1.0 scope pointer

MVP business closure is `B01 + B02 + B03 + B04 + B05 + B06 + B07 + B12 + B13`.

Core path: `Auth → User → Content Create → Media Reference → Publish → Feed Read → Content Read → Social Action → Search → Topic → History`.

B08/B09/B10/B11/B14 are V2; B15-B21 later.

## 9. Final rule

> **Do not invent a route when the contract defines it. Load minimum correct context, freeze the declared scope, implement, prove the diff, and stop.**
