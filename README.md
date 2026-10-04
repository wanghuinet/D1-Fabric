# D1-Fabric

**A Database Middleware Foundation for Cloudflare Workers and D1**

D1-Fabric is a database middleware and data infrastructure foundation designed for modern Serverless architectures. It sits between business applications and underlying databases, providing unified data routing, shard management, physical target resolution, execution control, reliability, and recovery capabilities.

D1-Fabric decouples logical databases and logical shards from their physical database targets. Applications can work with logical data resources without being tightly coupled to individual database instances, while the middleware manages routing, scaling, migration, rebalancing, and failure handling.

## Core Capabilities

**Unified Data Routing**  
Resolves logical database and shard requests to the correct physical database targets through controlled routing and version information.

**Shard and Expansion Management**  
Provides shard lifecycle management, expansion planning, migration, and rebalancing for continuously growing workloads.

**Reliable Execution**  
Provides timeout control, retry budgets, circuit breaking, failure classification, and execution safeguards for distributed database operations.

**Version and Concurrency Control**  
Uses shard map versions and control epochs to prevent stale routing, outdated state, and invalid execution.

**Idempotency and Recovery**  
Uses idempotency and recovery mechanisms to reduce risks from duplicate execution, uncertain commits, and failure recovery.

**Control and Execution Separation**  
Separates authoritative control state from data execution, keeping database management and application execution clearly bounded.

**Serverless-Native Design**  
Built around Cloudflare Workers, D1, and Service Bindings while preserving a path toward other database platforms and infrastructure environments.

## Architectural Position

D1-Fabric is neither a business database nor a business ORM.

It sits between the application layer and database infrastructure:

**Business Application → D1-Fabric → Database Instances / Database Cluster**

D1-Fabric handles target resolution, routing, execution reliability, scaling, migration, and lifecycle management so application code can focus on business logic rather than database topology.

## Project Goal

D1-Fabric aims to provide a stable, scalable, and evolvable database infrastructure layer for modern high-concurrency, Serverless, and data-driven applications.

The project focuses on **clear responsibility boundaries, reliable data access, controlled database scaling, and long-term infrastructure evolution**.

## Chinese

See [README.zh-CN.md](README.zh-CN.md) for the Chinese introduction.
