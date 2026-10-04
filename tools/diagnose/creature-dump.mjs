/**
 * creature-dump.mjs
 *
 * Script de diagnóstico puro: autentica, conecta, inicia "Rat Cellars" (hunt
 * mais simples e já validada) e captura TODOS os campos reais das mensagens
 * creature-appear e creature-disappear por 30 segundos.
 *
 * Saída: JSON por linha em stdout (redirectable). Sem impressão de credenciais.
 *
 * Uso:
 *   node src/creature-dump.mjs 2>/dev/null | head -100
 *   node src/creature-dump.mjs 2>/dev/null > /tmp/creatures.json
 */

import "node:process";
import fs from "node:fs";
import { HunteraClient } from "@idlex/huntera-client";
import { GameSocket } from "@idlex/protocol";

loadDotEnv();
const username = process.env.HUNTERA_USERNAME;
const password = process.env.HUNTERA_PASSWORD;
if (!username || !password) {
  process.stderr.write("Configure HUNTERA_USERNAME e HUNTERA_PASSWORD no .env\n");
  process.exit(1);
}

const OBSERVE_MS = parseInt(process.env.DUMP_DURATION ?? "30000", 10);
const HUNT_ID = process.env.DUMP_HUNT_ID ?? "rat-hunt";

process.stderr.write(`[creature-dump] Autenticando...\n`);
const client = new HunteraClient();
await client.login(username, password);
const chars = await client.characters();
const character = chars.characters?.[0];
if (!character) { process.stderr.write("Nenhum personagem encontrado.\n"); process.exit(1); }

process.stderr.write(`[creature-dump] Personagem: ${character.name}\n`);

const ticketResp = await client.gameTicket(character.id);
const socket = new GameSocket({
  url: ticketResp.websocketUrl,
  ticket: ticketResp.ticket,
  headers: { Origin: "https://www.huntera.com.br" },
});

// ── Estado de captura ──────────────────────────────────────────────────────
/** Contador de todas as mensagens creature-appear e creature-disappear */
let appearCount = 0;
let disappearCount = 0;

/**
 * Para cada creature-disappear recebida, guardamos:
 * - o payload completo do appear correspondente (se existir)
 * - o payload completo do disappear
 */
const events = [];
const appeared = new Map(); // id → payload completo do creature-appear

socket.onMessage((msg) => {
  if (msg.type === "creature-appear") {
    appearCount++;
    // Guarda TODOS os campos para análise
    if (msg.id !== undefined) appeared.set(msg.id, { ...msg });

  } else if (msg.type === "creature-disappear") {
    disappearCount++;
    const prior = msg.id !== undefined ? appeared.get(msg.id) : undefined;
    events.push({
      disappear: { ...msg },
      appear: prior ?? null,
      hadAppear: prior !== undefined,
    });
    if (msg.id !== undefined) appeared.delete(msg.id);
  }
});

await socket.connect();
process.stderr.write(`[creature-dump] Conectado. Aguardando hunt-catalog...\n`);

// Aguarda catalog
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error("Timeout hunt-catalog")), 15000);
  const off = socket.onMessage((m) => {
    if (m.type === "hunt-catalog") { clearTimeout(t); off(); resolve(); }
  });
});

process.stderr.write(`[creature-dump] Catálogo recebido. Iniciando ${HUNT_ID}...\n`);
socket.send({ type: "start-hunt", huntId: HUNT_ID, tier: 0 });

process.stderr.write(`[creature-dump] Observando por ${OBSERVE_MS / 1000}s...\n`);
await new Promise((r) => setTimeout(r, OBSERVE_MS));

// ── Relatório ──────────────────────────────────────────────────────────────

process.stderr.write(`\n[creature-dump] ── Resumo ──────────────────────────────\n`);
process.stderr.write(`  creature-appear recebidos : ${appearCount}\n`);
process.stderr.write(`  creature-disappear recebidos: ${disappearCount}\n`);
process.stderr.write(`  disappear COM appear prévio : ${events.filter((e) => e.hadAppear).length}\n`);
process.stderr.write(`  disappear SEM appear prévio : ${events.filter((e) => !e.hadAppear).length}\n`);
process.stderr.write(`[creature-dump] ────────────────────────────────────────\n`);

// Amostra: 5 primeiros de cada categoria para análise manual
const withAppear = events.filter((e) => e.hadAppear).slice(0, 5);
const withoutAppear = events.filter((e) => !e.hadAppear).slice(0, 3);

process.stderr.write(`\n[creature-dump] === 5 primeiros disappear COM appear prévio (todos os campos) ===\n`);
for (const ev of withAppear) {
  process.stderr.write(`\n  APPEAR  : ${JSON.stringify(ev.appear)}\n`);
  process.stderr.write(`  DISAPPEAR: ${JSON.stringify(ev.disappear)}\n`);
}

process.stderr.write(`\n[creature-dump] === até 3 disappear SEM appear prévio ===\n`);
for (const ev of withoutAppear) {
  process.stderr.write(`  DISAPPEAR (sem appear): ${JSON.stringify(ev.disappear)}\n`);
}

// Todos os eventos completos em stdout (JSON por linha) para análise posterior
for (const ev of events) {
  process.stdout.write(JSON.stringify(ev) + "\n");
}

process.stderr.write(`\n[creature-dump] ${events.length} eventos gravados em stdout.\n`);

socket.logout();
await new Promise((r) => setTimeout(r, 150));
socket.close();
process.exit(0);

// ── Helpers ────────────────────────────────────────────────────────────────

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
