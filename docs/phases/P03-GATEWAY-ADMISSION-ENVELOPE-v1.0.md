# D1-Fabric 3.0 — P03 Gateway Admission + Envelope v1.0

**Status:** ACTIVE / EXECUTABLE / LOCKED
**phaseId:** P03
**taskId:** P03.1
**contractId:** D1F-3.0-MASTER-v1.0
**architectureId:** D1F-3.0-ARCH-v1.0
**implementationOwner:** GPT
**verificationId:** P03.1-GPT-REVIEW

## Objective

Complete W01 Fabric Gateway admission after P02 runtime validation. W01 MUST enforce the public middleware boundary without executing business or storage work.

## Allowed files

```text
workers/v2/W01-Fabric-Gateway/**
docs/phases/P03-GATEWAY-ADMISSION-ENVELOPE-v1.0.md
docs/phases/evidence/P03.1-EVIDENCE.md
```

## Forbidden behavior

```text
D1 access
routing or shard selection
Worker-to-Worker dispatch
cache implementation
write execution
idempotency state
placement/control-plane/LKG
business-domain semantics
unbounded retry/fan-out
new Worker or runtime primitive
physical D1 identifiers in public responses
SQL/topology disclosure
```

## W01 ownership

W01 owns:
- method and content-type admission;
- generic request envelope validation;
- operation identity/version allow-list validation at the generic contract boundary;
- tenant/principal context presence and boundedness;
- deadline and budget admission;
- deterministic request correlation;
- topology-neutral success/error envelopes;
- explicit rejection before any downstream side effect.

W01 does not decide routing, placement, execution plan, storage target, cache result, or business meaning.

## Admission rules

1. Only POST is accepted.
2. JSON content type is required; parameters such as charset are allowed.
3. Body size is bounded by P02.1's 1 MiB ceiling.
4. Required generic identity fields are strings and bounded.
5. `operationVersion` is a bounded version token; no business operation registry is introduced in P03.
6. Deadline is future and no later than 25 seconds from admission.
7. All execution-resource budgets are finite non-negative safe integers and must be zero at W01 because execution belongs to later phases.
8. Unknown top-level fields are ignored and never become privileged control input.
9. Error responses expose only stable public error codes and request correlation where already safely established; never topology, SQL, physical IDs, or internal Worker graph.
10. Successful admission returns a normalized envelope with contract metadata and no execution result.

## Failure matrix

| Case | Expected |
|---|---|
| non-POST | 405 / METHOD_NOT_ALLOWED |
| missing/invalid JSON content type | 415 / UNSUPPORTED_MEDIA_TYPE |
| invalid content-length | 400 / INVALID_REQUEST |
| body > 1 MiB | 413 / PAYLOAD_TOO_LARGE |
| malformed JSON | 400 / INVALID_REQUEST |
| non-object body | 400 / INVALID_REQUEST |
| missing/invalid identity | 400 / INVALID_REQUEST |
| missing/invalid operation version | 400 / INVALID_REQUEST |
| invalid deadline | 400 / INVALID_DEADLINE |
| nonzero W01 execution budget | 400 / BUDGET_EXCEEDED |
| valid generic envelope | 200 / ADMITTED |

## Security cases

- Validate explicit fields only.
- Do not trust caller-provided privilege flags.
- Do not reflect arbitrary payload fields into response metadata.
- Do not expose topology, SQL, physical D1 IDs, or Worker graph.
- Keep tenant and principal scope bounded and present.

## Resource cases

- Read request body once.
- Never perform D1 work.
- Never dispatch another Worker.
- Never retry.
- Never create execution budget.
- Reject before downstream work when admission fails.

## Tests

Required:
```text
npm ci
npm run typecheck
npm test
npm run dry-run
```

Tests MUST cover the complete failure matrix, content-type variants, zero-budget admission, and rejection-before-side-effect behavior.

## Acceptance thresholds

```text
100% P03.1 tests PASS
0 D1 statements
0 downstream dispatches
0 business semantics
0 forbidden file changes
stable error codes
stable normalized admission envelope
scope/architecture gate PASS
GPT post-task review PASS
exact pushed GitHub SHA verified
Cloudflare dry-run/deployment required before PASS
```

## Stop condition

P03.1 stops after its own review/evidence gate. Do not begin P04 automatically. W01 remains incomplete until all W01-owned phase work is explicitly gated.
