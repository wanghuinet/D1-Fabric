# D1-Fabric 3.0 — P01 Contract / Architecture Lock

**phaseId:** P01
**taskId:** P01.1
**status:** ACTIVE / EXECUTABLE / LOCKED
**contractId:** D1F-3.0-MASTER-v1.0
**architectureId:** D1F-3.0-ARCH-v1.0
**implementationOwner:** GPT
**verificationId:** P01.1-GPT-REVIEW

## 1. Objective

Freeze the 3.0 semantic authority, runtime topology, ownership boundaries, and development/review gate before runtime implementation begins.

P01 does not implement runtime business capability. It makes the architecture and contract machine-checkable enough that P02 can implement runtime types and validation without inventing semantics.

## 2. Normative inputs

1. `AGENTS.md`
2. `docs/D1-FABRIC-3.0-MASTER-CONTRACT-v1.0.md`
3. `docs/D1-FABRIC-3.0-ARCHITECTURE-CONTRACT-v1.0.md`
4. This phase packet

Compatibility/reference documents may be consulted only when they do not conflict with the Master Contract.

## 3. Allowed files

For P01.1:

```text
AGENTS.md
docs/D1-FABRIC-3.0-MASTER-CONTRACT-v1.0.md
docs/D1-FABRIC-3.0-ARCHITECTURE-CONTRACT-v1.0.md
docs/phases/P01-CONTRACT-ARCHITECTURE-LOCK-v1.0.md
```

No runtime source is to be created by P01.1.

## 4. Forbidden files / changes

```text
workers/**
package.json
wrangler.toml
runtime source
D1 schema
public API implementation
business-domain code
new Worker
new infrastructure primitive
new dependency
```

No contract semantics may be weakened or changed merely to simplify implementation.

## 5. Fixed architecture

Exactly four runtime boundaries exist:

```text
W01 Fabric Gateway
W02 Execution Fabric
W03 Write Fabric
W04 Control Plane
```

Ownership:

```text
W01 → normalization / contract selection / admission / response envelope
W02 → plan / scheduling / routing / bounded fan-out / read execution / cache termination / merge
W03 → write admission / primary targeting / write budget / idempotency / write consistency coupling
W04 → placement metadata / contract versions / capacity policy / recovery / configuration / LKG
```

Business meaning remains outside the Fabric kernel.

## 6. Contract locks to prove

P01.1 MUST prove the following are unambiguous:

- H01 single normative authority
- H02 budget reservation/consumption/release/hard-stop
- H03 atomic idempotency boundary
- H04 quota guarantee levels
- H05 control epoch and LKG fencing
- H06 cache/cursor/extension security binding
- H07 numeric capacity envelope requirement
- H08 executable phase/evidence requirement

P01.1 does not implement these runtime controls; it locks their semantic ownership and acceptance obligations for later phases.

## 7. Exact invariants

```text
I01: exactly one normative 3.0 Master Contract exists.
I02: exactly four approved runtime Worker boundaries exist.
I03: business semantics are not owned by W01-W04.
I04: every normative requirement has a contractId and architecture owner.
I05: every T1/T2 task has an explicit Change Manifest and Diff Scope Gate.
I06: no phase may consume a future-phase capability.
I07: every implementation task stops for GPT review before the next task.
I08: a local PASS is insufficient; the exact pushed GitHub SHA is the review input.
I09: review failure blocks advancement until a contract-preserving fix is tested and re-reviewed.
I10: no PASS may be asserted without reproducible evidence.
```

## 8. Failure matrix

