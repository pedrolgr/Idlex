import { HuntSession } from "@idlex/game-core";
import { HunteraClient } from "@idlex/huntera-client";
import {
  GameSocket,
  type CatalogHunt,
  type IncomingGameMessage,
} from "@idlex/protocol";

export type SlotStatus =
  | "idle"
  | "logging_in"
  | "connected"
  | "hunting"
  | "error"
  | "dead";

export interface CharacterSummary {
  id: number;
  name: string;
  level: number;
  vocation: string;
  outfitId: number;
  outfitColors: {
    head: number;
    body: number;
    legs: number;
    feet: number;
  };
  hp?: number;
  maxHp?: number;
  mana?: number;
  maxMana?: number;
}

export interface SlotJSON {
  id: number;
  status: SlotStatus;
  errorMessage: string | null;
  account: { email: string } | null;
  character: CharacterSummary | null;
  catalog: CatalogHunt[];
  catalogCount: number;
  session: ReturnType<HuntSession["toJSON"]>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class Slot {
  id: number;
  status: SlotStatus = "idle";
  errorMessage: string | null = null;
  account: { email: string } | null = null;
  character: CharacterSummary | null = null;
  client: HunteraClient | null = null;
  socket: GameSocket | null = null;
  session: HuntSession = new HuntSession();
  catalog: CatalogHunt[] = [];
  catalogLoaded = false;
  accountPassword: string | null = null;
  reconnecting = false;
  onBroadcast?: () => void;

  constructor(id: number, onBroadcast?: () => void) {
    this.id = id;
    this.onBroadcast = onBroadcast;
  }

  resolveHuntDetailsFromCatalog(): void {
    if (!this.session.huntId || this.catalog.length === 0) return;
    const found = this.catalog.find(
      (h) => ((h as any).id ?? (h as any).huntId) === this.session.huntId,
    );
    if (found) {
      if (!this.session.huntName || this.session.huntName === this.session.huntId) {
        this.session.huntName =
          (found as any).name ?? (found as any).displayName ?? this.session.huntId;
      }
      if (Array.isArray((found as any).monsters) && !this.session.validMonsterNames) {
        this.session.validMonsterNames = new Set(
          (found as any).monsters.map((m: any) =>
            (typeof m === "string" ? m : m.name).toLowerCase(),
          ),
        );
      }
    }
  }

  syncHuntStatus(): void {
    if (this.status === "idle" || this.status === "logging_in" || this.status === "error") {
      return;
    }
    if (this.session.deathInfo?.isDead) {
      this.status = "dead";
    } else if (this.session.huntActive) {
      this.status = "hunting";
    } else if (this.status === "hunting") {
      this.status = "connected";
    }
  }

  setupSocketEvents(socket: GameSocket): void {
    socket.onMessage((msg: IncomingGameMessage) => {
      this.session.handleMessage(msg);

      if (msg.type === "welcome" && typeof (msg as any).playerId === "number") {
        this.session.gamePlayerId = (msg as any).playerId;
        this.onBroadcast?.();
      }

      if (msg.type === "hunt-catalog" && Array.isArray((msg as any).hunts)) {
        this.catalog = (msg as any).hunts;
        this.catalogLoaded = true;
        this.resolveHuntDetailsFromCatalog();
        this.syncHuntStatus();
        this.onBroadcast?.();
      }

      if (
        msg.type === "instance-enter" ||
        msg.type === "hunt-pending" ||
        msg.type === "hunt-analyzer-session" ||
        msg.type === "hunt-analyzer-update" ||
        msg.type === "hunt-leave-pending"
      ) {
        this.resolveHuntDetailsFromCatalog();
        this.syncHuntStatus();
        this.onBroadcast?.();
      }

      if (msg.type === "player-stats" && this.character) {
        if (typeof msg.level === "number") this.character.level = msg.level;
        if (typeof msg.vocation === "string")
          this.character.vocation = msg.vocation;
        if (typeof msg.health === "number") this.character.hp = msg.health;
        if (typeof msg.maxHealth === "number")
          this.character.maxHp = msg.maxHealth;
        if (typeof msg.hp === "number") this.character.hp = msg.hp;
        if (typeof msg.maxHp === "number") this.character.maxHp = msg.maxHp;
        if (typeof msg.mana === "number") this.character.mana = msg.mana;
        if (typeof msg.maxMana === "number")
          this.character.maxMana = msg.maxMana;
        this.syncHuntStatus();
        this.onBroadcast?.();
      }

      if (msg.type === "player-vitals" && this.character) {
        if (typeof msg.hp === "number") this.character.hp = msg.hp;
        if (typeof msg.maxHp === "number") this.character.maxHp = msg.maxHp;
        if (typeof msg.health === "number") this.character.hp = msg.health;
        if (typeof msg.maxHealth === "number")
          this.character.maxHp = msg.maxHealth;
        if (typeof msg.mana === "number") this.character.mana = msg.mana;
        if (typeof msg.maxMana === "number")
          this.character.maxMana = msg.maxMana;
        this.syncHuntStatus();
        this.onBroadcast?.();
      }

      if (msg.type === "creature-health") {
        this.onBroadcast?.();
      }

      if (
        msg.type === "creature-outfit" &&
        this.character &&
        msg.id === this.character.id
      ) {
        if (typeof msg.outfitId === "number")
          this.character.outfitId = msg.outfitId;
        if (msg.colors) this.character.outfitColors = msg.colors as any;
      }

      if (msg.type === "player-died") {
        console.log(
          `[Slot ${this.id}] Morte ativa detectada (player-died):`,
          JSON.stringify(msg),
        );
        if (this.socket && this.socket.isOpen()) {
          this.socket.send({ type: "request-death-history" });
        }
        this.onBroadcast?.();
      }

      if (
        msg.type === "death-history" ||
        msg.type === "blessings-status" ||
        msg.type === "training-update" ||
        msg.type === "item-values" ||
        msg.type === "market-prices"
      ) {
        this.onBroadcast?.();
      }

      if (msg.type === "system-message" && msg.message) {
        console.log(`[Slot ${this.id}] Mensagem do sistema:`, msg.message);
        const lowerMsg = String(msg.message).toLowerCase();
        const isExternalLogout =
          lowerMsg.includes("desconectado") ||
          lowerMsg.includes("deslogado") ||
          lowerMsg.includes("disconnected") ||
          lowerMsg.includes("outro local") ||
          lowerMsg.includes("outro dispositivo") ||
          lowerMsg.includes("outra sessão") ||
          lowerMsg.includes("outra sessao") ||
          lowerMsg.includes("outra conexão") ||
          lowerMsg.includes("outra conexao") ||
          lowerMsg.includes("logged out") ||
          lowerMsg.includes("conexão simultânea") ||
          lowerMsg.includes("conexao simultanea") ||
          lowerMsg.includes("login simultâneo") ||
          lowerMsg.includes("login simultaneo") ||
          lowerMsg.includes("sessão expirada") ||
          lowerMsg.includes("sessao expirada") ||
          lowerMsg.includes("sessão finalizada") ||
          lowerMsg.includes("sessao finalizada") ||
          lowerMsg.includes("sessão encerrada") ||
          lowerMsg.includes("sessao encerrada") ||
          lowerMsg.includes("você foi desconectado") ||
          lowerMsg.includes("voce foi desconectado") ||
          lowerMsg.includes("already connected") ||
          lowerMsg.includes("já conectado") ||
          lowerMsg.includes("ja conectado") ||
          lowerMsg.includes("kicked") ||
          lowerMsg.includes("expulso");

        if (isExternalLogout) {
          console.warn(
            `[Slot ${this.id}] Desconexão sinalizada pelo sistema:`,
            msg.message,
          );
          void this.disconnect(
            String(msg.message) || "Desconectado: o personagem foi conectado em outro local.",
          ).then(() => {
            this.onBroadcast?.();
          });
          return;
        }
      }

      if (
        msg.type &&
        (msg.type.includes("party") ||
          msg.type.includes("vip") ||
          msg.type.includes("friend"))
      ) {
        this.onBroadcast?.();
      }
    });

    socket.onClose((event) => {
      console.warn(
        `[Slot ${this.id}] Conexão WebSocket encerrada pelo servidor (código: ${event?.code || "desconhecido"}, motivo: ${event?.reason || "nenhum"}).`,
      );
      if (this.socket === socket) {
        this.socket = null;
      }
      if (this.status !== "idle" && this.character && !this.reconnecting) {
        const reasonLower = String(event?.reason || "").toLowerCase();
        const isExplicitDisconnect =
          event?.code === 1008 ||
          event?.code === 4001 ||
          reasonLower.includes("desconectado") ||
          reasonLower.includes("deslogado") ||
          reasonLower.includes("outro local") ||
          reasonLower.includes("duplicate") ||
          reasonLower.includes("another") ||
          reasonLower.includes("kicked");

        if (isExplicitDisconnect) {
          console.warn(
            `[Slot ${this.id}] Desconexão explícita detectada via close event.`,
          );
          void this.disconnect(
            event?.reason || "Desconectado: o personagem foi conectado em outro local.",
          ).then(() => {
            this.onBroadcast?.();
          });
          return;
        }

        const isTransfer = event?.code === 4003 || event?.reason === "transfer";
        void this.handleAutoReconnect(isTransfer);
      }
    });

    socket.onError((err) => {
      console.error(
        `[Slot ${this.id}] Erro no WebSocket:`,
        (err as Error)?.message || err,
      );
    });
  }

  async handleAutoReconnect(isTransfer: boolean): Promise<void> {
    if (this.reconnecting || (this.status as SlotStatus) === "idle" || !this.character) return;
    this.reconnecting = true;
    console.log(
      `[Slot ${this.id}] Auto-reconexão iniciada (${isTransfer ? "transferência de mundo" : "queda inesperada"})...`
    );

    const prevHuntActive = this.session.huntActive;
    const prevHuntId = this.session.huntId;
    const prevTier = this.session.tier;

    if (isTransfer) {
      await sleep(1000);
    }

    let attempts = 0;
    const maxAttempts = isTransfer ? 6 : 3;
    while (attempts < maxAttempts && (this.status as SlotStatus) !== "idle") {
      attempts++;
      try {
        console.log(`[Slot ${this.id}] Tentativa de reconexão ${attempts}/${maxAttempts}...`);
        await this.ensureSocket();

        // Se o slot foi desconectado pelo usuário durante a espera
        if ((this.status as SlotStatus) === "idle") {
          this.reconnecting = false;
          return;
        }

        this.reconnecting = false;

        if (prevHuntActive && prevHuntId && this.socket && this.socket.isOpen()) {
          try {
            this.socket.send({ type: "start-hunt", huntId: prevHuntId, tier: prevTier });
            this.status = "hunting";
          } catch {}
        } else {
          this.status = "connected";
        }

        console.log(`[Slot ${this.id}] Reconectado com sucesso após fechamento!`);
        this.onBroadcast?.();
        return;
      } catch (err: any) {
        console.warn(
          `[Slot ${this.id}] Falha na tentativa ${attempts} de reconexão: ${(err as Error).message}`
        );

        if ((this.status as SlotStatus) === "idle") {
          this.reconnecting = false;
          return;
        }

        const errMsg = String(err?.message || "").toLowerCase();
        const isExternalOrAuth =
          err?.status === 401 ||
          err?.status === 403 ||
          err?.status === 409 ||
          errMsg.includes("já conectado") ||
          errMsg.includes("ja conectado") ||
          errMsg.includes("already") ||
          errMsg.includes("in use") ||
          errMsg.includes("outro local") ||
          errMsg.includes("sessão inválida") ||
          errMsg.includes("sessao invalida") ||
          errMsg.includes("credenciais inválidas") ||
          errMsg.includes("unauthorized");

        if (isExternalOrAuth) {
          console.warn(
            `[Slot ${this.id}] Detectado conflito de login externo ou sessão expirada. Abortando reconexão.`,
          );
          this.reconnecting = false;
          await this.disconnect(
            err?.status === 409 || errMsg.includes("já conectado") || errMsg.includes("already")
              ? "Desconectado: o personagem já está conectado em outro local."
              : "Desconectado: a sessão foi encerrada em outro local.",
          );
          this.onBroadcast?.();
          return;
        }

        await sleep(isTransfer ? 1500 : 2000);
      }
    }

    this.reconnecting = false;
    if ((this.status as SlotStatus) !== "idle") {
      await this.disconnect(
        "Conexão perdida com o servidor do jogo. O personagem pode ter sido desconectado em outro local.",
      );
      this.onBroadcast?.();
    }
  }

  async ensureSocket(): Promise<GameSocket> {
    if (this.socket && this.socket.isOpen()) {
      return this.socket;
    }

    if (this.client && this.character) {
      console.log(
        `[Slot ${this.id}] Reconectando socket para ${this.character.name}...`,
      );
      try {
        const ticketResp = await this.client.gameTicket(String(this.character.id));
        const socket = new GameSocket({
          url: ticketResp.websocketUrl,
          ticket: ticketResp.ticket,
          headers: { Origin: "https://www.huntera.com.br" },
        });
        this.setupSocketEvents(socket);
        await socket.connect();
        this.socket = socket;
        console.log(
          `[Slot ${this.id}] Socket reconectado via gameTicket com sucesso!`,
        );
        return this.socket;
      } catch (err: any) {
        console.warn(
          `[Slot ${this.id}] Erro ao renovar ticket com client atual:`,
          (err as Error).message,
        );
        const errMsg = String(err?.message || "").toLowerCase();
        const isConflict =
          err?.status === 409 ||
          errMsg.includes("já conectado") ||
          errMsg.includes("ja conectado") ||
          errMsg.includes("already") ||
          errMsg.includes("in use");
        if (isConflict) {
          throw err;
        }
      }
    }

    if (this.account?.email && this.accountPassword && this.character) {
      console.log(
        `[Slot ${this.id}] Reautenticando client Huntera para ${this.account.email}...`,
      );
      this.client = new HunteraClient();
      await this.client.login(this.account.email, this.accountPassword);
      const ticketResp = await this.client.gameTicket(String(this.character.id));
      const socket = new GameSocket({
        url: ticketResp.websocketUrl,
        ticket: ticketResp.ticket,
        headers: { Origin: "https://www.huntera.com.br" },
      });
      this.setupSocketEvents(socket);
      await socket.connect();
      this.socket = socket;
      console.log(
        `[Slot ${this.id}] Socket reautenticado e conectado com sucesso!`,
      );
      return this.socket;
    }

    throw new Error(
      "Socket não conectado. Por favor, reconecte sua conta.",
    );
  }

  async login(email: string, password: string): Promise<SlotJSON> {
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
        id: Number(char.id),
        name: char.name,
        level: char.level,
        vocation: char.vocation ?? "none",
        outfitId: char.outfitId ?? 128,
        outfitColors: char.outfitColors ?? {
          head: 0,
          body: 0,
          legs: 0,
          feet: 0,
        },
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

      if (this.socket && this.socket.isOpen()) {
        try {
          this.socket.send({ type: "blessings-open" });
        } catch {}
      }

      const start = Date.now();
      while (!this.catalogLoaded && Date.now() - start < 8000) {
        await sleep(200);
      }

      this.resolveHuntDetailsFromCatalog();
      this.syncHuntStatus();

      if (this.session.deathInfo?.isDead) {
        this.status = "dead";
      } else {
        this.status = this.session.huntActive ? "hunting" : "connected";
      }
      return this.toJSON();
    } catch (err) {
      this.status = "error";
      this.errorMessage = (err as Error).message || "Erro na autenticação";
      throw err;
    }
  }

