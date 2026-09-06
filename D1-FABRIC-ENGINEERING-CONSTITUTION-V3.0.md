# D1-Fabric Engineering Constitution v3.0

**Project:** D1-Fabric  
**Constitution:** Engineering Constitution v3.0  
**Status:** MANDATORY  
**Engineering Model:** AI-Native Engineering  
**Primary Application Language:** TypeScript  
**Application Source Extensions:** `.ts` / `.tsx` / `.d.ts`

---

## 0. Constitution Authority

This Constitution is the highest-level engineering constraint for D1-Fabric.

It applies to:

- AI Agents
- Developers
- Reviewers
- Independent Verification Agents
- CI/CD
- Automation
- Workers
- Runtime
- Release processes

If a lower-level prompt, task, issue, or instruction conflicts with this Constitution, this Constitution takes precedence.

**P0 violations require immediate STOP.** They may not be hidden, deferred, or carried into later work.

---

## 1. Engineering Objective

D1-Fabric does not optimize for maximum code volume or fastest code generation.

The objective is:

> **The minimum amount of correct code that provides complete, runnable, verifiable, maintainable, extensible, and deployable capability.**

Engineering priority:

```text
Correctness
    ↓
Safety
    ↓
Reliability
    ↓
Maintainability
    ↓
Simplicity
    ↓
Performance
    ↓
Cost
```

Lines of code are not a completion criterion.

---

## 2. AI Engineering Principle

AI is an **Autonomous Engineering Agent**, not a code snippet generator.

AI is responsible for:

```text
Understand
Design
Implement
Build
Test
Run
Verify
Review
Document
Produce Evidence
Prepare Release
```

AI may perform self-review, but:

> **The Coding AI does not own the final PASS decision.**

Final capability acceptance requires independent verification and evidence.

---

## 3. Source Code Policy

D1-Fabric application source code is restricted to:

```text
.ts
.tsx
.d.ts
```

### `.ts`

Default TypeScript source format. Use for Workers, services, APIs, routers, storage, cache, query, shard logic, controllers, domain logic, tests, benchmarks, CLI and runtime code.

### `.tsx`

Use only when the source actually requires JSX/TSX syntax. If JSX is not required, use `.ts`.

### `.d.ts`

Use only for TypeScript declarations, module declarations, environment declarations, third-party declarations, API declarations, and type augmentation. It must not contain runtime business logic or side effects.

### Source versus artifacts

Build output, generated files, configuration, deployment files, Dockerfiles, YAML, JSON, SQL migrations, shell scripts, and documentation are not application source code and are governed by their respective engineering contracts.

### Unapproved application languages

Core application logic must remain TypeScript unless a language exception is explicitly approved through architecture review. Go, Rust, Python, Java, C++, C, and other languages must not be introduced as a second application implementation language without approval.

---

## 4. Requirement Gate

Before implementation, every Capability must define:

```text
Requirement
Acceptance Criteria
Scope
Non-Scope
Dependencies
Risks
Performance Targets
Security Requirements
Compatibility Requirements
```

Ambiguous requirements do not authorize implementation expansion.

---

## 5. Design Gate

Required flow:

```text
Requirement
    ↓
Design
    ↓
Design Review
    ↓
Contract Freeze
    ↓
Implementation
```

Design must address, where applicable:

```text
Architecture
Data Flow
Control Flow
Failure Path
Concurrency Model
State Model
API
Data Contract
Dependencies
Performance
Security
Recovery
Observability
```

Do not implement first and retrofit the design afterward.

---

## 6. Contract Freeze

Before implementation, freeze the applicable contracts:

```text
API Contract
Data Contract
Error Contract
Concurrency Contract
Lifecycle Contract
Performance Contract
Security Contract
Compatibility Contract
Observability Contract
```

Frozen contracts cannot be changed silently. A required change must include:

```text
Change Request
    ↓
Impact Analysis
    ↓
Contract Version Update
    ↓
Regression
    ↓
Independent Verification
    ↓
Approval
```

---

## 7. Worker Boundary

A Worker is a **Capability Boundary**, not a tiny task boundary.

Each Worker must provide a complete capability path:

```text
Input
 ↓
Processing
 ↓
State
 ↓
Output
 ↓
Error Handling
 ↓
Recovery
 ↓
Observability
```

Do not create artificial micro-tasks whose only purpose is to generate PASS records.

---

## 8. Worker Completion Gate

A Worker is not complete because its code was written.

Required lifecycle:

```text
IMPLEMENTED
    ↓
TYPE CHECK
    ↓
UNIT TEST
    ↓
INTEGRATION TEST
    ↓
BUILD
    ↓
START
    ↓
REAL REQUEST
    ↓
FAILURE TEST
    ↓
SECURITY TEST
    ↓
PERFORMANCE TEST
    ↓
REGRESSION
    ↓
AI SELF REVIEW
    ↓
INDEPENDENT VERIFICATION
    ↓
EVIDENCE COMPLETE
    ↓
CAPABILITY PASS
```

