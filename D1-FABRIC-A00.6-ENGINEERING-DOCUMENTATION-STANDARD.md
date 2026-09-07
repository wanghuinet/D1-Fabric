# D1-Fabric A00.6 Engineering Documentation Standard

**Status:** ACTIVE ENGINEERING STANDARD  
**Scope:** D1-Fabric 1.0+  
**Position:** A00.6, subordinate to Constitution and complementary to A00.5 Moat Contract  
**Primary objective:** Make architecture and implementation decisions explicit, reviewable, testable, and reproducible.

## 1. Purpose

Documentation is an engineering control surface, not project decoration.

Every authoritative document SHALL answer enough of the following questions for another engineer or AI agent to implement the capability without reconstructing intent from chat history:

- What problem is being solved?
- What is explicitly not being solved?
- What guarantees are made?
- What state exists and who owns it?
- What happens on concurrency, retry, timeout, overload, partial failure, and recovery?
- What is the normal hot path and its bounded resource budget?
- What evidence proves the implementation works?

A document that cannot constrain implementation is explanatory material, not an engineering contract.

## 2. Documentation Hierarchy

Authority SHALL be explicit:

```text
Constitution
  ↓
Architecture / Platform Contracts
  ↓
Capability Contracts
  ↓
ADR / Decision Records
  ↓
Implementation
  ↓
Verification / Evidence
```

If two documents conflict, the higher-authority document controls until the conflict is explicitly resolved.

No implementation may silently redefine an authoritative contract.

## 3. Contract Before Code

A non-trivial capability SHALL have a contract before implementation begins.

The minimum contract is:

```text
Purpose
Scope
Non-goals
Inputs
Outputs
State
Authoritative Owner
Invariants
Hot Path
Control/Cold Path
Concurrency Boundary
Failure Model
Retry / Idempotency
Timeout / Cancellation
Backpressure / Overload
Scaling Boundary
D1 I/O Budget
Security Boundary
Observability
Compatibility
Distribution Target
Verification Plan
Evidence Requirements
```

If a material item is unknown, implementation status SHALL be `BLOCKED` or `DESIGN_INCOMPLETE`; it SHALL NOT be silently inferred during coding.

## 4. Requirement Traceability

Every material requirement SHALL be traceable through:

```text
REQ-ID
  ↓
Contract Clause
  ↓
Implementation Surface
  ↓
Test / Verification ID
  ↓
Evidence ID
```

Requirements without verification are unproven.

Tests without a requirement or invariant should be reviewed for whether they represent necessary behavior or accidental implementation detail.

## 5. Invariant Standard

An invariant SHALL be stated as a property that can be tested or falsified.

Weak:

```text
Routing should be reliable.
```

Acceptable:

```text
For a fixed routing epoch, a partition identity resolves to one
authoritative shard unless the request is explicitly within a valid
ownership-transition state.
```

Every critical invariant SHOULD identify:

- scope;
- precondition;
- guaranteed property;
- allowed exception;
- violation signal;
- verification method.

## 6. State Ownership Standard

Every mutable state SHALL have exactly one declared authoritative owner.

Documentation MUST identify:

- state name;
- owner;
- readers;
- writers;
- persistence location;
- version/epoch semantics;
- cache semantics if applicable;
- recovery source of truth.

Replicated or cached copies SHALL NOT be described as authoritative unless explicitly contracted.

## 7. Hot-Path Contract

Every capability touching request execution SHALL document the normal path as a bounded sequence.

For D1-Fabric, the preferred shape is:

```text
Request
  ↓
Local routing snapshot
  ↓
Cache
  ↓
Query / Write
  ↓
Target shard
  ↓
Response
```

The contract SHALL explicitly state:

- maximum expected D1 reads;
- maximum expected D1 writes;
- maximum fan-out;
- retry budget;
- serialization/network-hop budget where material;
- queue/admission behavior;
- timeout budget where defined.

Control-plane intelligence MUST remain outside the mandatory normal hot path unless an explicit correctness requirement proves otherwise.

## 8. Resource-Budget Standard

A capability SHALL declare resource budgets before implementation when the resource can affect scale, cost, or reliability.

At minimum, applicable capabilities SHALL consider:

```text
D1 reads/request
D1 writes/request
Cross-shard fan-out
Network hops
Retry attempts
Queue depth
Concurrent work
Payload size
Cache memory
CPU-sensitive loops
```

A budget is a correctness/scalability boundary, not an optimization suggestion.

Exceeding a hard budget SHALL produce defined behavior such as reject, shed, degrade, or bounded continuation. It SHALL NOT silently become unbounded work.

## 9. Complexity Budget

Before implementation, the change SHALL be reviewed for complexity introduced.

The Change Manifest SHOULD declare, where applicable:

```text
new files
new public interfaces
new state objects
new dependencies
new network hops
new D1 operations
new retry paths
new queues
new concurrency mechanisms
new execution paths
```

New complexity requires one of:

1. a requirement;
2. an invariant;
3. a measurable performance/reliability benefit;
4. a real ownership/scaling/security/failure boundary.

"Future-proofing" alone is insufficient.

## 10. AI Implementation Gate

AI agents SHALL NOT begin implementation from a vague prompt alone.

Before coding, the agent SHALL produce internally or in the development record:

```text
CONTRACT UNDERSTOOD
SCOPE FROZEN
DEPENDENCIES VERIFIED
STATE OWNERSHIP VERIFIED
INVARIANTS VERIFIED
HOT PATH VERIFIED
D1 BUDGET VERIFIED
FAILURE MODEL VERIFIED
COMPLEXITY BUDGET VERIFIED
CHANGE MANIFEST FROZEN
```

