import "node:process";
import fs from "node:fs";
import readline from "node:readline/promises";
import readlineCb from "node:readline";
import { HunteraClient } from "./huntera-client.mjs";
import { GameSocket } from "./game-socket.mjs";
import { HuntSession, searchHunts, parseHuntTier } from "./hunt-session.mjs";

loadDotEnv();

const username = process.env.HUNTERA_USERNAME;
const password = process.env.HUNTERA_PASSWORD;
if (!username || !password) {
  die("Configure HUNTERA_USERNAME e HUNTERA_PASSWORD no arquivo .env antes de executar.");
}

const huntTier = parseHuntTier(process.env.HUNTERA_HUNT_TIER);
const session = new HuntSession({ tier: huntTier });

let socket = null;
let cleanupStarted = false;
let statusTimer = null;
let isRunning = true;

// Handlers de encerramento seguro
process.once("SIGINT", () => void cleanupAndExit(0));
process.once("SIGTERM", () => void cleanupAndExit(0));

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("   Huntera Direct Client — Caçadas CLI");
  console.log("═══════════════════════════════════════════\n");

  // Fase 1 — Autenticação HTTP
  console.log("⏳ Autenticando...");
  const client = new HunteraClient();
  await client.login(username, password);
  const characters = await client.characters();
  const character = characters.characters?.[0];
  if (!character) die("Nenhum personagem encontrado na conta.");

  console.log(`✔  Personagem: ${character.name} (nível ${character.level}, ${character.vocation})\n`);

  // Fase 1b — Ticket e conexão WebSocket
  console.log("⏳ Obtendo ticket de jogo...");
  const ticket = await client.gameTicket(character.id);
  const wsOrigin = safeWsUrl(ticket.websocketUrl);
  console.log(`✔  Endpoint WebSocket: ${wsOrigin}\n`);

  console.log("⏳ Conectando ao servidor...");
  socket = new GameSocket({
    url: ticket.websocketUrl,
    ticket: ticket.ticket,
    headers: { Origin: "https://www.huntera.com.br" },
  });

  socket.onMessage((msg) => session.handleMessage(msg));
  await socket.connect();
  console.log("✔  Conectado.\n");

  // Fase 2 — Catálogo de caçadas
  console.log("⏳ Aguardando catálogo de caçadas...");
  const catalog = await waitForCatalog(socket, 15000);
  console.log(`✔  Catálogo recebido: ${catalog.length} caçadas disponíveis.\n`);

  // Loop contínuo: permite selecionar hunt, jogar, sair e escolher outra
  while (isRunning) {
    const chosen = await selectHunt(catalog);
    if (!chosen) {
      console.log("\nNenhuma caçada selecionada. Encerrando.");
      await cleanupAndExit(0);
      return;
    }

    const huntId = chosen.id ?? chosen.huntId;
    const huntName = chosen.name ?? chosen.displayName ?? huntId;
    const validMonsters = chosen.monsters?.map((m) => m.name) ?? [];
    session.setHunt(huntId, huntName, validMonsters);

    console.log(`\n🎯 Entrando na caçada: ${huntName} (id=${huntId}, tier=${huntTier})\n`);
    socket.send({ type: "start-hunt", huntId, tier: huntTier });

    // Loop de monitoramento interativo durante a hunt
    await runHuntLoop(socket, session);

    if (isRunning) {
      console.log("══════════════════════════════════════════════════════════════");
      console.log("   Selecione sua próxima caçada:");
      console.log("══════════════════════════════════════════════════════════════\n");
    }
  }
}

/**
 * Loop interativo durante a execução de uma caçada.
 * Suporta teclas diretas (sem precisar de Enter se for TTY):
 * - 'l': sair da caçada atual e voltar ao catálogo com contagem regressiva
 * - 'd': alternar visão detalhada de drops e suprimentos
 * - 'q': encerrar sessão
 * @param {GameSocket} sock
 * @param {HuntSession} sess
 */
