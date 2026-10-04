/**
 * mummy-dump.mjs
 *
 * Executa uma caçada real nas Mummies (Burial Chambers / mummy-hunt)
 * e monitora detalhadamente:
 * - Drops de loot (loot-add, item-on-ground)
 * - Mudanças no inventário e consumo de suprimentos (código 55 inventory-update)
 * - Dano e combate (creature-hit, creature-health, player-vitals, spells)
 * - Progresso do bestiário de Mummy
 * - Hunt analyzer (se emitido) e todos os códigos de mensagens
 */

import "node:process";
import fs from "node:fs";
import { inflateRawSync } from "node:zlib";
import { HunteraClient } from "@idlex/huntera-client";
import { encodeMessage } from "@idlex/protocol";

loadDotEnv();

const username = process.env.HUNTERA_USERNAME;
const password = process.env.HUNTERA_PASSWORD;
const OBSERVE_MS = parseInt(process.env.DUMP_DURATION ?? "120000", 10); // default 2 min
const HUNT_ID = "mummy-hunt";
const TIER = parseInt(process.env.HUNTERA_HUNT_TIER ?? "0", 10);

if (!username || !password) {
  console.error("Configure HUNTERA_USERNAME e HUNTERA_PASSWORD no .env");
  process.exit(1);
}

const XOR_SEED = 1213550164;
const COMPRESSED = 1;
const BATCHED = 2;
const textDecoder = new TextDecoder();

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
    return [{ code: decoded[0], data: decoded[1] }];
  } catch { return []; }
}

const log = (m) => process.stderr.write(`[mummy-hunt] ${m}\n`);

log(`=======================================================`);
log(`   INICIANDO CAÇADA NAS MUMMIES (${HUNT_ID})`);
log(`   Duração: ${OBSERVE_MS / 1000}s | Tier: ${TIER}`);
log(`=======================================================\n`);

const client = new HunteraClient();
await client.login(username, password);
const chars = await client.characters();
const character = chars.characters?.[0];
log(`✔ Personagem: ${character.name} (Nível ${character.level}, ${character.vocation})`);

const ticketResp = await client.gameTicket(character.id);
const { WebSocket } = await import("ws");
const ws = new WebSocket(ticketResp.websocketUrl, {
  headers: { Origin: "https://www.huntera.com.br" },
});
ws.binaryType = "arraybuffer";

// Estatísticas da sessão
const stats = {
  mummyKills: 0,
  xpGained: 0,
  damageDealt: 0,
  damageTaken: 0,
  spellsCast: [],
  inventoryChanges: [],
  lootedItems: [],
  lastVitals: null,
  initialGold: null,
  latestGold: null,
  bestiaryMummy: null,
  analyzerUpdates: [],
  rawCodesSeen: new Map(),
};

ws.on("message", (data) => {
  for (const { code, data: body } of decodeRaw(data)) {
    stats.rawCodesSeen.set(code, (stats.rawCodesSeen.get(code) ?? 0) + 1);

    // 184: player-vitals
    if (code === 184) {
      stats.lastVitals = body;
    }

    // 30: experience-gain
    if (code === 30 && typeof body.value === "number") {
      stats.xpGained += body.value;
      log(`⭐ Ganhou +${body.value} XP! (Total: ${stats.xpGained})`);
    }

    // 20: creature-hit
    if (code === 20) {
      if (body.targetId !== character.id && body.attackerId) {
        stats.damageDealt += body.value;
      } else if (body.targetId === character.id) {
        stats.damageTaken += body.value;
        log(`🩸 Tomou ${body.value} de dano da Mummy! (HP: ${stats.lastVitals?.health}/${stats.lastVitals?.maxHealth})`);
      }
    }

    // 24: creature-speech / spell
    if (code === 24 && body.kind === "spell") {
      stats.spellsCast.push(body);
      log(`✨ Magia usada: "${body.text}" (${body.spellId})`);
    }

    // 55: inventory-update (alteração de itens, poções gastas, etc)
    if (code === 55) {
      if (stats.initialGold === null && typeof body.gold === "number") {
        stats.initialGold = body.gold;
      }
      if (typeof body.gold === "number") {
        stats.latestGold = body.gold;
      }
      if (Array.isArray(body.changes) && body.changes.length > 0) {
        for (const ch of body.changes) {
          stats.inventoryChanges.push(ch);
          log(`🎒 Inventário atualizado: ${ch.container}[${ch.index}] -> ${ch.item?.name} x${ch.item?.count}`);
        }
      }
    }

    // 59: loot-add (drop direto recebido)
    if (code === 59) {
      const it = body.item ?? body;
      stats.lootedItems.push(it);
      log(`🎁 LOOT DROP: ${it.name} (x${it.count || 1}) [Item ID: ${it.itemId}]`);
    }

    // 60: item-on-ground (drop no chão)
    if (code === 60) {
      const it = body.item ?? body;
      stats.lootedItems.push(it);
      log(`📦 DROP NO CHÃO: ${it.name} (x${it.count || 1}) [Item ID: ${it.itemId}]`);
    }

    // 9: bestiary-update
    if (code === 9 && body.kills) {
      if (body.kills.mummy !== undefined) {
        const prev = stats.bestiaryMummy;
        stats.bestiaryMummy = body.kills.mummy;
        if (prev !== null && prev !== body.kills.mummy) {
          stats.mummyKills++;
          log(`💀 Mummy DERROTADA! Total no bestiário: ${body.kills.mummy}`);
        }
      }
    }

    // 41: hunt-analyzer-update
    if (code === 41) {
      stats.analyzerUpdates.push(body);
      log(`📊 HUNT ANALYZER UPDATE: waste=${body.waste} | lootValue=${body.lootValue} | kills=${body.kills}`);
      if (body.supplies?.length) {
        log(`   Supplies usados: ${JSON.stringify(body.supplies)}`);
      }
      if (body.loot?.length) {
        log(`   Loot acumulado: ${JSON.stringify(body.loot)}`);
      }
    }
  }
});