  async startHunt(
    huntId: string,
    tier: number | string = 0,
  ): Promise<SlotJSON> {
    await this.ensureSocket();

    const hunt = this.catalog.find(
      (h) => ((h as any).id ?? (h as any).huntId) === huntId,
    );
    if (!hunt) {
      throw new Error(`Caçada "${huntId}" não encontrada no catálogo.`);
    }

    const huntName =
      (hunt as any).name ?? (hunt as any).displayName ?? huntId;
    const validMonsters = (hunt as any).monsters?.map((m: any) => m.name) ?? [];
    const chosenTier =
      typeof tier === "number" ? tier : parseInt(tier, 10) || 0;

    this.session.tier = chosenTier;
    this.session.setHunt(huntId, huntName, validMonsters);
    this.socket!.send({ type: "start-hunt", huntId, tier: chosenTier });
    this.status = "hunting";

    return this.toJSON();
  }

  async leaveHunt(): Promise<SlotJSON> {
    if (this.socket && this.socket.isOpen()) {
      try {
        console.log(`[Slot ${this.id}] Enviando leave-hunt ao servidor...`);
        this.socket.send({ type: "leave-hunt" });
      } catch (err) {
        console.warn(`[Slot ${this.id}] Erro ao enviar leave-hunt:`, err);
      }

      // Aguarda até 6.5s verificando se o servidor confirmou a saída para a cidade
      const startWait = Date.now();
      let retrySent = false;
      while (Date.now() - startWait < 6500 && this.session.huntActive) {
        await sleep(250);
        // Se após 2.5s o servidor não confirmou saída nem enviou leavePending, reenvia leave-hunt
        if (
          !retrySent &&
          Date.now() - startWait > 2500 &&
          this.session.huntActive &&
          !this.session.leavePendingMs
        ) {
          retrySent = true;
          try {
            console.log(`[Slot ${this.id}] Reenviando leave-hunt após 2.5s sem confirmação...`);
            this.socket.send({ type: "leave-hunt" });
          } catch {}
        }
      }
    }

    // Se o servidor confirmou que saiu da caçada (session.huntActive virou false) ou socket caiu:
    if (!this.session.huntActive || !this.socket || !this.socket.isOpen()) {
      console.log(`[Slot ${this.id}] Saída da caçada confirmada.`);
      this.session.resetSession();
      this.status = this.socket && this.socket.isOpen() ? "connected" : "idle";
    } else {
      console.warn(
        `[Slot ${this.id}] Servidor ainda não confirmou saída da caçada após timeout. Mantendo status hunting.`,
      );
    }

    this.onBroadcast?.();
    return this.toJSON();
  }

