# D1-Fabric Product & Platform Roadmap Contract v1.0

**Effective:** 2026-09-09
**Status:** ACTIVE / PRIMARY PRODUCT ROADMAP CONTRACT
**Authority:** This document replaces the old version-first v1.1–v1.9 roadmap model. C00/C01/C02 remain authoritative for constitution, architecture/ownership, and engineering operations. API contracts remain authoritative for concrete API semantics.

## 1. Purpose

D1-Fabric roadmap planning follows a large-scale product engineering model: define a durable user/platform outcome, prioritize measurable problems, move incrementally, validate with real usage and production data, and continuously reinforce or change the roadmap when evidence changes.

The roadmap is therefore **not a promise that every future feature will be implemented exactly as currently imagined**. It is a controlled decision system.

Principles:

```text
User problem → measurable outcome → capability → smallest useful landing
→ real usage → evidence → decision → next iteration
```

The roadmap may change. The architecture contract may not be silently changed by an implementation agent.

## 2. Product North Star

D1-Fabric becomes a reusable content distribution platform that lets first-party products and approved third-party developers publish, distribute, consume and interact with text/image/video content through one stable semantic API, without exposing D1, sharding, Workers or internal storage topology.

The strategic loop is:

```text
Creator / Developer / Admin
        ↓
publish content
        ↓
API distribution
        ↓
Web / H5 / Android / iOS / Vertical Apps
        ↓
consume + like + follow + comment
        ↓
behavior / quality signals
        ↓
discovery / recommendation
        ↓
creator + developer ecosystem
```

## 3. Planning horizons

### Horizon A — Current iteration: fully specified

Only the current iteration is implementation-frozen. It has:

- exact user journeys;
- exact API contract;
- exact data/migration contract;
- owners;
- security requirements;
- cost/performance budgets;
- acceptance tests;
- rollout and rollback conditions.

Current implementation target: **v1.1 complete content-distribution loop**.

### Horizon B — Near-term capabilities: directionally specified

The next 2–3 capability increments are planned by user problem, outcome and dependency. Exact implementation details remain adjustable until design review.

Current direction:

```text
Social completion → Creator platform → Discovery
```

### Horizon C — Strategic horizon: capability intent only

Longer-term directions are not frozen as schemas, Workers, endpoints or algorithms.

Current strategic directions:

```text
Recommendation → Media expansion → Platform operations → AI → Ecosystem
```

These become implementation contracts only when evidence, readiness and product priority justify them.

## 4. Capability roadmap

### C1 — Content distribution foundation

**Current target: v1.1**

User problem: creators and developers need a reliable way to publish and distribute text/image/video content across multiple clients.

Capabilities:

```text
Identity
Content
Media/R2
Lifecycle
Feed
Interaction
Comments/replies
Search/topic/history primitives
H5
Android
Developer API
```

Success is a complete usable loop, not the number of endpoints or lines of code.

### C2 — Social graph completion

User problem: users need richer participation around content and creators.

Candidate capabilities:

```text
reply / mention / share
notification primitives
richer interaction state
abuse-safe interaction
```

Entry condition: v1.1 interaction data and UX demonstrate real usage or a validated product requirement.

### C3 — Creator platform

User problem: creators need efficient production, publishing and feedback tools.

Candidate capabilities:

```text
creator profile
content management
drafts / scheduling
collections / channels
basic creator analytics
```

Reuse the canonical Content/Media/Interaction model. No parallel content backend.

### C4 — Discovery

User problem: users cannot efficiently find valuable content as corpus size grows.

Candidate capabilities:

```text
search quality
topics
hashtags
trending
discovery surfaces
```

Provider technology remains replaceable. Business semantics remain owned by business Workers.

### C5 — Recommendation

User problem: a large content corpus requires personalized ranking and recall.

Evolution:

```text
deterministic signals
→ measured ranking
→ recall/ranking systems
→ ML/vector capabilities only when justified
```

No ML or vector infrastructure is authorized merely because it is fashionable.

### C6 — Media expansion

User problem: richer media requires processing and playback capabilities.

