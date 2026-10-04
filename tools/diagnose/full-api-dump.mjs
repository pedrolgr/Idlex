/**
 * full-api-dump.mjs
 *
 * Script de investigação completa da API Huntera.
 * Captura TODOS os campos de TODAS as mensagens WebSocket por 60 segundos
 * durante uma caçada ativa, e também testa todos os endpoints HTTP disponíveis.
 *
 * Uso:
 *   node src/full-api-dump.mjs 2>&1 | tee /tmp/api-dump.json
 */

import "node:process";
import fs from "node:fs";
import { HunteraClient } from "@idlex/huntera-client";
import { GameSocket } from "@idlex/protocol";

loadDotEnv();

const username = process.env.HUNTERA_USERNAME;
const password = process.env.HUNTERA_PASSWORD;
const OBSERVE_MS = parseInt(process.env.DUMP_DURATION ?? "60000", 10);
const HUNT_ID = process.env.DUMP_HUNT_ID ?? "rat-hunt";

if (!username || !password) {
  console.error("Configure HUNTERA_USERNAME e HUNTERA_PASSWORD no .env");
  process.exit(1);
}

// ── Coleta de dados ──────────────────────────────────────────────────────────

/** Guarda o schema completo de cada tipo de mensagem (union de todos os campos vistos) */
const messageSchemas = new Map(); // type → { fieldName → Set<typeof value> }
/** Guarda exemplos completos de cada tipo (primeiros 3) */
const messageExamples = new Map(); // type → object[]
/** Conta quantas vezes cada tipo chegou */
const messageCounts = new Map(); // type → number
/** Guarda todos os campos de player-stats */
let playerStatsAll = null;
/** Guarda todos os campos de player-vitals */
let playerVitalsAll = null;
/** Guarda o welcome completo */
let welcomeAll = null;
/** Guarda hunt-catalog completo (primeiro hunt de cada tipo) */
let catalogSample = null;
/** Guarda hunt-analyzer-update completo */
let analyzerUpdateAll = null;
/** Guarda hunt-analyzer-session completo */
let analyzerSessionAll = null;
/** Guarda hunt-pending completo */
let huntPendingAll = null;
/** Guarda hunt-quick-sell-state completo */
let quickSellStateAll = null;
/** Guarda hunt-exit-rules completo */
let exitRulesAll = null;
/** Guarda hunt-sell-rules completo */
let sellRulesAll = null;
/** Guarda hunt-favorites completo */
let favoritesAll = null;
/** Guarda instance-enter completo */
let instanceEnterAll = null;
/** Guarda system-message completo */
const systemMessages = [];
/** Guarda loot-add todos */
const lootAdds = [];
/** Guarda creature-appear (primeiros 10 de cada kind) */
const creaturesByKind = new Map(); // kind → object[]
/** Guarda experience-gain todos */
const experienceGains = [];
/** Guarda player-died todos */
const playerDiedAll = [];
/** Guarda mensagens desconhecidas (código não mapeado ainda) */
const unknownMessages = [];

function recordMessage(msg) {
  const type = msg.type ?? "UNKNOWN";
  messageCounts.set(type, (messageCounts.get(type) ?? 0) + 1);

  // Registra schema (todos os campos e tipos de valor)
  if (!messageSchemas.has(type)) messageSchemas.set(type, {});
  const schema = messageSchemas.get(type);
  for (const [key, val] of Object.entries(msg)) {
    if (!schema[key]) schema[key] = new Set();
    schema[key].add(Array.isArray(val) ? `array[${val.length}]` : typeof val);
  }

  // Guarda exemplos (primeiros 3)
  if (!messageExamples.has(type)) messageExamples.set(type, []);
  if (messageExamples.get(type).length < 3) {
    messageExamples.get(type).push(deepClone(msg));
  }

  // Coleta específica por tipo
  switch (type) {
    case "player-stats":
      if (!playerStatsAll) playerStatsAll = deepClone(msg);
      else playerStatsAll = mergeObjects(playerStatsAll, msg);
      break;
    case "player-vitals":
      if (!playerVitalsAll) playerVitalsAll = deepClone(msg);
      else playerVitalsAll = mergeObjects(playerVitalsAll, msg);
      break;
    case "welcome":
      if (!welcomeAll) welcomeAll = deepClone(msg);
      break;
    case "hunt-catalog":
      if (!catalogSample) catalogSample = deepClone(msg);
      break;
    case "hunt-analyzer-update":
      if (!analyzerUpdateAll) analyzerUpdateAll = deepClone(msg);
      else analyzerUpdateAll = mergeObjects(analyzerUpdateAll, msg);
      break;
    case "hunt-analyzer-session":
      if (!analyzerSessionAll) analyzerSessionAll = deepClone(msg);
      else analyzerSessionAll = mergeObjects(analyzerSessionAll, msg);
      break;
    case "hunt-pending":
      if (!huntPendingAll) huntPendingAll = deepClone(msg);
      else huntPendingAll = mergeObjects(huntPendingAll, msg);
      break;
    case "hunt-quick-sell-state":
      if (!quickSellStateAll) quickSellStateAll = deepClone(msg);
      else quickSellStateAll = mergeObjects(quickSellStateAll, msg);
      break;
    case "hunt-exit-rules":
      exitRulesAll = deepClone(msg);
      break;
    case "hunt-sell-rules":
      sellRulesAll = deepClone(msg);
      break;
    case "hunt-favorites":
      favoritesAll = deepClone(msg);
      break;
    case "instance-enter":
      instanceEnterAll = deepClone(msg);
      break;
    case "system-message":
      systemMessages.push(deepClone(msg));
      break;
    case "loot-add":
      lootAdds.push(deepClone(msg));
      break;
    case "creature-appear": {
      const kind = msg.creature?.kind ?? msg.kind ?? "unknown";
      if (!creaturesByKind.has(kind)) creaturesByKind.set(kind, []);
      if (creaturesByKind.get(kind).length < 3) {
        creaturesByKind.get(kind).push(deepClone(msg));
      }
      break;
    }
    case "experience-gain":
      experienceGains.push(deepClone(msg));
      break;
    case "player-died":
      playerDiedAll.push(deepClone(msg));
      break;
  }
}

