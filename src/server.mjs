import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HunteraClient } from "./huntera-client.mjs";
import { GameSocket } from "./game-socket.mjs";
import { HuntSession } from "./hunt-session.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "../public");
const PORT = parseInt(process.env.PORT || "3000", 10);

// Carrega .env se existir para pré-preenchimento opcional
loadDotEnv();

class Slot {
  constructor(id) {
    this.id = id;
    this.status = "idle"; // 'idle' | 'logging_in' | 'connected' | 'hunting' | 'error'
    this.errorMessage = null;
    this.account = null; // { email }
    this.character = null; // { id, name, level, vocation, outfitId, outfitColors }
    /** @type {HunteraClient|null} */
    this.client = null;
    /** @type {GameSocket|null} */
    this.socket = null;
    this.session = new HuntSession();
    this.catalog = [];
    this.catalogLoaded = false;
    this.accountPassword = null;
  }

  setupSocketEvents(socket) {
    socket.onMessage((msg) => {
      this.session.handleMessage(msg);

      if (msg.type === "hunt-catalog" && Array.isArray(msg.hunts)) {
        this.catalog = msg.hunts;
        this.catalogLoaded = true;
      }

      if (msg.type === "player-stats" && this.character) {
        if (typeof msg.level === "number") this.character.level = msg.level;
        if (typeof msg.vocation === "string") this.character.vocation = msg.vocation;
        if (typeof msg.health === "number") this.character.hp = msg.health;
        if (typeof msg.maxHealth === "number") this.character.maxHp = msg.maxHealth;
        if (typeof msg.hp === "number") this.character.hp = msg.hp;
        if (typeof msg.maxHp === "number") this.character.maxHp = msg.maxHp;
        if (typeof msg.mana === "number") this.character.mana = msg.mana;
        if (typeof msg.maxMana === "number") this.character.maxMana = msg.maxMana;
        broadcastSSE();
      }

      if (msg.type === "player-vitals" && this.character) {
        if (typeof msg.hp === "number") this.character.hp = msg.hp;
        if (typeof msg.maxHp === "number") this.character.maxHp = msg.maxHp;
        if (typeof msg.health === "number") this.character.hp = msg.health;
        if (typeof msg.maxHealth === "number") this.character.maxHp = msg.maxHealth;
        if (typeof msg.mana === "number") this.character.mana = msg.mana;
        if (typeof msg.maxMana === "number") this.character.maxMana = msg.maxMana;
        broadcastSSE();
      }

      if (msg.type === "creature-health") {
        broadcastSSE();
      }

      if (msg.type === "creature-outfit" && this.character && msg.id === this.character.id) {
        if (typeof msg.outfitId === "number") this.character.outfitId = msg.outfitId;
        if (msg.colors) this.character.outfitColors = msg.colors;
      }

      if (msg.type === "player-died") {
        console.log(`[Slot ${this.id}] Morte ativa detectada (player-died):`, JSON.stringify(msg));
        if (this.socket && this.socket.isOpen()) {
          this.socket.send({ type: "request-death-history" });
        }
        broadcastSSE();
      }

      if (msg.type === "death-history" || msg.type === "blessings-status") {
        broadcastSSE();
      }

      if (msg.type === "system-message" && msg.message) {
        console.log(`[Slot ${this.id}] Mensagem do sistema:`, msg.message);
        const lowerMsg = String(msg.message).toLowerCase();
        if (lowerMsg.includes("desconectado") || lowerMsg.includes("disconnected") || lowerMsg.includes("outro local") || lowerMsg.includes("logged out")) {
          console.warn(`[Slot ${this.id}] Desconexão sinalizada pelo sistema:`, msg.message);
          this.disconnect(msg.message);
          broadcastSSE();
          return;
        }
      }

      if (msg.type && (msg.type.includes("party") || msg.type.includes("vip") || msg.type.includes("friend"))) {
        broadcastSSE();
      }
    });

    socket.onClose((event) => {
      console.warn(`[Slot ${this.id}] Conexão WebSocket encerrada pelo servidor (código: ${event?.code || "desconhecido"}).`);
    });

    socket.onError((err) => {
      console.error(`[Slot ${this.id}] Erro no WebSocket:`, err?.message || err);
    });
  }

