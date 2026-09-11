# ADR-0002: Executable Governance Closure

- Status: APPROVED
- Date: 2026-09-12
- Scope: R1 foundation governance

## Context

R1 established machine-readable capability, ADR, ownership, dependency, binding and change-scope authorities. The remaining governance gap was that historical code, contracts, authoritative data ownership, runtime envelopes, release admission and exceptions were not yet represented as executable policy.

## Decision

Extend R1 with machine-enforced registries for:

- legacy isolation;
- contracts;
- authoritative data ownership;
- runtime envelopes;
- release/version policy;
- expiring exceptions.

These policies are enforcement inputs to the canonical foundation validator. They do not authorize new Workers, product functionality, or a new architecture.

## Rules

1. Historical paths are read-only and cannot be imported, deployed, registered or used as active implementation dependencies.
2. Public and governance contracts are versioned; breaking changes require a new version, ADR, migration plan and verification evidence.
3. Authoritative mutable state has exactly one logical owner; caches are never authority.
4. Runtime fan-out and retry behavior must remain within declared ceilings.
5. Release admission requires governance, applicable tests, architecture review and evidence.
6. Exceptions default to deny, require an owner/reason/scope/expiry, and cannot be permanent.

## Consequences

R1 becomes executable for these governance dimensions. Runtime-specific numeric limits remain conservative governance ceilings and do not replace Cloudflare's authoritative platform limits. More detailed SLO, cost, security, environment-drift and migration enforcement remains in R2/R3.

## Verification

The canonical validator MUST reject violations and GitHub Actions MUST execute it for the governed branch.
