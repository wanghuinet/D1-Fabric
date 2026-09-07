# D1-Fabric Platform Infrastructure Contract

**Project:** D1-Fabric  
**Status:** MANDATORY  
**Scope:** Core architecture, data model, Worker design, capability boundaries  
**Authority:** v3.0 + v3.1 + v3.2 Constitution and applicable ADRs

## 1. Core Positioning

D1-Fabric is a **general-purpose distributed data infrastructure layer for Cloudflare D1**, not a self-media/content database and not a database whose core model is tied to any single application category.

The objective is:

> **Provide a reusable distributed data substrate whose routing, sharding, query, cache, write, storage, control, reliability, and verification capabilities remain independent of the business domain stored above it.**

D1-Fabric MUST NOT make self-media, articles, videos, feeds, creators, or any other single product category a mandatory core-domain concept.

## 2. Business-Domain Neutrality

The same D1-Fabric core MUST be able to support materially different application data models without changing its fundamental data-plane architecture.

Representative domains include:

```text
Content / Creator
APP Marketplace
AI Agent Marketplace
E-commerce
Finance / Market Data
Startup / Investment
Jobs / Recruitment
Games
Community / Social
Enterprise Applications
```

These are examples, not a fixed supported-domain list.

The core system MUST treat business entities as application-level schemas/contracts rather than hard-coded D1-Fabric concepts.

## 3. Separation of Infrastructure and Domain

The architectural boundary is:

```text
Application Domain
    ↓
Business Schema / Entity Model
    ↓
D1-Fabric API / Data Contract
    ↓
Routing / Sharding / Query / Cache / Write
    ↓
Cloudflare D1
```

### D1-Fabric owns

```text
Request routing
Shard identity and ownership
Shard placement metadata
Query execution primitives
Write execution primitives
Idempotency semantics
Caching primitives
D1 I/O control
Concurrency boundaries
Backpressure
Failure / recovery primitives
Epoch / fencing
Migration primitives
Observability
Verification
```

### Application owns

```text
Business entities
Business fields
Business relationships
Business validation
Business ranking semantics
Business permissions
Product workflows
Domain-specific indexes
Domain-specific aggregation rules
```

D1-Fabric MUST NOT embed domain-specific assumptions merely because an initial application happens to use them.

## 4. Schema Freedom

D1-Fabric MUST support application-defined schemas such as:

```text
APP
- app_id
- developer_id
- name
- category
- version
- rating
- download_count
- update_time

MARKET / FINANCE
- instrument_id
- symbol
- price
- open
- high
- low
- volume
- timestamp

CONTENT
- content_id
- creator_id
- type
- title
- body/reference
- created_at
```

The examples above are illustrative. They MUST NOT become mandatory core schema fields.

The core must provide stable infrastructure contracts while allowing different applications to define their own entity schemas, indexes, partition keys, retention policies, and access patterns subject to D1 and D1-Fabric limits.

## 5. Partitioning and Sharding Neutrality

Partitioning MUST be based on infrastructure-level routing semantics, not on a fixed business type.

A partition key may represent, depending on the application:

```text
user_id
app_id
developer_id
company_id
stock_id
product_id
agent_id
game_id
content_id
tenant_id
```

The core routing layer MUST operate on deterministic partition identity and shard metadata rather than assuming what the entity means.

Hotspot protection, split/merge, migration, epoch/fencing, and recovery MUST remain domain-neutral.

## 6. Query and Write Neutrality

The query engine MUST optimize execution characteristics, not business meaning.

Examples:

```text
lookup by key
range query
indexed lookup
batched read
batched write
upsert
idempotent mutation
aggregation where explicitly supported
```

Domain-specific behavior such as recommendation ranking, financial indicators, social ranking, or marketplace scoring belongs above the infrastructure layer unless explicitly promoted into a generic infrastructure primitive.

## 7. D1 Is the Persistence Substrate, Not the Product Model

D1-Fabric uses Cloudflare D1 as a persistence substrate and adds distributed-data behavior above it.

D1-Fabric MUST NOT assume that D1 alone provides the complete scaling model required by the middleware.

The architecture MUST continue to enforce:

