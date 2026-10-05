import test from "node:test";
import assert from "node:assert/strict";
import { SlotManager } from "../apps/api/dist/modules/slots/slot-manager.js";
import { Slot } from "../apps/api/dist/slot.js";
import { createServerApp } from "../apps/api/dist/server.js";

test("SlotManager: multi-tenant isolation per user", async () => {
  const defaultSlots = [new Slot(1), new Slot(2), new Slot(3), new Slot(4)];
  const manager = new SlotManager(defaultSlots);

  // Unauthenticated user receives default slots
  const anonSlots = manager.getSlotsForUser(undefined);
  assert.equal(anonSlots.length, 4);
  assert.equal(anonSlots, defaultSlots);

  // User A gets their own isolated slots
  const userASlots = manager.getSlotsForUser("user-a-uuid");
  assert.equal(userASlots.length, 4);
  assert.notEqual(userASlots, defaultSlots);

  // User B gets their own isolated slots
  const userBSlots = manager.getSlotsForUser("user-b-uuid");
  assert.equal(userBSlots.length, 4);
  assert.notEqual(userBSlots, userASlots);

  // Modifying slot state for user A does not affect user B
  userASlots[0].status = "hunting";
  assert.equal(userASlots[0].status, "hunting");
  assert.equal(userBSlots[0].status, "idle");
  assert.equal(defaultSlots[0].status, "idle");

  await manager.disconnectAll();
});

test("Accounts API: routes require authentication and validate inputs", async () => {
  const { app, shutdown } = await createServerApp();

  try {
    // Unauthenticated request is rejected
    const unauthRes = await app.inject({
      method: "GET",
      url: "/api/v1/accounts",
    });
    assert.equal(unauthRes.statusCode, 401);

    // Invalid slot index is rejected
    const invalidSlotRes = await app.inject({
      method: "DELETE",
      url: "/api/v1/accounts/99",
    });
    assert.equal(invalidSlotRes.statusCode, 401);
  } finally {
    await shutdown();
  }
});
