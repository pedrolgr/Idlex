import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeMessage, createAnonymizer } from "../tools/lib/sanitize.mjs";

test("sanitizeMessage remove campos sensíveis recursivamente sem mutar a entrada", () => {
  const input = { type: "x", ticket: "abc", nested: { password: "p", list: [{ email: "a@b.c", ok: 1 }] }, websocketUrl: "wss://h/ws/1" };
  const out = sanitizeMessage(input);
  assert.equal(out.ticket, "[REDACTED]");
  assert.equal(out.nested.password, "[REDACTED]");
  assert.equal(out.nested.list[0].email, "[REDACTED]");
  assert.equal(out.nested.list[0].ok, 1);
  assert.equal(out.websocketUrl, "[REDACTED]");
  assert.equal(input.ticket, "abc");
});

test("createAnonymizer usa pseudônimos estáveis só para jogadores", () => {
  const anon = createAnonymizer();
  const a = anon({ type: "creature-appear", creature: { id: 1, kind: "player", name: "Gatonet" } });
  const m = anon({ type: "creature-appear", creature: { id: 2, kind: "monster", name: "Rat" } });
  const p = anon({ type: "party-update", members: [{ id: 1, name: "gatonet" }, { id: 2, name: "Outro" }] });
  assert.equal(a.creature.name, "Player1");
  assert.equal(m.creature.name, "Rat");
  assert.deepEqual(p.members.map((x) => x.name), ["Player1", "Player2"]);
});