```text
bounded D1 I/O
shard-local execution
minimal cross-shard coordination
bounded retries
bounded queues
hot-shard protection
explicit consistency semantics
recoverable ownership transitions
```

High-frequency or high-volume domains MUST use appropriate batching, aggregation, caching, denormalization, or other bounded techniques where necessary rather than blindly issuing one D1 write per event.

For example, market data may retain authoritative latest-state and appropriately partitioned historical data in D1 while high-frequency ingestion is aggregated/batched according to an explicit domain contract.

## 8. Multi-Product Reuse

A single D1-Fabric deployment MAY serve multiple application domains when isolation, tenancy, security, capacity, and operational requirements permit.

For stronger isolation, separate logical datasets, namespaces, tenants, databases, or deployments MAY be used without changing the core architecture.

The infrastructure should therefore support:

```text
One Core
   ↓
Many Schemas
   ↓
Many Applications
   ↓
Many Business Models
```

The goal is not to make every product identical. The goal is to make the underlying data infrastructure reusable.

## 9. Worker Architecture Consequence

Worker count MUST NOT increase merely because new business domains are added.

A new domain such as APP Marketplace, Finance, or Creator Content MUST normally reuse the existing infrastructure Workers.

Workers remain capability boundaries, for example:

```text
W01 Gateway / Runtime
W02 Shard Router
W03 Query
W04 Write
W05 Cache
W06 Control / Migration / Recovery
```

The exact final Worker count remains subject to architecture review and measured ownership/scaling/failure boundaries.

A domain-specific Worker requires a separate architectural justification showing real ownership, scaling, security, lifecycle, or operational value.

## 10. Extension Model

Domain integrations SHOULD be implemented as thin application-level adapters/contracts over D1-Fabric rather than forks of the core.

Preferred model:

```text
D1-Fabric Core
     ↓
Stable Infrastructure Contract
     ↓
Domain Adapter
 ┌───┼────┬─────┐
 ▼   ▼    ▼     ▼
APP  Content Finance Agent
```

The same core implementation SHOULD support multiple schemas and workloads without duplicating routing, shard, cache, query, write, or recovery logic.

## 11. Anti-Coupling Rules

The following are prohibited unless explicitly approved:

```text
Core API named only for one business domain
Core schema requiring content-specific fields
Shard algorithm assuming content IDs
Router assuming creator/user semantics
Query engine containing product ranking rules
Cache layer assuming feed semantics
Write engine assuming likes/comments
Infrastructure Worker dedicated only to a single product feature
```

If a generic infrastructure primitive can express the requirement, prefer the generic primitive.

## 12. Acceptance Gate

A new core capability is compliant only if review can answer YES to all applicable questions:

```text
Can it operate without a self-media-specific schema?
Can it support at least two materially different entity models?
Is business meaning outside the infrastructure core?
Does partitioning remain domain-neutral?
Does the capability preserve D1 I/O bounds?
Does it preserve shard ownership invariants?
Does it preserve concurrency/backpressure contracts?
Does it preserve failure/recovery contracts?
Does it avoid unnecessary Worker proliferation?
Can an application add a new domain without modifying unrelated core logic?
```

If the answer is NO because the capability genuinely requires domain knowledge, the dependency MUST be explicitly documented as an application-layer concern or approved infrastructure primitive.

## 13. Compatibility with Open / Commercial Boundary

Business-domain neutrality is an architectural principle and does not by itself determine whether an implementation is public or commercial.

Public contracts should remain reusable and interoperable according to:

`D1-FABRIC-OPEN-SOURCE-COMMERCIAL-BOUNDARY.md`

Proprietary optimization, automation, workload intelligence, migration intelligence, and cost optimization MAY remain commercial without coupling the core to a specific business domain.

## 14. Strategic Objective

D1-Fabric is intended to become a **general distributed-data infrastructure**, where the application can change while the underlying data-plane capability remains stable.

Therefore:

> **Do not build a better self-media database. Build a reusable data infrastructure that can power self-media, APP marketplaces, finance, AI agents, commerce, games, communities, and future applications without changing its fundamental architecture.**

This principle protects the core from premature product coupling and increases the reuse, ecosystem, and commercial value of D1-Fabric.
