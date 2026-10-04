/**
 * supply-dump.mjs
 *
 * Captura especificamente:
 * 1. hunt-analyzer-update (supplies, loot, waste) — precisa de mais tempo de hunt
 * 2. Mensagens com código DESCONHECIDO — pode ser supply-use, item-consume, etc.
 * 3. Decodifica RAW todos os frames para expor o código numérico, mesmo sem nome
 *
 * Uso:
 *   DUMP_DURATION=300000 node src/supply-dump.mjs 2>&1
 */

import "node:process";
import fs from "node:fs";
import { inflateRawSync } from "node:zlib";
import { HunteraClient } from "./huntera-client.mjs";
import { encodeMessage } from "./game-codec.mjs";

loadDotEnv();

const username = process.env.HUNTERA_USERNAME;
const password = process.env.HUNTERA_PASSWORD;
const OBSERVE_MS = parseInt(process.env.DUMP_DURATION ?? "300000", 10);
const HUNT_ID = process.env.DUMP_HUNT_ID ?? "rat-hunt";

if (!username || !password) {
  console.error("Configure HUNTERA_USERNAME e HUNTERA_PASSWORD no .env");
  process.exit(1);
}

// ── Constantes do codec ─────────────────────────────────────────────────────

const XOR_SEED = 1213550164;
const COMPRESSED = 1;
const BATCHED = 2;
const textDecoder = new TextDecoder();

const KNOWN_CODES = new Set([
  42, 47, 115, 46, 49, 40, 41, 77, 184, 30, 18, 15, 59,
  103, 80, 92, 73, 43, 126, 176, 54,
]);
const KNOWN_NAMES = {
  42: "hunt-catalog", 47: "hunt-pending", 115: "hunt-start-warning",
  46: "hunt-leave-pending", 49: "hunt-quick-sell-state", 40: "hunt-analyzer-session",
  41: "hunt-analyzer-update", 77: "player-stats", 184: "player-vitals",
  30: "experience-gain", 18: "creature-disappear", 15: "creature-appear",
  59: "loot-add", 103: "welcome", 80: "pong", 92: "system-message",
  73: "player-died", 43: "hunt-exit-rules", 126: "hunt-sell-rules",
  176: "hunt-favorites", 54: "instance-enter",
};

// ── Decoder RAW ─────────────────────────────────────────────────────────────

function xorInPlace(bytes, nonce) {
  let state = (nonce ^ XOR_SEED) >>> 0;
  if (state === 0) state = XOR_SEED;
  const full = bytes.length & -4;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = 0; offset < full; offset += 4) {
    state ^= state << 13; state >>>= 0;
    state ^= state >>> 17; state >>>= 0;
    state ^= state << 5;  state >>>= 0;
    view.setUint32(offset, view.getUint32(offset, true) ^ state, true);
  }
  if (full < bytes.length) {
    state ^= state << 13; state >>>= 0;
    state ^= state >>> 17; state >>>= 0;
    state ^= state << 5;  state >>>= 0;
    for (let offset = full; offset < bytes.length; offset++) {
      bytes[offset] ^= (state >>> ((offset & 3) << 3)) & 255;
    }
  }
}

function decodeRaw(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length < 5) return [];
  const nonce = (bytes[0] | bytes[1] << 8 | bytes[2] << 16 | bytes[3] << 24) >>> 0;
  const decrypted = new Uint8Array(bytes.subarray(4));
  xorInPlace(decrypted, nonce);
  const flags = decrypted[0];
  const results = [];

  if (flags & BATCHED) {
    let offset = 1;
    while (offset + 4 <= decrypted.length) {
      const len = (decrypted[offset] | decrypted[offset+1]<<8 | decrypted[offset+2]<<16 | decrypted[offset+3]<<24) >>> 0;
      offset += 4;
      if (offset + len > decrypted.length) break;
      results.push(...decodeRaw(decrypted.subarray(offset, offset + len)));
      offset += len;
    }
    return results;
  }

  let body = decrypted.subarray(1);
  if (flags & COMPRESSED) {
    try { body = new Uint8Array(inflateRawSync(body)); } catch { return []; }
  }
  try {
    const decoded = JSON.parse(textDecoder.decode(body));
    if (!Array.isArray(decoded) || decoded.length !== 2) return [];
    const [code, data] = decoded;
    return [{ code, data, known: KNOWN_CODES.has(code), name: KNOWN_NAMES[code] ?? null }];
  } catch { return []; }
}

