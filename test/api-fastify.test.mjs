import test from "node:test";
import assert from "node:assert/strict";
import { createServerApp } from "../apps/api/dist/server.js";

test("Fastify Server App: healthz e readyz endpoints", async () => {
  const { app, shutdown } = await createServerApp();

  try {
    const healthRes = await app.inject({
      method: "GET",
      url: "/healthz",
    });
    assert.equal(healthRes.statusCode, 200);
    const healthJson = healthRes.json();
    assert.equal(healthJson.status, "ok");
    assert.ok(healthJson.timestamp);

    const readyRes = await app.inject({
      method: "GET",
      url: "/readyz",
    });
    // In dev without postgres/redis, readyz reports 200 or 503
    assert.ok(readyRes.statusCode === 200 || readyRes.statusCode === 503);
    const readyJson = readyRes.json();
    assert.ok("db" in readyJson);
    assert.ok("redis" in readyJson);
  } finally {
    await shutdown();
  }
});

test("Fastify Server App: slots API endpoints", async () => {
  const { app, shutdown } = await createServerApp();

  try {
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "colenntgamer@gmail.com",
        password: "PlGr@Hunter123",
      },
    });
    const cookie = loginRes.headers["set-cookie"];

    // GET /api/slots
    const res = await app.inject({
      method: "GET",
      url: "/api/slots",
      headers: { cookie },
    });
    assert.equal(res.statusCode, 200);
    const slots = res.json();
    assert.ok(Array.isArray(slots));
    assert.equal(slots.length, 4);

    // GET /api/v1/slots/1
    const resSlot = await app.inject({
      method: "GET",
      url: "/api/v1/slots/1",
      headers: { cookie },
    });
    assert.equal(resSlot.statusCode, 200);
    const slot1 = resSlot.json();
    assert.equal(slot1.id, 1);
    assert.equal(slot1.status, "idle");

    // POST /api/slots/1/price-mode -> "auction"
    const resPriceMode = await app.inject({
      method: "POST",
      url: "/api/slots/1/price-mode",
      headers: { cookie },
      payload: { mode: "auction" },
    });
    assert.equal(resPriceMode.statusCode, 200);
    const slotAfterMode = resPriceMode.json();
    assert.equal(slotAfterMode.session.priceMode, "auction");

    // Invalid slot index
    const resInvalid = await app.inject({
      method: "GET",
      url: "/api/slots/99",
      headers: { cookie },
    });
    assert.equal(resInvalid.statusCode, 400);
  } finally {
    await shutdown();
  }
});

test("Fastify Server App: security headers and SPA fallback", async () => {
  const { app, shutdown } = await createServerApp();

  try {
    const res = await app.inject({
      method: "GET",
      url: "/healthz",
    });
    // Helmet headers
    assert.ok(res.headers["content-security-policy"] !== undefined);
    assert.equal(res.headers["x-frame-options"], "SAMEORIGIN");

    // 404 for unknown api endpoint
    const res404Api = await app.inject({
      method: "GET",
      url: "/api/unknown-route",
    });
    assert.equal(res404Api.statusCode, 404);
  } finally {
    await shutdown();
  }
});
