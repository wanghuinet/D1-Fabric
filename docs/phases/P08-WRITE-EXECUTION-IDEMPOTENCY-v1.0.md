# P08 — Write Execution + Atomic Idempotency v1.0

**Status:** ACTIVE / EXECUTABLE / LOCKED  
**phaseId:** P08  
**taskId:** P08.1  
**contractId:** D1F-3.0-MASTER-v1.0  
**architectureId:** D1F-3.0-ARCH-v1.0  
**implementationOwner:** W03 Write Fabric  
**verificationId:** P08.1-GATE-v1.0

## 1. Objective

Implement the minimum generic W03 write boundary for a bounded **single-target mutation** with atomic idempotency. P08 must prove that authoritative mutation and idempotency state share one D1 transaction boundary whenever exactly-once effect semantics are required.

P08 terminates at successful bounded write execution and deterministic idempotency result replay. It does not implement consistency policy, retry policy, control-plane publication, distributed transactions, cross-shard mutation, or business semantics.

## 2. Ownership

- **W03:** authoritative write execution and idempotency state transition.
- **W02:** planning/routing/scheduling inputs only; no W02 write execution.
- **W04:** authoritative placement/control epoch only.
- **W01:** admission/envelope only.
- **Application:** business meaning, mutation semantics, SQL/data model supplied as operation contract input.

## 3. Allowed files

- `workers/v2/W03-Write-Fabric/**`
- this phase packet
- `docs/phases/evidence/P08.1-EVIDENCE.md`
- `.github/workflows/w03-p08-validation.yml`

No other implementation surface is allowed.

## 4. Forbidden

- changes to W01/W02/W04
- new Worker/runtime primitive
- cross-shard writes
- distributed transaction protocol
- replication
- consistency/bookmark/replica policy
- retry loops or retry policy
- business-domain branches
- ORM/query builder
- unbounded batch/fanout
- `Promise.all(N)`
- physical topology in public responses
- idempotency state outside the authoritative transaction for exactly-once single-target mutations
- reporting COMMITTED without authoritative commit
- treating timeout/unknown outcome as permission for a fresh mutation

## 5. Input contract

Every write execution must provide:

```text
requestId
tenantId
principalScope
operation
operationVersion
contractVersion
idempotencyKey
logicalTargetId
executionEpoch
mutation statement + bounded bindings
expectedRowsWritten
write budget
statement budget
payload budget
deadline
```

`expectedRowsWritten` is a non-negative contract ceiling for the business mutation. W03 additionally accounts for its two idempotency-state row mutations.

All values are untrusted and bounded.

The implementation must not invent physical database identifiers from public input. An approved execution adapter may supply the physical D1 binding only at the internal W03 execution boundary.

## 6. Atomic idempotency protocol

Required state machine:

```text
ABSENT → IN_FLIGHT → COMMITTED
                 ↘ FAILED
```

For exactly-once single-target mutations, the idempotency record and authoritative mutation MUST be part of the same D1 transaction.

P08 uses a single D1 `batch()` for the idempotency claim, business mutation, and committed-result update. Cloudflare D1 documents `batch()` as a SQL transaction that rolls back the entire sequence if a statement fails.

Required behavior:

1. `ABSENT`: reserve resources, begin the transaction, establish the idempotency claim and perform the mutation atomically.
2. Successful transaction commit: return `COMMITTED` with deterministic operation result metadata.
3. Repeated committed key: return the recorded committed result without repeating the mutation.
4. Repeated in-flight/unknown state: do not perform a fresh mutation; return a bounded non-committed outcome such as `IN_FLIGHT`/`UNKNOWN` according to the exact implementation contract.
5. Failed transaction: no `COMMITTED` result may be emitted.
6. Transaction rollback must not leave a falsely authoritative committed idempotency record.

The exact SQL/data shape is implementation-local and generic; P08 must not encode application business meaning.

## 7. Budget ledger

Every execution must enforce:

```text
DECLARED → RESERVED → IN_FLIGHT → CONSUMED
                         ↘ RELEASED
```

Before D1 dispatch:
- reserve statement budget
- reserve rows-written budget
- reserve payload budget
- validate deadline

For the W03 implementation boundary, the declared statement ceiling must cover the worst safe path: one existing-key lookup + three statements in the atomic batch + one authoritative lookup after an ambiguous batch outcome = **5 statements**. A normal first write consumes 4; a committed duplicate consumes 1; an ambiguous committed outcome may consume 5.