  async ensureSocket() {
    if (this.socket && this.socket.isOpen()) {
      return this.socket;
    }

    if (this.client && this.character) {
      console.log(`[Slot ${this.id}] Reconectando socket para ${this.character.name}...`);
      try {
        const ticketResp = await this.client.gameTicket(this.character.id);
        const socket = new GameSocket({
          url: ticketResp.websocketUrl,
          ticket: ticketResp.ticket,
          headers: { Origin: "https://www.huntera.com.br" },
        });
        this.setupSocketEvents(socket);
        await socket.connect();
        this.socket = socket;
        console.log(`[Slot ${this.id}] Socket reconectado via gameTicket com sucesso!`);
        return this.socket;
      } catch (err) {
        console.warn(`[Slot ${this.id}] Erro ao renovar ticket com client atual:`, err.message);
      }
    }

    if (this.account?.email && this.accountPassword && this.character) {
      console.log(`[Slot ${this.id}] Reautenticando client Huntera para ${this.account.email}...`);
      this.client = new HunteraClient();
      await this.client.login(this.account.email, this.accountPassword);
      const ticketResp = await this.client.gameTicket(this.character.id);
      const socket = new GameSocket({
        url: ticketResp.websocketUrl,
        ticket: ticketResp.ticket,
        headers: { Origin: "https://www.huntera.com.br" },
      });
      this.setupSocketEvents(socket);
      await socket.connect();
      this.socket = socket;
      console.log(`[Slot ${this.id}] Socket reautenticado e conectado com sucesso!`);
      return this.socket;
    }

    throw new Error("Socket não conectado. Por favor, reconecte sua conta.");
  }

  async login(email, password) {
    if (this.socket) {
      await this.disconnect();
    }

    this.status = "logging_in";
    this.errorMessage = null;
    this.account = { email };
    this.accountPassword = password;

    try {
      this.client = new HunteraClient();
      await this.client.login(email, password);

      const chars = await this.client.characters();
      const char = chars.characters?.[0];
      if (!char) {
        throw new Error("Nenhum personagem encontrado nesta conta.");
      }

      this.character = {
        id: char.id,
        name: char.name,
        level: char.level,
        vocation: char.vocation ?? "none",
        outfitId: char.outfitId ?? 128,
        outfitColors: char.outfitColors ?? { head: 0, body: 0, legs: 0, feet: 0 },
      };

      this.session.setPlayerId(char.id);
      this.session.setPlayerName(char.name);

      const ticketResp = await this.client.gameTicket(char.id);
      this.socket = new GameSocket({
        url: ticketResp.websocketUrl,
        ticket: ticketResp.ticket,
        headers: { Origin: "https://www.huntera.com.br" },
      });

      this.setupSocketEvents(this.socket);
      await this.socket.connect();

      // Solicita status de bênçãos logo ao autenticar
      if (this.socket && this.socket.isOpen()) {
        try {
          this.socket.send({ type: "blessings-open" });
        } catch {}
      }

      // Aguarda catálogo por até 8s
      const start = Date.now();
      while (!this.catalogLoaded && Date.now() - start < 8000) {
        await sleep(200);
      }

      if (this.session.deathInfo?.isDead) {
        this.status = "dead";
      } else {
        this.status = this.session.huntActive ? "hunting" : "connected";
      }
      return this.toJSON();
    } catch (err) {
      this.status = "error";
      this.errorMessage = err.message || "Erro na autenticação";
      throw err;
    }
  }

  async startHunt(huntId, tier = 0) {
    await this.ensureSocket();

    const hunt = this.catalog.find((h) => (h.id ?? h.huntId) === huntId);
    if (!hunt) {
      throw new Error(`Caçada "${huntId}" não encontrada no catálogo.`);
    }

    const huntName = hunt.name ?? hunt.displayName ?? huntId;
    const validMonsters = hunt.monsters?.map((m) => m.name) ?? [];
    const chosenTier = parseInt(tier, 10) || 0;

    this.session.tier = chosenTier;
    this.session.setHunt(huntId, huntName, validMonsters);
    this.socket.send({ type: "start-hunt", huntId, tier: chosenTier });
    this.status = "hunting";

    return this.toJSON();
  }

  async leaveHunt() {
    await this.ensureSocket();

    try {
      this.socket.send({ type: "leave-hunt" });
    } catch {}

    // Aguarda desengajamento de 5s
    await sleep(5200);
    this.session.resetSession();
    this.status = "connected";

    return this.toJSON();
  }

