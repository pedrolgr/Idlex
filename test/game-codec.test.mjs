import test from "node:test";
import assert from "node:assert/strict";
import { encodeMessage, decodeOutgoingForTest } from "../src/game-codec.mjs";

test("encodes and decodes a protocol message", () => {
  const decoded = decodeOutgoingForTest(encodeMessage({ type: "ping", t: 123 }));
  assert.deepEqual(decoded, { type: "ping", t: 123 });
});

test("encodes logout without throwing", () => {
  // logout não tem payload extra, apenas o tipo
  const frame = encodeMessage({ type: "logout" });
  assert.ok(frame instanceof Uint8Array, "frame deve ser Uint8Array");
  assert.ok(frame.length >= 5, "frame deve ter ao menos 5 bytes (4 nonce + 1 flags)");
  const decoded = decodeOutgoingForTest(frame);
  assert.deepEqual(decoded, { type: "logout" });
});

test("encodes set-action-slot with condition rule properly", () => {
  const msg = {
    type: "set-action-slot",
    slot: 1,
    rule: {
      potionId: "health-potion",
      enabled: true,
      conditions: [
        { subject: "player", attribute: "health", operator: "<=", value: 55, percent: true },
      ],
    },
  };
  const frame = encodeMessage(msg);
  assert.ok(frame instanceof Uint8Array);
  const decoded = decodeOutgoingForTest(frame);
  assert.deepEqual(decoded, msg);
});