The declared rows-written ceiling must cover `expectedRowsWritten + 2` for the business mutation plus idempotency INSERT/UPDATE. D1 result metadata is used to account actual rows written where available.

After completion:
- consume actual usage
- release unused reservation
- leave no residual reservation

If remaining budget cannot safely admit the mutation or authoritative outcome resolution, reject before D1 dispatch. A failure or timeout cannot create a new budget.

## 8. Single-target boundary

P08.1 supports `actualFanout <= 1` only.

A request that attempts multiple logical targets, multiple mutation statements outside the contract, or cross-shard atomicity MUST fail closed. Cross-shard retryable mutation requires a separately approved future contract.

## 9. Deadline / unknown outcome

The original deadline is authoritative. No retry may extend it.

If the client loses the response after a possible commit, the system MUST NOT infer failure and execute a new mutation. A subsequent request using the same idempotency key must resolve the authoritative idempotency state and replay the committed result if committed.

## 10. Security

Idempotency state must be bound to the minimum required:

```text
tenantId
principalScope
operation
operationVersion
contractVersion
idempotencyKey
```

Cross-tenant, cross-principal, cross-operation, or contract-version reuse must not replay another caller's result.

Public responses must not expose physical D1 identifiers, internal Worker graph, SQL topology, or control-plane internals.

## 11. Failure matrix

| Case | Required result |
|---|---|
| invalid budget | reject before D1 |
| expired deadline | reject before D1 |
| missing logical target/epoch | fail closed |
| cross-shard mutation | reject |
| first valid mutation | atomic commit → COMMITTED |
| duplicate committed key | replay, no mutation |
| in-flight/unknown key | no fresh mutation |
| D1 transaction failure | non-COMMITTED failure |
| timeout/response loss | authoritative state must decide outcome |
| tenant/principal mismatch | reject/no replay |
| contract-version mismatch | reject/no replay |

## 12. Resource/security tests

Minimum P08.1 tests:

### Positive
- first bounded single-target mutation commits
- committed duplicate replays result without repeating mutation
- budget reservation is visible before D1 dispatch
- unused reservation is released

### Negative/failure
- invalid budgets
- insufficient statement/row/payload budget
- expired deadline
- missing target/epoch
- transaction rollback
- no COMMITTED on unknown/failure
- cross-shard rejection
- no retry/fresh mutation after unknown outcome

### Security
- cross-tenant idempotency key isolation
- cross-principal isolation
- operation/version binding
- contract-version binding
- no physical topology disclosure

### Resource/invariant
- atomic idempotency + mutation same transaction
- one mutation attempt for a committed key
- zero residual reservations
- actual fanout <= 1
- bounded statement/write/payload use
- no `Promise.all(N)`

## 13. Architecture / scope gate

The implementation must prove:

```text
Architecture → Contract → Code → Tests
Contract → Architecture → Code → Tests
```

Changed files must be limited to the allowed surface. No business semantics or new infrastructure may appear.

## 14. Required verification commands

From `workers/v2/W03-Write-Fabric`:

```text
npm ci
npm run typecheck
npm test
npm run dry-run
```

CI must additionally scan for:

```text
Promise.all(
wrangler d1
physical topology identifiers in public responses
unbounded write fanout
```

CI must prove atomic transaction behavior using a deterministic test double or real supported D1 integration where available. A unit test that merely mocks two unrelated success calls is insufficient evidence of atomicity.

## 15. Evidence schema

`P08.1-EVIDENCE.md` must bind:

```text
phaseId
contractId
architectureId
implementationOwner
source files
changed files
test IDs
exact commit SHA
GitHub Actions run/job
npm ci result
typecheck result
test result
dry-run result
atomicity evidence
budget ledger evidence
security evidence
failure evidence
scope/architecture gate
independent GPT review
final PASS/FAIL
```

A manual PASS is invalid.

## 16. Definition of Done

P08.1 is PASS only when:

```text
contract implemented
+ negative/failure/security/resource tests pass
+ atomic transaction boundary proven
+ budget reservation/consumption/release proven
+ unknown outcome cannot create duplicate mutation
+ exact pushed SHA verified
+ CI reproducible
+ scope/architecture clean
+ GPT independent review PASS
+ evidence committed
```

## 17. Mandatory stop

After P08.1 PASS:

**STOP. Do not enter P09 automatically.**

Any conflict, undefined atomicity, missing evidence, architecture drift, security-binding defect, or inability to prove exact transaction semantics is a release-blocking FAIL and must stop implementation.