  async disconnect(reason = null) {
    this.status = "idle";
    this.errorMessage = reason || null;
    this.accountPassword = null;

    if (this.socket) {
      try {
        if (this.session.huntActive) {
          this.socket.send({ type: "leave-hunt" });
        }
        this.socket.logout();
        await sleep(150);
      } catch {}
      try {
        this.socket.close();
      } catch {}
      this.socket = null;
    }

    this.client = null;
    this.account = null;
    this.character = null;
    this.catalog = [];
    this.catalogLoaded = false;
    this.session.resetSession();
  }

  async revive() {
    await this.ensureSocket();
    this.socket.send({ type: "revive" });
    this.session.revive();
    this.status = "connected";
    // Atualiza status de bênçãos após reviver
    try {
      this.socket.send({ type: "blessings-open" });
    } catch {}
    return this.toJSON();
  }

  async dismissDeath() {
    this.session.dismissDeath();
    this.status = this.session.huntActive ? "hunting" : "connected";
    return this.toJSON();
  }

  async buyBlessing(id = "all") {
    await this.ensureSocket();
    this.socket.send({ type: "blessings-open" });
    this.socket.send({ type: "blessing-buy", id });
    await sleep(350);
    this.socket.send({ type: "blessings-open" });
    return this.toJSON();
  }

  async openBlessings() {
    await this.ensureSocket();
    this.socket.send({ type: "blessings-open" });
    return this.toJSON();
  }

  toJSON() {
    let currentStatus = this.status;
    if (this.session.deathInfo?.isDead) {
      currentStatus = "dead";
    } else if (this.session.huntActive) {
      currentStatus = "hunting";
    } else if (this.status === "dead") {
      currentStatus = "connected";
    }

    return {
      id: this.id,
      status: currentStatus,
      errorMessage: this.errorMessage,
      account: this.account ? { email: this.account.email } : null,
      character: this.character,
      catalog: this.catalog || [],
      catalogCount: this.catalog.length,
      session: this.session.toJSON(),
    };
  }
}

// Inicializa os 4 slots
const slots = [new Slot(1), new Slot(2), new Slot(3), new Slot(4)];

// Clientes SSE conectados
const sseClients = new Set();

let sseBroadcastTimer = null;
function broadcastSSE() {
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

// Dispara broadcast SSE a cada 1 segundo para atualizar o painel
setInterval(broadcastSSE, 1000);

// MIME types para arquivos estáticos
const MIME_TYPES = {
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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Habilita CORS para desenvolvimento
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // ---------------------------------------------------------------------------
  // API Endpoints
  // ---------------------------------------------------------------------------

  // Favicon do app
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
    sendJson(res, 200, slots.map((s) => s.toJSON()));
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

  // /api/slots/:id/...
  const slotMatch = pathname.match(/^\/api\/slots\/([1-4])(?:\/([a-z0-9\/-]+))?$/);
  if (slotMatch) {
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
        sendJson(res, 401, { error: err.message });
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
        sendJson(res, 400, { error: err.message });
      }
      return;
    }

    if (action === "hunt/leave" && req.method === "POST") {
      try {
        await slot.leaveHunt();
        broadcastSSE();
        sendJson(res, 200, slot.toJSON());
      } catch (err) {
        sendJson(res, 400, { error: err.message });
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
      sendJson(res, 400, { error: "mode é obrigatório ('npc', 'auction', 'custom')" });
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
          sendJson(res, 500, { error: "Erro ao enviar ao WebSocket: " + err.message });
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
            slot.socket.send({ type: "select-action-bar-preset", index: body.index });
          } else if (body.action === "save" && body.name) {
            slot.socket.send({ type: "save-action-bar-preset", name: body.name });
          }
        } catch (err) {
          sendJson(res, 500, { error: "Erro ao enviar ao WebSocket: " + err.message });
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
        slot.socket.send({ type: "party-invite-name", name: body.name.trim() });
        broadcastSSE();
        sendJson(res, 200, { success: true, message: `Convite enviado para ${body.name}` });
      } catch (err) {
        sendJson(res, 500, { error: "Erro ao enviar convite: " + err.message });
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
        const msg = { type: "party-respond", accept };
        if (followLeader) {
          msg.followLeader = true;
        }
        slot.socket.send(msg);
        slot.session.partyInvite = null;
        broadcastSSE();
        sendJson(res, 200, { success: true, accept });
      } catch (err) {
        sendJson(res, 500, { error: "Erro ao responder convite: " + err.message });
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
        sendJson(res, 500, { error: "Erro ao sair da party: " + err.message });
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
        sendJson(res, 500, { error: "Erro ao alternar seguir líder: " + err.message });
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
        slot.socket.send({ type: "party-kick", playerId: body.playerId || body.id });
        broadcastSSE();
        sendJson(res, 200, { success: true });
      } catch (err) {
        sendJson(res, 500, { error: "Erro ao expulsar membro: " + err.message });
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
        sendJson(res, 400, { error: "Este personagem não está em nenhuma party." });
        return;
      }
      if (party.leaderId !== slot.character?.id) {
        sendJson(res, 403, { error: "Apenas o líder do grupo pode alterar as configurações de custos da party." });
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
        sendJson(res, 500, { error: "Erro ao alterar custos compartilhados: " + err.message });
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
        sendJson(res, 500, { error: "Erro ao responder proposta de custos: " + err.message });
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
        sendJson(res, 500, { error: "Erro ao cancelar custos compartilhados: " + err.message });
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
        sendJson(res, 500, { error: "Erro ao responder transferência de mundo: " + err.message });
      }
      return;
    }

    if (action === "revive" && req.method === "POST") {
      try {
        await slot.revive();
        broadcastSSE();
        sendJson(res, 200, slot.toJSON());
      } catch (err) {
        sendJson(res, 400, { error: err.message });
      }
      return;
    }

    if (action === "death/dismiss" && req.method === "POST") {
      try {
        await slot.dismissDeath();
        broadcastSSE();
        sendJson(res, 200, slot.toJSON());
      } catch (err) {
        sendJson(res, 400, { error: err.message });
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
        sendJson(res, 400, { error: err.message });
      }
      return;
    }

    if (action === "blessings/open" && req.method === "POST") {
      try {
        await slot.openBlessings();
        broadcastSSE();
        sendJson(res, 200, slot.toJSON());
      } catch (err) {
        sendJson(res, 400, { error: err.message });
      }
      return;
    }
  }

  // ---------------------------------------------------------------------------
  // Arquivos Estáticos (public/)
  // ---------------------------------------------------------------------------
  let filePath = path.join(PUBLIC_DIR, pathname === "/" ? "index.html" : pathname);

  // Segurança de travessia de diretório
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

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
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

