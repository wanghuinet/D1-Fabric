# W04/W06 Business Leakage Migration Contract v1.0

> Status: ACTIVE
> Purpose: remove business semantics from middleware without breaking existing capability

## 1. Objective

Perform a controlled move-not-copy migration from W04/W06 to the correct business owners. No functionality may be lost merely because ownership changes.

## 2. W04 target state

W04 Write Engine is generic data-plane capability only:

- INSERT/UPDATE/DELETE primitives;
- transaction/write primitives;
- idempotency integration;
- bounded deadline/retry behavior;
- generic validation/error/result handling;
- resource limits.

W04 MUST NOT know content type, author, title, assets, publish operation, content statistics, visibility, category, language, region, or business table names.

## 3. W04 migration owner

The current `publish.ts` semantics move to B02 Content. Media/object semantics move to B03 Media. Identity/author authorization remains owned by B01 Identity/User.

## 4. W06 target state

W06 Control & Recovery owns generic control-plane capabilities:

- shard health;
- routing/epoch/control metadata;
- generic integrity checks;
- recovery/reconciliation primitives;
- migration control;
- operational diagnostics.

W06 MUST NOT contain content-specific rules or direct knowledge of business publish tables.

## 5. W06 migration owner

Content-specific integrity rules move to B02. Media-specific integrity rules move to B03. Identity/security-specific checks remain with their semantic owners, while W06 supplies generic recovery/integrity primitives.

## 6. Safe migration sequence

```text
Inventory current semantics
→ assign semantic owner
→ define owner contract
→ implement owner capability
→ wire callers
→ run compatibility tests
→ run boundary tests
→ remove old middleware semantic code
→ run full regression
→ audit diff/dependencies
→ commit
→ push
→ CI PASS
```

Never delete first. Never maintain two authoritative implementations.

## 7. Compatibility requirement

Existing API behavior, successful operations, failure behavior, idempotency behavior, and persistence semantics must remain compatible unless an explicit versioned contract says otherwise.

If a public API currently points directly to W04 publish behavior, introduce the owner path and compatibility adapter only as a temporary migration mechanism; the adapter must have a retirement condition.

## 8. Boundary tests

The migration must prove:

- no business identifiers/imports remain in W04/W06;
- no business table names remain in middleware code;
- no duplicate business owner exists;
- authorization is not bypassed;
- tenant/routing/epoch rules remain intact;
- duplicate publish/write remains idempotent;
- partial failure does not corrupt state;
- recovery still restores invariants;
- existing core API smoke paths remain valid.

## 9. Scope restriction

This contract does not authorize redesign of the shard algorithm, public API version, D1 topology, Cloudflare product selection, or unrelated business capabilities. Those require a separate approved contract change.

## 10. Completion gate

Migration is complete only when W04/W06 pass purity audit, business owners pass functional regression, package/build/test checks pass, the exact commit has evidence, and CI is green.
