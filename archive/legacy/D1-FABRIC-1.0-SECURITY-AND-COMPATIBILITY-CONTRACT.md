# D1-Fabric 1.0 Security and Compatibility Contract

**Status:** ARCHITECTURE BASELINE  
**Version:** 1.0  
**Authority:** Architecture Contract + Data and State Contract + Runtime Execution Contract + Performance and Cost Contract + Reliability and Recovery Contract + AI Governance Contract  

## 1. Purpose

This contract freezes the security boundary, trust model, authorization model, tenant isolation, data boundaries, public protocol compatibility, schema evolution, deployment compatibility, and security-failure behavior of D1-Fabric.

Core law:

> **No request may access, mutate, infer, or control state outside its declared authority, and no compatible version may reinterpret authoritative state ambiguously.**

Security is a correctness property. Compatibility is a safety property. Neither may be traded for latency, cost, convenience, or AI optimization.

## 2. Security Priority

Security decisions follow:

```text
Isolation
→ Authentication
→ Authorization
→ Data boundary
→ Integrity
→ Confidentiality
→ Auditability
→ Availability
→ Performance
→ Cost
```

A lower-priority optimization MUST NOT weaken a higher-priority security property.

## 3. Threat Model

D1-Fabric MUST assume:

```text
unauthenticated caller
compromised credential
expired credential
forged/modified request
replayed request
cross-tenant request
malicious query shape
SQL injection attempt
oversized payload
resource-exhaustion attempt
stale authorization context
stale routing context
compromised application layer
misconfigured Worker binding
malicious/incorrect plugin or adapter
insider/operator mistake
supply-chain compromise
AI-generated unsafe action
```

The runtime MUST fail closed where trust is required for correctness or isolation.

## 4. Trust Boundaries

The system MUST distinguish at least:

```text
External Caller
→ API / Worker Boundary
→ Authentication Context
→ Authorization Context
→ D1-Fabric Runtime
→ Routing / Control Plane
→ Shard-local Data Plane
→ D1
```

Crossing a trust boundary MUST require an explicit contract.

Application business logic MUST NOT be treated as inherently trusted by the infrastructure runtime.

## 5. Identity

Every authenticated request MUST resolve to a stable identity representation sufficient for authorization.

Identity MAY represent:

```text
user
service
application
tenant
operator
internal runtime component
```

The infrastructure MUST distinguish:

```text
identity
actor
tenant
resource owner
authorization scope
```

They MUST NOT be collapsed into one unchecked identifier.

## 6. Authentication

Authentication MUST establish who or what is making the request before protected operations execute.

D1-Fabric MUST NOT treat:

- an arbitrary client-supplied user ID;
- a tenant ID in a URL;
- a shard ID;
- a routing key;
- a cache key;
- an unverified header;

as proof of identity.

Authentication mechanisms MAY be implemented by an upstream gateway, Cloudflare Access, an application, or another approved identity provider, but D1-Fabric MUST receive a verified identity/credential context with defined provenance.

Cloudflare Access can enforce authorization before a Worker executes, while Workers bindings themselves represent explicit resource capabilities. These platform mechanisms can support the boundary, but application-level authorization remains a D1-Fabric responsibility where the runtime exposes multi-tenant data. citeturn0search6turn0search2

## 7. Credential Handling

Credentials, tokens, signing keys, encryption keys, and secrets MUST NOT be:

- stored in source code;
- logged;
- returned in normal responses;
- embedded in persistent business records;
- exposed to untrusted AI prompts;
- copied into cache keys or telemetry payloads.

Cloudflare Workers supports Secrets/secret bindings; secrets SHOULD be supplied through the platform secret mechanism rather than source-controlled configuration. citeturn0search19

## 8. Authentication Failure

Authentication failures MUST be explicit and bounded.

The runtime MUST reject:

```text
missing credential
invalid credential
expired credential
revoked credential
malformed identity context
untrusted issuer
```

Authentication failure MUST NOT fall back to an anonymous identity that can access protected data.

## 9. Authorization

Authentication answers **who**.

Authorization answers **what that identity may do**.

Every protected operation MUST evaluate:

```text
actor
→ action
→ resource
→ tenant/scope
→ policy
→ result
```