// Conexão
await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error("Timeout connect")), 15000);
  ws.once("open", () => {
    clearTimeout(timeout);
    ws.send(encodeMessage({ type: "authenticate", clientVersion: "0.3.0+e0", ticket: ticketResp.ticket }));
    setInterval(() => ws.send(encodeMessage({ type: "ping", t: performance.now() })), 5000);
    resolve();
  });
  ws.once("error", reject);
});
log("✔ Conectado ao GameSocket");

// Aguarda catálogo
await new Promise((resolve) => {
  const h = (data) => {
    for (const { code } of decodeRaw(data)) {
      if (code === 42) { ws.off("message", h); resolve(); }
    }
  };
  ws.on("message", h);
});
log("✔ Catálogo recebido");

// Envia start-hunt para Mummy
log(`🚀 Enviando start-hunt: huntId="${HUNT_ID}", tier=${TIER}...`);
ws.send(encodeMessage({ type: "start-hunt", huntId: HUNT_ID, tier: TIER }));
const startTime = Date.now();

// Aguarda a duração solicitada
await new Promise((r) => setTimeout(r, OBSERVE_MS));

// Desengajamento limpo
log("\n🚪 Saindo da caçada...");
try {
  ws.send(encodeMessage({ type: "leave-hunt" }));
  await new Promise((r) => setTimeout(r, 5200));
} catch {}

try {
  ws.send(encodeMessage({ type: "logout" }));
  await new Promise((r) => setTimeout(r, 200));
  ws.close();
} catch {}

log("\n=======================================================");
log("              RELATÓRIO DA CAÇADA: MUMMY               ");
log("=======================================================");
log(`⏱ Duração: ${Math.round((Date.now() - startTime) / 1000)}s`);
log(`💀 Mummies derrotadas: ${stats.mummyKills}`);
log(`⭐ XP acumulada: ${stats.xpGained.toLocaleString("pt-BR")}`);
log(`⚔️ Dano causado: ${stats.damageDealt} | Dano recebido: ${stats.damageTaken}`);
log(`🩸 HP final: ${stats.lastVitals?.health}/${stats.lastVitals?.maxHealth} | Mana: ${stats.lastVitals?.mana}/${stats.lastVitals?.maxMana}`);

const goldDiff = (stats.latestGold ?? 0) - (stats.initialGold ?? 0);
log(`💰 Variação de Ouro: ${goldDiff >= 0 ? "+" : ""}${goldDiff} gp (Total: ${stats.latestGold})`);

log(`\n🎁 Drops coletados (${stats.lootedItems.length}):`);
if (stats.lootedItems.length === 0) {
  log("   (Nenhum drop registrado)");
} else {
  for (const it of stats.lootedItems) {
    log(`   • ${it.name} x${it.count || 1} (id: ${it.itemId})`);
  }
}

log(`\n🎒 Mudanças de inventário (${stats.inventoryChanges.length}):`);
for (const ch of stats.inventoryChanges) {
  log(`   • ${ch.container}: ${ch.item?.name} x${ch.item?.count}`);
}

log(`\n✨ Magias usadas: ${stats.spellsCast.length}`);
const spellCounts = {};
for (const s of stats.spellsCast) {
  spellCounts[s.text] = (spellCounts[s.text] || 0) + 1;
}
for (const [sp, c] of Object.entries(spellCounts)) {
  log(`   • "${sp}": ${c}x`);
}

if (stats.analyzerUpdates.length > 0) {
  log(`\n📊 Analyzer updates recebidos: ${stats.analyzerUpdates.length}`);
  const lastAn = stats.analyzerUpdates[stats.analyzerUpdates.length - 1];
  log(`   Waste: ${lastAn.waste} | LootValue: ${lastAn.lootValue}`);
  log(`   Supplies: ${JSON.stringify(lastAn.supplies)}`);
}

// Salva JSON completo em stdout
process.stdout.write(JSON.stringify(stats, null, 2) + "\n");
process.exit(0);

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
