import assert from "node:assert/strict";
import test from "node:test";
import { handleControl } from "../src/index.ts";

const DB = {} as never;

function request(method: string, path: string, body?: unknown, token?: string): Request {
  const headers = new Headers();
  if (body !== undefined) headers.set("content-type", "application/json");
  if (token !== undefined) headers.set("authorization", `Bearer ${token}`);
  return new Request(`https://w04.test${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("publish fails closed without the admin token", async () => {
  const response = await handleControl(
    request("POST", "/v1/control/publish", { configVersion: 1, epoch: 1 }),
    { CONTROL_DB: DB },
  );
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "CONTROL_PLANE_NOT_CONFIGURED");
});

test("publish rejects missing or invalid authorization before touching the database", async () => {
  const body = {
    configVersion: 1,
    epoch: 1,
    activationTime: 1_000,
    expiryTime: 10_000,
    source: "test",
    payload: {},
  };

  for (const token of [undefined, "wrong", "Basic secret"]) {
    const response = await handleControl(
      request("POST", "/v1/control/publish", body, token),
      { CONTROL_DB: DB, CONTROL_PLANE_ADMIN_TOKEN: "secret" },
    );
    assert.equal(response.status, 401);
    assert.equal((await response.json()).code, "UNAUTHORIZED");
  }
});

test("publish validates request field types after authorization", async () => {
  const response = await handleControl(
    request("POST", "/v1/control/publish", {
      configVersion: 1,
      epoch: 1,
      activationTime: 1_000,
      expiryTime: 10_000,
      source: 123,
      payload: {},
    }, "secret"),
    { CONTROL_DB: DB, CONTROL_PLANE_ADMIN_TOKEN: "secret" },
  );
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "INVALID_REQUEST");
});

test("revoke validates positive safe integer keys", async () => {
  const response = await handleControl(
    request("POST", "/v1/control/revoke", { configVersion: 0, epoch: 1 }, "secret"),
    { CONTROL_DB: DB, CONTROL_PLANE_ADMIN_TOKEN: "secret" },
  );
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "INVALID_REQUEST");
});