Authorization MUST occur before authoritative read or mutation.

## 10. Least Privilege

Every caller, Worker, service binding, adapter, control-plane operation, and automation agent MUST receive only the capabilities required for its role.

Cloudflare bindings are capability grants: a Worker only receives access to resources explicitly attached to it. D1-Fabric SHOULD use this capability-oriented model to minimize accidental resource exposure. citeturn0search2turn0search21

## 11. Authorization Scope

Authorization scopes MUST be explicit and composable.

A scope MAY contain:

```text
read/write/admin
resource type
resource identifier
tenant
shard scope
operation class
expiration
policy version
```

A broader scope MUST NOT be inferred from a narrower scope.

## 12. Tenant Isolation

Tenant isolation is a mandatory correctness invariant.

Every tenant-scoped operation MUST carry an authoritative tenant identity through the execution path.

Conceptually:

```text
Authenticated Actor
→ Authorized Tenant Context
→ Routing Identity
→ Query/Write Plan
→ Shard
→ D1 Predicate / Key Boundary
```

The tenant boundary MUST NOT depend solely on client-supplied query predicates.

## 13. Cross-Tenant Access

Cross-tenant access MUST be explicitly authorized.

The runtime MUST reject a request where:

```text
authenticated tenant != requested tenant
```

unless an explicit privileged policy permits the operation.

Administrative or support operations that cross tenant boundaries MUST be separately auditable and MUST NOT silently reuse ordinary tenant credentials.

## 14. Tenant Isolation at Routing

Routing MUST preserve tenant isolation.

A routing key collision MUST NOT cause one tenant's authoritative data to resolve to another tenant's logical namespace.

If tenant identity participates in the partition identity, the canonical partition identity MUST be deterministic and versioned.

Example conceptual identity:

```text
partition_identity = namespace + tenant_id + logical_key
```

The exact representation is an implementation choice; the isolation invariant is not.

## 15. Tenant Isolation at Query Execution

A query plan MUST retain the authorization/tenant boundary through:

```text
normalize
→ validate
→ route
→ plan
→ execute
→ merge
```

The planner MUST NOT remove a security predicate merely because an index, cache, optimization, or shard-local plan appears to make it unnecessary.

## 16. Cache Isolation

Cache keys MUST include every security-relevant scope required to distinguish authorized results.

A cached result MUST NOT be returned merely because the underlying logical key matches.

Conceptually:

```text
cache_identity = resource + tenant + authorization_scope + consistency_context
```

If authorization context changes, previously cached authorization-sensitive results MUST be considered unsafe unless the cache contract proves they remain valid.

## 17. Data Classification

D1-Fabric SHOULD classify data into at least:

```text
PUBLIC
TENANT
PRIVATE
SENSITIVE
CONTROL
SECRET
EPHEMERAL
OBSERVATION
```

The application defines business-specific classification, while D1-Fabric enforces infrastructure boundaries.

Secrets MUST NOT be stored as ordinary application data unless an explicit encrypted-secret contract exists.

## 18. Data Boundary

D1-Fabric MUST define where data may flow:

```text
client
→ edge
→ runtime
→ shard
→ D1
→ cache/derived state
→ telemetry
```

Sensitive data MUST NOT cross a boundary unless the destination is explicitly authorized.

Telemetry SHOULD use identifiers, hashes, classifications, and aggregate metrics rather than raw sensitive payloads.

## 19. Data Minimization

The runtime MUST process and retain only the data necessary for the requested capability.

Queries SHOULD select required columns rather than indiscriminately returning entire rows where practical.

Logs and traces MUST NOT capture full request bodies or database rows by default.

## 20. SQL Injection and Query Safety

All application-provided values MUST use parameterized queries or equivalent safe binding.

Dynamic SQL identifiers MAY be generated only from validated allowlists or trusted schema metadata.

The runtime MUST NOT concatenate untrusted values into SQL statements.

Cloudflare's D1 API uses parameterized queries, and Cloudflare's current D1 API guidance explicitly recommends validating API input in addition to parameterization. citeturn0search20

## 21. Query Capability Boundary

If D1-Fabric exposes a generic query interface, the interface MUST distinguish between:

