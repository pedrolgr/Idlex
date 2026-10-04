import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadFixtureFile, replayFixture } from "./helpers/replay.mjs";

/**
 * Testes de caracterização ("golden master") do HuntSession.
 *
 * Para cada fixtures/sessions/<nome>.jsonl existe fixtures/golden/<nome>.json com o
 * toJSON() esperado. Estes arquivos são o CONTRATO de comportamento das Fases 1 (TS)
 * e 4 (multi-tenant): a refatoração não pode alterá-los.
 *
 * Para regenerar intencionalmente (após mudança de comportamento aprovada):
 *   UPDATE_GOLDEN=1 npm test
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const SESSIONS_DIR = path.join(here, "../fixtures/sessions");
const GOLDEN_DIR = path.join(here, "../fixtures/golden");
const UPDATE = process.env.UPDATE_GOLDEN === "1";

const fixtures = fs.existsSync(SESSIONS_DIR)
  ? fs.readdirSync(SESSIONS_DIR).filter((f) => f.endsWith(".jsonl")).sort()
  : [];

test("há ao menos uma fixture de caracterização", () => {
  assert.ok(fixtures.length > 0, "Nenhuma fixture em fixtures/sessions");
});

for (const file of fixtures) {
  const name = file.replace(/\.jsonl$/, "");
  test(`caracterização: ${name}`, () => {
    const events = loadFixtureFile(path.join(SESSIONS_DIR, file));
    const actual = replayFixture(events);
    const goldenPath = path.join(GOLDEN_DIR, `${name}.json`);

    if (UPDATE || !fs.existsSync(goldenPath)) {
      fs.mkdirSync(GOLDEN_DIR, { recursive: true });
      fs.writeFileSync(goldenPath, JSON.stringify(actual, null, 2) + "\n");
      if (!UPDATE) assert.fail(`Golden criado em ${goldenPath}. Revise e rode novamente.`);
      return;
    }

    const expected = JSON.parse(fs.readFileSync(goldenPath, "utf8"));
    assert.deepStrictEqual(actual, expected);
  });

  test(`determinismo: ${name} gera o mesmo resultado em duas execuções`, () => {
    const events = loadFixtureFile(path.join(SESSIONS_DIR, file));
    assert.deepStrictEqual(replayFixture(events), replayFixture(events));
  });
}
