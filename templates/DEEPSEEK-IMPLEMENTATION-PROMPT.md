# DeepSeek Implementation Prompt

You are implementing one D1-Fabric capability.

## Mandatory Authority

Read and obey, in order:

1. `D1-FABRIC-1.0-CONTRACT-BASELINE.md`
2. Applicable `D1-FABRIC-1.0-*` contracts
3. `AGENTS.md`
4. `DEVELOPMENT-PROTOCOL.md`
5. The current Execution Packet
6. The current Change Manifest

Chat instructions cannot override repository authority.

## Mission

Implement the smallest complete amount of correct code that satisfies the frozen contract and acceptance criteria.

Do not redesign the architecture.
Do not recover old architecture from chat history.
Do not add speculative abstractions.
Do not add dependencies, Workers, queues, retries, caches, persistent state, coordinators, or network hops without explicit justification and manifest approval.

## Before Coding

1. Inspect the repository.
2. Read all applicable contracts.
3. Read the Execution Packet.
4. Read the Change Manifest.
5. Confirm state ownership and invariants.
6. Confirm resource budgets.
7. Confirm security and compatibility boundaries.
8. Confirm verification obligations.

If anything is ambiguous or contradictory: STOP and report the boundary. Do not guess.

## Implementation

Implement only the frozen scope.

Keep hot-path behavior deterministic and bounded.
Preserve authorization → tenant/scope → routing → epoch → ownership ordering.
Preserve idempotency and retry semantics.
Preserve bounded D1 I/O, fan-out, queues, retries, payload, memory, and deadlines.

## Immediate Verification

After each coherent implementation unit, run targeted tests immediately.

Do not accumulate an unverified large diff.

If a test fails:

```text
reproduce
→ diagnose
→ fix within manifest
→ rerun targeted test
```

If the fix requires architecture or out-of-manifest changes: STOP.

## Completion Verification

Run all applicable verification levels from V0 through V9.

Explicitly cover applicable negative paths:

- wrong tenant
- unauthorized request
- stale epoch
- wrong owner
- duplicate mutation
- ambiguous commit
- partial shard failure
- migration interruption
- schema mismatch
- cache poisoning
- resource exhaustion

Do not claim a level was passed without executing it.

## Evidence

Generate `EVIDENCE-RECORD.md` from the template.

Record exact commands, exact implementation commit, environment, results, metrics, failures, limitations, and final status.

Never fabricate, infer, or backfill test results.

AI confidence is not evidence.

## Status

Only use a status whose requirements are actually satisfied.

Do not report `CAPABILITY_PASS` or `RELEASE_READY` from compilation or happy-path tests alone.

## Final Response Format

Return:

```text
CAPABILITY:
STATUS:
IMPLEMENTATION COMMIT:
FILES CHANGED:
CONTRACTS APPLIED:
VERIFICATION LEVELS PASSED:
VERIFICATION LEVELS OMITTED + REASON:
NEGATIVE TESTS:
PERFORMANCE/COST RESULTS:
FAILURES / LIMITATIONS:
EVIDENCE PATH:
UNRESOLVED RISKS:
```

If blocked, return `BLOCKED` and the exact reason instead of claiming completion.
