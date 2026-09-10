import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/index.ts";

test("health endpoint is deterministic and dependency-free", async () => {
  const response = await worker.fetch(new Request("https://w05.internal/health"), {});
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    service: "d1-fabric-w05-reliability-plane",
    status: "ok",
  });
});

test("ready endpoint is false without downstream W03 and true when W03 is bound", async () => {
  const unavailable = await worker.fetch(new Request("https://w05.internal/ready"), {});
  assert.equal(unavailable.status, 200);
  assert.deepEqual(await unavailable.json(), {
    service: "d1-fabric-w05-reliability-plane",
    ready: false,
  });

  const available = await worker.fetch(new Request("https://w05.internal/ready"), {
    W03: { fetch: async () => new Response(null, { status: 204 }) },
  });
  assert.equal(available.status, 200);
  assert.deepEqual(await available.json(), {
    service: "d1-fabric-w05-reliability-plane",
    ready: true,
  });
});

test("unknown routes fail closed", async () => {
  const response = await worker.fetch(new Request("https://w05.internal/private"), {});
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: "NOT_FOUND",
    service: "d1-fabric-w05-reliability-plane",
  });
});
