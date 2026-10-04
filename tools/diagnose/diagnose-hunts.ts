import fs from "node:fs";
import path from "node:path";
import readlineCb from "node:readline";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";
import {
  HuntSession,
  parseHuntTier,
  searchHunts,
} from "@idlex/game-core";
import { HunteraClient } from "@idlex/huntera-client";
import { GameSocket, type CatalogHunt } from "@idlex/protocol";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadDotEnv();

const username = process.env.HUNTERA_USERNAME;
const password = process.env.HUNTERA_PASSWORD;
if (!username || !password) {
  die("Configure HUNTERA_USERNAME e HUNTERA_PASSWORD no arquivo .env antes de executar.");
}

const huntTier = parseHuntTier(process.env.HUNTERA_HUNT_TIER);
const session = new HuntSession({ tier: huntTier });

let socket: GameSocket | null = null;
let cleanupStarted = false;
let statusTimer: NodeJS.Timeout | null = null;
let isRunning = true;

process.once("SIGINT", () => void cleanupAndExit(0));
process.once("SIGTERM", () => void cleanupAndExit(0));

async function main(): Promise<void> {
  console.log("═══════════════════════════════════════════");
  console.log("   Huntera Direct Client — Caçadas CLI");
  console.log("═══════════════════════════════════════════\n");

  console.log("⏳ Autenticando...");
  const client = new HunteraClient();
  await client.login(username!, password!);
  const characters = await client.characters();
  const character = characters.characters?.[0];
  if (!character) die("Nenhum personagem encontrado na conta.");

  console.log(`✔  Personagem: ${character.name} (nível ${character.level}, ${character.vocation})\n`);

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

  console.log("⏳ Aguardando catálogo de caçadas...");
  const catalog = await waitForCatalog(socket, 15000);
  console.log(`✔  Catálogo recebido: ${catalog.length} caçadas disponíveis.\n`);

  while (isRunning) {
    const chosen = await selectHunt(catalog);
    if (!chosen) {
      console.log("\nNenhuma caçada selecionada. Encerrando.");
      await cleanupAndExit(0);
      return;
    }

    const huntId = (chosen as any).id ?? (chosen as any).huntId;
    const huntName = (chosen as any).name ?? (chosen as any).displayName ?? huntId;
    const validMonsters = (chosen as any).monsters?.map((m: any) => m.name) ?? [];
    session.setHunt(huntId, huntName, validMonsters);

    console.log(`\n🎯 Entrando na caçada: ${huntName} (id=${huntId}, tier=${huntTier})\n`);
    socket.send({ type: "start-hunt", huntId, tier: huntTier });

    await runHuntLoop(socket, session);

    if (isRunning) {
      console.log("══════════════════════════════════════════════════════════════");
      console.log("   Selecione sua próxima caçada:");
      console.log("══════════════════════════════════════════════════════════════\n");
    }
  }
}

async function runHuntLoop(sock: GameSocket, sess: HuntSession): Promise<void> {
  sess.renderStatus(process.stdout);
  statusTimer = setInterval(() => {
    if (sess.huntActive) {
      sess.renderStatus(process.stdout);
    }
  }, 2500);

  return new Promise((resolve) => {
    let leaveTriggered = false;

    let removeListeners: () => void = () => {};

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

    if (process.stdin.isTTY) {
      readlineCb.emitKeypressEvents(process.stdin);
      process.stdin.setRawMode(true);
      process.stdin.resume();

      const onKeypress = (_str: string, key: readlineCb.Key) => {
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

      removeListeners = () => {
        process.stdin.removeListener("keypress", onKeypress);
        try {
          if (process.stdin.isTTY) process.stdin.setRawMode(false);
          process.stdin.pause();
        } catch {}
      };
    } else {
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

      removeListeners = () => {
        try {
          rlNonTty.close();
        } catch {}
      };
    }
  });
}

async function countdownLeave(
  sock: GameSocket,
  sess: HuntSession,
  seconds = 5,
): Promise<void> {
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

function waitForCatalog(
  sock: GameSocket,
  timeoutMs: number,
): Promise<CatalogHunt[]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new Error("Timeout aguardando hunt-catalog. Verifique a conexão."),
        ),
      timeoutMs,
    );
    const unsub = sock.onMessage((msg) => {
      if (msg.type === "hunt-catalog" && Array.isArray((msg as any).hunts)) {
        clearTimeout(timer);
        unsub();
        resolve((msg as any).hunts);
      }
    });
  });
}