// ── Coleta ──────────────────────────────────────────────────────────────────

const unknownCodes = new Map();
const analyzerUpdates = [];
const lootAdds = [];
let totalFrames = 0;
let startedAt = null;

const log = (m) => process.stderr.write(`[supply-dump] ${m}\n`);

// ── Main ─────────────────────────────────────────────────────────────────────

log(`=== Supply Dump — ${OBSERVE_MS / 1000}s | Hunt: ${HUNT_ID} ===`);

log("Autenticando...");
const client = new HunteraClient();
await client.login(username, password);

const chars = await client.characters();
const character = chars.characters?.[0];
if (!character) { log("Nenhum personagem."); process.exit(1); }
log(`Personagem: ${character.name} (lv ${character.level})`);

const ticketResp = await client.gameTicket(character.id);
log("Ticket obtido. Conectando...");

const { WebSocket } = await import("ws");
const ws = new WebSocket(ticketResp.websocketUrl, {
  headers: { Origin: "https://www.huntera.com.br" },
});
ws.binaryType = "arraybuffer";

// Listener principal — loga TUDO incluindo códigos desconhecidos
ws.on("message", (data) => {
  totalFrames++;
  for (const { code, data: body, known, name } of decodeRaw(data)) {
    if (!known) {
      if (!unknownCodes.has(code)) {
        unknownCodes.set(code, []);
        log(`🔴 CÓDIGO DESCONHECIDO: ${code} — body: ${JSON.stringify(body).slice(0, 400)}`);
      } else if (unknownCodes.get(code).length < 3) {
        log(`🔴 Código ${code} novamente: ${JSON.stringify(body).slice(0, 200)}`);
      }
      unknownCodes.get(code).push(body);
    }

    if (code === 41) { // hunt-analyzer-update
      analyzerUpdates.push(body);
      const elapsed = startedAt ? Math.round((Date.now() - startedAt) / 1000) : "?";
      log(`✅ hunt-analyzer-update #${analyzerUpdates.length} (${elapsed}s)`);
      log(`   waste=${body.waste} lootValue=${body.lootValue} kills=${body.kills} xp=${body.experience}`);
      log(`   supplies (${body.supplies?.length ?? 0}): ${JSON.stringify(body.supplies?.slice(0,2))}`);
      log(`   loot (${body.loot?.length ?? 0}): ${JSON.stringify(body.loot?.slice(0,2))}`);
      log(`   ALL FIELDS: ${JSON.stringify(Object.keys(body))}`);
    }

    if (code === 59) { // loot-add
      lootAdds.push(body);
      log(`📦 loot-add: ${JSON.stringify(body.item ?? body)}`);
    }
  }
});

// Handshake
await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error("timeout connect")), 15000);
  ws.once("open", () => {
    clearTimeout(timeout);
    ws.send(encodeMessage({ type: "authenticate", clientVersion: "0.3.0+e0", ticket: ticketResp.ticket }));
    setInterval(() => ws.send(encodeMessage({ type: "ping", t: performance.now() })), 5000);
    resolve();
  });
  ws.once("error", reject);
});
log("Conectado!");

// Aguarda catalog
log("Aguardando hunt-catalog...");
await new Promise((resolve) => {
  const h = (data) => {
    for (const { code } of decodeRaw(data)) {
      if (code === 42) { ws.off("message", h); resolve(); }
    }
  };
  ws.on("message", h);
});
log("Catálogo recebido. Iniciando hunt...");