```text
approved operation
approved query shape
approved schema/resource
approved fields
approved predicates
approved ordering
approved limits
```

Arbitrary SQL execution MUST NOT be exposed to ordinary application callers.

Administrative SQL access MUST be isolated from the normal data-plane API.

## 22. Resource Abuse Protection

Security includes resource protection.

Untrusted requests MUST be subject to bounded:

```text
payload size
query complexity
rows returned
rows read
shards touched
fan-out
concurrency
execution time
retries
batch size
memory
```

A request that is valid syntactically but exceeds resource policy MUST be rejected or degraded safely.

## 23. Rate and Admission Control

Rate limiting and admission control SHOULD be applied at the smallest effective boundary:

```text
identity
→ tenant
→ operation
→ shard
→ global safety boundary
```

The runtime MUST avoid a single global rate limiter becoming an unavoidable hot-path bottleneck unless a real security requirement demands it.

## 24. Replay Protection

Security-sensitive mutations MUST define replay semantics.

Where replay would be harmful, the request MUST contain or derive a bounded validity mechanism such as:

```text
idempotency key
nonce
sequence
expiration
request timestamp
```

Replay protection MUST be compatible with the Reliability and Recovery Contract.

## 25. Authorization and Idempotency

Idempotency records MUST NOT be usable to bypass authorization.

The runtime MUST evaluate:

```text
authenticate
→ authorize
→ resolve idempotency
→ execute/recover
```

A previously authorized operation MUST NOT automatically authorize a new actor to retrieve its result unless the contract explicitly permits that behavior.

## 26. Ownership and Security

Security boundaries MUST align with authoritative ownership.

An operation MUST NOT mutate a shard merely because it possesses a valid authentication credential.

The request must also satisfy:

```text
authorization
+
ownership
+
valid routing epoch
+
operation policy
```

This prevents a compromised or stale component from becoming an unauthorized owner.

## 27. Control-Plane Security

Control metadata has higher security sensitivity than ordinary application data because corruption can alter ownership and routing.

Control-plane operations MUST require elevated authorization and MUST be auditable.

The following operations are security-critical:

```text
change shard ownership
change routing epoch
change placement
start/commit migration
restore database
change schema contract
change authorization policy
change tenant boundary
change AI authority
```

## 28. Migration Security

Migration MUST preserve authorization and tenant boundaries.

A migration process MUST verify:

- source ownership;
- destination authorization;
- tenant scope;
- schema compatibility;
- data classification;
- epoch/fencing state;
- destination integrity.

Migration MUST NOT become an uncontrolled mechanism for copying data across tenant or security boundaries.

## 29. Backup / Restore Security

Restoration is an administrative security-sensitive operation.

A restore MUST require explicit authorization and audit evidence.

After restore, the runtime MUST revalidate:

```text
schema
ownership
routing epoch
authorization metadata
idempotency state
migration state
security invariants
```

A restored database MUST NOT automatically regain normal traffic merely because the D1 database is reachable.

## 30. Encryption Boundary

D1 currently provides encryption at rest and encrypted transport between Workers/Cloudflare network components and D1. citeturn0search7

D1-Fabric MUST still protect data at application boundaries because platform encryption does not replace:

```text
authentication
authorization
tenant isolation
secret management
least privilege
logging controls
```

If application-level encryption is required for a data class, key ownership and rotation MUST be explicitly defined rather than assumed from D1 encryption-at-rest.

## 31. Logging and Audit Security

Security logs MUST be:

```text
minimal
structured
correlatable
access-controlled
integrity-protected where required
```

Logs MUST NOT expose:

- secrets;
- authentication credentials;
- full sensitive payloads;
- unnecessary personal data;
- raw authorization tokens.

Security-critical events SHOULD include:

```text
request_id
actor_id / actor class
tenant_id or tenant class
operation
resource class
policy version
result
reason
timestamp
```

## 32. Security Incident State

Security failures MUST have explicit states:

```text
NORMAL
→ SUSPECTED
→ ISOLATED
→ INVESTIGATING
→ CONTAINED
→ RECOVERING
→ VERIFIED
→ RESTORED
```

When trust cannot be established, the affected capability MUST remain isolated or fail closed.

## 33. Security Failure Behavior