// ── HTTP Endpoints ───────────────────────────────────────────────────────────

const log = (msg) => process.stderr.write(`[dump] ${msg}\n`);

log("=== Huntera Full API Dump ===");
log(`Duração: ${OBSERVE_MS / 1000}s | Hunt: ${HUNT_ID}`);
log("");

log("1. Autenticando...");
const client = new HunteraClient();
await client.login(username, password);
log("   ✔ Login OK");

log("2. GET /api/auth/me");
const meData = await client.me();
log(`   ✔ Campos: ${Object.keys(meData).join(", ")}`);

log("3. GET /api/characters");
const charsData = await client.characters();
const character = charsData.characters?.[0];
log(`   ✔ Campos da resposta: ${Object.keys(charsData).join(", ")}`);
log(`   ✔ Campos de cada personagem: ${Object.keys(character ?? {}).join(", ")}`);

// Tenta endpoints extras (especulativos - vamos ver o que existe)
log("4. Testando endpoints HTTP especulativos...");
const extraEndpoints = [
  "/api/friends",
  "/api/friend-requests",
  "/api/party",
  "/api/party/invites",
  "/api/store",
  "/api/leaderboard",
  "/api/achievements",
  "/api/rankings",
  "/api/profile",
  "/api/notifications",
  "/api/inventory",
  "/api/market",
  "/api/shop",
  "/api/guilds",
  "/api/guild",
  "/api/social",
  "/api/chat",
  "/api/inbox",
  "/api/players",
  "/api/settings",
  "/api/preferences",
  "/api/config",
  "/api/announcements",
  "/api/news",
  "/api/events",
  "/api/quests",
  "/api/tasks",
  "/api/daily",
  "/api/premium",
  "/api/subscription",
  "/api/payments",
];

const httpResults = { found: [], notFound: [], error: [] };
for (const ep of extraEndpoints) {
  try {
    const result = await client.request(ep);
    httpResults.found.push({ endpoint: ep, fields: Object.keys(result ?? {}) });
    log(`   ✅ ENCONTRADO: ${ep} → ${JSON.stringify(Object.keys(result ?? {}))}`);
  } catch (err) {
    if (err.status === 404 || err.status === 405) {
      httpResults.notFound.push({ endpoint: ep, status: err.status });
    } else if (err.status === 401 || err.status === 403) {
      httpResults.found.push({ endpoint: ep, note: "EXISTS (auth required)" });
      log(`   🔒 EXISTE (auth): ${ep} → ${err.status}`);
    } else {
      httpResults.error.push({ endpoint: ep, error: err.message, status: err.status });
    }
  }
}

// ── WebSocket ────────────────────────────────────────────────────────────────

log("\n5. Obtendo ticket WebSocket...");
const ticketResp = await client.gameTicket(character.id);
log("   ✔ Ticket obtido");

log("6. Conectando ao WebSocket...");
const socket = new GameSocket({
  url: ticketResp.websocketUrl,
  ticket: ticketResp.ticket,
  headers: { Origin: "https://www.huntera.com.br" },
});

socket.onMessage((msg) => recordMessage(msg));

await socket.connect();
log("   ✔ Conectado\n");

// Aguarda catalog
log("7. Aguardando hunt-catalog...");
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error("Timeout hunt-catalog")), 15000);
  const off = socket.onMessage((m) => {
    if (m.type === "hunt-catalog") { clearTimeout(t); off(); resolve(); }
  });
});
log(`   ✔ Catálogo recebido: ${catalogSample?.hunts?.length ?? 0} hunts`);