**NO CAPABILITY PASS → NO NEXT WORKER.**

---

## 9. Hard Gates

```text
NO REQUIREMENT
    ↓
NO DESIGN

NO DESIGN
    ↓
NO IMPLEMENTATION

NO BUILD
    ↓
NO PASS

NO RUNTIME
    ↓
NO PASS

NO INTEGRATION
    ↓
NO PASS

NO INDEPENDENT VERIFICATION
    ↓
NO CAPABILITY PASS

NO CAPABILITY PASS
    ↓
NO NEXT WORKER
```

---

## 10. Test Contract

Tests must be designed with the behavior they protect.

Applicable test levels include:

```text
Unit Test
Integration Test
End-to-End Test
Failure Test
Concurrency Test
Recovery Test
Security Test
Performance Test
Regression Test
```

Behavior-changing code must have corresponding tests.

Prohibited:

```text
Fake Test
Always-Pass Test
Unused Assertion
Mock-Only Validation for Real Behavior
Skipped Critical Test
Fabricated Test Result
```

Tests must themselves be reviewable and meaningful.

---

## 11. Build Gate

Required build pipeline:

```text
Format
 ↓
Type Check
 ↓
Lint
 ↓
Unit Test
 ↓
Integration Test
 ↓
Build
```

Any failure stops progression. Errors may not be ignored, suppressed, or relabeled as PASS without an explicit approved exception.

---

## 12. Runtime Verification

Build PASS does not equal Runtime PASS.

The system must be started and exercised:

```text
Build
 ↓
Start
 ↓
Health Check
 ↓
Readiness Check
 ↓
Real Request
 ↓
Real Response
```

A capability that cannot be demonstrated at runtime is **NOT VERIFIED**.

---

## 13. Real Capability Verification

Verification must follow the real call path, not merely inspect isolated files:

```text
Client
 ↓
API
 ↓
Worker
 ↓
Core Logic
 ↓
Storage / Dependency
 ↓
Response
```

No real call path means no capability verification.

---

## 14. Failure and Recovery Engineering

Critical Workers must test relevant failures, including:

```text
Process Crash
Worker Crash
Network Timeout
Network Failure
Dependency Failure
Storage Failure
Disk Full
Duplicate Request
Retry
Partial Failure
Invalid Input
Corrupted State
Restart
Recovery
```

Required model:

```text
Failure
 ↓
Detection
 ↓
Isolation
 ↓
Recovery
 ↓
Consistency Verification
```

Normal-path success alone is insufficient.

---

## 15. Concurrency Safety

Concurrent code must be evaluated for:

```text
Race
Deadlock
Livelock
Starvation
Data Race
Lock Contention
Resource Exhaustion
Ordering
Cancellation
Timeout
```

Prefer the simplest concurrency model that satisfies the requirement. Complexity requires justification and verification.

---

## 16. Security Gate

Every production capability must address applicable:

```text
Authentication
Authorization
Input Validation
Injection
Privilege Boundaries
Secret Handling
Data Exposure
Dependency Vulnerability
Supply Chain Risk
Auditability
```

Critical security failure is a capability failure.

Security may not be deferred merely because the functional path works.

---

## 17. Privacy and Data Protection

When user or sensitive data is involved, define:

```text
Data Classification
Data Access
Data Retention
Data Exposure
Logging Policy
Encryption Requirements
Deletion Requirements
```

Sensitive data must not be exposed through logs, metrics, debug output, errors, or test fixtures unless explicitly required and protected.

---

## 18. Dependency Governance

Every new runtime dependency must have a documented reason and account for:

```text
Name
Version
Purpose
Security
License
Maintenance
Runtime Impact
Build Impact
Performance Impact
Alternative
```

Principle:

> **If the dependency is not necessary, do not add it.**

Avoid convenience dependencies, duplicate libraries, abandoned packages, and unnecessary frameworks.

---

## 19. Data Compatibility

Data-layer changes must define applicable:

```text
Schema Version
Data Version
Protocol Version
Metadata Version
Migration Version
```

Upgrade verification must cover old data against the new version and, where applicable, rollback or compatibility behavior.

```text
Old Data
 ↓
New Version
 ↓
Read
 ↓
Write
 ↓
Restart
 ↓
Rollback / Compatibility Verification
```

---

## 20. API Compatibility

Every API change must explicitly assess:

```text
Breaking Change?
Backward Compatible?
Forward Compatible?
Client Impact?
Worker Impact?
Migration Required?
```