The runtime MUST fail closed for:

```text
unknown identity
unknown authorization policy
ambiguous tenant
ambiguous ownership
invalid epoch
corrupted control metadata
invalid security configuration
untrusted schema version
```

The runtime MAY fail open only for explicitly classified non-security-critical observability or optimization features.

## 34. Security Degradation

A security degradation MUST never silently expand privileges.

Permitted degradation may include:

```text
read-only
reduced feature set
cache disabled
AI disabled
non-critical telemetry disabled
administrative operation disabled
```

Forbidden degradation includes:

```text
cross-tenant access
anonymous privileged access
stale authorization acceptance
unbounded query access
unfenced writes
```

## 35. Public Protocol Contract

Every externally consumable D1-Fabric interface MUST define:

```text
protocol version
request schema
response schema
error schema
authentication requirements
authorization requirements
resource limits
idempotency semantics
consistency semantics
compatibility policy
```

Undocumented behavior is not a compatibility guarantee.

## 36. Protocol Versioning

Protocol versions MUST be explicit when a change can alter semantics.

Backward-compatible additions SHOULD be preferred over breaking changes.

A version MAY be encoded in:

```text
media type
header
endpoint
RPC method
request envelope
```

The exact encoding is an implementation choice; semantic version compatibility is mandatory.

## 37. Compatibility Classes

Changes MUST be classified as:

```text
PATCH — implementation/bug fix with unchanged contract
MINOR — backward-compatible capability addition
MAJOR — incompatible contract/semantic change
```

The project MUST NOT label a breaking semantic change as a patch merely to avoid versioning work.

## 38. Wire Compatibility

A newer server SHOULD continue accepting valid requests from supported older clients.

A newer client SHOULD tolerate documented additive response fields.

Clients MUST NOT depend on undocumented field ordering, incidental error text, internal shard identifiers, or internal routing metadata.

## 39. Error Compatibility

Error responses MUST use stable machine-readable error codes.

Human-readable messages MAY change.

Clients MUST branch on:

```text
error_code
category
retryability
```

rather than exact error-message strings.

## 40. Schema Compatibility

Schema changes MUST be classified as:

```text
ADD
EXPAND
MIGRATE
CONTRACT
BREAK
```

The preferred production pattern is:

```text
Expand
→ deploy compatible readers
→ deploy compatible writers
→ backfill/migrate
→ verify
→ switch
→ contract old form
```

D1 migrations are versioned sequential SQL migrations and D1 records applied migrations in a migrations table; D1-Fabric MUST layer its compatibility rules above that mechanism rather than treating migration-file order alone as application compatibility. citeturn0search0

## 41. Expand-Contract Rule

A schema change MUST NOT remove or reinterpret a field while a supported reader/writer may still depend on its old meaning.

For a breaking semantic change, use a new field/version rather than silently changing the meaning of an existing field.

Destructive changes require evidence that all affected execution versions have been retired or migrated.

## 42. Schema Ownership

Each authoritative schema object MUST have:

```text
owner
version
migration path
compatibility range
rollback/recovery plan
verification tests
```

Schema changes MUST be coordinated with routing, migration, indexes, query plans, cache formats, and serialized protocol representations where applicable.

## 43. Data Format Compatibility

Persisted records MUST remain readable by all supported runtime versions.

Serialized formats SHOULD be:

```text
versioned
self-describing where necessary
forward-compatible where practical
backward-readable within the support window
```

A cache or derived representation MAY be discarded and rebuilt when it is not authoritative.

Authoritative data MUST NOT depend on a non-authoritative cache format for recoverability.

## 44. Rolling Deployment Compatibility

During rolling deployment, at least two versions may temporarily coexist.

Therefore every release MUST define:

```text
old reader ↔ new writer
new reader ↔ old writer
old protocol ↔ new protocol
new protocol ↔ old protocol
```

where the deployment topology permits coexistence.

If coexistence cannot be made safe, deployment MUST use an explicit stop-the-world or gated cutover.

## 45. Routing Compatibility

Routing changes are compatibility changes whenever they can change ownership interpretation.

Routing algorithms MUST be versioned/fenced when required.

A new routing version MUST NOT reinterpret existing authoritative data without a migration/compatibility protocol.

