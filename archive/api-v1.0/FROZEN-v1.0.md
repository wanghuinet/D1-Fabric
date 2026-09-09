# Business API v1.0 — FROZEN

**Effective:** 2026-09-09  
**Status:** FROZEN  
**Authority:** this file + the five artifacts listed below.

## Canonical frozen artifacts

1. `docs/api/v1/openapi.yaml` — public HTTP contract
2. `docs/api/v1/dto.ts` — Request/Response DTO contract
3. `docs/api/v1/migrations/0001_business_v1.sql` — D1 business schema
4. `docs/api/v1/RPC-CONTRACT-v1.0.md` — internal Worker RPC contract
5. `docs/B01-BUSINESS-SCHEMA-API-DESIGN-v1.0.md` — architecture and cost rules

## Frozen Worker topology

```text
W07 API/BFF
W08 Identity
W09 Content
W10 Feed
W11 Interaction
W12 Social
W13 Search
```

W01-W06 are completed technical infrastructure and are out of scope for business implementation.

## Frozen change-control rule

No implementation may silently modify any canonical artifact. A change is allowed only if:

- it is backward-compatible and additive, and the affected contract/test evidence is updated first; or
- the change is explicitly versioned as v1.1+ and the v1.0 contract remains intact.

Breaking changes include field removal/rename/type changes, endpoint or method changes, primary/unique-key changes, Worker ownership changes, RPC signature changes, and business-truth schema changes.

## Implementation gate

The next phase is implementation, not redesign:

```text
migration validation
→ W07 API/BFF skeleton
→ W08 Identity
→ W09 Content
→ W10 Feed
→ W11 Interaction
→ W12 Social
→ W13 Search
→ integration tests
→ RPC/D1 cost acceptance
```

Every Worker must be independently deployable and own its own `package.json`. Business Workers must not copy or reimplement W01-W06 infrastructure.
