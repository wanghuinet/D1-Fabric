# D1-Fabric AI Engineering Instructions

**Version:** 7.0
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
docs/D1-FABRIC-3.0-CONTRACT-v1.0.md           ← 3.0执行合同 / 双向一致性 / 扩展接口 / Push-Verify Gate
docs/api/v1.1/                                 ← v1.1 OpenAPI/DTO/RPC/migration evidence set
```

Historical documents under `archive/` have NO active authority. The former 1.0 middleware implementation is preserved under `workers/old1.0/` and is not the 2.0/3.0 implementation target unless an explicit migration contract says otherwise.

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
→ D1-FABRIC-2.0-BLUEPRINT when reviewing the 2.0 baseline
→ D1-FABRIC-3.0-CONTRACT-v1.0 when implementing/reviewing 3.0
→ applicable domain/data contract
→ existing verified implementation/tests
→ Change Manifest / Execution Packet
```

Do NOT preload the repository or historical documents. Load the minimum context required by the task.

## 3. AI authority boundary

AI agents are implementation agents, not architecture, product, database, security-policy, ownership, or scope authorities. For approved 3.0 work, AI implements the 3.0 contract and its acceptance gates; it may not invent additional architecture.

AI MUST NOT independently add, split, or merge Workers outside the approved topology; create speculative infrastructure; change semantic ownership; invent competing protocol semantics; put business meaning into middleware; implement future-phase features; delete functionality to reduce code; or fabricate evidence.

Conflict or genuine architecture defect: STOP → report exact conflict → versioned proposal → approval → implement.

## 4. Current runtime topology

The approved execution boundaries remain:

- W01 Fabric Gateway
- W02 Execution Fabric
- W03 Write Fabric
- W04 Control Plane

Cache is a capability of the read execution path, not a mandatory standalone network hop. Observability is emitted by the executing boundary, not a synchronous telemetry Worker.

No additional Worker is justified merely because a capability has a separate name. Worker topology changes require an explicit architecture change.

## 5. Industrial-basis rule

Every new middleware capability must identify:

```text
production-proven distributed-systems idea
→ D1/Edge/Serverless adaptation
→ small measurable Fabric innovation
→ contract + adversarial evidence
```

No novelty-for-novelty features.

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
- Every execution has explicit fan-out, statement, row, write, retry and deadline budgets.
- `sum(shard_rows_budget) <= global_rows_budget`.
- `sum(shard_write_budget) <= global_write_budget`.
- `sum(statement_budget) <= global_statement_budget`.
- Cache HIT terminates database execution when `cacheTermination=true`.
- AI-generated data operations are validated against the same Data Contract used by runtime.
- No middleware Worker contains business semantics.

## 7. Scope discipline

Every T1/T2 task requires a Change Manifest and Diff Scope Gate. No drive-by refactor, dependency, schema, API, Worker, or infrastructure change.

T0 = trivial mechanical; T1 = bounded local semantic; T2 = cross-boundary/security/state/routing/epoch/recovery/schema/public protocol/material performance or cost. Never downgrade a real T2 task.

## 8. 3.0 delivery law

```text
Contract + Architecture
→ DeepSeek implementation
→ local verification
→ diff/scope gate
→ commit
→ PUSH TO GITHUB
→ exact commit SHA
→ STOP
→ independent Worker verification
→ contract-preserving refactor only if required
→ final PASS / FAIL evidence
```

A local PASS is not a delivery. The pushed GitHub commit is the verification input.

The implementation agent must not start unrelated work after pushing the assigned boundary.

## 9. Worker package/file rule

Every independently deployable Worker must retain its own package boundary:

```text
workers/v2/<worker>/
  package.json
  wrangler.toml
  src/index.ts
  tests/
```

Shared TypeScript contracts belong under:

```text
workers/v2/contracts/
```

Worker runtime code is TypeScript. PowerShell is not a substitute for Worker source code.

Dependencies must not be collapsed into one giant root package merely for convenience.

Every delivery report must list repository-relative added/modified/deleted file paths.

## 10. Independent Worker verification

The verification pass must inspect the exact pushed commit and independently check:

```text
package/file layout
architecture ownership
Contract → Code → Test mapping
resource bounds
security
failure/concurrency/idempotency
regression
Architecture → Contract mapping
Contract → Architecture mapping
```

Verification may perform only contract-preserving refactoring. It may not add product/business functionality or change architecture under the label of refactoring.

## 11. Iteration and commercial extension boundary

3.0 provides versioned Iteration, Application, and Commercial Extension interfaces. These interfaces allow games, social applications, content platforms, commerce, AI applications, and future commercial capabilities to evolve without placing their business semantics inside the Fabric kernel.

The kernel remains generic. Extensions must declare identity, version, capability, input/output contract, authorization scope, tenant scope, resource budget, data ownership, consistency, failure policy, compatibility, lifecycle, and observability requirements.

No extension interface authorizes a new Worker, storage system, queue, coordinator, or business logic inside middleware.

## 12. Roadmap and application boundary

Application/business Workers remain outside the Fabric kernel. v1.1 business functionality must continue to follow the approved application contracts. A future interface is not permission to implement a future product feature.

## 13. Final rule

> Solve the declared system problem, use the minimum correct context, implement only the approved boundary, prove the result, push the verified commit, independently verify the pushed state, and stop.
