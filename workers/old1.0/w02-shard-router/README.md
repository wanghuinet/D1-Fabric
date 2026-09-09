# W02 Shard Router

Deployable Cloudflare Worker vertical slice for deterministic shard routing.

## Deploy

```bash
npm install
npx wrangler deploy
```

## Smoke test

```bash
npm run smoke -- https://YOUR-WORKER.workers.dev
```

## Current boundary

This first deployable slice implements canonical routing identity, deterministic shard selection, logical-to-physical placement metadata, shard state checks, and stale epoch rejection. It does not yet perform D1 I/O or execute migration; those remain downstream control/execution responsibilities.