async function runHuntLoop(sock, sess) {
  sess.renderStatus(process.stdout);
  statusTimer = setInterval(() => {
    if (sess.huntActive) {
      sess.renderStatus(process.stdout);
    }
  }, 2500);

  return new Promise((resolve) => {
    let leaveTriggered = false;

    const stopTrackingAndResolve = async () => {
      if (statusTimer) {
        clearInterval(statusTimer);
        statusTimer = null;
      }
      removeListeners();
      resolve();
    };

    const handleLeave = async () => {
      if (leaveTriggered) return;
      leaveTriggered = true;

      if (statusTimer) {
        clearInterval(statusTimer);
        statusTimer = null;
      }
      removeListeners();

      process.stdout.write("\n");
      await countdownLeave(sock, sess, 5);
      resolve();
    };

    const handleToggleDetails = () => {
      sess.toggleDetails();
      sess.renderStatus(process.stdout);
    };

    const handleQuit = async () => {
      removeListeners();
      await cleanupAndExit(0);
      resolve();
    };

    // Configuração de entrada pelo terminal
    if (process.stdin.isTTY) {
      readlineCb.emitKeypressEvents(process.stdin);
      process.stdin.setRawMode(true);
      process.stdin.resume();

      const onKeypress = (str, key) => {
        if (!key) return;

        if (key.ctrl && key.name === "c") {
          void handleQuit();
          return;
        }

        const ch = (key.sequence || key.name || "").toLowerCase();
        if (ch === "l") {
          void handleLeave();
        } else if (ch === "d") {
          handleToggleDetails();
        } else if (ch === "q") {
          void handleQuit();
        }
      };

      process.stdin.on("keypress", onKeypress);

      var removeListeners = () => {
        process.stdin.removeListener("keypress", onKeypress);
        try {
          if (process.stdin.isTTY) process.stdin.setRawMode(false);
          process.stdin.pause();
        } catch {}
      };
    } else {
      // Modo não-TTY (fallback com readline)
      const rlNonTty = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const checkCommand = async () => {
        while (sess.huntActive && !leaveTriggered) {
          let line = "";
          try {
            line = (await rlNonTty.question("")).trim().toLowerCase();
          } catch {
            break;
          }
          if (line === "l" || line === "leave" || line === "sair") {
            rlNonTty.close();
            await handleLeave();
            return;
          } else if (line === "d" || line === "details") {
            handleToggleDetails();
          } else if (line === "q" || line === "quit") {
            rlNonTty.close();
            await handleQuit();
            return;
          }
        }
      };

      void checkCommand();

      var removeListeners = () => {
        try {
          rlNonTty.close();
        } catch {}
      };
    }
  });
}

/**
 * Executa o desengajamento da caçada com contagem regressiva visível.
 * @param {GameSocket} sock
 * @param {HuntSession} sess
 * @param {number} seconds
 */
async function countdownLeave(sock, sess, seconds = 5) {
  try {
    sock.send({ type: "leave-hunt" });
  } catch {}

  for (let s = seconds; s > 0; s--) {
    process.stdout.write(`\r🚪 Desengajando da caçada em ${s}s...   `);
    await sleep(1000);
  }

  process.stdout.write(`\r✔  Você saiu da caçada e voltou à cidade!       \n\n`);
  sess.resetSession();
  await sleep(300);
}

/**
 * Aguarda a primeira mensagem `hunt-catalog` por até `timeoutMs` milissegundos.
 * @param {GameSocket} sock
 * @param {number} timeoutMs
 * @returns {Promise<object[]>}
 */
function waitForCatalog(sock, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Timeout aguardando hunt-catalog. Verifique a conexão.")),
      timeoutMs,
    );
    const unsub = sock.onMessage((msg) => {
      if (msg.type === "hunt-catalog" && Array.isArray(msg.hunts)) {
        clearTimeout(timer);
        unsub();
        resolve(msg.hunts);
      }
    });
  });
}