async function selectHunt(catalog: CatalogHunt[]): Promise<CatalogHunt | null> {
  printTopHunts(catalog.slice(0, 10));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    while (true) {
      let query: string;
      try {
        query = (
          await rl.question(
            '🔍 Escolha a caçada (nome, ID ou número 1-10, ou "q" para sair): ',
          )
        ).trim();
      } catch {
        return null;
      }

      if (query.toLowerCase() === "q" || query === "") return null;

      const num = parseInt(query, 10);
      if (!Number.isNaN(num) && num >= 1 && num <= 10) {
        const hunt = catalog[num - 1];
        if (hunt) {
          console.log(
            `   ✔  Selecionado: ${hunt.name ?? hunt.displayName ?? hunt.id}\n`,
          );
          return hunt;
        }
      }

      const matches = searchHunts(catalog, query);

      if (matches.length === 0) {
        console.log(
          `   ❌ Nenhuma caçada encontrada para "${query}". Tente novamente.\n`,
        );
        continue;
      }

      if (matches.length === 1 && matches[0]) {
        const hunt = matches[0];
        console.log(
          `   ✔  Selecionado: ${hunt.name ?? hunt.displayName ?? hunt.id}\n`,
        );
        return hunt;
      }

      console.log(
        `\n   Encontradas ${matches.length} caçadas correspondentes:\n`,
      );
      matches.forEach((h, i) => {
        const label = h.name ?? h.displayName ?? h.id;
        const id = h.id ?? (h as any).huntId ?? "?";
        console.log(`   [${i + 1}] ${label} (id: ${id})`);
      });
      console.log();

      let idx: number;
      try {
        const raw = (
          await rl.question(
            `   Escolha o número (1–${matches.length}), ou "q" para cancelar: `,
          )
        ).trim();
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
      if (hunt) {
        console.log(
          `   ✔  Selecionado: ${hunt.name ?? hunt.displayName ?? hunt.id}\n`,
        );
        return hunt;
      }
    }
  } finally {
    rl.close();
  }
}

function printTopHunts(hunts: CatalogHunt[]): void {
  console.log("── Primeiras caçadas disponíveis ──────────────────────────────");
  hunts.forEach((hunt, i) => {
    const id = hunt.id ?? (hunt as any).huntId ?? "?";
    const name = hunt.name ?? hunt.displayName ?? "?";
    const tierInfo =
      (hunt as any).tier !== undefined ? ` | tier=${(hunt as any).tier}` : "";
    const levelReq =
      (hunt as any).requiredLevel !== undefined
        ? ` | nível mín.=${(hunt as any).requiredLevel}`
        : "";
    console.log(`  [${i + 1}] ${name} (id: ${id})${tierInfo}${levelReq}`);
  });
  console.log("────────────────────────────────────────────────────────────────\n");
}

async function cleanupAndExit(code: number): Promise<void> {
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

function safeWsUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return "[URL inválida]";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function die(msg: string): never {
  console.error(`\n❌ ${msg}`);
  process.exit(1);
}

function loadDotEnv(): void {
  try {
    const envPath = path.resolve(__dirname, "../../.env");
    const text = fs.readFileSync(envPath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      const key = match?.[1];
      const val = match?.[2];
      if (key && val !== undefined && process.env[key] === undefined) {
        process.env[key] = val.replace(/^['"]|['"]$/g, "");
      }
    }
  } catch {}
}

main().catch((err) => {
  console.error("\n❌ Erro inesperado:", (err as Error).message);
  cleanupAndExit(1);
});
