# D1-Fabric 2.0 Runtime Layout

2.0 starts from a small number of execution boundaries. Do not split Workers by individual capability.

```text
workers/v2/
  w01-fabric-gateway/
  w02-execution-fabric/
  w03-write-fabric/
  w04-control-plane/
```

Shared semantics belong in versioned contracts, not duplicated between Workers.

The first implementation slice is Contract + Budget + Adaptive Execution + Cache Termination + Trace. Future features require evidence and a scoped design change.
