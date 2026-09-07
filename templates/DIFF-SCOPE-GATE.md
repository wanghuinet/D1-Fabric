# D1-Fabric Diff Scope Gate

**Status:** TEMPLATE / GATE

The actual change MUST be compared against the frozen Change Manifest before completion.

## Expected Scope

```text
Capability:
Manifest version/commit:
Allowed files:
Allowed additions:
Allowed deletions:
Allowed schema changes:
Allowed dependency changes:
Allowed public API changes:
Allowed runtime behavior changes:
```

## Actual Scope

```text
Changed files:
Added/removed files:
Schema diff:
Dependency diff:
Public API diff:
Runtime behavior diff:
```

## Gate Rules

PASS only when:

```text
actual files ⊆ manifest files
AND
actual schema changes ⊆ manifest
AND
actual dependency changes ⊆ manifest
AND
actual public/runtime changes ⊆ manifest
AND
no new semantic owner was introduced
AND
no contract MUST/invariant was changed implicitly
```

## Exceptions

A necessary contract-compatible correction outside the original manifest MUST be recorded with reason, affected boundary, verification, and manifest revision before PASS.

## Result

```text
SCOPE_PASS / SCOPE_DRIFT / BLOCKED
Reason:
Evidence:
Evaluated commit:
Reviewer:
```

> **The diff is evidence of what actually changed; the manifest is the declared boundary.**
