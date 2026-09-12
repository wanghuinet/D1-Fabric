# D1-Fabric 3.2.1 P0-02 Control-Plane Bootstrap and Recovery Contract

Version: 1.0  
Status: DRAFT FOR ARCHITECTURE REVIEW — P0-02 REMEDIATION  
Scope: Control-plane bootstrap, independence, degraded operation and recovery  
Parent Contract: `docs/D1-FABRIC-3.2-INFRASTRUCTURE-ARCHITECTURE-CONTRACT-v1.0.md`  
Proof Contract: `docs/D1-FABRIC-3.2.3-ARCHITECTURE-PROOF-AND-ENFORCEMENT-CONTRACT-v1.0.md`  
Gate: `docs/D1-FABRIC-3.2-FINAL-ARCHITECTURE-GATE-v1.0.md`

## 0. Decision

This contract closes P0-02 from the 3.2 Red-Team review.

The control plane MUST be independently bootstrappable and recoverable. Normal data-plane serving MUST NOT require a live W06 control-plane mutation path when a previously verified safe state remains valid.

This contract does not add a worker. It defines mandatory behavior for the existing control-plane responsibility.

3.2 remains non-ACTIVE until the machine rules and recovery evidence defined here PASS.

## 1. Hard Invariants

### P0-02-I1 — No Circular Bootstrap Dependency

The bootstrap dependency graph MUST be acyclic for the minimum startup path.

No component required to start W06 may itself require a successful W06 decision or mutation.

### P0-02-I2 — Recovery Root

W06 MUST have a low-dependency Recovery Root containing, or deterministically locating:

- authoritative control-state identity
- authority/generation metadata
- bootstrap policy version
- security bootstrap material required to validate state
- last-known-good state reference
- recovery evidence reference
- environment identity

The Recovery Root is a bootstrap locator and integrity anchor. It MUST NOT become a competing long-term application state store.

### P0-02-I3 — Authoritative Recovery Source

Exactly one declared source is authoritative for recovering each control-state object type.

A cache, dashboard projection, stale Worker-local state or AI-generated proposal MUST NOT be accepted as an authoritative recovery source.

### P0-02-I4 — Generation and Epoch Validation

Every recovered control-state object MUST carry a generation/epoch.

Recovery MUST reject:

- generation regression
- conflicting equal-generation state
- unknown authority identity
- invalid policy version
- expired recovery evidence
- state whose dependency snapshot is incompatible with the current environment

### P0-02-I5 — Verified Last-Known-Good State

Last-known-good state may be used only when all of the following hold:

1. the state was previously verified;
2. verification is attributable to the exact state generation;
3. the state has not exceeded its freshness/validity bound;
4. the authority identity is still trusted;
5. the current policy explicitly permits the affected operation.

### P0-02-I6 — Fail-Closed High-Risk Mutations

While W06 is unavailable or control state is stale, the system MUST fail closed for operations that can alter authoritative topology, placement, ownership, schema, provider binding, destructive lifecycle state or other high-risk infrastructure state.

### P0-02-I7 — Safe Degraded Serving

Where policy permits, normal request serving MAY continue against verified last-known-good data-plane routing/configuration.

Degraded serving MUST be:

- bounded by freshness/epoch;
- observable;
- tenant-safe;
- incapable of creating an untracked authoritative control-state mutation.

### P0-02-I8 — Recovery Is Not Complete at State Load

W06 recovery MUST proceed through:

`Load Recovery Root → Validate Authority → Load Authoritative State → Validate Generation/Policy → Reconstruct Runtime View → Execute Verification Probes → Commit Recovery Generation → Re-enable Mutations`

A state load without successful verification MUST remain RECOVERING and MUST NOT transition to ACTIVE.

## 2. Bootstrap Dependency Contract

The minimum bootstrap graph SHALL be represented explicitly as a directed acyclic graph.

Required conceptual layers:

`Environment Identity / Root Trust`

→ `Recovery Root`

→ `Authoritative Control-State Store`

→ `Control-State Validation`

→ `W06 Runtime`

→ `Provider Observers / Reconciliation`

→ `Mutation Admission`

Normal data-plane serving is a separate branch:

`Verified Last-Known-Good Runtime View → W01-W05 Safe Serving`

This branch MUST NOT require a successful W06 mutation to serve already-safe operations within their declared stale window.

## 3. Control-Plane States

W06 control-plane lifecycle SHALL use at least these states:

- `BOOTSTRAPPING`
- `DEGRADED`
- `RECOVERING`
- `VERIFYING`
- `ACTIVE`
- `FENCED`
- `FAILED`

Legal minimum transitions:

`BOOTSTRAPPING → ACTIVE`

only after validation and verification succeed.

`BOOTSTRAPPING → DEGRADED`

when safe serving is possible but control mutation is unavailable.

`BOOTSTRAPPING → RECOVERING`

when authoritative state must be reconstructed.

`RECOVERING → VERIFYING → ACTIVE`

only after all recovery predicates pass.

`RECOVERING → FENCED`

on authority, generation, integrity or dependency contradiction.

`VERIFYING → FENCED`

on failed recovery evidence.

`ACTIVE → DEGRADED`

when W06 loses required dependencies but verified safe runtime state remains valid.

`ACTIVE → FENCED`

when authoritative control state cannot be trusted.

`FENCED → RECOVERING`

only through the declared recovery procedure.

No undocumented transition is legal.

## 4. Degraded-Mode Contract

When W06 is unavailable:

### Allowed without fresh W06 mutation

