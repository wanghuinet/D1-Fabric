import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/index.ts";

test("health endpoint is deterministic and dependency-free", async () => {
  const response = await worker.fetch(new Request("https://example.com/health"), {});
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "ok");
});

test("ready endpoint is deterministic", async () => {
  const response = await worker.fetch(new Request("https://example.com/ready"), {});
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "ready");
});

test("unknown and unsupported requests fail closed", async () => {
  const getUnknown = await worker.fetch(new Request("https://example.com/nope"), {});
  assert.equal(getUnknown.status, 404);
  const postHealth = await worker.fetch(new Request("https://example.com/health", { method: "POST" }), {});
  assert.equal(postHealth.status, 405);
});
