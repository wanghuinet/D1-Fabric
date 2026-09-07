# D1-Fabric AI Engineering Instructions

**Authority:** D1-Fabric Engineering Constitution v3.0 + v3.1 Addendum  
**Project:** D1-Fabric  
**Primary language:** TypeScript

## Mission

Build the minimum amount of correct code that provides complete, runnable, verifiable, maintainable, scalable, and deployable distributed-data capability.

Do not optimize for code volume or number of tasks.

## Read Before Coding

Before modifying code, read the applicable:

1. `D1-FABRIC-ENGINEERING-CONSTITUTION-V3.0.md`
2. `D1-FABRIC-ENGINEERING-CONSTITUTION-V3.1-ADDENDUM.md`
3. `D1-FABRIC-1.0-DEVELOPMENT-CONTRACT.md`
4. `D1-FABRIC-ARTIFACT-TYPE-CONTRACT.md`
5. `D1-FABRIC-FIRST-PASS-VERIFICATION-PROTOCOL.md`
6. applicable architecture and capability contracts
7. applicable ADRs

Do not infer an architecture rule from chat history when an authoritative repository document exists.

## Before Implementation

Answer these questions:

```text
What requirement am I implementing?
What is explicitly out of scope?
What is the smallest complete design?
What are the inputs and outputs?
What are the invariants?
What is the hot path?
What is the control/cold path?
What state is authoritative?
What happens on duplicate execution?
What happens on timeout/failure?
How does recovery work?
What is the scaling boundary?
What is the D1 I/O cost?
What evidence will prove completion?
```

If a non-trivial question cannot be answered, stop and update the design/contract before coding.

## Architecture Rules

- Do not create a module merely to create a task boundary.
- Do not create a Worker merely to create another Worker.
- Prefer capability boundaries with real ownership, isolation, lifecycle, scaling, or operational value.
- Keep control-plane metadata out of the mandatory hot path when correctness permits.
- Prefer shard-local execution after deterministic routing.
- Minimize D1 reads, writes, cross-shard coordination, network hops, serialization, and retries on hot paths.
- Do not introduce future-proof abstractions without a current requirement.
- Do not copy Cloudflare architecture or code without an explicit D1-Fabric requirement.

## Source of Truth

Do not silently edit production/dashboard configuration when a versioned repository configuration is authoritative.

Any configuration model must have one declared source of truth.

## Coding Rules

- Use TypeScript for application logic unless explicitly approved otherwise.
- Keep implementations small and direct.
- Prefer existing utilities and contracts over new abstractions.
- No speculative interfaces.
- No unused wrappers.
- No hidden side effects.
- No unrelated refactors.
- No silent contract changes.

## Verification Rules

Never report PASS from source inspection alone.

For applicable capabilities:

```text
Type Check
 ↓
Lint / Format
 ↓
Unit Test
 ↓
Integration Test
 ↓
Build
 ↓
Runtime
 ↓
Real Request
 ↓
Failure / Recovery
 ↓
Security
 ↓
Performance / Regression
 ↓
Independent Verification
 ↓
Evidence
```

Unknown is not PASS.

## Documentation Rules

If a change affects architecture, contracts, invariants, commands, deployment, recovery, or verification, perform a documentation impact check.

Update only the affected authoritative documents. Do not generate documentation churn.

Non-trivial architecture decisions belong in ADRs.

## Completion Rules

A capability is not complete because code exists.

It is complete only when the applicable contract, implementation, tests, runtime behavior, failure handling, performance evidence, regression evidence, documentation impact review, and independent verification are closed.

Use explicit status values only:

```text
UNKNOWN
READY
IN_PROGRESS
LOCAL_PASS
CONTRACT_PASS
INTEGRATION_PASS
REGRESSION_PASS
CAPABILITY_PASS
RELEASE_READY
RELEASED
ROLLED_BACK
FAILED
BLOCKED
```

## Stop Conditions

STOP immediately for:

- unresolved P0/P1 defect
- data corruption or loss risk
- security boundary violation
- undocumented architecture drift
- contract violation
- missing authoritative requirement
- fabricated or incomplete verification evidence
- unexplained critical performance regression

Do not continue to the next capability until the current capability reaches its required PASS state.
