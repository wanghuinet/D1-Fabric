# D1-Fabric 3.0 Architecture Contract v1.0

**Status:** ACTIVE ARCHITECTURE LOCK  
**Baseline:** approved D1-Fabric 2.0 architecture  
**Purpose:** prevent 3.0 contract evolution from changing the execution topology

## 1. Architecture identity

D1-Fabric 3.0 is the evolution of the execution contract above the approved 2.0 runtime architecture. The architecture identity is the execution abstraction, governance model, and ownership boundaries—not a permanent count of databases or shards.

## 2. Runtime boundaries

```text
W01 Fabric Gateway
  normalization / contract selection / admission / response envelope

W02 Execution Fabric
  plan compilation / scheduling / routing / bounded fan-out / read cache / budgets / merge / termination / trace

W03 Write Fabric
  write admission / primary targeting / write budget / idempotency / write consistency coupling

W04 Control Plane
  placement metadata / contract versions / capacity policy / recovery / configuration publication / last-known-good
```

Cache is not a standalone mandatory Worker. Observability is not a synchronous telemetry Worker.

## 3. Ownership invariants

```text
OWNER-001 one semantic concern → one owner
OWNER-002 one authoritative mutable state → one owner
OWNER-003 business meaning → application layer
OWNER-004 generic execution governance → Fabric
OWNER-005 public protocol → application-facing contract
OWNER-006 placement/control metadata → W04
OWNER-007 read execution/scheduling/routing → W02
OWNER-008 write execution/idempotency → W03
OWNER-009 request normalization/admission envelope → W01
```

## 4. Data-plane contract

Every execution is bounded by fan-out, downstream concurrency, statements, rows read, rows written, retries, and deadline.

The execution pipeline is:

```text
Contract → Admission → Compile → Schedule → Place → Execute → Merge → Terminate
```

Governance applies across the complete pipeline:

```text
Budget + Deadline + Retry Budget + Consistency + Isolation + Trace
```

## 5. Placement abstraction

Logical data placement is separated from physical storage. The current 64-logical/8-physical arrangement, where applicable to an existing deployment profile, is not the definition of the architecture and must not be hard-coded as the only future topology.

No public API exposes physical D1 identifiers or internal shard topology.

## 6. Extension architecture

3.0 adds three application-facing evolution boundaries without adding runtime Workers:

```text
Iteration Interface
Application Interface
Commercial Extension Interface
```

They terminate at the existing Fabric boundary and reuse the same admission, routing, budget, consistency, security, and observability controls.

### 6.1 Iteration Interface

For versioned application evolution:

- new bounded operations;
- new schemas/fields owned by the application;
- new indexes;
- new API versions;
- new capability contracts.

It cannot alter kernel invariants silently.

### 6.2 Application Interface

Carries bounded application intent. It cannot carry physical D1 instructions, internal Worker call graphs, or unbounded execution directives.

### 6.3 Commercial Extension Interface

Supports generic references for capabilities such as quota, usage, subscription, entitlement, promotion, advertising reference, marketplace reference, developer plans, and enterprise policies.

Fabric does not own payment processing, pricing, advertising decisions, game economy rules, or domain eligibility logic.

## 7. Capability registry

The registry contains versioned capability metadata only:

```text
capabilityId
version
inputSchema
outputSchema
dataOwnership
consistencyRequirement
resourceBudget
securityPolicy
compatibilityPolicy
lifecycleState
```

Capability metadata is not executable code and cannot bypass Fabric controls.

## 8. Domain neutrality

The same extension architecture can serve:

```text
Game: player / inventory / ranking / guild / match / event
Social: follow / like / comment / relationship / notification
Content: post / media / topic / creator / history
Commerce: product / cart / order / promotion / inventory
AI: agent / task / memory / tool / workflow / usage
```

These are external consumers. W01-W04 must remain domain-neutral.

## 9. Evolution rule

Allowed evolution:

```text
application capability ↑
contract versions ↑
implementation quality ↑
placement/scheduler/storage mechanisms ↑
```

Not allowed without architecture approval:

```text
kernel business semantics ↑
Worker count ↑
implicit coordinator ↑
unbounded execution ↑
public topology exposure ↑
```

## 10. Architecture change gate

Any change to runtime boundaries, ownership, data-plane semantics, consistency guarantees, security boundaries, or public topology is an architecture change, not a refactor.

Required sequence:

```text
proposal → evidence → architecture decision → contract update → phase update → implementation → conformance tests
```

## 11. Architecture acceptance

A release passes only when:

- every architecture invariant has implementation/test evidence;
- every normative contract item maps to an architecture owner or is explicitly implementation-only;
- no unapproved Worker or infrastructure primitive exists;
- no business semantics exist in the kernel;
- extension interfaces do not bypass kernel governance;
- public contracts remain compatible according to their version policy;
- resource bounds are mechanically testable.