// Cache em memória de avatares para latência 0ms
const avatarCache = new Map();

async function handleAvatarRequest(url, res) {
  const outfitId = parseInt(url.searchParams.get("outfitId") || "128", 10);
  const head = parseInt(url.searchParams.get("head") || "0", 10);
  const body = parseInt(url.searchParams.get("body") || "0", 10);
  const legs = parseInt(url.searchParams.get("legs") || "0", 10);
  const feet = parseInt(url.searchParams.get("feet") || "0", 10);
  const animate = url.searchParams.get("animate") !== "0";
  const vocation = (url.searchParams.get("vocation") || "none").toLowerCase();

  const cacheKey = `${animate ? "anim" : "static"}-${outfitId}-${head}-${body}-${legs}-${feet}`;
  if (avatarCache.has(cacheKey)) {
    const cached = avatarCache.get(cacheKey);
    res.writeHead(200, {
      "Content-Type": cached.contentType,
      "Cache-Control": "public, max-age=86400",
    });
    res.end(cached.buffer);
    return;
  }

  const endpoint = animate ? "animate" : "static";
  const remoteUrl = `https://gunzot-outfits.gunzo.eu/${endpoint}/${outfitId}?head=${head}&body=${body}&legs=${legs}&feet=${feet}&addons=0`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const resp = await fetch(remoteUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (resp.ok) {
      const arrayBuffer = await resp.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = resp.headers.get("content-type") || (animate ? "image/gif" : "image/png");
      avatarCache.set(cacheKey, { buffer, contentType });

      res.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      });
      res.end(buffer);
      return;
    }
  } catch {}

  // Fallback: SVG de alta qualidade da vocação
  const fallbackSvg = generateVocationSvg(vocation);
  res.writeHead(200, {
    "Content-Type": "image/svg+xml",
    "Cache-Control": "public, max-age=3600",
  });
  res.end(fallbackSvg);
}

