#!/usr/bin/env node
/**
 * Captura de fixtures do protocolo Huntera.
 *
 * Suporta:
 *   - Modo somente leitura (padrão)
 *   - Modo de caçada ativa: --hunt <huntId> [--tier <tier>]
 *
 * Uso:
 *   node tools/capture-fixtures.mjs --name real-hunt-01 --seconds 90 --hunt rat-hunt --tier 0 --anonymize
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HunteraClient } from "@idlex/huntera-client";
import { GameSocket } from "@idlex/protocol";
import { sanitizeMessage, createAnonymizer } from "./lib/sanitize.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnv(path.join(root, ".env"));

const args = parseArgs(process.argv.slice(2));
const name = String(args.name ?? `capture-${new Date().toISOString().replace(/[:.]/g, "-")}`);
if (!/^[a-z0-9._-]+$/i.test(name)) fail("--name deve conter apenas letras, números, ponto, hífen e underscore.");
const seconds = Math.min(Math.max(parseInt(args.seconds ?? "120", 10) || 120, 5), 1800);
const huntId = args.hunt ? String(args.hunt) : null;
const tier = parseInt(args.tier ?? "0", 10) || 0;

const probes = String(args.probe ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const READ_ONLY_PROBES = new Set(["blessings-open", "request-death-history", "coins-refresh"]);
for (const p of probes) if (!READ_ONLY_PROBES.has(p)) fail(`--probe "${p}" não é permitida (${[...READ_ONLY_PROBES].join(", ")}).`);

const { HUNTERA_USERNAME: email, HUNTERA_PASSWORD: password } = process.env;
if (!email || !password) fail("Defina HUNTERA_USERNAME e HUNTERA_PASSWORD no .env.");

const rawDir = path.join(root, "fixtures/raw");
const outDir = path.join(root, "fixtures/sessions");
fs.mkdirSync(rawDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });
const rawStream = fs.createWriteStream(path.join(rawDir, `${name}.raw.jsonl`));
const cleanStream = fs.createWriteStream(path.join(outDir, `${name}.jsonl`));
const anonymize = args.anonymize ? createAnonymizer() : null;

cleanStream.write("// Fixture capturada com tools/capture-fixtures.mjs.\n");

const client = new HunteraClient();
await client.login(email, password);
const chars = await client.characters();
const char = chars.characters?.[0];
if (!char) fail("Nenhum personagem na conta.");
const ticket = await client.gameTicket(char.id);

const socket = new GameSocket({
  url: ticket.websocketUrl,
  ticket: ticket.ticket,
  headers: { Origin: "https://www.huntera.com.br" },
});

const t0 = Date.now();
let count = 0;
const byType = new Map();
let huntStarted = false;
let catalog = [];

const NOISE_TYPES = new Set([
  "scenario-terrain",
  "world-effect",
  "projectile-move",
  "creature-move",
  "pong"
]);

socket.onMessage(async (msg) => {
  const at = Date.now() - t0;
  count += 1;
  byType.set(msg.type, (byType.get(msg.type) ?? 0) + 1);

  // Grava no bruto (para auditoria)
  rawStream.write(JSON.stringify({ at, msg }) + "\n");

  // Ignora ruído massivo no arquivo sanitizado para manter replay rápido e leve
  if (NOISE_TYPES.has(msg.type)) return;

  let clean = sanitizeMessage(msg);
  if (anonymize) clean = anonymize(clean);

  cleanStream.write(JSON.stringify({ at, msg: clean }) + "\n");

  if (msg.type === "hunt-catalog" && Array.isArray(msg.hunts)) {
    catalog = msg.hunts;
    if (huntId && !huntStarted) {
      huntStarted = true;
      const found = catalog.find((h) => (h.id ?? h.huntId) === huntId);
      const huntName = found?.name ?? found?.displayName ?? huntId;
      const monsters = found?.monsters?.map((m) => m.name) ?? [];

      // Grava a chamada preparatória para a sessão em replay
      cleanStream.write(JSON.stringify({
        at: Date.now() - t0,
        call: "setHunt",
        args: [huntId, huntName, monsters],
      }) + "\n");

      console.log(`Iniciando caçada real: ${huntName} (ID: ${huntId}, Tier: ${tier})...`);
      socket.send({ type: "start-hunt", huntId, tier });
    }
  }
});

let stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  console.log("\nFinalizando captura de forma segura...");

  if (huntStarted) {
    try {
      console.log("Saindo da caçada (leave-hunt)...");
      socket.send({ type: "leave-hunt" });
      await new Promise((r) => setTimeout(r, 4000));
    } catch {}
  }

  try {
    socket.logout();
    await new Promise((r) => setTimeout(r, 400));
  } catch {}
  try {
    socket.close();
  } catch {}

  await Promise.all([
    new Promise((r) => rawStream.end(r)),
    new Promise((r) => cleanStream.end(r))
  ]);

  console.log(`\nCapturadas ${count} mensagens em ${((Date.now() - t0) / 1000).toFixed(0)}s.`);
  console.log([...byType.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([t, n]) => `  ${t}: ${n}`).join("\n"));
  console.log(`\nSaída sanitizada: fixtures/sessions/${name}.jsonl`);
  console.log(`Saída bruta: fixtures/raw/${name}.raw.jsonl`);
  process.exit(code);
}

process.once("SIGINT", () => void stop(0));
process.once("SIGTERM", () => void stop(0));

await socket.connect();
console.log(`Conectado. Duração planejada: ${seconds}s.`);
for (const p of probes) socket.send({ type: p });
setTimeout(() => void stop(0), seconds * 1000);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) out[key] = true;
    else { out[key] = next; i++; }
  }
  return out;
}
function loadEnv(file) {
  try {
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
  } catch {}
}
function fail(msg) { console.error(`Erro: ${msg}`); process.exit(1); }
