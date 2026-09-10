# D1-Fabric GPT Continuous Master Document

Version: 1.0  
Status: ACTIVE / SOURCE OF TRUTH FOR GPT CONTINUITY

## 1. Purpose

This document preserves the current architectural direction and development continuity for GPT-led implementation. It does not replace formal contracts; formal contracts remain authoritative.

## 2. Current Product Model

D1-Fabric is a Cloudflare-native distributed relational data fabric built around D1, Workers, KV, R2 and, where justified, Durable Objects.

The product is explicitly split into two products:

1. Open Core 1.0 — complete open-source foundational middleware kernel.
2. Advanced 1.0 — advanced capabilities built on Open Core contracts without becoming a runtime dependency of Open Core.

## 3. Architectural Rule

Open Core MUST run correctly with Advanced disabled. Advanced MAY depend on Open Core, but MUST enter through stable contracts and extension points. Advanced MUST NOT directly couple to private implementation details of Core.

## 4. Open Core Scope

Gateway, Routing, Execution, Write, Shard Registry, Topology, Placement, Versioning, Idempotency, Reliability, expansion foundations, migration/rebalance foundations, contracts, verification and operational safety.

## 5. Advanced Scope

Online Data Movement, Migration Proof, Consistency Policy Engine, Policy-Gated Cutover, Hotspot Detection/Isolation, Adaptive Expansion, Workload-aware Placement, Cost-aware Routing, Shard Digital Twin, Simulation and bounded adaptive optimization.

## 6. Development Order

Architecture Contract → Capability Contract → Module Contract → Minimal Implementation → Unit Tests → Contract Tests → Integration Tests → Cloudflare Runtime Verification → CI → Architecture Audit → PASS.

No feature is complete merely because code exists or tests pass. Contracted, implemented, verified, production-ready and active are distinct states.

## 7. Governance

Architecture-first, contract-first, module-first, verification-first and controlled evolution. Critical changes require explicit impact analysis, regression evidence and an auditable decision record.

## 8. Current Priority

Finish and freeze Open Core architecture before implementing Advanced. Every new capability must be classified as KERNEL, ADVANCED, D1-ADAPT, MOAT or FRONTIER and assigned to a contract and owner.

## 9. Non-Goals

This document does not authorize implementation of any feature by itself. It records continuity and architectural direction only.
