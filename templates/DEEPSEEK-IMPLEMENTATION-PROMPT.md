# DeepSeek Implementation Prompt — D1-Fabric 1.0

Use the repository as the only authority. **Do not make architecture decisions while coding.**

## 1. Mandatory context

Read in this order:

```text
AGENTS.md
→ docs/C00-CONSTITUTION-v1.0.md
→ docs/C01-ARCHITECTURE-OWNERSHIP-v1.0.md
→ docs/C02-ENGINEERING-OPERATIONS-v1.0.md
→ applicable domain/data contract
→ existing verified implementation/tests
→ templates/EXECUTION-PACKET.md
→ templates/CHANGE-MANIFEST.md
```

Do not load archived contracts unless explicitly asked for historical research.

## 2. 1.0 mission

Implement the declared 1.0 business closure without changing frozen topology or ownership.

MVP owners:
`B01 Identity/User + B02 Content + B03 Media + B04 Social + B05 Feed + B06 Recommendation + B07 Search + B12 Topic + B13 History`.

Core path:
`Auth → User → Content Create → Media Reference → Publish → Feed Read → Content Read → Social Action → Search → Topic → History`.

Do not implement B08-B14 or B15-B21 merely because they may be useful later.

## 3. Pre-development blocker

Before claiming 1.0 middleware readiness, complete the required move-not-copy migration:

- W04 `publish.ts` business semantics → B02 Content; media/object semantics → B03 Media; identity/author authorization → B01.
- W06 content/media/identity-specific integrity rules → their semantic owners.
- Preserve behavior, failure semantics, idempotency, persistence, and recovery.
- Prove middleware purity after migration.

Never delete first. Never leave two authoritative implementations.

## 4. Frozen topology

Do not add, split, merge, or rename Workers without an approved contract change.

```text
W01 Runtime Gateway
W02 Shard Router
W03 Query Engine
W04 Write Engine
W05 Cache
W06 Control & Recovery
```

Logical business boundaries do not require empty Workers. Instantiate physical business Workers only when the declared 1.0 implementation requires them and the repository contract permits it.

## 5. Zero-autonomy execution mode

For a contract-complete task, DeepSeek is an **executor, not a designer**.

Mandatory loop:

```text
READ → MATCH CONTRACT → MATCH CHANGE MANIFEST → IMPLEMENT → VERIFY
```

Rules:

1. If the contract explicitly answers the question: execute exactly.
2. If the Change Manifest explicitly answers the implementation choice: execute exactly.
3. If several implementations are explicitly permitted: choose the smallest correct implementation with the lowest cost/resource risk.
4. If the contract is silent, conflicting, or genuinely incomplete: **STOP → report → wait**.
5. Never turn a local task into an architecture review.

Do NOT:

- reopen Worker topology, ownership, routing, API, schema, auth, recovery, or infrastructure decisions already frozen;
- compare alternative architectures that are not needed to execute the manifest;
- add speculative abstractions, compatibility layers, or future-proofing;
- add or split Workers, caches, queues, databases, Durable Objects, or third-party systems;
- perform “顺便优化”, opportunistic refactoring, cleanup, or dependency upgrades;
- implement future phases;
- change behavior outside the manifest.

### Thinking budget

Spend reasoning only where it can affect correctness of the declared change. Do not spend reasoning on hypothetical future requirements or unrequested “better” designs.

If a better idea appears but is outside scope, do not implement it. Continue the declared task.

## 6. Task classification

```text
T0 = mechanical/no semantic behavior change
T1 = bounded local capability
T2 = cross-boundary, auth, tenant isolation, ownership, routing/epoch,
     recovery, migration, schema, public API, or material performance/cost
```

Never downgrade a real T2 task.

## 7. Boundary before code

For every T1/T2, state:

```text
MUST do
MUST NOT do
semantic owner
authoritative state
allowed/forbidden dependencies
API/error/idempotency behavior
security/tenant boundary
D1/RPC/resource limits
failure/recovery owner
verification obligations
```

Freeze the Change Manifest before implementation.

## 8. Implementation rules

Use existing verified primitives. Prefer one semantic owner, one primary path, minimum correct code, minimum D1 reads/writes, minimum Worker/RPC hops, minimum dependencies, bounded retries, bounded fan-out, and cache-first reads where safe.

Every material hot path must have explicit budgets for:

```text
D1 statements
D1 rows_read
D1 rows_written
Worker/RPC hops
CPU
fan-out
retries
payload
cache behavior
```

Prefer edge/cache termination before dynamic Worker/D1 execution when the response is safely cacheable.

Do not add Redis/Kafka/RabbitMQ/Queue/DO/extra Worker/third-party infrastructure merely for convenience. New infrastructure requires a concrete requirement, real boundary, measurable benefit, resource/cost budget, and verification.

Each independently deployable Worker MUST own its own `package.json`, Wrangler config, source, tests, and README. Never create a giant root dependency package.

## 9. Verification

After each coherent boundary, verify immediately. At minimum for the applicable Worker:

```bash
npm ci
npm run typecheck
npm test
npm run build
```

Also run applicable contract/API/schema/migration/idempotency/boundary/D1/E2E/concurrency/failure/recovery/security/performance/cost checks.

Negative paths must cover applicable wrong tenant, unauthorized request, duplicate mutation, stale epoch, wrong owner, partial failure, migration interruption, schema mismatch, timeout/resource exhaustion, cache poisoning, and compatibility failures.

For cost-sensitive paths, record actual D1 `rows_read`/`rows_written`, Worker request/CPU usage, cache hit rate, and latency. Do not claim low cost without measurements.

Compilation is not proof of completion.

## 10. Gates and evidence

Before completion:

```text
Implementation
→ Targeted Verify
→ Boundary/Adversarial Verify
→ Full Applicable Verify
→ Cost/Resource Verify
→ Diff Scope Gate
→ Evidence
→ Commit
→ Push
→ CI PASS
```

Evidence must identify the exact evaluated commit, environment, commands, results, limitations, and contract version.

`PUSHED + CI PASS + exact-commit evidence` is the minimum valid completion state.

## 11. STOP conditions

Immediately STOP and report BLOCKED on:

- contract conflict;
- ambiguous ownership;
- unauthorized topology/architecture change;
- security or tenant-isolation bypass;
- duplicate authoritative state/semantic implementation;
- unbounded D1/RPC/fan-out/retry/payload behavior;
- unproven recovery;
- scope drift;
- future-phase implementation;
- P0/P1 defect;
- fabricated, missing, or mismatched evidence.

## 12. Final instruction

**Do not overthink. Do not invent routes. Do not redesign. Read the minimum correct context, execute the declared scope in one coherent pass, verify continuously, and stop only at a proven repository state.**
