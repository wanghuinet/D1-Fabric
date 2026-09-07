# D1-Fabric Module Boundary Card

**Status:** TEMPLATE

Use one card for each non-trivial runtime module/capability.

## Identity

```text
Capability:
Module:
Owner:
Contract version:
Depends on:
Depended on by:
```

## Responsibility

```text
MUST do:
MUST NOT do:
Semantic decisions owned here:
Semantic decisions explicitly owned elsewhere:
```

## Interface

```text
Inputs:
Outputs:
Errors:
Side effects:
Public/internal boundary:
```

## State

```text
State read:
State written:
Authoritative owner of each state:
Source of truth:
Epoch/version/fencing:
```

## Dependencies

```text
Allowed dependencies:
Forbidden dependencies:
Allowed network/D1 calls:
Maximum calls/fan-out:
```

## Execution Constraints

```text
Hot path/control path:
Deadline:
Retries:
Parallelism:
Memory:
Payload/result bounds:
Consistency:
Idempotency:
```

## Failure / Recovery

```text
Failure classes:
Partial failure behavior:
Timeout/cancellation:
Recovery owner:
Return-to-service condition:
```

## Security

```text
Trust boundary:
Authorization assumption:
Tenant isolation rule:
Untrusted inputs:
Validation requirements:
```

## Verification

```text
Required tests:
Critical negative paths:
Contract MUSTs covered:
Evidence:
```

## Scope Rule

Implementation MUST stay inside this boundary unless the contract, packet, and manifest are explicitly revised.