Breaking changes require versioning, migration planning, regression verification, and rollback planning.

---

## 21. Performance Contract

Critical capabilities must define measurable targets for applicable:

```text
QPS
P50
P95
P99
CPU
Memory
Network
Storage I/O
Error Rate
```

Benchmark evidence must record:

```text
Baseline
Current Result
Delta
Environment
Dataset
Concurrency
Duration
```

---

## 22. Performance Regression Gate

Performance must be compared against a baseline.

```text
Baseline
 ↓
Current
 ↓
Regression Analysis
```

Worker-specific thresholds determine PASS, REVIEW, or FAIL.

Significant unexplained regression blocks release until reviewed.

---

## 23. Observability Contract

Every production Worker must provide applicable:

```text
Health
Readiness
Logs
Metrics
Errors
Latency
Resource Usage
```

The system must be able to answer:

```text
What happened?
When?
Where?
Why?
How often?
How severe?
```

A production capability without sufficient observability is not release-ready.

---

## 24. Release Engineering

Releases must be reproducible:

```text
Source
 ↓
Build
 ↓
Test
 ↓
Artifact
 ↓
Verify
 ↓
Deploy
```

The release record must identify:

```text
Version
Commit
Build
Artifact
Configuration
Dependencies
```

The team must be able to determine exactly what version is running in production.

---

## 25. Canary Release

Production changes should use staged rollout where the deployment environment supports it:

```text
Build
 ↓
Verification
 ↓
Canary
 ↓
Observe
 ↓
Promote
```

Canary results must be based on real operational signals. A failed validation blocks promotion.

---

## 26. Rollback Contract

Every production release must have a defined rollback path appropriate to the change:

```text
Rollback Version
Rollback Procedure
Rollback Trigger
Rollback Verification
Data Compatibility
```

Relevant triggers include increased errors, latency, crashes, data integrity issues, or security issues.

After rollback, verify health, functionality, data integrity, and performance.

---

## 27. Code Review Contract

Review must cover, as applicable:

```text
Design
Functionality
Complexity
Tests
Naming
Comments
Style
Documentation
Security
Concurrency
```

The purpose is continuous improvement of system code health, not an unrealistic claim of perfect code.

---

## 28. Change Size and Scope

A change should be:

> **Conceptually small and self-contained.**

A change should include the related tests needed to establish its correctness and should not break the build.

Unrelated refactoring must not be mixed into feature changes without explicit justification.

---

## 29. Refactoring Rule

Large refactors should be separated from feature work when practical:

```text
Refactor
```

and

```text
Feature
```

should remain independently understandable, testable, and reversible.

---

## 30. Code Health

Every change must answer:

> **Does this improve or preserve the long-term health of D1-Fabric?**

Prohibited unless justified:

```text
Future Abstraction
Unused Interface
Unused Wrapper
Premature Generalization
Over Engineering
Duplicate Implementation
```

---

## 31. Independent Verification

D1-Fabric uses independent verification to reduce self-confirmation bias in AI development.

```text
Coding Agent
      ↓
Self Test
      ↓
Self Review
      ↓
Independent Verification
      ↓
Evidence
      ↓
PASS / FAIL
```

The verifier must independently examine:

```text
Requirement
Contract
Implementation
Tests
Runtime
Failure Handling
Performance
Security
Evidence
```

Independent verification must not simply repeat the coding agent's conclusion.

---

## 32. Evidence Contract

Every PASS requires evidence.

Minimum evidence includes:

```text
Project
Version
Worker
Capability
Commit
Files Changed
LOC Changed
Dependencies
Build Result
Test Result
Runtime Result
Integration Result
Failure Result
Security Result
Performance Result
Regression Result
Review Result
Independent Verification Result
Limitations
```

Missing evidence means **UNKNOWN**, not PASS.

---

## 33. Status Model

Allowed states:

```text
UNKNOWN
READY
IN_PROGRESS
LOCAL_PASS
CONTRACT_PASS
INTEGRATION_PASS
REGRESSION_PASS
CAPABILITY_PASS
RELEASE_READY
RELEASED
ROLLED_BACK
FAILED
BLOCKED
```

Do not use vague states such as:

```text
Probably OK
Almost Complete
Basically Done
Looks Good
Should Work
```

---

## 34. PASS Definition

A Capability may be marked `CAPABILITY_PASS` only when all applicable critical gates pass:

```text
Requirement PASS
AND
Contract PASS
AND
Build PASS
AND
Test PASS
AND
Runtime PASS
AND
Integration PASS
AND
Failure PASS
AND
Security PASS
AND
Performance PASS
AND
Regression PASS
AND
Independent Verification PASS
AND
Evidence COMPLETE
```

Any critical failure means:

```text
CAPABILITY FAILED
```

