# D1-Fabric 3.0 Runtime Layout

3.0 remains based on a small number of execution boundaries. Do not split Workers by individual capability.

```text
workers/v2/
  w01-fabric-gateway/
  w02-execution-fabric/
  w03-write-fabric/
  w04-control-plane/
  contracts/
```

## Worker package rule

Every independently deployable Worker owns its own package boundary:

```text
<worker>/
  package.json
  wrangler.toml
  src/
    index.ts
    ...
  tests/
    ...
```

Do not merge all Worker dependencies into one giant root package. Shared semantics belong in versioned contract files under `contracts/`.

Worker runtime implementation is TypeScript. PowerShell is not a substitute for Worker source code.

## 3.0 implementation → push → verification protocol

The implementation agent must use this exact sequence:

```text
read repository authority
→ read applicable 3.0 contract
→ inspect target Worker
→ implement assigned boundary
→ typecheck/build
→ unit tests
→ adversarial/resource/security/regression tests
→ diff scope check
→ commit
→ PUSH TO GITHUB
→ record exact commit SHA
→ STOP
```

The independent Worker verification pass then verifies the **pushed commit**, not the local working tree:

```text
fetch exact commit
→ inspect changed files
→ verify Worker package format
→ verify architecture ownership
→ verify Contract → Code → Test mapping
→ verify resource bounds
→ verify security and failure semantics
→ verify regression
→ architecture ↔ contract bidirectional audit
→ PASS / FAIL
```

Verification may perform only contract-preserving refactoring. It may not use refactoring as permission to add business features, create/split/merge Workers, alter public semantics, or introduce speculative infrastructure.

A local PASS without a pushed GitHub commit and independent verification is not a completed delivery.

## Contract location

The executable 3.0 contract is:

```text
docs/D1-FABRIC-3.0-CONTRACT-v1.0.md
```

Shared TypeScript contracts remain under:

```text
workers/v2/contracts/
```

Shared semantics must not be duplicated inside individual Workers.