ws.send(encodeMessage({ type: "start-hunt", huntId: HUNT_ID, tier: 0 }));
startedAt = Date.now();
log(`Hunt iniciada. Observando por ${OBSERVE_MS / 1000}s...`);
log("(hunt-analyzer-update chega tipicamente após 1-3 min)\n");

// Progress a cada 30s
const progressTimer = setInterval(() => {
  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  log(`[${elapsed}s] frames=${totalFrames} | analyzer-updates=${analyzerUpdates.length} | unknown=${unknownCodes.size} | loot-adds=${lootAdds.length}`);
}, 30000);

await sleep(OBSERVE_MS);
clearInterval(progressTimer);

// ── Relatório ─────────────────────────────────────────────────────────────

log("\n\n═══════════ RELATÓRIO FINAL ═══════════");
log(`Total frames: ${totalFrames}`);
log(`hunt-analyzer-update: ${analyzerUpdates.length}`);
log(`loot-add: ${lootAdds.length}`);
log(`Códigos desconhecidos: ${unknownCodes.size}`);

if (unknownCodes.size > 0) {
  log("\n🔴 CÓDIGOS DESCONHECIDOS ENCONTRADOS:");
  for (const [code, examples] of unknownCodes.entries()) {
    log(`  Código ${code} (${examples.length}x):`);
    log(`    Campos: ${JSON.stringify(Object.keys(examples[0] ?? {}))}`);
    log(`    Exemplo: ${JSON.stringify(examples[0]).slice(0, 500)}`);
  }
}

if (analyzerUpdates.length > 0) {
  log("\n✅ HUNT-ANALYZER-UPDATE — TODOS OS CAMPOS:");
  const last = analyzerUpdates[analyzerUpdates.length - 1];
  for (const [k, v] of Object.entries(last)) {
    const val = Array.isArray(v) ? `[${v.length} items] ${JSON.stringify(v).slice(0, 200)}` : JSON.stringify(v);
    log(`  ${k}: ${val}`);
  }

  // Supplies detalhados
  const allSupplies = analyzerUpdates.flatMap(u => u.supplies ?? []);
  const uniqueSupplies = new Map();
  for (const s of allSupplies) {
    const key = s.itemId ?? s.name;
    if (!uniqueSupplies.has(key)) uniqueSupplies.set(key, s);
    else {
      // merge para ver todos os campos possíveis
      for (const [fk, fv] of Object.entries(s)) {
        if (!(fk in uniqueSupplies.get(key))) uniqueSupplies.get(key)[fk] = fv;
      }
    }
  }
  log("\n  SUPPLIES (itens USADOS/GASTOS) — campos completos:");
  for (const s of uniqueSupplies.values()) {
    log(`    ${JSON.stringify(s)}`);
  }

  // Loot detalhado
  const allLoot = analyzerUpdates.flatMap(u => u.loot ?? []);
  const uniqueLoot = new Map();
  for (const l of allLoot) {
    const key = l.itemId ?? l.name;
    if (!uniqueLoot.has(key)) uniqueLoot.set(key, l);
  }
  log("\n  LOOT (itens DROPADOS) — campos completos:");
  for (const l of uniqueLoot.values()) {
    log(`    ${JSON.stringify(l)}`);
  }
} else {
  log("\n⚠️  hunt-analyzer-update NÃO chegou nesta sessão.");
  log("   O personagem pode não estar usando poções/runes.");
  log("   Ou o tempo foi insuficiente. Tente DUMP_DURATION=600000 (10min).");
}

// JSON para stdout
process.stdout.write(JSON.stringify({
  totalFrames,
  analyzerUpdateCount: analyzerUpdates.length,
  lootAddCount: lootAdds.length,
  unknownCodes: Object.fromEntries([...unknownCodes.entries()].map(([k,v]) => [k, v.slice(0,5)])),
  analyzerUpdates,
  lootAdds,
}, null, 2) + "\n");

try { ws.close(); } catch {}
process.exit(0);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function loadDotEnv() {
  try {
    const text = fs.readFileSync(new URL("../.env", import.meta.url), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (match && process.env[match[1]] === undefined)
        process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    }
  } catch {}
}