Candidate capabilities:

```text
video processing
playback
streaming
audio
media lifecycle
```

R2 remains object storage. Processing systems are adapters/services and do not redefine D1-Fabric ownership.

### C7 — Platform operations

User problem: scale requires trust, moderation, notifications, abuse prevention and operational control.

Candidate capabilities:

```text
notifications/messages
moderation
anti-abuse
quotas
operational controls
```

Hot paths remain bounded; side effects remain asynchronous where possible.

### C8 — AI layer

User problem: creators, users and operators need assistance and intelligence.

Candidate capabilities:

```text
AI search
creator assistance
moderation assistance
content assistance
recommendation intelligence
```

AI is an upper-layer capability. It cannot redefine D1-Fabric's generic middleware ownership.

### C9 — Developer ecosystem

User problem: external developers need predictable access, governance and sustainable platform economics.

Candidate capabilities:

```text
developer applications
scopes
quotas
rate plans
webhooks/events
governance
anti-abuse
monetization/billing interfaces
long-term API compatibility
```

## 5. Iteration decision framework

Every proposed iteration must answer:

1. **User:** who has the problem?
2. **Problem:** what is failing or missing?
3. **Outcome:** what measurable improvement is expected?
4. **Evidence:** what data, feedback or experiment justifies priority?
5. **Capability:** what is the smallest reusable capability that solves it?
6. **Dependencies:** what existing contracts must remain stable?
7. **Cost:** what D1/RPC/CPU/storage/network cost is introduced?
8. **Risk:** security, reliability, migration, compatibility and abuse risks?
9. **Landing:** what is the smallest production-safe release?
10. **Exit:** what evidence decides success, continuation, redesign or abandonment?

A feature without a user problem and measurable outcome is not automatically roadmap work.

## 6. Prioritization law

Priority is determined by a combination of:

```text
User value
× strategic leverage
× evidence strength
× technical feasibility
÷ cost / risk / complexity
```

Do not treat every request as P0. A finite team must ruthlessly prioritize.

## 7. Experiment and landing law

Prefer early, production-safe landings over waiting for a theoretically complete system.

A landing may be intentionally narrow if it tests a meaningful assumption. It must still satisfy security, correctness and reliability gates.

For uncertain product decisions:

```text
hypothesis
→ smallest safe experiment
→ real users / representative traffic
→ measure
→ learn
→ reinforce / revise / stop
```

Do not confuse an experiment with a permanent API contract. Experimental interfaces must be explicitly marked and isolated from stable public semantics.

## 8. Metrics framework

Every active capability should define a small metric set across four dimensions.

### User value

Examples:

```text
successful task completion
content consumption
interaction rate
creator publishing success
developer adoption
```

### Product quality

```text
error rate
latency
availability
content correctness
API compatibility
```

### Platform economics

```text
D1 statements/request
D1 rows read/write/request
RPC/request
cache hit rate
R2 operations/storage/egress
CPU/duration
```

### Safety

```text
auth failures
authorization failures
abuse rate
rate-limit violations
data isolation failures
security incidents
```

Metrics are decision inputs, not vanity dashboards.

## 9. Design review gate

Any major change to public API, schema, ownership, Worker topology, security boundary, cost model or reliability model requires an approved design before implementation.

The design must explain:

```text
problem
requirements
alternatives
chosen design
ownership
API/data impact
cost
security
reliability
migration
rollback
observability
acceptance
```

Implementation agents cannot approve their own architecture change.

A true conflict follows:

```text
STOP → record conflict → design proposal → review/approval → implement
```

This follows the principle used in large-scale engineering organizations that major changes begin with an approved design and pass technical/reliability/security review before implementation and rollout. citeturn0search2turn0search0

## 10. Implementation contract hierarchy

The roadmap never substitutes for implementation contracts.

```text
Product Roadmap Contract
        ↓
Iteration Contract
        ↓
API Contract
        ↓
Implementation Contract
        ↓
Data / Migration Contract
        ↓
Code + Tests
        ↓
Qualification
        ↓
Progressive Rollout
        ↓
Evidence
```