- reads using verified routing/placement within freshness bounds;
- operations explicitly classified safe under stale state;
- health observation and telemetry;
- queue consumption only where consumer routing/state remains valid;
- idempotent retries that do not create new authoritative topology decisions.

### Forbidden

- new authoritative placement;
- shard split/merge/rebalance;
- destructive resource retirement;
- ownership transfer;
- provider binding change;
- schema destructive migration;
- policy-sensitive security mutation;
- control-state overwrite based on stale observations;
- AI-generated infrastructure mutation without current authority validation.

### Expiry

Every degraded-state view MUST have a maximum permitted stale duration and generation boundary.

On expiry, the affected operation MUST fail closed rather than silently extending the degraded window.

## 5. Recovery Evidence Contract

A recovery attempt MUST produce evidence containing:

- recovery attempt ID
- source commit/configuration generation where relevant
- authority identity
- recovery root identity/version
- authoritative state generation
- expected generation
- policy version
- dependency graph identity
- state integrity result
- verification probe set/version
- start/end timestamps
- environment identity
- verifier identity
- final result
- evidence expiration/freshness

Recovery evidence is invalid when any identity, generation, authority or policy binding does not match the current recovery attempt.

## 6. Recovery Safety Rules

The recovery system MUST reject:

1. Recovery Root pointing to an unknown authority.
2. A newer incompatible generation being replaced by an older snapshot.
3. Two equal-generation snapshots with conflicting contents.
4. A recovery snapshot lacking required integrity metadata.
5. Recovery from an expired or revoked evidence record.
6. A recovered state requiring a dependency that cannot be bootstrapped independently.
7. Automatic reactivation when verification evidence is missing.
8. AI or operator proposals that bypass generation checks.

## 7. Self-Dependency Prohibition

The following dependency pattern is forbidden:

`W06 startup → W06 decision → resource needed for W06 startup`

Any resource essential to W06 bootstrap MUST have an independently recoverable root and a documented bootstrap source.

If such independence cannot be established, W06 MUST enter `FENCED` rather than repeatedly retrying into a dependency cycle.

## 8. Recovery Attempt Boundaries

Recovery MUST be bounded by:

- maximum recovery duration;
- maximum retries per dependency;
- maximum dependency fan-out;
- maximum state reconstruction scope;
- maximum number of recovery generations considered;
- explicit stop condition.

Repeated unsuccessful recovery MUST NOT create uncontrolled retry amplification against providers or data-plane resources.

## 9. Concurrency and Split-Brain Protection

Only one recovery authority may own a recovery generation at a time.

A concurrent recovery attempt MUST use an explicit recovery epoch/lease or an equivalent fencing mechanism.

When a newer recovery epoch is committed:

- older recovery attempts MUST become invalid;
- stale mutations MUST be rejected;
- previously cached recovery decisions MUST be revalidated before use.

## 10. Machine-Governance Requirements

The governance layer MUST be able to evaluate at least these rules:

`BOOT-001` Bootstrap DAG exists and is acyclic.

`BOOT-002` Recovery Root exists and identifies a trusted authority.

`BOOT-003` Every control-state object has a declared recovery source.

`BOOT-004` Every degraded-state view has generation and freshness bounds.

`BOOT-005` High-risk mutations are fail-closed while W06 is unavailable/stale.

`BOOT-006` Recovery cannot transition to ACTIVE without current verification evidence.

`BOOT-007` Recovery generation/epoch fencing rejects stale concurrent recovery.

`BOOT-008` Recovery retries and fan-out are bounded.

`BOOT-009` No forbidden bootstrap cycle exists.

`BOOT-010` Recovery evidence is bound to authority, generation, policy and environment.

Any violated rule is a hard gate failure.

## 11. Mandatory Negative Verification Matrix

The P0-02 gate MUST include deterministic tests for:

| Scenario | Required result |
|---|---|
| Recovery Root missing | FAIL / FENCED |
| Recovery Root points to unknown authority | FAIL / FENCED |
| Bootstrap graph contains cycle | FAIL |
| Authoritative state unavailable | RECOVERING or controlled DEGRADED, never false ACTIVE |
| Last-known-good state within freshness bound | Safe degraded serving permitted where policy allows |
| Last-known-good state expired | FAIL-CLOSED for affected operations |
| Recovered generation regresses | FAIL / FENCED |
| Equal-generation conflicting snapshots | FAIL / FENCED |
| Policy version mismatch | FAIL / FENCED |
| Recovery evidence missing | FAIL / FENCED |
| Recovery verification fails | FAIL / FENCED |
| Concurrent stale recovery attempts | Older epoch rejected |
| W06 unavailable during normal safe reads | Reads continue only inside declared safety window |
| W06 unavailable during high-risk mutation | Mutation rejected |
| Recovery succeeds but verification is absent | MUST NOT become ACTIVE |

## 12. Admission Impact

P0-02 is closed only when all of the following are true:

- this contract is referenced by the architecture gate;
- BOOT-001 through BOOT-010 are represented as executable governance rules;
- the negative verification matrix passes;
- recovery evidence exists for the current governed generation;
- no open bootstrap cycle or authority contradiction remains;
- the evidence record itself is valid under the Evidence Registry / Kernel Validator rules.

Until then:

`P0-02 = NOT PASS`

## 13. Final Principle

Control-plane availability is not the same as control-plane authority.

D1-Fabric MUST be able to continue safely without W06 for bounded, already-authorized operations, while refusing to invent new authority during an outage.

The recovery objective is therefore:

`independently bootstrap → deterministically recover → verify → fence stale state → then resume authority`