// Inicia hunt
log(`8. Iniciando hunt: ${HUNT_ID}...`);
socket.send({ type: "start-hunt", huntId: HUNT_ID, tier: 0 });

// Aguarda hunt-pending
await new Promise((resolve, reject) => {
  const t = setTimeout(resolve, 5000);
  const off = socket.onMessage((m) => {
    if (m.type === "hunt-pending") { clearTimeout(t); off(); resolve(); }
  });
});
log("   ✔ Hunt iniciada");

// Testa mensagens de leitura (não-destrutivas)
log("9. Testando envio de mensagens de diagnóstico...");

// Testar reset do analyzer (baixo risco)
log("   → Enviando hunt-analyzer-reset...");
try {
  socket.send({ type: "hunt-analyzer-reset" });
  log("     ✔ Enviado com sucesso");
} catch (e) {
  log(`     ✗ Erro: ${e.message}`);
}

await sleep(2000);

log(`\n10. Observando por ${OBSERVE_MS / 1000}s...\n`);
await sleep(OBSERVE_MS);

// Encerra
log("11. Encerrando...");
socket.logout();
await sleep(200);
socket.close();

// ── RELATÓRIO FINAL ──────────────────────────────────────────────────────────

const report = {
  capturedAt: new Date().toISOString(),
  observeDurationMs: OBSERVE_MS,
  huntId: HUNT_ID,

  httpEndpoints: {
    tested: extraEndpoints.length,
    found: httpResults.found,
    notFound: httpResults.notFound.length,
    errors: httpResults.error,
  },

  httpKnownEndpoints: {
    "GET /api/auth/me": {
      fields: Object.keys(meData),
      sample: sanitize(meData),
    },
    "GET /api/characters": {
      responseFields: Object.keys(charsData),
      characterFields: Object.keys(character ?? {}),
      characterSample: sanitize(character ?? {}),
    },
  },

  websocketMessages: {
    totalTypes: messageCounts.size,
    countByType: Object.fromEntries([...messageCounts.entries()].sort((a, b) => b[1] - a[1])),
    schemaByType: Object.fromEntries(
      [...messageSchemas.entries()].map(([type, schema]) => [
        type,
        Object.fromEntries(Object.entries(schema).map(([k, v]) => [k, [...v]])),
      ])
    ),
  },

  detailedPayloads: {
    welcome: sanitize(welcomeAll),
    playerStats: sanitize(playerStatsAll),
    playerVitals: sanitize(playerVitalsAll),
    huntPending: sanitize(huntPendingAll),
    huntAnalyzerSession: sanitize(analyzerSessionAll),
    huntAnalyzerUpdate: sanitize(analyzerUpdateAll),
    huntQuickSellState: sanitize(quickSellStateAll),
    huntExitRules: sanitize(exitRulesAll),
    huntSellRules: sanitize(sellRulesAll),
    huntFavorites: sanitize(favoritesAll),
    instanceEnter: sanitize(instanceEnterAll),
    catalogFirstHunt: sanitize(catalogSample?.hunts?.[0]),
    catalogFieldsUnion: catalogSample?.hunts
      ? [...new Set(catalogSample.hunts.flatMap((h) => Object.keys(h)))]
      : [],
  },

  creaturesByKind: Object.fromEntries(
    [...creaturesByKind.entries()].map(([kind, arr]) => [kind, arr.map(sanitize)])
  ),

  lootAdds: lootAdds.slice(0, 10).map(sanitize),
  lootAddCount: lootAdds.length,
  experienceGains: experienceGains.slice(0, 5).map(sanitize),
  experienceGainCount: experienceGains.length,
  systemMessages: systemMessages.map(sanitize),
  playerDeaths: playerDiedAll.map(sanitize),

  messageExamples: Object.fromEntries(
    [...messageExamples.entries()].map(([type, examples]) => [type, examples.map(sanitize)])
  ),
};

process.stdout.write(JSON.stringify(report, null, 2) + "\n");
log("\n✔ Dump completo gravado em stdout");

// ── Helpers ──────────────────────────────────────────────────────────────────

function sanitize(obj) {
  if (!obj) return null;
  const str = JSON.stringify(obj);
  // Remove campos sensíveis por nome (ticket, password, cookie, token)
  return JSON.parse(str.replace(/"(ticket|password|token|cookie|secret)":\s*"[^"]*"/gi, '"$1":"[REDACTED]"'));
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function mergeObjects(a, b) {
  const result = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (!(k in result) || result[k] === null || result[k] === undefined) {
      result[k] = v;
    }
  }
  return result;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadDotEnv() {
  try {
    const text = fs.readFileSync(new URL("../.env", import.meta.url), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (match && process.env[match[1]] === undefined) {
        process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
      }
    }
  } catch {}
}
