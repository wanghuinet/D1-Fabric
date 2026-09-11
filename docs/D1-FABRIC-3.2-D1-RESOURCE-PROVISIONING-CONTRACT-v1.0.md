# D1-Fabric 3.2 D1 Resource Provisioning Contract

Version: 1.0  
Status: DRAFT — ARCHITECTURE-ALIGNED POLICY BASELINE  
Scope: W06 Control resource lifecycle + W04 Data consumption boundary

## 1. Purpose

This contract defines how D1-Fabric may provision a new Cloudflare D1 database as part of controlled scale-out.

The contract separates **resource creation** from **runtime data-plane attachment**. Creating a D1 database does not by itself make that database available to a Worker through `env.<binding>`.

## 2. Provider Capability

Cloudflare exposes a D1 management API that can create a database and return its database identifier. The operation requires an appropriately authorized API credential with D1 write permission.

D1-Fabric MAY use this provider API from the control plane, subject to secret isolation, least privilege, auditability, rate limits and failure handling.

The provider API is a control-plane mechanism and MUST NOT be treated as an implicit replacement for the Worker D1 Binding API on the normal request path.

## 3. Resource Lifecycle

A newly provisioned D1 resource SHALL progress through explicit states:

`REQUESTED → ALLOCATING → CREATED → INITIALIZING → VERIFIED → REGISTERED → PLACED → ATTACHED → PUBLISHED`

Failure states SHALL be explicit and recoverable:

`ALLOCATION_FAILED | INITIALIZATION_FAILED | VERIFICATION_FAILED | ATTACHMENT_FAILED | PUBLISH_FAILED`

A failed resource MUST NOT enter the active routing generation.

## 4. Authority

W06 is authoritative for:

- provisioning intent;
- provider resource identity;
- resource lifecycle state;
- placement decision;
- attachment readiness;
- routing-generation publication;
- reconciliation and recovery.

W04 consumes the published placement state and executes data-plane operations. W04 MUST NOT independently create, delete, reassign or publish D1 resources.

## 5. Idempotency

Provisioning SHALL be idempotent.

The control operation MUST have a stable operation identity and resource intent identity so that retries cannot silently create duplicate logical resources.

If provider-side idempotency is unavailable, W06 MUST reconcile by authoritative provider identity/name and its own operation record before retrying creation.

Duplicate physical resources MUST NOT become duplicate active logical placements.

## 6. Initialization

Creation success is not readiness.

Before a new resource can participate in routing, W06 MUST establish that:

1. the returned provider identifier is valid;
2. the resource is queryable;
3. required schema/bootstrap state is present;
4. required compatibility/version checks pass;
5. the resource satisfies placement and failure-domain policy;
6. the resource can be safely attached to the intended data-plane access mechanism.

Initialization failure MUST leave the resource outside the published routing generation.

## 7. Runtime Attachment Constraint

Cloudflare D1 Workers access is provided through Worker bindings. A D1 binding identifies a database and is configured as part of the Worker configuration/deployment surface.

Therefore:

- creating a D1 database does **not** dynamically create `env.NEW_DB` in an already-running Worker;
- a newly created database MUST NOT be assumed to be immediately reachable through a new runtime binding;
- W06 MUST NOT publish a routing generation that references an unattached database;
- the attachment mechanism used by W04 MUST be an explicitly supported and tested deployment/runtime mechanism.

The D1 REST API MAY be used for administrative/control operations where appropriate, but it MUST NOT be assumed to provide unlimited normal-request data-plane capacity. The production data path MUST use an explicitly validated access pattern.

## 8. Attachment Strategies

D1-Fabric MAY use one of the following provider-supported strategies after architecture and performance validation:

### A. Pre-provisioned binding pool

A bounded set of D1 bindings is deployed ahead of demand. W06 allocates logical placement onto an available bound resource.

This is the simplest operational model but does not provide unlimited runtime binding growth.

### B. Controlled Worker deployment update

W06 may orchestrate a controlled Worker configuration/version update that attaches newly created D1 resources.

The update MUST be treated as a deployment/control-plane transition with compatibility, rollout, rollback and generation-safety checks. It MUST NOT mutate active routing state merely because the provider resource exists.

### C. Other explicitly supported Cloudflare runtime attachment mechanism

If Cloudflare provides a supported mechanism that permits the required dynamic attachment semantics, D1-Fabric may adopt it only after provider-contract validation, performance testing, security review and an accepted ADR.

No undocumented or inferred runtime API is permitted.

## 9. Publication Gate

The routing generation MAY reference a newly provisioned D1 only after:

`Created → Initialized → Verified → Registered → Placed → Attached → Health-checked → Generation-prepared`

Only then may W06 publish the generation.

The generation publication is the atomic architectural boundary between control-plane intent and data-plane visibility.

## 10. Failure and Rollback

At any stage before publication, failure SHALL preserve the previous valid routing generation.

After publication, failure SHALL use the existing reliability/recovery contracts and generation-safe rollback or forward-repair mechanism.

Resource cleanup MUST be separated from routing rollback. A physical D1 that is no longer referenced MUST enter an explicit reconciliation state before deletion is considered safe.

Automatic deletion of newly created resources after transient failure is NOT permitted without reconciliation evidence.

## 11. Security

Provider credentials used for D1 provisioning MUST:

- remain outside application request payloads;
- be least-privileged;
- be scoped to the required account/resources where possible;
- be unavailable to W04 normal data-plane code;
- be auditable;
- support rotation without changing the logical placement model.

AI-generated code MUST NOT introduce provider credentials into source, fixtures, tests or generated configuration.

## 12. Observability and Evidence

Every provisioning operation SHALL be correlatable through:

- operation ID;
- logical resource ID;
- provider database ID;
- target placement generation;
- lifecycle state transitions;
- actor/authority;
- timestamps;
- verification results;
- failure classification;
- recovery outcome.

A resource MUST NOT be considered active solely because the Cloudflare API returned success.

## 13. Governance

Changes to provisioning authority, lifecycle states, attachment strategy, generation publication semantics, provider credentials, failure handling or resource deletion policy are architecture-affecting changes and require the applicable ADR, Change Manifest, Diff Scope and fresh evidence.

This contract does not authorize a new Worker. It remains within the existing W01–W06 deployment baseline.

## 14. Explicit Non-Goals

This contract does not:

- make physical D1 count an architectural constant;
- guarantee unlimited D1 creation;
- assume that a newly created D1 automatically appears as a Worker binding;
- authorize W04 to provision infrastructure;
- make the Cloudflare management API the normal application data path;
- introduce a new Worker or logical architecture plane;
- authorize undocumented Cloudflare runtime behavior.

## 15. Final Rule

**Create is not attach. Attach is not publish. Only a verified attached resource may enter a routing generation.**
