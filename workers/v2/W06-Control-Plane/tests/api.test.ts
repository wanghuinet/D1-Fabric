import assert from "node:assert/strict";
import test from "node:test";
import { handleW06 } from "../src/api.ts";

test("W06 API exposes bounded health and planning endpoints", async () => {
  const health = await handleW06(new Request("https://w06/health"));
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: "ok" });

  const response = await handleW06(new Request("https://w06/v1/migration/plan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      logicalDatabaseId: "db-1",
      logicalShardId: "ls-1",
      sourcePhysicalShardId: "ps-1",
      targetPhysicalShardId: "ps-2",
      sourceShardMapVersion: 1,
      targetShardMapVersion: 2,
      controlEpoch: 1,
    }),
  }));
  assert.equal(response.status, 200);
  const body = await response.json() as { status: string; plan: { planId: string; phase: string } };
  assert.equal(body.status, "PLANNED");
  assert.equal(body.plan.phase, "PREPARED");
  assert.match(body.plan.planId, /^mig-1-2-/);
});

test("W06 API maps malformed payloads to client errors", async () => {
  const invalidJson = await handleW06(new Request("https://w06/v1/migration/plan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{",
  }));
  assert.equal(invalidJson.status, 400);

  const unsupported = await handleW06(new Request("https://w06/v1/migration/plan", {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: "{}",
  }));
  assert.equal(unsupported.status, 415);

  const malformedShape = await handleW06(new Request("https://w06/v1/placement/resolve", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ request: null }),
  }));
  assert.equal(malformedShape.status, 400);
});

test("W06 placement rejects caller-supplied metadata and remains fail-closed without authoritative storage", async () => {
  const withMetadata = await handleW06(new Request("https://w06/v1/placement/resolve", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      request: { logicalDatabaseId: "db-1", logicalShardKey: "abcd", shardMapVersion: 1 },
      metadata: [{ logicalDatabaseId: "db-1", logicalShardId: "ls-1" }],
    }),
  }));
  assert.equal(withMetadata.status, 400);
  assert.deepEqual(await withMetadata.json(), {
    status: "ERROR",
    code: "INVALID_REQUEST",
    message: "caller-supplied placement metadata is forbidden",
  });

  const withoutDb = await handleW06(new Request("https://w06/v1/placement/resolve", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      request: { logicalDatabaseId: "db-1", logicalShardKey: "abcd", shardMapVersion: 1 },
    }),
  }));
  assert.equal(withoutDb.status, 503);
  assert.deepEqual(await withoutDb.json(), {
    status: "ERROR",
    code: "AUTHORITATIVE_METADATA_UNAVAILABLE",
    message: "authoritative metadata store is not configured",
  });
});

test("W06 API rejects oversized requests before planning", async () => {
  const payload = JSON.stringify({ logicalDatabaseId: "db", blob: "x".repeat(1_100_000) });
  const response = await handleW06(new Request("https://w06/v1/expansion/plan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload,
  }));
  assert.equal(response.status, 413);
});