---

## 35. Unknown Is Not Pass

```text
NOT TESTED       = UNKNOWN
NOT VERIFIED     = UNKNOWN
NOT RUN          = UNKNOWN
SKIPPED          = UNKNOWN
FABRICATED       = FAILED
```

Unknown states may not be promoted to PASS by assumption.

---

## 36. Defect Escalation

Severity levels:

```text
P0 — Critical
P1 — High
P2 — Medium
P3 — Low
```

P0 examples include:

```text
Data Loss
Data Corruption
Critical Security Failure
Major System Unavailability
Major Consistency Failure
Unrecoverable Failure
```

P0/P1 handling:

```text
STOP
 ↓
CAPABILITY FAILED
 ↓
ROOT CAUSE
 ↓
FIX
 ↓
FULL REGRESSION
 ↓
INDEPENDENT VERIFICATION
```

---

## 37. No Defect Propagation

A Worker with unresolved critical defects must not be used as a foundation for the next Worker.

```text
Worker A
 ↓
CAPABILITY PASS
 ↓
Worker B
```

Never:

```text
Worker A
 ↓
Known Critical Defect
 ↓
Worker B
```

---

## 38. Incident and Learning Loop

Every P0/P1 incident must produce learning that can prevent recurrence:

```text
Incident
 ↓
Detection
 ↓
Root Cause
 ↓
Fix
 ↓
Regression Test
 ↓
Contract Update
 ↓
Automation
 ↓
Architecture Learning
```

The review must ask:

```text
Why was it not detected?
Why was it not tested?
Why was it not reviewed?
Why was it not automatically blocked?
```

The preferred outcome is a new automated test, rule, gate, or monitoring signal rather than reliance on memory.

---

## 39. AI Autonomous Development Loop

The standard D1-Fabric AI loop is:

```text
READ
 ↓
UNDERSTAND
 ↓
REQUIREMENT
 ↓
DESIGN
 ↓
DESIGN REVIEW
 ↓
CONTRACT FREEZE
 ↓
IMPLEMENT
 ↓
TYPE CHECK
 ↓
TEST
 ↓
BUILD
 ↓
RUN
 ↓
REAL REQUEST
 ↓
FAILURE TEST
 ↓
SECURITY
 ↓
PERFORMANCE
 ↓
REGRESSION
 ↓
SELF REVIEW
 ↓
INDEPENDENT VERIFICATION
 ↓
EVIDENCE
 ↓
CAPABILITY PASS
 ↓
CANARY
 ↓
OBSERVE
 ↓
RELEASE
```

---

## 40. AI Prohibited Actions

AI must never:

```text
Fabricate Test Results
Fabricate Benchmark Results
Fabricate Runtime Results
Fabricate Review Results
Fabricate Evidence

Ignore Build Failure
Ignore Test Failure
Ignore Runtime Failure
Ignore Security Failure
Ignore Regression

Skip Required Gate
Modify Frozen Contract Without Approval
Add Unauthorized Dependency
Introduce Unapproved Application Language
Create Fake Implementation
Use Placeholder as Production Code
Hide Known Defect
Mark UNKNOWN as PASS
Start the Next Worker Before CAPABILITY PASS
Perform Unrelated Broad Refactors
```

---

## 41. Final Architecture Gate

Before moving to the next Worker, the system must answer, with evidence:

```text
Does it compile?
Does it run?
Does it work?
Does it integrate?
Does it survive relevant failures?
Is it secure?
Is it observable?
Is it performant?
Is it compatible?
Can it roll back?
Can another engineer understand it?
Can another AI continue it?
```

If a critical answer cannot be demonstrated:

> **DO NOT PASS.**

---

## 42. Final Engineering Principle

D1-Fabric does not assume that AI will never make mistakes.

Instead, the engineering system must ensure that an AI mistake cannot silently propagate into the next stage.

```text
AI Error
   ↓
Detection
   ↓
Verification
   ↓
Gate
   ↓
STOP
   ↓
Fix
   ↓
Regression
   ↓
Learning
   ↓
Future Automation
```

---

## 43. Constitution Final Rule

> **D1-Fabric is not complete because code has been written.**
>
> **A Capability is complete only when requirements are clear, design is approved, contracts are frozen, implementation exists, the project builds, tests pass, the real system runs, relevant failures are verified, security is verified, performance is verified, regression is verified, independent verification passes, and evidence is complete.**
>
> **No evidence, no PASS.**
>
> **No Independent Verification, no CAPABILITY PASS.**
>
> **No CAPABILITY PASS, no next Worker.**
>
> **No Release Verification, no Production Release.**
>
> **Every significant incident must become a new test, rule, automation, or contract improvement.**

---

**End of D1-Fabric Engineering Constitution v3.0**
