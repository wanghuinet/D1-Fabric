# P09 — Consistency + Bookmark/Replica Policy v1.0

**Status:** ACTIVE / EXECUTABLE / LOCKED  
**phaseId:** P09  
**taskId:** P09.1  
**contractId:** D1F-3.0-MASTER-v1.0  
**architectureId:** D1F-3.0-ARCH-v1.0  
**implementationOwner:** W02 Execution Fabric  
**authorityBoundary:** W04 remains authoritative for placement/control snapshots  
**verificationId:** P09.1-GATE-v1.0

## 1. Objective

Implement the minimum generic consistency boundary for bounded read execution using an explicit consistency mode and an opaque, integrity-protected bookmark/session context.

P09 proves that read execution cannot silently downgrade the caller's requested consistency requirement, cannot accept an invalid or cross-scope bookmark, and cannot expose replica/physical topology as application directives.

Cloudflare D1 Sessions provide sequential consistency across queries and support `first-primary`, `first-unconstrained`, and a previous-session bookmark as session starting constraints. P09 maps those platform capabilities into a bounded Fabric policy; it does not invent a stronger consistency guarantee than the platform provides.

## 2. Ownership

- **W02:** evaluate the operation's declared consistency policy and apply the bounded read/session boundary.
- **W04:** authoritative placement metadata, control epoch, replica eligibility, and configuration publication.
- **W03:** authoritative writes; P09 does not change write execution.
- **W01:** admission/envelope only.
- **Application:** declares operation intent and receives an opaque bounded continuation context.

## 3. Allowed files

- `workers/v2/W02-Execution-Fabric/**`
- this phase packet
- `docs/phases/evidence/P09.1-EVIDENCE.md`
- `.github/workflows/w02-p09-validation.yml`

No W01/W03/W04 implementation changes are permitted in P09.1. No new Worker/runtime primitive is permitted.

## 4. Consistency modes

P09.1 supports exactly these generic modes:

```text
EVENTUAL
SESSION
READ_YOUR_WRITES
PRIMARY
```

Semantics:

- **EVENTUAL:** no caller-supplied prior bookmark requirement; bounded replica-capable read is allowed when the validated placement/control boundary permits it.
- **SESSION:** read must execute through a D1 Session-compatible boundary and preserve sequential consistency for the logical session.
- **READ_YOUR_WRITES:** requires a valid prior bookmark representing the caller's authoritative observation/write boundary; missing, invalid, expired, or incompatible context fails closed. No heuristic fallback to EVENTUAL is allowed.
- **PRIMARY:** first read must require the primary-start constraint; this is the strongest P09 starting policy and must not be silently downgraded.

P09 does not claim linearizability, serializability, or globally synchronous replica consistency.

## 5. Bookmark contract

A bookmark/continuation token is opaque application state and MUST NOT expose physical topology.

Required binding:

```text
tenantId
principalScope
operation
operationVersion
contractVersion
consistencyMode
issuedAt
expiresAt
bookmark payload
integrity
```

Rules:

1. all fields are bounded and validated;
2. token integrity is verified before use;
3. token lifetime is finite;
4. cross-tenant/principal/operation/version reuse is rejected;
5. consistency-mode downgrade is rejected;
6. malformed, tampered, expired, or incompatible tokens fail closed;
7. token payload cannot become executable routing authority;
8. public token content cannot contain physical D1/database/shard identifiers.

The bookmark may be represented as an opaque signed/encrypted continuation value. The exact cryptographic encoding is implementation-local, but integrity protection is mandatory.

## 6. Replica policy

W02 may consume a validated control/placement input describing whether replica reads are eligible. W02 MUST NOT become the source of truth for replica topology.

Required policy:

```text
validated control says eligible
+ consistency mode permits replica
+ session/bookmark requirements satisfied
= replica-capable execution allowed
```

Otherwise execution must use the safe permitted path or fail closed.

Replica lag is an expected platform condition. P09 must not manufacture a fixed lag bound unless supplied by an authoritative contract/configuration.

P09 must not expose `served_by_region`, physical database IDs, physical shard IDs, or internal Worker graph as public routing directives.

## 7. Budget / deadline invariants

Consistency handling consumes the existing execution budget. It may not create a new budget.

Required invariants:

```text
reserved + consumed + newly admitted <= parent ceiling
actual fanout <= declared fanout
D1 statements <= statement budget
rows read <= rows-read budget
payload <= payload budget
retry count <= retry budget
work <= original deadline
```

A consistency-context validation failure occurs before downstream D1 dispatch whenever possible.

Bookmark validation, session construction, and policy evaluation MUST NOT create an unbounded loop or additional unbounded network hop.