  async startTraining(skill: string, repeat = false): Promise<SlotJSON> {
    await this.ensureSocket();
    this.socket!.send({
      type: "start-training",
      mode: "online",
      skill,
      ...(repeat ? { repeat: true } : {}),
    });
    return this.toJSON();
  }

  async leaveTraining(): Promise<SlotJSON> {
    await this.ensureSocket();
    this.socket!.send({ type: "leave-training" });
    return this.toJSON();
  }

  async disconnect(reason: string | null = null): Promise<void> {
    this.reconnecting = false;
    this.status = "idle";
    this.errorMessage = reason || null;
    this.accountPassword = null;

    const sock = this.socket;
    this.socket = null;
    if (sock) {
      try {
        if (this.session.huntActive) {
          sock.send({ type: "leave-hunt" });
        }
        sock.logout();
      } catch {}
      try {
        sock.close();
      } catch {}
    }

    this.client = null;
    this.account = null;
    this.character = null;
    this.catalog = [];
    this.catalogLoaded = false;
    this.session.resetSession();
  }

  async revive(): Promise<SlotJSON> {
    await this.ensureSocket();
    this.socket!.send({ type: "revive" });
    this.session.revive();
    if (this.session.deathInfo) {
      this.session.deathInfo.isDead = false;
      this.session.deathInfo.diedAt = null;
    }
    if (this.character) {
      const restoredHp = this.character.maxHp || this.session.playerState.maxHp || 100;
      this.character.hp = restoredHp;
      this.session.playerState.hp = restoredHp;
    }
    this.status = "connected";
    try {
      this.socket!.send({ type: "blessings-open" });
    } catch {}
    this.onBroadcast?.();
    return this.toJSON();
  }

  async dismissDeath(): Promise<SlotJSON> {
    this.session.dismissDeath();
    this.status = this.session.huntActive ? "hunting" : (this.socket && this.socket.isOpen() ? "connected" : "idle");
    return this.toJSON();
  }

  async buyBlessing(id = "all"): Promise<SlotJSON> {
    await this.ensureSocket();
    this.socket!.send({ type: "blessings-open" });
    this.socket!.send({ type: "blessing-buy", id });
    await sleep(350);
    this.socket!.send({ type: "blessings-open" });
    return this.toJSON();
  }

  async openBlessings(): Promise<SlotJSON> {
    await this.ensureSocket();
    this.socket!.send({ type: "blessings-open" });
    return this.toJSON();
  }

  toJSON(): SlotJSON {
    let currentStatus = this.status;
    if (
      this.status === "idle" ||
      this.status === "logging_in" ||
      this.status === "error"
    ) {
      currentStatus = this.status;
    } else if (this.session.deathInfo?.isDead) {
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