/**
 * Exibe o catálogo e coleta a seleção do usuário via readline limpo.
 * @param {object[]} catalog
 * @returns {Promise<object|null>}
 */
async function selectHunt(catalog) {
  printTopHunts(catalog.slice(0, 10));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    while (true) {
      let query;
      try {
        query = (await rl.question('🔍 Escolha a caçada (nome, ID ou número 1-10, ou "q" para sair): ')).trim();
      } catch {
        return null;
      }

      if (query.toLowerCase() === "q" || query === "") return null;

      // Seleção direta por número (1 a 10)
      const num = parseInt(query, 10);
      if (!Number.isNaN(num) && num >= 1 && num <= 10) {
        const hunt = catalog[num - 1];
        console.log(`   ✔  Selecionado: ${hunt.name ?? hunt.displayName ?? hunt.id}\n`);
        return hunt;
      }

      const matches = searchHunts(catalog, query);

      if (matches.length === 0) {
        console.log(`   ❌ Nenhuma caçada encontrada para "${query}". Tente novamente.\n`);
        continue;
      }

      if (matches.length === 1) {
        const hunt = matches[0];
        console.log(`   ✔  Selecionado: ${hunt.name ?? hunt.displayName ?? hunt.id}\n`);
        return hunt;
      }

      console.log(`\n   Encontradas ${matches.length} caçadas correspondentes:\n`);
      matches.forEach((h, i) => {
        const label = h.name ?? h.displayName ?? h.id;
        const id = h.id ?? h.huntId ?? "?";
        console.log(`   [${i + 1}] ${label} (id: ${id})`);
      });
      console.log();

      let idx;
      try {
        const raw = (await rl.question(`   Escolha o número (1–${matches.length}), ou "q" para cancelar: `)).trim();
        if (raw.toLowerCase() === "q" || raw === "") return null;
        idx = parseInt(raw, 10);
      } catch {
        return null;
      }

      if (Number.isNaN(idx) || idx < 1 || idx > matches.length) {
        console.log("   ❌ Número inválido. Tente novamente.\n");
        continue;
      }

      const hunt = matches[idx - 1];
      console.log(`   ✔  Selecionado: ${hunt.name ?? hunt.displayName ?? hunt.id}\n`);
      return hunt;
    }
  } finally {
    rl.close();
  }
}

/**
 * Imprime as primeiras hunts do catálogo no terminal numeradas de 1 a 10.
 * @param {object[]} hunts
 */
function printTopHunts(hunts) {
  console.log("── Primeiras caçadas disponíveis ──────────────────────────────");
  hunts.forEach((hunt, i) => {
    const id = hunt.id ?? hunt.huntId ?? "?";
    const name = hunt.name ?? hunt.displayName ?? "?";
    const tierInfo = hunt.tier !== undefined ? ` | tier=${hunt.tier}` : "";
    const levelReq = hunt.requiredLevel !== undefined ? ` | nível mín.=${hunt.requiredLevel}` : "";
    console.log(`  [${i + 1}] ${name} (id: ${id})${tierInfo}${levelReq}`);
  });
  console.log("────────────────────────────────────────────────────────────────\n");
}

/**
 * Encerra a sessão de forma idempotente e segura.
 * @param {number} code
 */
async function cleanupAndExit(code) {
  if (cleanupStarted) return;
  cleanupStarted = true;
  isRunning = false;

  if (session.huntId) process.stdout.write("\n");

  if (statusTimer) {
    clearInterval(statusTimer);
    statusTimer = null;
  }

  try {
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
  } catch {}

  console.log("\n⏹  Encerrando sessão...");

  try {
    socket?.logout();
    await sleep(150);
  } catch {}

  try {
    socket?.close();
  } catch {}

  process.exit(code);
}

function safeWsUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return "[URL inválida]";
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function die(msg) {
  console.error(`\n❌ ${msg}`);
  process.exit(1);
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

main().catch((err) => {
  console.error("\n❌ Erro inesperado:", err.message);
  cleanupAndExit(1);
});
