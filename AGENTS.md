# D1-Fabric AI Engineering Instructions

**Version:** 2.0
**Status:** ACTIVE
**Role:** AI唯一入口；本文件负责路由，不重复定义全部领域合同。

## 1. Repository Authority

The repository is the source of truth. Chat is never an authority.

Active contract set:

```text
AGENTS.md                                      ← AI唯一入口
 docs/AI-DEVELOPMENT-CONTRACT-v1.0.md          ← 总开发/AI/验证/成本合同
 docs/PHASE-0-ARCHITECTURE-FREEZE-CONTRACT-v1.0.md ← 架构与边界合同
 docs/W04-W06-BUSINESS-LEAKAGE-MIGRATION-CONTRACT-v1.0.md ← 当前专项迁移合同
```

Historical contracts must live under `archive/legacy/` and have **NO ACTIVE AUTHORITY**. AI MUST NOT use archived documents to resolve current design questions unless a task explicitly requests historical research.

## 2. Mandatory Read Order

For every non-trivial task:

```text
AGENTS.md
→ AI-DEVELOPMENT-CONTRACT-v1.0.md
→ PHASE-0-ARCHITECTURE-FREEZE-CONTRACT-v1.0.md when architecture/ownership/deployment/cost topology is affected
→ W04-W06-BUSINESS-LEAKAGE-MIGRATION-CONTRACT-v1.0.md when W04/W06 migration is affected
→ existing verified implementation
→ Change Manifest / applicable templates
```

Do NOT load every repository document by default.

## 3. AI Authority Boundary

DeepSeek and other AI agents are implementation agents, not architecture, product, database, security-policy, or scope authorities.

AI MUST NOT independently:

- redesign architecture;
- add or split Workers;
- create infrastructure because it seems fashionable;
- change semantic ownership;
- invent a second API/schema/auth/idempotency/recovery semantic;
- put business logic into middleware;
- implement future-phase features;
- delete functionality to reduce code;
- fabricate evidence.

If a contract/code conflict or genuine architecture defect is found: **STOP → report → propose versioned change → wait for approval → implement.**

## 4. Core Engineering Law

```text
Contract
→ Owner
→ Data Contract
→ Schema/Index
→ Implementation
→ Targeted Test
→ Adversarial/Boundary Test
→ Cost/Performance Check
→ Diff Scope Check
→ Commit
→ Push
→ CI PASS
→ Evidence
```

No step may be replaced by model confidence or compilation success.

## 5. Non-negotiable Invariants

- One semantic concern has one owner.
- One authoritative mutable state has one owner.
- Authenticate → Authorize → resolve authorized scope → route → epoch/ownership → resource policy → idempotency → execute → commit → derived/cache state.
- No unbounded D1 I/O, fan-out, retries, payloads, queues, or synchronous side-effect cascades.
- No global coordinator is mandatory on the hot path.
- Partial failure must not corrupt committed state.
- Recovery must restore distributed invariants before normal admission.
- Public compatibility cannot be silently changed.
- Middleware is generic capability only; business owns meaning.

## 6. Cost / Performance Law

Every material capability must minimize, subject to correctness:

```text
D1 reads/writes
→ Worker/RPC hops
→ fan-out
→ payload
→ retries
→ storage operations
→ paid infrastructure
```

Prefer Cloudflare-native primitives and existing capabilities. New Redis/Kafka/RabbitMQ/DO/Queue/Worker/third-party infrastructure requires a concrete requirement, real boundary, measurable benefit, resource/cost budget, and verification.

Cache-first reads are preferred where safe. Batch/transaction writes are preferred where correct. No cost claim is valid without measurements.

## 7. Scope Discipline

Every T1/T2 task requires a Change Manifest and Diff Scope Gate. No "drive-by" refactor, dependency, schema, API, Worker, or infrastructure change is allowed.

Use the smallest safe development mode:

```text
T0 → trivial local change
T1 → bounded module/capability change
T2 → material/cross-boundary/security/state/recovery change
```

Never downgrade a task involving auth, tenant isolation, ownership, routing/epoch, recovery, public compatibility, or cross-shard correctness.

## 8. Verification

Applicable verification must include build/typecheck/tests and, where relevant, contract, API, schema, idempotency, boundary, D1, E2E, concurrency, failure/recovery, security, performance, and cost checks.

Critical negative paths must be tested where applicable: wrong tenant, unauthorized request, duplicate mutation, stale epoch, wrong owner, partial failure, migration interruption, schema mismatch, cache poisoning, timeout/resource exhaustion.

`PUSHED + CI PASS + exact-commit evidence` is the minimum valid completion state.

## 9. Current Architecture Pointer

Current middleware topology is M00/M01/M02/M03 over W01-W06. Business ownership is B01-B14, with B15-B21 reserved logical boundaries only. See the Phase 0 contract for the frozen topology and ownership map.

Current known migration: W04 `publish.ts` → B02 Content; W06 business-specific integrity checks → their business owners. See the W04/W06 migration contract.

## 10. Final Rule

> **Do not think up a new route when the contract already defines the route. Read the minimum required context, execute the declared scope, prove the result, and stop.**