## 8. Cache interaction

A valid terminal cache HIT may still terminate with zero D1 work only when its cached result satisfies the requested consistency contract.

A cache entry produced under a weaker consistency mode MUST NOT satisfy a stronger request.

A bookmark-bound or session-bound request cannot silently consume an unbound weaker cache entry.

Invalid cache/context binding fails closed rather than authorizing weaker execution.

## 9. Failure matrix

| Case | Required result |
|---|---|
| unsupported consistency mode | reject before D1 |
| malformed bookmark | reject before D1 |
| tampered bookmark | reject before D1 |
| expired bookmark | reject before D1 |
| cross-tenant/principal bookmark | reject/no replay |
| operation/version mismatch | reject/no replay |
| stronger mode with weaker token | reject/no downgrade |
| READ_YOUR_WRITES without valid context | fail closed |
| PRIMARY without primary-start eligibility | fail closed |
| replica eligibility absent/invalid | safe path or fail closed |
| cache weaker than requested consistency | cache cannot terminate |
| deadline exhausted | reject before dispatch |
| budget insufficient | hard-stop before dispatch |

## 10. Security invariants

- Tenant isolation is mandatory.
- Principal/authorization scope is mandatory.
- Operation and contract version binding is mandatory.
- Bookmark integrity and expiry are mandatory.
- Consistency mode is part of the security/state binding.
- Public results contain intent-level metadata only.
- No physical topology identifier is accepted as caller authority.
- Extension metadata remains data and cannot execute routing or consistency policy.

## 11. Required tests

### Positive

1. EVENTUAL bounded read succeeds.
2. SESSION preserves session context.
3. READ_YOUR_WRITES accepts a valid bound bookmark.
4. PRIMARY selects the primary-start policy.
5. Valid bookmark round-trips with bounded expiry.
6. Stronger consistency rejects a weaker cache entry.

### Negative/security

7. malformed bookmark rejected.
8. tampered bookmark rejected.
9. expired bookmark rejected.
10. cross-tenant bookmark rejected.
11. cross-principal bookmark rejected.
12. operation/version mismatch rejected.
13. consistency downgrade rejected.
14. READ_YOUR_WRITES without valid context rejected.
15. replica eligibility cannot be invented by W02.
16. physical topology disclosure rejected.

### Resource/failure

17. validation consumes no D1 statement when rejection occurs before dispatch.
18. statement/row/payload budgets remain bounded.
19. deadline remains authoritative.
20. cache HIT is zero D1 only when its consistency binding is sufficient.
21. no unbounded promises or fanout.
22. existing P04-P08 regression suite remains green.

## 12. Architecture / scope gate

The implementation MUST prove:

```text
Architecture → Contract → Code → Tests
Contract → Architecture → Code → Tests
```

W04 remains the authoritative control-plane owner. P09 must not add placement logic, replica discovery, or a new coordinator.

No business semantics, ORM, retry policy, cross-shard transaction, new Worker, or new runtime primitive may appear.

## 13. Required verification

From `workers/v2/W02-Execution-Fabric`:

```text
npm ci
npm run typecheck
npm test
npm run dry-run
```

CI additionally MUST verify:

```text
bookmark integrity markers
consistency downgrade rejection
physical-topology disclosure scan
unbounded fanout/promise scan
no W01/W03/W04 implementation changes
exact SHA marker
```

If a real Cloudflare D1 integration is available, the gate SHOULD additionally prove `withSession()` behavior and bookmark propagation. A unit-only mock cannot be described as real D1 evidence.

## 14. Evidence schema

`P09.1-EVIDENCE.md` MUST bind:

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
npm ci
 typecheck
test
dry-run
consistency evidence
bookmark integrity evidence
security evidence
resource evidence
failure evidence
scope/architecture gate
real-D1 evidence when available
independent GPT review
final PASS/FAIL
```

Manual PASS without reproducible evidence is `FAIL_EVIDENCE`.

## 15. Definition of Done

P09.1 is PASS only when:

```text
contract implemented
+ all required positive/negative/security/resource tests pass
+ no consistency downgrade exists
+ bookmark state binding is proven
+ replica policy remains W04-authoritative
+ budget/deadline invariants remain proven
+ exact pushed SHA verified
+ CI reproducible
+ scope/architecture clean
+ independent GPT review PASS
+ evidence committed
```

## 16. Mandatory STOP

After P09.1 PASS:

**STOP. Do not enter P10 automatically.**

Any undefined consistency guarantee, bookmark security gap, replica-authority drift, architecture change, missing evidence, or inability to prove exact behavior is a release-blocking FAIL.