For v1.1, the existing API contract and `docs/api/v1.1/` artifacts remain the concrete implementation authority. A future `API-IMPLEMENTATION-CONTRACT-vX.Y.md` may be added when a version needs finer-grained execution freezing.

## 11. v1.1 is the current execution boundary

v1.1 is intentionally deep and narrow.

Must close:

```text
Auth/User
→ text/image/video/mixed content
→ R2 media reference
→ draft/publish/schedule/archive
→ home/following/hot feed
→ detail
→ like/favorite/follow
→ comments/replies
→ search/topic/history primitives
→ Admin publishing
→ public H5
→ Android integration
→ approved developer API
```

Do not implement v1.2+ functionality merely because an interface could be useful.

Not required for v1.1:

```text
recommendation ML
realtime messaging
payments
complex analytics
AI agents
advanced moderation
```

## 12. Stable architecture constraints

The roadmap cannot be used to bypass C01.

- W01–W06 remain generic middleware.
- Business semantics belong to business Workers.
- Do not add a Worker merely for a future logical boundary.
- Public APIs hide shard/D1/SQL/internal Worker details.
- R2 owns binary media; D1 owns metadata/reference.
- One canonical post model supports `text|image|video|mixed`.
- Comments and replies use one model with `parent_id`.
- Duplicate actions require authoritative constraints/idempotency.
- Cache hit should terminate at 0 D1 where applicable.
- Normal reads target 1 D1; primary writes target 1 write where applicable.
- Per-item RPC, unbounded scans and synchronous fan-out are prohibited.

## 13. Iteration lifecycle

```text
1. Observe
   ↓
2. Define user problem
   ↓
3. Establish measurable outcome
   ↓
4. Prioritize
   ↓
5. Design smallest capability
   ↓
6. Design review
   ↓
7. Freeze current implementation contract
   ↓
8. Build
   ↓
9. Targeted + adversarial qualification
   ↓
10. Progressive rollout / safe landing
   ↓
11. Measure real usage
   ↓
12. Decide: reinforce / modify / stop
   ↓
13. Update roadmap evidence
```

The loop is intentionally iterative rather than a one-way v1.1→v1.9 waterfall.

## 14. AI development governance

AI agents are execution accelerators, not roadmap authorities.

AI must:

- read the active roadmap and relevant contracts;
- implement only the declared current iteration;
- reuse existing verified primitives;
- minimize code and dependencies;
- prove tests, security, cost and scope;
- stop when a real architectural conflict appears.

AI must not:

- redesign the roadmap;
- invent product priorities;
- implement future phases early;
- add Workers for speculative reasons;
- create parallel schemas or APIs;
- change ownership silently;
- optimize code count at the expense of semantic correctness;
- fabricate metrics or evidence.

## 15. Roadmap change control

Roadmap changes are expected when evidence changes. The change must record:

```text
what changed
why it changed
evidence
user impact
architecture impact
API impact
data impact
cost impact
security impact
what is deferred or removed
```

Changing the roadmap does not authorize breaking an already-frozen public API. Public breaking changes require an explicit API version decision.

## 16. Definition of Done for an iteration

An iteration is complete only when:

1. The user problem and intended outcome are documented.
2. The current implementation contract is frozen.
3. Implementation matches the contract.
4. Security/correctness/adversarial tests pass.
5. Cost and performance budgets are demonstrated on high-frequency paths.
6. Migration is reproducible and rollback is understood.
7. CI/qualification passes.
8. Production landing is safe and observable.
9. Evidence is recorded.
10. The next roadmap decision is based on evidence, not assumption.

## 17. Authority

This document is the active product/platform roadmap contract. It supersedes the previous version-first `CURRENT-ITERATION-CONTRACT-v1.1-v1.9.md` as the roadmap authority.

It does **not** supersede:

```text
C00 Constitution
C01 Architecture / Ownership
C02 Engineering Operations
API contracts
Data / Migration contracts
Security contracts
```

Historical roadmap documents remain in `archive/` for auditability only.