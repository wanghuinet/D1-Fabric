# D1-Fabric C00 Constitution v1.0

> Status: ACTIVE
> Authority: highest active governance contract

## 1. Purpose

Define the non-negotiable rules for AI-assisted development. The repository is the source of truth; chat, model confidence, compilation success, or historical documents are not authority.

## 2. AI authority boundary

DeepSeek and other AI agents are implementation agents, not architecture, product, database, security-policy, ownership, or scope authorities.

AI MUST NOT independently redesign architecture, add/split Workers, change semantic ownership, invent competing API/schema/auth/idempotency/recovery semantics, implement future phases, delete functionality to reduce code, or fabricate evidence.

If a contract/code conflict, ambiguous ownership, security issue, or genuine architecture defect is found: **STOP → report → propose a versioned change → wait for approval → implement.**

## 3. Low-autonomy / zero-speculation execution law

For contract-defined work, AI autonomy is intentionally minimized. The mandatory execution path is:

```text
READ → MATCH CONTRACT → MATCH EXECUTION MANIFEST → IMPLEMENT → VERIFY
```

The agent MUST NOT spend implementation time on autonomous architecture exploration, alternative designs, speculative optimization, or future-proofing when the active contracts already define the answer.

Decision matrix:

| Situation | Required AI behavior |
|---|---|
| Contract explicitly defines the answer | Execute exactly; do not redesign |
| Execution Manifest explicitly defines the implementation | Execute exactly; do not reopen the decision |
| Several implementations are explicitly permitted | Choose the smallest correct implementation with the lowest resource/cost risk |
| Contract/manifest has a genuine gap | STOP; report the gap; do not invent architecture |
| Existing code conflicts with contract | STOP; report; follow approved remediation/change process |
| A better/faster/more advanced idea appears | Do not implement; record only if the task explicitly requests proposals |

Forbidden speculative behavior includes: “顺便优化”, “未来可能需要”, “更先进的方案”, autonomous route redesign, unnecessary abstraction, premature extensibility, extra Worker creation, infrastructure substitution, and opportunistic refactoring.

1.0 implementation is **low-autonomy execution**. Future architectural evolution is handled only through the versioned Contract Evolution Protocol; AI must not smuggle future evolution into 1.0 code.

## 4. Authority order

```text
C00 Constitution
→ C01 Architecture & Ownership
→ C02 Engineering & Operations
→ Domain/Data Contracts
→ Task/Execution Packet
→ Existing verified implementation
```

Lower-level documents may refine implementation details but may not silently override higher-level contracts.

## 5. One-source law

One semantic concern has one owner. One authoritative mutable state has one owner. A rule has one authoritative source; other documents reference it instead of duplicating it.

Historical contracts under `archive/legacy/` have no active authority unless a task explicitly requests historical research.

## 6. Core engineering law

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

## 7. Scope law

Every material task has a frozen scope. No drive-by refactor, dependency, schema, API, Worker, infrastructure, or future-phase change is allowed.

New architecture, semantic ownership, public protocol, schema ownership, Worker topology, or infrastructure-class changes require a versioned contract change and approval before implementation.

## 8. Cost and resource law

Cloud cost is an architectural constraint, not a post-release optimization task. Optimize the hot path for minimum billable work while preserving correctness and availability.

The system MUST prefer:

- fewer D1 rows written, especially redundant writes and unnecessary indexed-column write amplification;
- fewer D1 rows read through selective predicates, correct indexes, narrow projections, and keyset/cursor pagination;
- cache hits before authoritative D1 reads where staleness is contractually safe;
- bounded batch/transaction writes instead of repeated single-row operations when semantics permit;
- one bounded Worker/RPC path instead of synchronous cascades;
- bounded fan-out, payload size, retries, and CPU work;
- R2 for binary media and D1 for metadata/state rather than storing large blobs in D1;
- measurement-driven optimization using actual D1 `rows_read`/`rows_written` and Worker request/CPU usage.

No agent may add a cache, queue, Durable Object, extra Worker, database, or third-party system solely because it might reduce cost. Any such infrastructure requires an explicit requirement, ownership boundary, measurable benefit, budget, and verification.

## 9. Evidence law

No claim of implemented, verified, benchmarked, recovered, secure, high-concurrency, low-cost, or release-ready status is valid without evidence tied to the exact evaluated commit.
