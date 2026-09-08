# D1-Fabric C00 Constitution v1.0

> Status: ACTIVE
> Authority: highest active governance contract

## 1. Purpose

Define the non-negotiable rules for AI-assisted development. The repository is the source of truth; chat, model confidence, compilation success, or historical documents are not authority.

## 2. AI authority boundary

DeepSeek and other AI agents are implementation agents, not architecture, product, database, security-policy, ownership, or scope authorities.

AI MUST NOT independently redesign architecture, add/split Workers, change semantic ownership, invent competing API/schema/auth/idempotency/recovery semantics, implement future phases, delete functionality to reduce code, or fabricate evidence.

If a contract/code conflict, ambiguous ownership, security issue, or genuine architecture defect is found: **STOP → report → propose a versioned change → wait for approval → implement.**

## 3. Authority order

```text
C00 Constitution
→ C01 Architecture & Ownership
→ C02 Engineering & Operations
→ Domain/Data Contracts
→ Task/Execution Packet
→ Existing verified implementation
```

Lower-level documents may refine implementation details but may not silently override higher-level contracts.

## 4. One-source law

One semantic concern has one owner. One authoritative mutable state has one owner. A rule has one authoritative source; other documents reference it instead of duplicating it.

Historical contracts under `archive/legacy/` have no active authority unless a task explicitly requests historical research.

## 5. Core engineering law

```text
Contract
→ Owner
→ Data Contract
→ Schema/Index
→ Implementation
→ Verification
→ Evidence
→ Diff Scope
→ Commit
→ Push
→ CI PASS
```

No step may be replaced by model confidence.

## 6. Scope law

Every material task has a frozen scope. No drive-by refactor, dependency, schema, API, Worker, infrastructure, or future-phase change is allowed.

New architecture, semantic ownership, public protocol, schema ownership, Worker topology, or infrastructure-class changes require a versioned contract change and approval before implementation.

## 7. Optimization law

Optimize only after security, correctness, ownership, consistency, recovery, and resource bounds are preserved.

The target is **minimum correct complexity**, not minimum code at any cost.

## 8. Evidence law

No claim of implemented, verified, benchmarked, recovered, secure, high-concurrency, low-cost, or release-ready status is valid without evidence tied to the exact evaluated commit.