If a material contradiction appears, the agent SHALL stop rather than silently invent a design.

## 11. Change Manifest

Every non-trivial change SHALL define:

- files allowed to change;
- interfaces allowed to change;
- state allowed to change;
- tests to add/update;
- documentation to add/update;
- explicit out-of-scope files and behavior.

Unrelated refactoring is prohibited during a scoped capability implementation.

## 12. Verification Matrix

Verification SHALL map directly to the contract.

The minimum applicable matrix is:

```text
Requirement
  ↓
Normal path
  ↓
Boundary / empty / invalid
  ↓
Duplicate
  ↓
Retry
  ↓
Timeout / cancellation
  ↓
Concurrency / race
  ↓
Partial failure
  ↓
Overload / backpressure
  ↓
Resource exhaustion
  ↓
Restart / recovery
  ↓
Hot key / hot shard / skew
  ↓
Security
  ↓
Performance / regression
```

Not every row applies to every capability, but every excluded row SHALL have an explicit applicability decision.

## 13. Evidence Standard

A PASS statement SHALL identify evidence.

Evidence SHOULD include:

- commit SHA;
- contract/version;
- changed files;
- test command;
- test result;
- runtime/configuration;
- workload;
- latency distribution where relevant;
- throughput where relevant;
- actual D1 reads/writes where relevant;
- errors/rejections;
- queue peak;
- fan-out;
- retry amplification;
- limitations.

The following are not sufficient by themselves:

- source inspection;
- compilation only;
- one successful request;
- screenshot;
- assertion that a test "should pass";
- fabricated or non-reproducible benchmark numbers.

Allowed evidence status values SHALL distinguish:

```text
PASS
FAIL
NOT_TESTED
NOT_RUN
SKIPPED
UNKNOWN
```

`UNKNOWN` and `UNPROVEN` SHALL NOT be converted to PASS by narrative wording.

## 14. ADR Standard

A material architectural decision SHALL be recorded as an ADR when it affects:

- public protocol;
- state ownership;
- shard ownership;
- consistency;
- failure/recovery;
- physical Worker boundaries;
- D1 I/O model;
- scaling model;
- open/commercial boundary;
- security boundary;
- significant dependency or compatibility behavior.

ADR minimum structure:

```text
Context
Problem
Constraints
Options Considered
Decision
Why
Consequences
Rejected Alternatives
Verification / Evidence
```

Rejected alternatives are mandatory when their omission would make the decision difficult to understand later.

## 15. Architecture Diagram Standard

Architecture diagrams SHALL distinguish at minimum:

- data plane;
- control plane;
- authoritative state;
- caches;
- persistent storage;
- external boundaries;
- synchronous hot-path edges;
- asynchronous/control-path edges.

A box is not a valid architectural boundary merely because it has a name.

A physical Worker boundary requires evidence of independent scaling, lifecycle, failure isolation, state ownership, security, operational separation, or materially different hot/cold-path characteristics.

## 16. Interface Standard

Every cross-capability interface SHALL document:

- input schema;
- output schema;
- error model;
- version compatibility;
- idempotency semantics;
- timeout behavior;
- retry behavior;
- ordering requirements;
- ownership assumptions;
- observability fields where necessary.

Interfaces SHALL not rely on undocumented conventions.

## 17. Configuration Standard

Every production-affecting configuration value SHALL have:

- name;
- type;
- default or explicit required value;
- valid range;
- source of truth;
- runtime/reload semantics;
- security classification where applicable;
- impact on compatibility/performance/reliability.

One configuration item SHALL have one authoritative source of truth.

## 18. Documentation Change Control

When implementation changes any of the following, documentation impact review is mandatory:

```text
API
Protocol
Invariant
State ownership
Routing
D1 I/O
Retry
Timeout
Concurrency
Backpressure
Recovery
Worker boundary
Deployment
Security
Compatibility
Distribution boundary
```

Documentation updates SHALL be minimal and authoritative. Duplicated explanations are discouraged because contradictory copies become architecture drift.

## 19. Release Documentation Gate

A capability cannot reach `CAPABILITY_PASS` unless applicable documentation is synchronized with implementation and evidence.

A release cannot reach `RELEASE_READY` when any of the following remains unresolved:

- undocumented public behavior;
- undocumented architecture drift;
- missing state ownership;
- missing failure/recovery semantics;
- missing D1 I/O budget;
- missing verification evidence;
- unresolved compatibility impact;
- unresolved distribution classification.

## 20. Anti-Overdocumentation Rule

The objective is not maximum documentation volume.

Prefer:

```text
one authoritative contract
+ one ADR when needed
+ one verification record
+ one durable evidence record
```

over multiple documents repeating the same rule.

Documentation that adds no constraint, decision, evidence, or operational value SHOULD NOT be created.

## 21. Engineering Quality Test

Before accepting a contract, ask:

1. Could another engineer implement it without chat-history archaeology?
2. Could an independent reviewer falsify its important claims?
3. Are state ownership and failure semantics explicit?
4. Is the hot path bounded?
5. Is D1 I/O bounded and measurable?
6. Are concurrency and retry behavior explicit?
7. Is complexity justified?
8. Can implementation be changed without changing the guarantee?
9. Can two conforming implementations interoperate from the public contract?
10. Does the document make the system simpler rather than merely longer?

If the answer to a material question is no, the document is not ready to govern implementation.

**Final principle:**

> Documentation SHALL reduce ambiguity, constrain implementation, expose trade-offs, enable independent verification, and preserve engineering knowledge. It SHALL make correct implementation easier and incorrect implementation harder.
