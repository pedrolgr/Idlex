import test from "node:test";
import assert from "node:assert/strict";
import {
  toCompactSlot,
  computeSlotDeltas,
  storeCatalog,
  getCachedCatalog,
} from "../apps/api/dist/modules/stream/deltas.js";
import { createServerApp } from "../apps/api/dist/server.js";

test("Stream Deltas: catalog caching and compact state", () => {
  const dummyCatalog = [
    {
      id: "cyclops-mountain",
      name: "Montanha dos Ciclopes",
      minLevel: 30,
      maxLevel: 60,
      description: "Caçada de Ciclopes",
      tier: "low",
      monsters: ["Cyclops", "Cyclops Drone"],
    },
  ];

  const hash = storeCatalog(dummyCatalog);
  assert.ok(hash);
  const cached = getCachedCatalog(hash);
  assert.deepEqual(cached, dummyCatalog);

  const slotMock = {
    id: 1,
    status: "hunting",
    errorMessage: null,
    account: { email: "player@huntera.com" },
    character: {
      id: 1234,
      name: "HunterKnight",
      level: 100,
      vocation: "knight",
      outfitId: 128,
      outfitColors: { head: 1, body: 2, legs: 3, feet: 4 },
      hp: 1500,
      maxHp: 1500,
      mana: 300,
      maxMana: 300,
    },
    catalog: dummyCatalog,
    catalogCount: 1,
    session: {},
  };

  const compact = toCompactSlot(slotMock);
  assert.equal(compact.catalogHash, hash);
  assert.equal(compact.character?.name, "HunterKnight");

  // Deltas computation
  const patches = computeSlotDeltas(undefined, compact);
  assert.ok(patches.length >= 2);

  // No changes -> 0 patches
  const noPatches = computeSlotDeltas(compact, compact);
  assert.equal(noPatches.length, 0);

  // Status changed -> 1 patch
  const updatedCompact = { ...compact, status: "dead" };
  const deltaPatches = computeSlotDeltas(compact, updatedCompact);
  assert.equal(deltaPatches.length, 1);
  assert.equal(deltaPatches[0]?.type, "status");
});

test("Stream Endpoint: /api/v1/catalog/hunts/:hash and /api/v1/stream", async () => {
  const { app, shutdown } = await createServerApp();

  try {
    const dummyCatalog = [{ id: "test", name: "Test Hunt" }];
    const hash = storeCatalog(dummyCatalog);

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/catalog/hunts/${hash}`,
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.headers["cache-control"], "public, max-age=86400, immutable");
    assert.deepEqual(res.json(), dummyCatalog);
  } finally {
    await shutdown();
  }
});
