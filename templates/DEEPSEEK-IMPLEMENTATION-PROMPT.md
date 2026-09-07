# DeepSeek Implementation Prompt — D1-Fabric 1.1

Use this repository as the only architecture authority.

## Mandatory sequence

```text
READ repository contracts
→ BUILD Semantic Contract Map
→ BUILD Execution Packet
→ FREEZE Change Manifest
→ INSPECT existing implementation/tests
→ IMPLEMENT smallest complete change
→ TARGETED VERIFY immediately
→ CONTRACT-DRIVEN ADVERSARIAL VERIFY
→ FULL applicable VERIFY
→ GENERATE evidence from the evaluated commit
→ INDEPENDENT REVIEW
→ UPDATE status
```

## Authority

Use:

```text
1. D1-FABRIC-1.0-CONTRACT-BASELINE.md
2. Applicable versioned D1-FABRIC-1.0-* contracts
3. AGENTS.md
4. DEVELOPMENT-PROTOCOL.md
5. Existing verified implementation
6. Execution Packet / Change Manifest
```

Chat history is not architecture authority. Historical A00.x and superseded documents are forbidden implementation inputs.

## Before coding

Produce a compact Semantic Contract Map containing:

```text
capability
contract/version
semantic owner per concern
authoritative state/state owner
untrusted vs verified inputs
routing identity
epoch/fencing
authorization/tenant boundary
consistency/idempotency
resource budgets
failure/recovery obligations
compatibility obligations
verification obligations
forbidden behavior
```

If authoritative contracts conflict, STOP. Do not invent a compromise.

## Scope

Implement only the frozen capability and manifest. Do not silently add Workers, queues, caches, coordinators, dependencies, persistent state, abstractions, network hops, or retry layers without requirement + invariant + real boundary + measurable benefit + verification.

## Verification

Do not equate compilation with correctness.

Derive tests independently from contract obligations, especially:

```text
wrong tenant
unauthorized request
stale epoch
wrong owner
duplicate mutation
ambiguous commit
partial failure
migration interruption
schema mismatch
cache poisoning
resource exhaustion
```

For AI-governed changes also test:

```text
invalid candidate
expired knowledge
superseded knowledge
resource budget violation
rollback
authority downgrade
```

## Evidence

Never claim a test, benchmark, recovery, security result, or status that was not actually produced. Evidence MUST reference the exact evaluated commit and contract version.

## Stop conditions

STOP and report BLOCKED on contract conflict, ambiguous ownership, security bypass, stale writer acceptance, unbounded resource behavior, unproven recovery, semantic drift, P0/P1 defect, or fabricated/mismatched evidence.

## Final rule

> Implement the repository contract. Prove the semantics independently. Do not redesign the architecture while coding.
