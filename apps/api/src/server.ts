import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleAvatarRequest } from "./modules/assets/avatar.js";
import { handleItemIconRequest } from "./modules/assets/item-icon.js";
import { Slot } from "./slot.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve public dir from workspace root
function resolvePublicDir(): string {
  const candidates = [
    path.resolve(__dirname, "../../../public"),
    path.resolve(__dirname, "../../public"),
    path.resolve(process.cwd(), "public"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return path.resolve(process.cwd(), "public");
}

const PUBLIC_DIR = resolvePublicDir();

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

export function sendJson(
  res: http.ServerResponse,
  statusCode: number,
  data: unknown,
): void {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(data));
}

export function parseJsonBody(req: http.IncomingMessage): Promise<Record<string, any>> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk: Buffer | string) => {
      body += chunk;
      if (body.length > 1e6) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}

export function createServerApp() {
  const sseClients = new Set<http.ServerResponse>();
  let sseBroadcastTimer: NodeJS.Timeout | null = null;

  function broadcastSSE(): void {
    if (sseBroadcastTimer) return;
    sseBroadcastTimer = setTimeout(() => {
      sseBroadcastTimer = null;
      if (sseClients.size === 0) return;
      const payload = `data: ${JSON.stringify(slots.map((s) => s.toJSON()))}\n\n`;
      for (const res of sseClients) {
        try {
          res.write(payload);
        } catch {
          sseClients.delete(res);
        }
      }
    }, 100);
  }

  const slots = [
    new Slot(1, broadcastSSE),
    new Slot(2, broadcastSSE),
    new Slot(3, broadcastSSE),
    new Slot(4, broadcastSSE),
  ];

  const sseInterval = setInterval(broadcastSSE, 1000);

  const server = http.createServer(async (req, res) => {
    const host = req.headers.host || "localhost";
    const url = new URL(req.url || "/", `http://${host}`);
    const pathname = url.pathname;

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (pathname === "/favicon.ico" || pathname === "/favicon.svg") {
      const faviconPath = path.join(PUBLIC_DIR, "favicon.svg");
      fs.readFile(faviconPath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end();
          return;
        }
        res.writeHead(200, {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=86400",
        });
        res.end(data);
      });
      return;
    }

    if (pathname === "/api/events") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      res.write(`data: ${JSON.stringify(slots.map((s) => s.toJSON()))}\n\n`);
      sseClients.add(res);

      req.on("close", () => {
        sseClients.delete(res);
      });
      return;
    }

    if (pathname === "/api/slots" && req.method === "GET") {
      sendJson(
        res,
        200,
        slots.map((s) => s.toJSON()),
      );
      return;
    }

    if (pathname === "/api/avatar" && req.method === "GET") {
      await handleAvatarRequest(url, res);
      return;
    }

    if (pathname === "/api/item-icon" && req.method === "GET") {
      await handleItemIconRequest(url, res);
      return;
    }

    const slotMatch = pathname.match(
      /^\/api\/slots\/([1-4])(?:\/([a-z0-9\/-]+))?$/,
    );
    if (slotMatch && slotMatch[1]) {
      const slotId = parseInt(slotMatch[1], 10);
      const action = slotMatch[2] || "";
      const slot = slots.find((s) => s.id === slotId);

      if (!slot) {
        sendJson(res, 404, { error: "Slot não encontrado" });
        return;
      }

      if (action === "" && req.method === "GET") {
        sendJson(res, 200, slot.toJSON());
        return;
      }

      if (action === "login" && req.method === "POST") {
        const body = await parseJsonBody(req);
        if (!body.email || !body.password) {
          sendJson(res, 400, { error: "E-mail e senha são obrigatórios." });
          return;
        }
        try {
          await slot.login(body.email, body.password);
          broadcastSSE();
          sendJson(res, 200, slot.toJSON());
        } catch (err) {
          broadcastSSE();
          sendJson(res, 401, { error: (err as Error).message });
        }
        return;
      }

      if (action === "logout" && req.method === "POST") {
        await slot.disconnect();
        broadcastSSE();
        sendJson(res, 200, slot.toJSON());
        return;
      }

      if (action === "catalog" && req.method === "GET") {
        sendJson(res, 200, { hunts: slot.catalog });
        return;
      }

      if (action === "hunt/start" && req.method === "POST") {
        const body = await parseJsonBody(req);
        if (!body.huntId) {
          sendJson(res, 400, { error: "huntId é obrigatório" });
          return;
        }
        try {
          await slot.startHunt(body.huntId, body.tier ?? 0);
          broadcastSSE();
          sendJson(res, 200, slot.toJSON());
        } catch (err) {
          sendJson(res, 400, { error: (err as Error).message });
        }
        return;
      }

      if (action === "hunt/leave" && req.method === "POST") {
        try {
          await slot.leaveHunt();
          broadcastSSE();
          sendJson(res, 200, slot.toJSON());
        } catch (err) {
          sendJson(res, 400, { error: (err as Error).message });
        }
        return;
      }

      if (action === "price-mode" && req.method === "POST") {
        const body = await parseJsonBody(req);
        if (body.mode) {
          slot.session.setPriceMode(body.mode);
          broadcastSSE();
          sendJson(res, 200, slot.toJSON());
          return;
        }
        sendJson(res, 400, {
          error: "mode é obrigatório ('npc', 'auction', 'custom')",
        });
        return;
      }

      if (action === "item-price" && req.method === "POST") {
        const body = await parseJsonBody(req);
        if (body.itemId !== undefined && body.price !== undefined) {
          slot.session.setCustomPrice(body.itemId, body.price);
          broadcastSSE();
          sendJson(res, 200, slot.toJSON());
          return;
        }
        sendJson(res, 400, { error: "itemId e price são obrigatórios" });
        return;
      }

      if (action === "action-bar/slot" && req.method === "POST") {
        const body = await parseJsonBody(req);
        if (body.slot === undefined) {
          sendJson(res, 400, { error: "slot (0-19) é obrigatório" });
          return;
        }
        const slotIndex = Number(body.slot);
        if (slotIndex < 0 || slotIndex >= 20) {
          sendJson(res, 400, { error: "slot deve estar entre 0 e 19" });
          return;
        }

        if (slot.socket && slot.socket.isOpen()) {
          try {
            slot.socket.send({
              type: "set-action-slot",
              slot: slotIndex,
              rule: body.rule ?? null,
            });
          } catch (err) {
            sendJson(res, 500, {
              error:
                "Erro ao enviar ao WebSocket: " + (err as Error).message,
            });
            return;
          }
        }

        slot.session.setLocalActionSlot(slotIndex, body.rule ?? null);
        broadcastSSE();
        sendJson(res, 200, slot.toJSON());
        return;
      }

      if (action === "action-bar/preset" && req.method === "POST") {
        const body = await parseJsonBody(req);
        if (slot.socket && slot.socket.isOpen()) {
          try {
            if (body.action === "select" && typeof body.index === "number") {
              slot.socket.send({
                type: "select-action-bar-preset",
                index: body.index,
              });
            } else if (body.action === "save" && body.name) {
              slot.socket.send({
                type: "save-action-bar-preset",
                name: body.name,
              });
            }
          } catch (err) {
            sendJson(res, 500, {
              error:
                "Erro ao enviar ao WebSocket: " + (err as Error).message,
            });
            return;
          }
        }
        broadcastSSE();
        sendJson(res, 200, slot.toJSON());
        return;
      }

      if (action === "party/invite" && req.method === "POST") {
        const body = await parseJsonBody(req);
        if (!body.name) {
          sendJson(res, 400, { error: "Nome do jogador é obrigatório" });
          return;
        }
        if (!slot.socket || !slot.socket.isOpen()) {
          sendJson(res, 400, { error: "Personagem não conectado" });
          return;
        }
        try {
          slot.socket.send({
            type: "party-invite-name",
            name: body.name.trim(),
          });
          broadcastSSE();
          sendJson(res, 200, {
            success: true,
            message: `Convite enviado para ${body.name}`,
          });
        } catch (err) {
          sendJson(res, 500, {
            error: "Erro ao enviar convite: " + (err as Error).message,
          });
        }
        return;
      }

      if (action === "party/respond" && req.method === "POST") {
        const body = await parseJsonBody(req);
        const accept = Boolean(body.accept);
        const followLeader = Boolean(body.followLeader);
        if (!slot.socket || !slot.socket.isOpen()) {
          sendJson(res, 400, { error: "Personagem não conectado" });
          return;
        }
        try {
          const msg: any = { type: "party-respond", accept };
          if (followLeader) {
            msg.followLeader = true;
          }
          slot.socket.send(msg);
          slot.session.partyInvite = null;
          broadcastSSE();
          sendJson(res, 200, { success: true, accept });
        } catch (err) {
          sendJson(res, 500, {
            error: "Erro ao responder convite: " + (err as Error).message,
          });
        }
        return;
      }

      if (action === "party/leave" && req.method === "POST") {
        if (!slot.socket || !slot.socket.isOpen()) {
          sendJson(res, 400, { error: "Personagem não conectado" });
          return;
        }
        try {
          slot.socket.send({ type: "party-leave" });
          slot.session.party = null;
          broadcastSSE();
          sendJson(res, 200, { success: true });
        } catch (err) {
          sendJson(res, 500, {
            error: "Erro ao sair da party: " + (err as Error).message,
          });
        }
        return;
      }

      if (action === "party/follow-leader" && req.method === "POST") {
        const body = await parseJsonBody(req);
        const follow = Boolean(body.follow);
        if (!slot.socket || !slot.socket.isOpen()) {
          sendJson(res, 400, { error: "Personagem não conectado" });
          return;
        }
        try {
          slot.socket.send({ type: "party-follow-leader", follow });
          broadcastSSE();
          sendJson(res, 200, { success: true, follow });
        } catch (err) {
          sendJson(res, 500, {
            error: "Erro ao alternar seguir líder: " + (err as Error).message,
          });
        }
        return;
      }

      if (action === "party/kick" && req.method === "POST") {
        const body = await parseJsonBody(req);
        if (!body.playerId && !body.id) {
          sendJson(res, 400, { error: "ID do jogador é obrigatório" });
          return;
        }
        if (!slot.socket || !slot.socket.isOpen()) {
          sendJson(res, 400, { error: "Personagem não conectado" });
          return;
        }
        try {
          slot.socket.send({
            type: "party-kick",
            playerId: body.playerId || body.id,
          });
          broadcastSSE();
          sendJson(res, 200, { success: true });
        } catch (err) {
          sendJson(res, 500, {
            error: "Erro ao expulsar membro: " + (err as Error).message,
          });
        }
        return;
      }

      if (action === "party/costs-offer" && req.method === "POST") {
        const body = await parseJsonBody(req);
        const enabled = Boolean(body.enabled);
        if (!slot.socket || !slot.socket.isOpen()) {
          sendJson(res, 400, { error: "Personagem não conectado" });
          return;
        }
        const party = slot.session.party;
        if (!party) {
          sendJson(res, 400, {
            error: "Este personagem não está em nenhuma party.",
          });
          return;
        }
        if (party.leaderId !== slot.character?.id) {
          sendJson(res, 403, {
            error:
              "Apenas o líder do grupo pode alterar as configurações de custos da party.",
          });
          return;
        }
        try {
          if (enabled) {
            slot.socket.send({ type: "party-costs-offer", enabled: true });
          } else {
            slot.socket.send({ type: "party-costs-cancel" });
            slot.socket.send({ type: "party-costs-offer", enabled: false });
          }
          broadcastSSE();
          sendJson(res, 200, { success: true, enabled });
        } catch (err) {
          sendJson(res, 500, {
            error:
              "Erro ao alterar custos compartilhados: " +
              (err as Error).message,
          });
        }
        return;
      }

      if (action === "party/costs-respond" && req.method === "POST") {
        const body = await parseJsonBody(req);
        const accept = Boolean(body.accept);
        if (!slot.socket || !slot.socket.isOpen()) {
          sendJson(res, 400, { error: "Personagem não conectado" });
          return;
        }
        try {
          slot.socket.send({ type: "party-costs-respond", accept });
          broadcastSSE();
          sendJson(res, 200, { success: true, accept });
        } catch (err) {
          sendJson(res, 500, {
            error:
              "Erro ao responder proposta de custos: " +
              (err as Error).message,
          });
        }
        return;
      }

      if (action === "party/costs-cancel" && req.method === "POST") {
        if (!slot.socket || !slot.socket.isOpen()) {
          sendJson(res, 400, { error: "Personagem não conectado" });
          return;
        }
        try {
          slot.socket.send({ type: "party-costs-cancel" });
          broadcastSSE();
          sendJson(res, 200, { success: true });
        } catch (err) {
          sendJson(res, 500, {
            error:
              "Erro ao cancelar custos compartilhados: " +
              (err as Error).message,
          });
        }
        return;
      }

      if (action === "party/transfer-respond" && req.method === "POST") {
        const body = await parseJsonBody(req);
        const accept = Boolean(body.accept);
        const fromName = body.fromName || slot.session.transferOffer?.fromName;
        if (!slot.socket || !slot.socket.isOpen()) {
          sendJson(res, 400, { error: "Personagem não conectado" });
          return;
        }
        try {
          slot.socket.send({ type: "transfer-respond", fromName, accept });
          slot.session.transferOffer = null;
          broadcastSSE();
          sendJson(res, 200, { success: true, accept });
        } catch (err) {
          sendJson(res, 500, {
            error:
              "Erro ao responder transferência de mundo: " +
              (err as Error).message,
          });
        }
        return;
      }

      if (action === "revive" && req.method === "POST") {
        try {
          await slot.revive();
          broadcastSSE();
          sendJson(res, 200, slot.toJSON());
        } catch (err) {
          sendJson(res, 400, { error: (err as Error).message });
        }
        return;
      }

      if (action === "death/dismiss" && req.method === "POST") {
        try {
          await slot.dismissDeath();
          broadcastSSE();
          sendJson(res, 200, slot.toJSON());
        } catch (err) {
          sendJson(res, 400, { error: (err as Error).message });
        }
        return;
      }

      if (action === "blessings/buy" && req.method === "POST") {
        const body = await parseJsonBody(req);
        try {
          await slot.buyBlessing(body.id || "all");
          broadcastSSE();
          sendJson(res, 200, slot.toJSON());
        } catch (err) {
          sendJson(res, 400, { error: (err as Error).message });
        }
        return;
      }

      if (action === "blessings/open" && req.method === "POST") {
        try {
          await slot.openBlessings();
          broadcastSSE();
          sendJson(res, 200, slot.toJSON());
        } catch (err) {
          sendJson(res, 400, { error: (err as Error).message });
        }
        return;
      }
    }

    // Static Files
    let filePath = path.join(
      PUBLIC_DIR,
      pathname === "/" ? "index.html" : pathname,
    );

    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403);
      res.end("Acesso negado");
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        filePath = path.join(PUBLIC_DIR, "index.html");
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";

      fs.readFile(filePath, (readErr, content) => {
        if (readErr) {
          res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Arquivo não encontrado");
          return;
        }
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content);
      });
    });
  });

  async function shutdown(): Promise<void> {
    clearInterval(sseInterval);
    console.log("\n⏹  Encerrando servidor e desconectando slots...");
    for (const slot of slots) {
      await slot.disconnect();
    }
    return new Promise((resolve) => {
      server.close(() => resolve());
    });
  }

  return { server, slots, shutdown };
}
