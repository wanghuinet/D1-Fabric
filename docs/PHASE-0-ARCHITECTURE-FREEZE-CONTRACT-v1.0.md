# D1-Fabric Phase 0 Architecture Freeze Contract v1.0

> Status: ACTIVE
> Scope: architecture, ownership, deployment topology, cost/performance boundaries

## 1. Purpose

Freeze the minimum architecture needed to build the platform without semantic drift, duplicated ownership, unnecessary infrastructure, or uncontrolled Cloudflare cost.

## 2. Non-negotiable law

**Business owns meaning. Middleware owns capability.**

One semantic concern has one owner. One authoritative mutable state has one owner. Logical boundaries are frozen before physical Workers are created.

## 3. Middleware topology

| Physical role | Current Worker | Responsibility |
|---|---|---|
| M00 Gateway | W01 | runtime/request boundary, request ID, deadline, CORS, execution entry |
| M01 Data Plane | W02 + W03 + W04 | routing, query, generic write |
| M02 Cache | W05 | generic cache and invalidation |
| M03 Control | W06 | generic integrity, recovery, migration/control |

W02/W03/W04 remain logically independent even when deployed as one physical data-plane unit.

No new middleware Worker is created without a measurable scaling, isolation, reliability, or security reason.

## 4. Business ownership

B01 Identity/User; B02 Content; B03 Media; B04 Social; B05 Feed; B06 Recommendation; B07 Search; B08 Creator; B09 Notification; B10 Moderation; B11 Analytics; B12 Topic; B13 History; B14 Monetization.

Reserved only: B15 AI/Agent; B16 Realtime; B17 Ranking/Feature; B18 Developer Platform; B19 Design/Creative; B20 Payment/Order; B21 Trust/Security.

Reserved does not mean an empty Worker is created now.

## 5. Hard purity boundary

Middleware MUST NOT understand content types, authors, social actions, feeds, recommendation rules, search semantics, topics, history, notifications, creator rules, monetization, business permissions, or business tables/fields.

W04 `publish.ts` business semantics move to B02. W06 content-specific integrity checks move to their business owners. Migration is move-not-copy and MUST preserve existing behavior before the old implementation is removed.

## 6. API boundary

Business APIs use `/api/v1/*` with one shared request context, auth/authz model, error format, cursor pagination, and idempotency semantics.

Business Workers MUST NOT invent competing protocol conventions.

## 7. Cloudflare-first cost law

Prefer the smallest Cloudflare-native solution that satisfies the contract. Do not add Redis, Kafka, RabbitMQ, Kubernetes, a second gateway, a second object store, or other infrastructure merely because it is familiar or fashionable.

Infrastructure may be introduced only when there is: (1) a concrete requirement, (2) a real boundary, (3) a measurable benefit, (4) a cost/resource budget, and (5) verification.

## 8. Cost and resource budgets

Every material API/capability declares, where applicable:

- maximum D1 reads/writes;
- maximum shard fan-out and parallelism;
- maximum rows/payload;
- Worker/RPC budget;
- cache policy and expected hit path;
- retry/deadline budget;
- storage/object operation budget;
- asynchronous side-effect policy.

Cache hits should avoid D1. Writes should prefer bounded batch/transaction semantics. No hot path may contain unbounded fan-out or synchronous side-effect cascades.

## 9. Correctness law

No design may trade away authorization, tenant isolation, idempotency, recovery, data integrity, or compatibility merely to reduce code or cost.

The optimization order is:

Security/isolation → correctness/state ownership → consistency/recovery → resource bounds → availability → performance → cost → code minimization.

## 10. Concurrency law

Hot paths must be short, bounded, cacheable where safe, and degradable. Cross-worker chains are minimized. Non-critical side effects use an event contract and are asynchronous when infrastructure exists to support them; infrastructure is not created speculatively.

Feed MVP uses cursor pagination and bounded fan-out. Complex ML ranking is deferred until evidence justifies it.

## 11. Schema and storage law

Owner → Data Contract → Schema → Index → Implementation → Verification.

D1 is authoritative for business metadata/state unless a later versioned contract explicitly changes ownership. R2 stores binary media; D1 stores media metadata/lifecycle state.

## 12. Deployment law

Every independently deployable Worker owns its own `package.json`, Wrangler config, source, tests, and README. Dependencies must not be mixed into a giant root package.

A Worker must be independently installable, testable, buildable, deployable, and rollback-capable.

## 13. Evolution law

No agent may change Worker topology, semantic ownership, public API, routing/epoch meaning, schema ownership, or infrastructure class implicitly. Such a change requires a versioned architecture proposal and approval before implementation.

## 14. Phase 0 exit gate

Phase 0 is complete only when:

1. active contract authority is singular and unambiguous;
2. W01-W06 boundaries are explicit;
3. B01-B14 ownership is explicit;
4. W04/W06 leakage has a migration contract;
5. API and data ownership rules are explicit;
6. cost/resource budgets are mandatory;
7. independent Worker packaging is mandatory;
8. historical contracts are outside the active AI document set;
9. repository and contract references are internally consistent;
10. the resulting commit is verified and pushed.
