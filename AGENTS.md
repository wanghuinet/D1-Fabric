# D1-Fabric AI Engineering Instructions

**Version:** 6.0
**Status:** ACTIVE
**Role:** AI唯一入口 / Router。

## 1. Repository authority

The repository is the source of truth. Chat is never an authority.

### Active core contracts

```text
AGENTS.md                                      ← AI唯一入口 / Router
docs/C00-CONSTITUTION-v1.0.md                 ← 总宪法 / AI权限 / 合同优先级
docs/C01-ARCHITECTURE-OWNERSHIP-v1.0.md      ← 架构 / Worker / Owner / 数据与API边界
docs/C02-ENGINEERING-OPERATIONS-v1.0.md       ← 开发 / 验证 / 成本 / 性能 / 部署 / 证据
docs/PRODUCT-PLATFORM-ROADMAP-CONTRACT-v1.0.md← 产品/平台路线图与迭代决策合同
docs/API-CONTRACT-v1.1-DEVELOPER-PLATFORM.md  ← v1.1公开API/第三方开发者合同
docs/API-IMPLEMENTATION-CONTRACT-v1.1.md      ← v1.1实现级冻结合同
docs/D1-FABRIC-2.0-BLUEPRINT.md               ← 2.0架构基线与微创新规则
docs/api/v1.1/                                 ← v1.1 OpenAPI/DTO/RPC/migration evidence set
```

Historical documents under `archive/` have NO active authority. The former 1.0 middleware implementation is preserved under `workers/old1.0/` and is not the 2.0 implementation target.

## 2. Mandatory read order

For every non-trivial task:

```text
AGENTS.md
→ C00
→ C01 when architecture/ownership/deployment/API/data boundaries are relevant
→ C02
→ PRODUCT-PLATFORM-ROADMAP-CONTRACT when product/version scope is relevant
→ API-CONTRACT when API/data contract is relevant
→ API-IMPLEMENTATION-CONTRACT when implementing v1.1
→ D1-FABRIC-2.0-BLUEPRINT when implementing or reviewing 2.0
→ applicable domain/data contract
→ existing verified implementation/tests
→ Change Manifest / Execution Packet
```

Do NOT preload the repository or historical documents. Load the minimum context required by the task.

## 3. AI authority boundary

AI agents are implementation agents, not architecture, product, database, security-policy, ownership, or scope authorities. For approved 2.0 work, AI implements the 2.0 blueprint and its acceptance gates; it may not invent additional architecture.

AI MUST NOT independently add, split, or merge Workers outside the approved 2.0 topology; create speculative infrastructure; change semantic ownership; invent competing protocol semantics; put business meaning into middleware; implement future-phase features; delete functionality to reduce code; or fabricate evidence.

Conflict or genuine architecture defect: STOP → report → versioned proposal → approval → implement.

## 4. Current topology and migration

The verified 1.0 middleware topology was W01-W06: Runtime Gateway, Shard Router, Query Engine, Write Engine, Cache, Control & Recovery. These six implementations are preserved under `workers/old1.0/` for rollback, audit, and behavior comparison.

The approved 2.0 middleware topology is four execution boundaries:

- W01 Fabric Gateway
- W02 Execution Fabric
- W03 Write Fabric
- W04 Control Plane

Cache is a capability of the read execution path, not a mandatory standalone network hop. Observability is emitted by the executing boundary, not a synchronous telemetry Worker.

The v1.1 business topology remains W07 API/BFF; W08 Identity; W09 Content + Media + Topic; W10 Feed + Recommendation + History; W12 Social + Interaction; W13 Search. W11 is not a physical Worker in v1.1.

Known pre-1.0 blocker: business semantics previously present in W04 `publish.ts` and W06 content-specific integrity logic must remain in the preserved 1.0 archive and must not be reintroduced into 2.0 middleware.

## 5. 2.0 industrial-basis rule

Every new 2.0 capability must identify:

```text
production-proven distributed-systems idea
→ D1/Edge/Serverless adaptation
→ small measurable Fabric innovation
→ contract + adversarial evidence
```

No novelty-for-novelty features. Do not claim that an established idea was invented by Fabric.

## 6. 2.0 core engineering law

```text
User/system problem → outcome → capability
→ industrial basis → approved Fabric adaptation
→ contract freeze → implementation → adversarial qualification
→ resource/cost/performance evidence → security → scope gate
→ commit → push → CI → evidence → measurement
```

## 7. 2.0 non-negotiable invariants

- One semantic concern has one owner.
- One authoritative mutable state has one owner.
- Business owns meaning; middleware owns generic capability.
- No unbounded D1 I/O, fan-out, retries, payloads, or synchronous side-effect cascades.
- No mandatory global coordinator on the hot path without an approved contract.
- Partial failure must not corrupt committed state.
- Recovery must restore invariants before normal admission.
- Public compatibility cannot be silently changed.
- Public APIs never expose shard/physical D1/SQL/internal Worker details.
- Every execution has explicit fan-out, statement, row, write, retry and deadline budgets.
- `sum(shard_rows_budget) <= global_rows_budget`.
- `sum(shard_write_budget) <= global_write_budget`.
- `sum(statement_budget) <= global_statement_budget`.
- Cache HIT terminates database execution when `cacheTermination=true`.
- AI-generated data operations are validated against the same Data Contract used by runtime.
- No 2.0 middleware Worker contains business semantics.

## 8. Scope discipline

Every T1/T2 task requires a Change Manifest and Diff Scope Gate. No drive-by refactor, dependency, schema, API, Worker, or infrastructure change.

T0 = trivial mechanical; T1 = bounded local semantic; T2 = cross-boundary/security/state/routing/epoch/recovery/schema/public protocol/material performance or cost. Never downgrade a real T2 task.

## 9. Roadmap authority

`docs/PRODUCT-PLATFORM-ROADMAP-CONTRACT-v1.0.md` remains the product/platform roadmap authority for the application. `docs/D1-FABRIC-2.0-BLUEPRINT.md` is the approved middleware architecture baseline for the 2.0 migration. Future capabilities remain evidence-driven and are not implementation promises until approved.

## 10. v1.1 business boundary

v1.1 closes the complete loop:

```text
Auth/User → text/image/video/mixed content → R2 media
→ publish/lifecycle → home/following/hot feed → detail
→ like/favorite/follow → comments/replies
→ search/topic/history primitives → Admin → public H5
→ Android → approved third-party developer API
```

Do not implement v1.2+ business functionality merely because an interface could be useful.

## 11. Final rule

> Solve the declared system problem, use the minimum correct context, implement only the approved boundary, prefer proven industrial ideas plus small measurable adaptation, prove the result, and stop.
