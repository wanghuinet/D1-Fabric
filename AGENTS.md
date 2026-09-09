# D1-Fabric AI Engineering Instructions

**Version:** 4.0
**Status:** ACTIVE
**Role:** AI唯一入口 / Router。

## 1. Repository authority

The repository is the source of truth. Chat is never an authority.

### Active core contracts

```text
AGENTS.md                                  ← AI唯一入口 / Router
 docs/C00-CONSTITUTION-v1.0.md             ← 总宪法 / AI权限 / 合同优先级
 docs/C01-ARCHITECTURE-OWNERSHIP-v1.0.md   ← 架构 / Worker / Owner / 数据与API边界
 docs/C02-ENGINEERING-OPERATIONS-v1.0.md   ← 开发 / 验证 / 成本 / 性能 / 部署 / 证据
 docs/CURRENT-ITERATION-CONTRACT-v1.1-v1.9.md ← 当前产品迭代总合同
 docs/API-CONTRACT-v1.1-DEVELOPER-PLATFORM.md ← v1.1公开API/第三方开发者合同
 docs/api/v1.1/                             ← v1.1 OpenAPI/DTO/RPC/migration evidence set
```

Historical documents under `archive/` have **NO ACTIVE AUTHORITY**.

## 2. Mandatory read order

For every non-trivial task:

```text
AGENTS.md
→ C00
→ C01 when architecture/ownership/deployment/API/data boundaries are relevant
→ C02
→ CURRENT-ITERATION-CONTRACT when product/version scope is relevant
→ API-CONTRACT when API/data contract is relevant
→ applicable domain/data contract
→ existing verified implementation/tests
→ Change Manifest / Execution Packet
```

Do NOT preload the repository or historical documents. Load the minimum context required by the task.

## 3. AI authority boundary

AI agents are implementation agents, not architecture, product, database, security-policy, ownership, or scope authorities.

AI MUST NOT independently redesign architecture; add, split, or merge Workers; create speculative infrastructure; change semantic ownership; invent competing protocol semantics; put business meaning into middleware; implement future-phase features; delete functionality to reduce code; or fabricate evidence.

Conflict or genuine architecture defect: **STOP → report → versioned proposal → approval → implement.**

## 4. Current topology

C01 is authoritative for middleware topology. Current generic middleware is W01-W06: W01 Runtime Gateway; W02 Shard Router; W03 Query Engine; W04 Write Engine; W05 Cache; W06 Control & Recovery.

The active v1.1 business topology is defined by the current iteration/API contracts: W07 API/BFF; W08 Identity; W09 Content + Media + Topic; W10 Feed + Recommendation + History; W12 Social + Interaction; W13 Search. W11 is not a physical Worker in v1.1. Do not create future Workers merely because a logical boundary is reserved.

Known pre-1.0 blocker remains: business semantics in W04 `publish.ts` and W06 content-specific integrity logic must be migrated according to C01 before affected middleware is considered pure.

## 5. Core engineering law

```text
Contract → Owner → Data Contract → Schema/Index → Implementation
→ Targeted Test → Adversarial/Boundary Test → Cost/Performance Check
→ Security Check → Diff Scope Gate → Commit → Push → CI PASS → Evidence
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
- Public APIs never expose shard/physical D1/SQL/internal Worker details.
- R2 is authoritative for binary media; D1 stores metadata/reference.
- Content uses one canonical post model for text/image/video/mixed; do not create parallel Article/Gallery/Video business tables.
- Comments and replies use one comments model with `parent_id`.
- Duplicate likes/favorites/follows are prevented by authoritative constraints/idempotency.

## 7. Scope discipline

Every T1/T2 task requires a Change Manifest and Diff Scope Gate. No drive-by refactor, dependency, schema, API, Worker, or infrastructure change.

T0 = trivial mechanical; T1 = bounded local semantic; T2 = cross-boundary/security/state/routing/epoch/recovery/schema/public protocol/migration/material performance or cost. Never downgrade a real T2 task.

## 8. Version authority

`docs/CURRENT-ITERATION-CONTRACT-v1.1-v1.9.md` is the sole active product roadmap for v1.1-v1.9. `docs/API-CONTRACT-v1.1-DEVELOPER-PLATFORM.md` is the active public semantic API contract. Existing `docs/api/v1.1/` artifacts remain the implementation contract set until superseded by an explicitly versioned contract.

v1.1 must close the real loop: Auth/User → text/image/video/mixed content → media/R2 → publish → home/following/hot feed → detail → like/favorite/follow → comments/replies → search/topic/history primitives → Admin → public H5 → Android → approved third-party developer API.

## 9. Final rule

> **Do not invent a route when the contract defines it. Load minimum correct context, freeze the declared scope, implement, prove the diff, and stop.**