| Case | Required result |
|---|---|
| Duplicate active normative contract | `FAIL_CONTRACT_AUTHORITY` + STOP |
| Architecture requires a fifth Worker | `FAIL_ARCH_DRIFT` + STOP |
| Business semantics enter kernel | `FAIL_ARCH_DRIFT` + STOP |
| Public topology becomes exposed | `FAIL_CONTRACT_DRIFT` + STOP |
| Budget semantics undefined | `FAIL_RESILIENCE` + STOP |
| Idempotency atomicity undefined | `FAIL_RESILIENCE` + STOP |
| Global quota overstated | `FAIL_RESILIENCE` + STOP |
| LKG fencing undefined | `FAIL_RESILIENCE` + STOP |
| Security binding undefined | `FAIL_SECURITY` + STOP |
| Capacity baseline undefined | `FAIL_CAPACITY` + STOP |
| Changed file outside allowed scope | `FAIL_SCOPE` + STOP |
| Evidence cannot reproduce result | `FAIL_EVIDENCE` + STOP |
| Post-task GPT review missing | `FAIL_REVIEW_GATE` + STOP |
| Post-task GPT review finds defect | Fix → test → push → re-review; do not advance |

## 9. Security cases

P01.1 MUST verify that the locked contract requires:

- no physical D1/shard topology in public API;
- tenant and authorization boundaries for reusable state;
- integrity and bounded lifetime for cursors;
- extension metadata is non-executable;
- authentication/authorization and schema validation precede execution;
- no business-domain semantics are introduced into Fabric.

## 10. Resource cases

P01.1 MUST verify that later runtime implementation is required to enforce finite ceilings for:

```text
fanout
concurrency
D1 statements
rows read
rows written
payload bytes
retries
wall-clock deadline
batch items
response items
cursor bytes
```

No resource field is advisory.

## 11. Test / verification commands

P01.1 is documentation/gate work. Verification MUST include, using repository tooling available to the implementation agent:

```text
contract authority/reference scan
architecture topology/ownership scan
phase packet completeness check
scope/diff check
encoding/format check
```

If a project test runner already exists, run its documentation/contract gate where available. Do not invent a runtime test suite in P01.

## 12. Acceptance thresholds

P01.1 PASS requires:

```text
100% of required phase-packet fields present
100% of H01-H08 mapped to a normative requirement
100% of W01-W04 ownership mapped
0 forbidden runtime/business changes
0 unresolved authority conflicts
0 unresolved architecture conflicts
0 scope violations
0 fabricated evidence
GPT post-task review = PASS
```

There is no performance/RPS acceptance in P01; that belongs to P15 under H07.

## 13. Evidence schema

A P01.1 evidence record MUST contain:

```text
phaseId=P01
taskId=P01.1
contractId=D1F-3.0-MASTER-v1.0
architectureId=D1F-3.0-ARCH-v1.0
sourceFiles=[AGENTS.md, Master Contract, Architecture Contract, P01 packet]
changedFiles=[exact changed paths]
tests=[exact commands/check IDs]
commitSha=<exact pushed SHA>
reviewId=P01.1-GPT-REVIEW
reviewStatus=PASS
failuresFound=<count and IDs>
fixCommits=<SHA list, if any>
ciReference=<reference or NOT_APPLICABLE with reason>
result=PASS
```

## 14. Post-task review gate

The task is not complete after the first implementation commit.

Required:

```text
implement P01.1
→ verify
→ commit
→ push
→ inspect exact pushed SHA
→ GPT independent review
→ if FAIL: make only identified contract-preserving fixes
→ verify again
→ push
→ GPT re-review
→ PASS
→ record evidence
→ STOP
```

The successful review does not authorize P02 automatically. A separate explicit P02 task must begin only after P01.1 is closed.

## 15. Stop condition

P01.1 MUST STOP immediately when all acceptance thresholds are met and evidence is reproducible, or earlier if any mandatory STOP condition occurs.

No P02 implementation is part of P01.1.

## 16. Definition of Done

```text
P01.1 packet committed
+ Master Contract verified
+ Architecture Contract verified
+ AGENTS review gate verified
+ H01-H08 mapped
+ W01-W04 ownership mapped
+ negative/failure/security/resource cases defined
+ scope clean
+ exact pushed SHA verified
+ GPT post-task review PASS
+ reproducible evidence recorded
+ STOP
```