function generateVocationSvg(vocation) {
  const voc = (vocation || "").toLowerCase();
  let emoji = "⚔️";
  let color = "#f5c518";
  let bg = "#181d27";

  if (voc.includes("knight") || voc.includes("cavaleiro")) {
    emoji = "🛡️";
    color = "#e74c3c";
    bg = "#231818";
  } else if (voc.includes("paladin") || voc.includes("paladino")) {
    emoji = "🏹";
    color = "#f1c40f";
    bg = "#232014";
  } else if (voc.includes("sorcerer") || voc.includes("mago")) {
    emoji = "🔮";
    color = "#9b59b6";
    bg = "#201526";
  } else if (voc.includes("druid") || voc.includes("druida")) {
    emoji = "🌿";
    color = "#2ecc71";
    bg = "#132317";
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
    <defs>
      <radialGradient id="g" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#2a3242"/>
        <stop offset="100%" stop-color="${bg}"/>
      </radialGradient>
    </defs>
    <circle cx="32" cy="32" r="30" fill="url(#g)" stroke="${color}" stroke-width="2.5"/>
    <text x="32" y="38" font-size="28" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  </svg>`;
}

// Dicionário canônico de itemId para slugs oficiais do Tibiopedia
const ITEM_ID_TO_SLUG = {
  3031: "gold_coin",
  3035: "platinum_coin",
  3043: "crystal_coin",
  3607: "cheese",
  3492: "worm",
  268: "mana_potion",
  266: "health_potion",
  237: "strong_mana_potion",
  236: "strong_health_potion",
  238: "great_mana_potion",
  239: "great_health_potion",
  23373: "ultimate_mana_potion",
  7643: "ultimate_health_potion",
  23375: "supreme_health_potion",
  7642: "great_spirit_potion",
  23374: "ultimate_spirit_potion",
  7876: "health_potion",
  3191: "great_fireball_rune",
  3161: "avalanche_rune",
  3155: "sudden_death_rune",
  3200: "explosion_rune",
  3189: "fireball_rune",
  3202: "thunderstorm_rune",
  3175: "stone_shower_rune",
  3198: "heavy_magic_missile_rune",
  3158: "icicle_rune",
  3182: "holy_missile_rune",
  3160: "ultimate_healing_rune",
  3447: "arrow",
  3446: "bolt",
  3448: "poison_arrow",
  774: "earth_arrow",
  763: "flaming_arrow",
  761: "flash_arrow",
  762: "shiver_arrow",
  7364: "sniper_arrow",
  7363: "piercing_bolt",
  7365: "onyx_arrow",
  3450: "power_bolt",
  3449: "burst_arrow",
  16143: "envenomed_arrow",
  16142: "drill_bolt",
  15793: "crystalline_arrow",
  16141: "prismatic_bolt",
  6528: "infernal_bolt",
  35901: "diamond_arrow",
  35902: "spectral_bolt",
  9649: "gauze_bandage",
  11444: "protective_charm",
  11466: "flask_of_embalming_fluid",
  3007: "crystal_ring",
  3017: "silver_brooch",
  3027: "black_pearl",
  3054: "silver_amulet",
  3045: "strange_talisman",
  3046: "magic_light_wand",
  3299: "poison_dagger",
  3429: "black_shield",
  5914: "yellow_piece_of_cloth",
  10290: "mini_mummy",
  37109: "sliver",
};

function sanitizeItemName(rawName) {
  if (!rawName) return "";
  let s = rawName.trim();
  // Remove sufixos como (x62), x2, (100)
  s = s.replace(/\s*\(?x?\d+\)?\s*$/i, "");
  // Remove contagens prefixadas como "2 worm"
  s = s.replace(/^\d+\s+/, "");
  // Normalização de plurais comuns
  const lower = s.toLowerCase();
  if (lower === "gold coins") return "gold coin";
  if (lower === "platinum coins") return "platinum coin";
  if (lower === "crystal coins") return "crystal coin";
  if (lower === "worms") return "worm";
  return s.trim();
}

// Cache de ícones de itens para latência 0ms
const itemIconCache = new Map();

async function handleItemIconRequest(url, res) {
  const rawName = url.searchParams.get("name") || "";
  const rawId = parseInt(url.searchParams.get("id") || "0", 10);
  const sanitized = sanitizeItemName(rawName);

  let slug = (rawId && ITEM_ID_TO_SLUG[rawId])
    ? ITEM_ID_TO_SLUG[rawId]
    : sanitized
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

  if (!slug) {
    res.writeHead(200, { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" });
    res.end(generateItemFallbackSvg("?", rawId));
    return;
  }

  if (itemIconCache.has(slug)) {
    const cached = itemIconCache.get(slug);
    res.writeHead(200, {
      "Content-Type": cached.contentType,
      "Cache-Control": "public, max-age=604800",
    });
    res.end(cached.buffer);
    return;
  }

  const remoteUrl = `https://tibiopedia.pl/images/static/items/${slug}.gif`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const resp = await fetch(remoteUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (resp.ok) {
      const contentType = resp.headers.get("content-type") || "";
      if (contentType.includes("image")) {
        const arrayBuffer = await resp.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        itemIconCache.set(slug, { buffer, contentType });

        res.writeHead(200, {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=604800",
        });
        res.end(buffer);
        return;
      }
    }
  } catch {}

  // Fallback SVG estilizado imediato caso a imagem remota não exista
  const svg = generateItemFallbackSvg(sanitized || rawName, rawId);
  const svgBuffer = Buffer.from(svg);
  itemIconCache.set(slug, { buffer: svgBuffer, contentType: "image/svg+xml" });

  res.writeHead(200, {
    "Content-Type": "image/svg+xml",
    "Cache-Control": "public, max-age=86400",
  });
  res.end(svgBuffer);
}