Old routing decisions MUST be rejected or safely rerouted after the new ownership epoch becomes authoritative.

## 46. Query Plan Compatibility

Query optimizations MUST preserve:

```text
authorization
result semantics
consistency
ordering guarantees
null semantics
pagination semantics
idempotency semantics
```

An optimization that changes any externally observable contract is a semantic change, not a performance-only change.

## 47. Index Compatibility

Indexes are implementation structures, but their lifecycle may affect performance, migration, and write cost.

Index additions SHOULD be backward-compatible.

Index removal MUST require evidence that supported query plans no longer depend on the index.

An index MUST NOT be removed merely because the current benchmark does not exercise its workload.

## 48. Cache Format Compatibility

Cache entries MUST include enough version/scope information to prevent a new runtime from interpreting an old value incorrectly.

When compatibility cannot be guaranteed:

```text
version mismatch → cache miss → authoritative read
```

Cache invalidation MUST NOT require an authoritative data rewrite unless explicitly necessary.

## 49. Client Compatibility Window

The project MUST define a supported compatibility window for external clients and runtime versions.

The window MUST specify:

```text
supported protocol versions
supported schema versions
supported migration states
minimum client version
retirement date/condition
```

Unsupported versions MUST receive a deterministic error rather than undefined behavior.

## 50. Security and Compatibility of AI

AI-generated code, plans, policies, migrations, query optimizations, and runtime decisions MUST pass the same security and compatibility contracts as human-generated changes.

AI MUST NOT:

- invent authorization semantics;
- weaken tenant isolation;
- bypass schema compatibility;
- expose secrets;
- directly change security policy without authority;
- promote an incompatible migration without verification;
- classify a breaking change as compatible merely to pass a release gate.

AI confidence is not security evidence.

## 51. Security Change Protocol

Any security-sensitive change MUST record:

```text
threat addressed
trust boundary affected
authority change
data boundary change
compatibility impact
migration impact
failure behavior
verification plan
rollback plan
```

Security-sensitive changes MUST receive independent verification where practical.

## 52. Supply-Chain and Dependency Security

Dependencies MUST be minimized.

Every dependency MUST have:

```text
purpose
version policy
security posture
license classification
update strategy
removal/rollback path
```

A dependency MUST NOT be added merely for convenience when a small native implementation is safer and simpler.

Dependencies with known critical vulnerabilities MUST block release unless an explicit risk acceptance exists.

## 53. Secret and Configuration Compatibility

Security configuration MUST be versioned where semantics matter.

The runtime MUST distinguish:

```text
configuration
secret
policy
runtime state
```

Secrets MUST NOT be committed to Git.

Changing security configuration MUST NOT silently reinterpret existing data ownership or authorization records.

## 54. Security Testing

Required security verification includes:

```text
authentication bypass
authorization bypass
cross-tenant read
cross-tenant write
stale credential
expired credential
replay
SQL injection
malformed query
oversized request
resource exhaustion
cache leakage
log leakage
secret exposure
control-plane privilege escalation
migration boundary violation
restore authorization
AI policy bypass
```

Each test MUST verify both externally visible behavior and internal security invariants.

## 55. Compatibility Testing

Every compatibility-sensitive release SHOULD verify:

```text
old client → new runtime
new client → supported old runtime
old schema reader → expanded schema
new schema reader → old compatible schema
old/new protocol coexistence
rolling deployment
migration interruption
rollback
cache version mismatch
routing version transition
```

Breaking changes MUST have explicit negative tests proving that unsupported combinations are rejected safely.

## 56. Security and Recovery

Security state MUST survive recovery.

After restart, migration, failover, or D1 restore, the runtime MUST re-establish:

```text
identity policy
authorization policy
tenant boundaries
ownership
routing epoch
schema compatibility
security configuration
```

A recovered system MUST NOT enter normal admission while any security-critical state is `UNKNOWN`.

## 57. Security Evidence

A security claim MUST be supported by reproducible evidence.

Evidence SHOULD include:

```text
threat
initial trust state
attack/fault
expected denial/isolation
observed result
affected resources
logs/audit evidence
version
verification result
```

Passing unit tests alone is insufficient for a critical isolation claim.

