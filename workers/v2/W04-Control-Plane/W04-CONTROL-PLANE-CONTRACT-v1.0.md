# W04 Control Plane Contract v1.0

**Status:** ACTIVE / NORMATIVE / W04 SCOPE
**Owner:** W04 Control Plane
**Architecture:** D1-Fabric 3.0
**Master authority:** `docs/D1-FABRIC-3.0-MASTER-CONTRACT-v1.0.md`
**Architecture authority:** `docs/D1-FABRIC-3.0-ARCHITECTURE-CONTRACT-v1.0.md`

## 1. Responsibility

W04 owns only generic control metadata:

- placement metadata;
- versioned execution/control contracts;
- capacity policy;
- configuration publication;
- recovery and Last-Known-Good (LKG) selection;
- epoch fencing/revocation.

Business meaning, business schemas, product policy, pricing, and domain behavior are forbidden.

## 2. Control snapshot

Every published snapshot MUST contain:

```text
configVersion
exactly one epoch
activationTime
expiryTime
validationStatus
source
placement metadata
capacity policy
contract metadata
```

The snapshot payload is opaque control metadata. It MUST NOT contain executable code.

## 3. Publication invariants

A snapshot can be published only when:

- `configVersion` and `epoch` are finite positive integers;
- `configVersion` is strictly newer than the current head;
- `epoch` is strictly newer than the current head;
- `activationTime < expiryTime`;
- `expiryTime` is in the future at publication time;
- validation status is `VALIDATED`;
- payload is bounded and valid JSON;
- source is non-empty and bounded.

Publication MUST atomically write the immutable snapshot and advance the active head.

## 4. LKG rules

LKG is the newest snapshot satisfying all of:

```text
validationStatus = VALIDATED
revoked = false
now >= activationTime
now < expiryTime
```

An expired or revoked snapshot is never eligible as LKG.

LKG is a recovery source. Selecting an LKG snapshot MUST NOT silently bypass epoch fencing. If the active head is invalid or revoked, normal writes remain blocked until a valid snapshot with a new active epoch is published.

## 5. Epoch fencing

An execution captures exactly one immutable epoch.

For write admission, the supplied epoch MUST equal the current active epoch and the corresponding snapshot MUST be valid, active, and unrevoked. Stale, retired, revoked, expired, or unknown epochs MUST be rejected.

Control-plane outage MUST NOT silently authorize a stale write route.

## 6. Revocation

Revocation is monotonic. A revoked snapshot cannot become active again. Revocation MUST persist before the snapshot can no longer be considered admissible.

## 7. Recovery

Recovery may select the newest valid LKG snapshot as recovery input. It MUST NOT reactivate an older epoch. A recovery implementation MUST publish a new monotonically increasing control version/epoch before normal write admission resumes.

Normal write admission MUST remain blocked until a valid non-expired non-revoked snapshot is available as the active head.

## 8. Resource limits

W04 MUST bound:

```text
request body: 1 MiB
snapshot payload JSON: 512 KiB
source length: 256 bytes
LKG scan: bounded by the indexed control table
```

W04 MUST NOT perform unbounded fan-out, retries, or synchronous telemetry hops.

## 9. Public API and security boundary

The Worker MUST NOT expose:

- physical D1 database identifiers;
- shard identifiers as implementation directives;
- SQL topology;
- internal Worker graph;
- raw control database rows.

The API exposes only bounded generic control metadata.

Mutating control-plane operations (`publish`, `revoke`) MUST fail closed unless a deployment-provided administrator credential is configured. The credential MUST be supplied through an environment secret and MUST NOT be stored in source control or request payloads. Production deployments SHOULD expose W04 through Cloudflare Service Bindings rather than a public route; authentication remains required as defense in depth.

## 10. Acceptance

W04 PASS requires tests for:

- publication validation;
- monotonic version/epoch fencing;
- LKG validity rules;
- revocation;
- stale write rejection;
- expiry rejection;
- payload bounds;
- atomic head advancement semantics;
- no executable extension metadata;
- Worker method/path/body bounds;
- mutation authorization and fail-closed behavior.
