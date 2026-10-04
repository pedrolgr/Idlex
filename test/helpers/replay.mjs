import fs from "node:fs";
import { mock } from "node:test";
import { HuntSession } from "@idlex/game-core";

/** Instante fixo usado para tornar o replay determinístico. */
export const FROZEN_NOW = 1_700_000_000_000;

/**
 * Formato de uma fixture (.jsonl, uma linha JSON por evento):
 *   {"at": <ms desde o início>, "msg": { "type": "...", ... }}   -> session.handleMessage(msg)
 *   {"at": <ms>, "call": "setHunt", "args": [ ... ]}             -> session[call](...args)
 *   {"at": <ms>, "set": { "tier": 1 }}                           -> Object.assign(session, set)
 * Linhas vazias e linhas iniciadas por "//" são ignoradas.
 */
export function parseFixture(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("//"))
    .map((l, i) => {
      try {
        return JSON.parse(l);
      } catch (err) {
        throw new Error(`Fixture inválida na linha útil ${i + 1}: ${err.message}`);
      }
    });
}

/** Reproduz uma fixture em uma HuntSession com relógio congelado e retorna o toJSON() final. */
export function replayFixture(events, sessionOptions = {}) {
  mock.timers.enable({ apis: ["Date"], now: FROZEN_NOW });
  try {
    const session = new HuntSession(sessionOptions);
    let clock = 0;
    for (const ev of events) {
      const at = typeof ev.at === "number" ? ev.at : clock;
      if (at > clock) {
        mock.timers.tick(at - clock);
        clock = at;
      }
      if (ev.msg) {
        session.handleMessage(ev.msg);
      } else if (ev.call) {
        if (typeof session[ev.call] !== "function") throw new Error(`Método inexistente: ${ev.call}`);
        session[ev.call](...(ev.args ?? []));
      } else if (ev.set) {
        Object.assign(session, ev.set);
      }
    }
    // Normaliza (Map/Set/undefined) exatamente como seria serializado para o frontend.
    return JSON.parse(JSON.stringify(session.toJSON()));
  } finally {
    mock.timers.reset();
  }
}

export function loadFixtureFile(file) {
  return parseFixture(fs.readFileSync(file, "utf8"));
}
