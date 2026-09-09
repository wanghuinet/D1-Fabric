# D1-Fabric 3.0 — P02 Runtime Types + Validation v1.0

**Status:** ACTIVE / EXECUTABLE / LOCKED
**taskId:** P02.1
**phaseId:** P02
**contractId:** D1F-3.0-MASTER-v1.0
**architectureId:** D1F-3.0-ARCH-v1.0
**implementationOwner:** GPT
**verificationId:** P02.1-GPT-REVIEW

## 1. Objective

Establish the first executable Cloudflare Worker runtime boundary for **W01 Fabric Gateway** using only generic middleware request types and deterministic validation. This task is a runtime foundation only; it does not implement downstream execution, routing, writes, control-plane behavior, cache, business semantics, or future-phase capabilities.

## 2. Allowed files

```text
workers/v2/W01-Fabric-Gateway/**
docs/phases/P02-RUNTIME-TYPES-VALIDATION-v1.0.md
docs/phases/evidence/P02.1-EVIDENCE.md
```

## 3. Forbidden files / behavior

```text
workers/v2/W02-Execution-Fabric/**
workers/v2/W03-Write-Fabric/**
workers/v2/W04-Control-Plane/**
application/business domain code
D1 schema or database mutation
routing/shard selection
cross-Worker dispatch
cache implementation
idempotency implementation
control-plane/LKG implementation
new Worker or infrastructure primitive
unbounded fan-out/retry
PowerShell as runtime code
```

## 4. W01 ownership for this task

W01 owns only:

- request envelope parsing;
- generic operation identity/version parsing;
- tenant/principal context presence validation;
- finite budget field validation;
- deadline validation;
- payload-size guard;
- deterministic error envelope;
- successful normalized envelope returned from the W01 boundary.

W01 MUST NOT execute the operation in P02.1.

## 5. Runtime invariants

- I01 exactly four approved Worker boundaries remain unchanged.
- I02 W01 contains no business semantics.
- I03 all external input is treated as untrusted.
- I04 malformed JSON is rejected deterministically.
- I05 required identity fields are non-empty and bounded.
- I06 numeric resource limits are finite, non-negative integers and cannot exceed the W01 hard envelope.
- I07 deadline must be in the future and bounded by the W01 maximum wall-clock envelope.
- I08 payload bytes are bounded before admission of the normalized request.
- I09 validation failure performs no downstream dispatch and no D1 work.
- I10 response errors do not disclose topology, SQL, physical D1 identifiers, or internal Worker graph.

## 6. Fixed W01 hard envelope for P02.1

```text
maxPayloadBytes = 1048576
maxDeadlineMs = 25000
maxFanout = 0
maxConcurrency = 0
maxD1Statements = 0
maxRowsRead = 0
maxRowsWritten = 0
maxRetries = 0
```

P02.1 is intentionally non-executing. Downstream execution budgets are not consumed or invented here.

## 7. Failure matrix

| Case | Expected result |
|---|---|
| invalid JSON | 400 / INVALID_REQUEST |
| non-object JSON | 400 / INVALID_REQUEST |
| missing requestId | 400 / INVALID_REQUEST |
| missing tenantId | 400 / INVALID_REQUEST |
| missing operation | 400 / INVALID_REQUEST |
| invalid operation version | 400 / INVALID_REQUEST |
| payload over 1 MiB | 413 / PAYLOAD_TOO_LARGE |
| invalid budget integer | 400 / INVALID_BUDGET |
| budget above W01 envelope | 400 / BUDGET_EXCEEDED |
| deadline missing/expired | 400 / INVALID_DEADLINE |
| deadline beyond 25s | 400 / INVALID_DEADLINE |
| unsupported HTTP method | 405 / METHOD_NOT_ALLOWED |
| valid envelope | 200 / VALIDATED |

## 8. Security cases

- reject empty/oversized identity strings;
- reject non-string tenant/request/operation identity values;
- reject prototype-bearing/unexpected object shapes by validating explicit fields only;
- never echo arbitrary input fields into privileged response metadata;
- never expose physical topology or SQL errors.

## 9. Resource cases

- parse body only once;
- reject payload above the fixed byte ceiling;
- no D1 calls;
- no Worker-to-Worker calls;
- no retry;
- no fan-out;
- no unbounded loop;
- no asynchronous side-effect cascade.

## 10. Tests

Required:

```text
npm test
npm run typecheck
npx wrangler deploy --dry-run
```

The test suite must cover every failure matrix row plus valid normalization.

## 11. Acceptance thresholds

```text
100% P02.1 tests PASS
0 runtime dependency on W02-W04
0 D1 statements
0 downstream dispatches
0 business-domain semantics
0 forbidden file changes
wrangler dry-run PASS
scope/architecture gate PASS
GPT post-task review PASS
exact pushed GitHub SHA verified
```

## 12. Evidence schema

```text
phaseId
 taskId
contractId
architectureId
sourceFiles
changedFiles
testFiles/testIds
commitSha
cloudflareDryRunReference
reviewId
reviewStatus
failuresFound
fixCommits
result
```

## 13. Stop condition

After P02.1 PASS, STOP. Do not begin P03 automatically. W01 will continue only after the next explicit task gate is approved.
