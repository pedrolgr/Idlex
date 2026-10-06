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

      if (msg.type === "death-history" || msg.type === "blessings-status") {
        this.onBroadcast?.();
      }

      if (msg.type === "system-message" && msg.message) {
        console.log(`[Slot ${this.id}] Mensagem do sistema:`, msg.message);
        const lowerMsg = String(msg.message).toLowerCase();
        if (
          lowerMsg.includes("desconectado") ||
          lowerMsg.includes("disconnected") ||
          lowerMsg.includes("outro local") ||
          lowerMsg.includes("logged out")
        ) {
          console.warn(
            `[Slot ${this.id}] Desconexão sinalizada pelo sistema:`,
            msg.message,
          );
          void this.disconnect(String(msg.message));
          this.onBroadcast?.();
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
    if (this.reconnecting || this.status === "idle" || !this.character) return;
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
    const maxAttempts = 6;
    while (attempts < maxAttempts && (this.status as SlotStatus) !== "idle") {
      attempts++;
      try {
        console.log(`[Slot ${this.id}] Tentativa de reconexão ${attempts}/${maxAttempts}...`);
        await this.ensureSocket();
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
      } catch (err) {
        console.warn(
          `[Slot ${this.id}] Falha na tentativa ${attempts} de reconexão: ${(err as Error).message}`
        );
        await sleep(isTransfer ? 1500 : 2500);
      }
    }

    this.reconnecting = false;
    if ((this.status as SlotStatus) !== "idle") {
      this.status = "error";
      this.errorMessage = "Conexão perdida com o servidor do jogo.";
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
      } catch (err) {
        console.warn(
          `[Slot ${this.id}] Erro ao renovar ticket com client atual:`,
          (err as Error).message,
        );
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
    await this.ensureSocket();

    try {
      this.socket!.send({ type: "leave-hunt" });
    } catch {}

    await sleep(5200);
    this.session.resetSession();
    this.status = "connected";

    return this.toJSON();
  }

  async disconnect(reason: string | null = null): Promise<void> {
    this.reconnecting = false;
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
    this.status = this.session.huntActive ? "hunting" : "connected";
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