## 58. Mandatory Security and Compatibility Invariants

- **SC-01** — Unauthenticated requests MUST NOT access protected data.
- **SC-02** — Authentication MUST NOT imply authorization.
- **SC-03** — Every protected operation MUST have explicit authorization semantics.
- **SC-04** — Tenant boundaries MUST be enforced independently of client claims.
- **SC-05** — Cross-tenant access MUST require explicit privileged authorization.
- **SC-06** — Cache MUST NOT leak data across authorization or tenant boundaries.
- **SC-07** — Untrusted input MUST NOT be concatenated into SQL.
- **SC-08** — Security-sensitive resources MUST use least privilege.
- **SC-09** — Control-plane mutations MUST be privileged and auditable.
- **SC-10** — Security failure MUST NOT silently expand privilege.
- **SC-11** — Security-critical uncertainty MUST fail closed.
- **SC-12** — Supported protocol changes MUST preserve documented semantics.
- **SC-13** — Breaking schema changes MUST use an explicit migration/compatibility protocol.
- **SC-14** — Rolling versions MUST NOT interpret authoritative state incompatibly.
- **SC-15** — Routing changes that affect ownership MUST be versioned/fenced.
- **SC-16** — Persisted authoritative state MUST remain recoverable across supported versions.
- **SC-17** — AI MUST NOT bypass security or compatibility invariants.
- **SC-18** — Security and compatibility claims MUST have reproducible evidence.

## 59. Forbidden Security Architecture

The following are prohibited:

- trusting client-supplied tenant identity without verification;
- treating authentication as authorization;
- global admin credentials in application code;
- secrets in source control;
- raw token logging;
- cross-tenant cache keys;
- arbitrary SQL for ordinary callers;
- authorization checks only after data retrieval;
- stale authorization accepted after policy invalidation;
- security-sensitive fail-open behavior without an explicit contract;
- schema changes that silently reinterpret authoritative data;
- breaking protocol changes without versioning;
- routing changes without ownership/epoch control;
- restoring databases without security-state verification;
- AI bypass of security policy;
- unnecessary security infrastructure that adds complexity without a real threat boundary.

## 60. Minimal-Code Security Rule

Security MUST be strong at the real trust boundaries and minimal elsewhere.

Every security mechanism MUST identify:

1. threat;
2. trust boundary;
3. protected invariant;
4. enforcement point;
5. failure behavior;
6. verification method.

Do not add security layers merely because they sound enterprise-grade.

Do not remove a security layer merely because it adds latency.

## 61. Release Gate

A release MUST NOT be `RELEASE_READY` unless applicable evidence demonstrates:

```text
authentication correctness
authorization correctness
tenant isolation
cache isolation
query safety
resource-abuse controls
control-plane protection
migration security
restore security
secret handling
protocol compatibility
schema compatibility
rolling deployment compatibility
routing compatibility
security failure behavior
recovery security
```

Any unresolved P0/P1 security defect blocks release.

## 62. Final Security and Compatibility Law

> **Never trust identity without proof, never authorize without scope, never cross a tenant boundary implicitly, never change authoritative meaning silently, and never recover into an unverified security state.**

Combined D1-Fabric 1.0 law:

```text
Deterministic Ownership
+
Bounded Execution
+
Evidence-Based Recovery
+
Explicit Security Boundaries
+
Compatibility-First Evolution
+
Governed AI
=
Production-Grade Distributed Data Runtime
```

---

## Cloudflare Platform Reference Basis

The contract is aligned with current Cloudflare platform behavior relevant to these boundaries:

- Workers bindings act as explicit resource capabilities and can grant access to D1 and other platform resources. citeturn0search2
- Cloudflare Access can restrict access to Workers applications before the Worker executes. citeturn0search6
- D1 data is encrypted at rest and in transit by the Cloudflare platform. citeturn0search7
- D1 migrations are versioned sequential SQL migrations with applied-migration tracking. citeturn0search0
- D1 APIs support parameterized queries, and Cloudflare recommends input validation for APIs that expose D1. citeturn0search20

These platform properties are implementation foundations. They do not replace D1-Fabric's own authentication, authorization, tenant isolation, ownership, compatibility, recovery, or evidence contracts.
