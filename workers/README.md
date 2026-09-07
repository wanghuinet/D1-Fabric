# D1-Fabric Workers

The repository contains one independently deployable Worker per runtime boundary.

| Worker | Root directory | Wrangler name |
|---|---|---|
| W01 Runtime Gateway | `workers/w01-runtime-gateway` | `d1-fabric-w01-runtime-gateway` |
| W02 Shard Router | `workers/w02-shard-router` | `d1-fabric-w02-shard-router` |
| W03 Query Engine | `workers/w03-query-engine` | `d1-fabric-w03-query-engine` |
| W04 Write Engine | `workers/w04-write-engine` | `d1-fabric-w04-write-engine` |
| W05 Cache | `workers/w05-cache` | `d1-fabric-w05-cache` |
| W06 Control & Recovery | `workers/w06-control-recovery` | `d1-fabric-w06-control-recovery` |

Each Worker is a deployable vertical slice. In Cloudflare Workers Builds, import the repository and set the corresponding Worker root directory to the directory above. The repository already contains a Wrangler configuration in each root.

Deployment command:

```bash
npx wrangler deploy
```

Smoke command:

```bash
npm run smoke -- https://YOUR-WORKER.workers.dev
```

These first slices intentionally expose the runtime boundary and deterministic contracts; downstream D1 bindings and cross-worker execution are added only when the corresponding capability is implemented and verified.