function generateItemFallbackSvg(name, itemId = 0) {
  const n = (name || "").toLowerCase();
  const initial = (name || "?").slice(0, 2).toUpperCase();

  // Ouro / Moeda
  if (n.includes("gold") || n.includes("coin") || itemId === 3031) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
      <defs>
        <radialGradient id="gc" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#fef08a"/>
          <stop offset="60%" stop-color="#eab308"/>
          <stop offset="100%" stop-color="#854d0e"/>
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="13" fill="url(#gc)" stroke="#ca8a04" stroke-width="1.5"/>
      <circle cx="16" cy="16" r="10" fill="none" stroke="#fef08a" stroke-width="1" stroke-dasharray="2,2"/>
      <text x="16" y="20" font-family="serif" font-size="13" font-weight="bold" fill="#713f12" text-anchor="middle">G</text>
    </svg>`;
  }

  // Poção
  if (n.includes("potion") || n.includes("poção") || n.includes("flask") || (itemId >= 236 && itemId <= 268)) {
    const isMana = n.includes("mana");
    const liquidColor = isMana ? "#38bdf8" : "#f87171";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
      <rect x="13" y="4" width="6" height="4" fill="#94a3b8" rx="1"/>
      <path d="M12 8 L8 16 C7 23 9 28 16 28 C23 28 25 23 24 16 L20 8 Z" fill="#1e293b" stroke="#cbd5e1" stroke-width="1.5"/>
      <path d="M9.5 17 C9.5 24 11 26 16 26 C21 26 22.5 24 22.5 17 Z" fill="${liquidColor}"/>
      <circle cx="14" cy="20" r="1.5" fill="#ffffff" opacity="0.6"/>
    </svg>`;
  }

  // Runa
  if (n.includes("rune") || n.includes("runa") || (itemId >= 3155 && itemId <= 3202)) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
      <polygon points="16,4 28,10 28,22 16,28 4,22 4,10" fill="#334155" stroke="#94a3b8" stroke-width="1.5"/>
      <path d="M16 10 L16 22 M11 13 L21 19 M21 13 L11 19" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`;
  }

  // Munição
  if (n.includes("arrow") || n.includes("bolt")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
      <line x1="6" y1="26" x2="24" y2="8" stroke="#d4af37" stroke-width="2"/>
      <polygon points="26,6 20,8 24,12" fill="#e2e8f0"/>
      <polygon points="6,26 9,21 11,23" fill="#ef4444"/>
      <polygon points="6,26 11,23 9,25" fill="#ef4444"/>
    </svg>`;
  }

  // Fallback estilizado padrão com moldura dourada e fundo escuro
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
    <rect width="32" height="32" rx="5" fill="#181d27" stroke="#d4af37" stroke-width="1.5"/>
    <text x="16" y="20" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#f5c518" text-anchor="middle" dominant-baseline="middle">${initial}</text>
  </svg>`;
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

server.listen(PORT, () => {
  console.log(`\n🚀 Servidor Huntera Web iniciado em http://localhost:${PORT}`);
  console.log(`   Suporte a 4 telas simultâneas com SSE ativo.\n`);
});

// Encerramento limpo
async function shutdown() {
  console.log("\n⏹  Encerrando servidor e desconectando slots...");
  for (const slot of slots) {
    await slot.disconnect();
  }
  server.close(() => {
    process.exit(0);
  });
}

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
