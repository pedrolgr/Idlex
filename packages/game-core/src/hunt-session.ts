import type { IncomingGameMessage } from "@idlex/protocol";
import {
  HUNTERA_ITEM_SELL_PRICES,
  HUNTERA_SUPPLY_PRICES,
} from "./constants.js";
import { HUNTERA_AUCTION_PRICES } from "./auction-prices.js";
import {
  formatDuration,
  formatEstimatedTime,
  formatStamina,
  getStaminaTier,
  parseHuntTier,
  searchHunts,
} from "./helpers.js";
import {
  handleActionBarPresets,
  handleActionBarUpdate,
} from "./handlers/action-bar.js";
import {
  handleCreatureAppear,
  handleCreatureDisappear,
  handleCreatureHealth,
  handleCreatureSay,
} from "./handlers/creatures.js";
import {
  handleBlessingsStatus,
  handleDeathFilmOffer,
  handleDeathHistory,
  handlePlayerDied,
} from "./handlers/death.js";
import {
  handleHuntAnalyzerSession,
  handleHuntAnalyzerUpdate,
  handleHuntLeavePending,
  handleHuntPending,
  handleInstanceEnter,
} from "./handlers/hunt.js";
import {
  handleEquippedItems,
  handleItemOnGround,
  handleLootAdd,
  handleMarketPrices,
  handlePlayerInventory,
} from "./handlers/inventory.js";
import {
  handlePartyCostsCancelled,
  handlePartyInviteConfirm,
  handlePartyInvited,
  handlePartyUpdate,
  handleTransferBegin,
  handleTransferOffer,
} from "./handlers/party.js";
import {
  handleBestiaryProgress,
  handleExperienceGain,
  handlePlayerStats,
  handlePlayerVitals,
} from "./handlers/stats.js";
import { handleFriendsList, handleVipStatus } from "./handlers/vip.js";
import type {
  BagLootEntry,
  BlessingsState,
  DeathInfo,
  FloorDropEntry,
  HourlyRates,
  HuntSessionJSON,
  HuntSessionOptions,
  InventoryState,
  LootEntry,
  PartyInviteState,
  PartyState,
  PlayerState,
  PriceMode,
  SkillSummaryItem,
  SuppliesEntry,
  TrainingState,
  TransferOfferState,
} from "./types.js";

export {
  formatDuration,
  formatEstimatedTime,
  formatStamina,
  getStaminaTier,
  parseHuntTier,
  searchHunts,
};

function lastStatusLinesA(n: number): string {
  return `${n}A\x1b[J`;
}

export class HuntSession {
  huntId: string | null;
  huntName: string | null;
  tier: number;
  playerId: number | null = null;
  playerName: string | null = null;
  gamePlayerId: number | null = null;

  validMonsterNames: Set<string> | null;
  creatures: Map<number, { id: number; name: string; kind: string }> = new Map();
  killsByName: Map<string, number> = new Map();
  monsterDeaths = 0;
  experienceGained = 0;

  playerState: PlayerState = {};
  huntPending = false;
  huntSessionRemainingMs: number | null = null;
  lastMessageAt: Date = new Date();
  lastStatusLines = 0;

  startedAt: number | null = null;
  localStartedAt: number | null = null;
  durationMs = 0;
  lootValue = 0;
  waste = 0;
  balance = 0;

  suppliesMap: Map<number, SuppliesEntry> = new Map();
  realtimeWaste = 0;

  huntStartGold: number | null = null;
  goldGainedInBag = 0;
  bagLootMap: Map<string | number, BagLootEntry> = new Map();
  floorDrops: FloorDropEntry[] = [];
  npcSellPrices: Map<number, number> = new Map();

  inventory: InventoryState = {
    backpack: [],
    satchel: [],
    gold: 0,
  };

  lootMap: Map<string | number, LootEntry> = new Map();
  supplies: unknown[] = [];
  loot: LootEntry[] = [];

  leavePendingMs: number | null = null;
  huntActive: boolean;
  showDetails = false;

  experience = 0;
  experienceNeeded = 0;

  magicLevel = 0;
  magicProgress = 0;
  magicProgressNeeded = 0;
  skills: Record<string, number> = {};
  skillProgress: Record<string, number> = {};
  skillProgressNeeded: Record<string, number> = {};

  bestiaryKills: Map<string, number> = new Map();
  bestiarySummary = { completed: 0, total: 0, bonusPercent: 0 };

  priceMode: PriceMode = "npc";
  auctionPrices: Map<number, number> = new Map();
  customPrices: Map<number, number> = new Map();

  actionBarSlots: unknown[] = Array(20).fill(null);
  actionBarPresets: string[] = ["Default"];
  activeActionBarPreset = 0;
  actionBarManaged = false;

  friends: Array<{
    name: string;
    online: boolean;
    level: number | null;
    vocation: string | null;
    lastSeenAt: number | null;
  }> = [];
  party: PartyState | null = null;
  partyInvite: PartyInviteState | null = null;
  transferOffer: TransferOfferState | null = null;

  deathInfo: DeathInfo = {
    isDead: false,
    diedAt: null,
    killer: null,
    where: null,
    lostExperience: null,
    lostLevels: null,
    skillsLost: [],
    blessingsSpent: 0,
    blessings: [],
    freeBless: false,
    lostItems: [],
    hits: [],
    levelBefore: null,
    levelAfter: null,
    experienceBefore: null,
    experienceAfter: null,
  };
  dismissedDeathAt: number | null = null;

  blessings: BlessingsState = {
    owned: [],
    cost: 0,
    freeUntilLevel: 80,
    lossReductionPercent: 40,
    equipmentLossPercent: 0,
  };
  training: TrainingState = {
    active: false,
    skill: null,
    etaMs: null,
    exercise: false,
  };

  constructor({
    huntId = null,
    huntName = null,
    tier = 0,
    validMonsters = null,
  }: HuntSessionOptions = {}) {
    this.huntId = huntId;
    this.huntName = huntName;
    this.tier = tier;
    this.huntActive = Boolean(huntId);

    this.validMonsterNames = Array.isArray(validMonsters)
      ? new Set(
          validMonsters.map((m) =>
            (typeof m === "string" ? m : (m as { name: string }).name).toLowerCase(),
          ),
        )
      : null;
  }

  revive(): void {
    if (this.deathInfo) {
      this.dismissedDeathAt = this.deathInfo.diedAt || Date.now();
      this.deathInfo.isDead = false;
    }
    this.huntActive = false;
  }

  dismissDeath(): void {
    if (this.deathInfo) {
      this.dismissedDeathAt = this.deathInfo.diedAt || Date.now();
      this.deathInfo.isDead = false;
    }
  }

  setLocalActionSlot(slot: number | string, rule: unknown): void {
    const s = Number(slot);
    if (s >= 0 && s < 20) {
      while (this.actionBarSlots.length < 20) this.actionBarSlots.push(null);
      this.actionBarSlots[s] = rule ?? null;
    }
  }

  setPlayerId(id: number | string | null | undefined): void {
    if (id !== undefined && id !== null) {
      this.playerId = Number(id);
    }
  }

  setPlayerName(name: string | null | undefined): void {
    if (name) {
      this.playerName = String(name);
    }
  }

  setHunt(
    huntId: string | null,
    huntName: string | null,
    validMonsters: Array<string | { name: string }> | null = null,
  ): void {
    this.huntId = huntId;
    this.huntName = huntName;
    this.huntActive = true;
    this.localStartedAt = Date.now();
    this.leavePendingMs = null;

    this.huntStartGold =
      this.inventory &&
      typeof this.inventory.gold === "number" &&
      this.inventory.gold > 0
        ? this.inventory.gold
        : null;
    this.goldGainedInBag = 0;
    this.bagLootMap.clear();
    this.floorDrops = [];
    this.suppliesMap.clear();
    this.realtimeWaste = 0;
    this.lootValue = 0;
    this.waste = 0;
    this.balance = 0;
    this.loot = [];

    this.creatures.clear();
    this.killsByName.clear();
    this.monsterDeaths = 0;

    this.validMonsterNames = Array.isArray(validMonsters)
      ? new Set(
          validMonsters.map((m) =>
            (typeof m === "string" ? m : m.name).toLowerCase(),
          ),
        )
      : null;
  }

  resetSession(): void {
    this.huntId = null;
    this.huntName = null;
    this.huntActive = false;
    this.validMonsterNames = null;
    this.creatures.clear();
    this.killsByName.clear();
    this.monsterDeaths = 0;
    this.experienceGained = 0;
    this.huntPending = false;
    this.huntSessionRemainingMs = null;
    this.startedAt = null;
    this.localStartedAt = null;
    this.durationMs = 0;
    this.lootValue = 0;
    this.waste = 0;
    this.balance = 0;
    this.suppliesMap.clear();
    this.realtimeWaste = 0;
    this.lootMap.clear();
    this.bagLootMap.clear();
    this.floorDrops = [];
    this.huntStartGold = null;
    this.goldGainedInBag = 0;
    this.supplies = [];
    this.loot = [];
    this.inventory = {
      backpack: [],
      satchel: [],
      gold: 0,
    };
    this.leavePendingMs = null;
    this.lastStatusLines = 0;
  }

  toggleDetails(): boolean {
    this.showDetails = !this.showDetails;
    return this.showDetails;
  }

  get bagTrackingActive(): boolean {
    return this.huntStartGold !== null || this.bagLootMap.size > 0;
  }

  setPriceMode(mode: PriceMode): void {
    if (["npc", "auction", "custom"].includes(mode)) {
      this.priceMode = mode;
      this.recalculateFinancials();
    }
  }

  setCustomPrice(itemId: number | string, price: number | string): void {
    const id = Number(itemId);
    const p = Number(price);
    if (!Number.isNaN(id) && !Number.isNaN(p) && p >= 0) {
      this.customPrices.set(id, p);
      this.recalculateFinancials();
    }
  }

  getItemEffectivePrice(itemId: number | undefined, defaultNpc = 0): number {
    if (itemId === undefined) return defaultNpc;
    if (this.priceMode === "custom" && this.customPrices.has(itemId)) {
      return this.customPrices.get(itemId)!;
    }
    if (this.priceMode === "auction") {
      if (this.auctionPrices.has(itemId)) {
        return this.auctionPrices.get(itemId)!;
      }
      if (itemId in HUNTERA_AUCTION_PRICES) {
        return HUNTERA_AUCTION_PRICES[itemId]!;
      }
    }
    return (
      this.npcSellPrices.get(itemId) ??
      (HUNTERA_ITEM_SELL_PRICES[itemId] ?? defaultNpc)
    );
  }

  recalculateFinancials(): void {
    for (const item of this.bagLootMap.values()) {
      if (item.itemId) {
        item.unitValue = this.getItemEffectivePrice(
          item.itemId,
          item.unitValue || 0,
        );
        item.totalValue = item.count * item.unitValue;
      }
    }

    for (const drop of this.lootMap.values()) {
      if (drop.itemId) {
        drop.unitValue = this.getItemEffectivePrice(
          drop.itemId,
          drop.unitValue || 0,
        );
        drop.value = drop.count * drop.unitValue;
      }
    }
    this.loot = [...this.lootMap.values()].sort(
      (a, b) => (b.value || 0) - (a.value || 0),
    );

    if (this.huntActive || this.bagTrackingActive) {
      this.lootValue = this.getBagLootValue();
      this.balance = this.lootValue - this.waste;
    }
  }

  getBagItemsValue(): number {
    return Array.from(this.bagLootMap.values())
      .filter((it) => it.itemId !== 3031)
      .reduce((sum, it) => sum + (it.totalValue || 0), 0);
  }

  getBagLootValue(): number {
    return this.goldGainedInBag + this.getBagItemsValue();
  }

  getRemainingXp(): number {
    if (this.experienceNeeded > this.experience) {
      return this.experienceNeeded - this.experience;
    }
    return 0;
  }

  getXpProgressPercent(): number {
    if (this.experienceNeeded > 0) {
      return Math.min(
        100,
        Math.max(0, Math.floor((this.experience / this.experienceNeeded) * 100)),
      );
    }
    return 0;
  }

  getHourlyRates(): HourlyRates {
    let elapsedMs = 0;
    if (this.durationMs > 0) {
      elapsedMs = this.durationMs;
    } else if (this.localStartedAt) {
      elapsedMs = Math.max(0, Date.now() - this.localStartedAt);
    }
    const elapsedSeconds = elapsedMs / 1000;
    const remainingXp = this.getRemainingXp();

    if (elapsedSeconds <= 0) {
      return {
        elapsedSeconds: 0,
        goldPerHour: 0,
        wastePerHour: 0,
        balancePerHour: 0,
        xpPerHour: 0,
        secondsToNextLevel: null,
        timeToNextLevelFormatted: "--",
        goldPerHourFormatted: "0 gp/h",
        wastePerHourFormatted: "0 gp/h",
        balancePerHourFormatted: "0 gp/h",
        xpPerHourFormatted: "0 XP/h",
      };
    }

    const factor = 3600 / elapsedSeconds;
    const goldPerHour = Math.round(this.lootValue * factor);
    const wastePerHour = Math.round(this.waste * factor);
    const balancePerHour = Math.round(this.balance * factor);
    const xpPerHour = Math.round(this.experienceGained * factor);

    let secondsToNextLevel: number | null = null;
    let timeToNextLevelFormatted = "--";

    if (remainingXp <= 0 && this.experienceNeeded > 0) {
      secondsToNextLevel = 0;
      timeToNextLevelFormatted = "0s";
    } else if (xpPerHour > 0 && remainingXp > 0) {
      secondsToNextLevel = Math.round((remainingXp / xpPerHour) * 3600);
      timeToNextLevelFormatted = formatEstimatedTime(secondsToNextLevel);
    } else if (this.experienceGained === 0) {
      timeToNextLevelFormatted = "Calculando...";
    }

    return {
      elapsedSeconds,
      goldPerHour,
      wastePerHour,
      balancePerHour,
      xpPerHour,
      secondsToNextLevel,
      timeToNextLevelFormatted,
      goldPerHourFormatted: `${goldPerHour.toLocaleString("pt-BR")} gp/h`,
      wastePerHourFormatted: `${wastePerHour.toLocaleString("pt-BR")} gp/h`,
      balancePerHourFormatted: `${balancePerHour >= 0 ? "+" : ""}${balancePerHour.toLocaleString("pt-BR")} gp/h`,
      xpPerHourFormatted: `${xpPerHour.toLocaleString("pt-BR")} XP/h`,
    };
  }

  getSkillsSummary(): SkillSummaryItem[] {
    const list: SkillSummaryItem[] = [];
    if (this.magicLevel > 0 || this.magicProgressNeeded > 0 || this.magicProgress > 0) {
      const needed = this.magicProgressNeeded || 1;
      const prog = this.magicProgress || 0;
      const rem = Math.max(0, needed - prog);
      const pct = Math.min(100, Math.max(0, Math.floor((prog / needed) * 100)));
      list.push({
        id: "magic",
        name: "Magic Level",
        level: this.magicLevel,
        progress: prog,
        needed,
        remaining: rem,
        percent: pct,
      });
    }

    const SKILL_NAMES: Record<string, string> = {
      sword: "Sword Fighting",
      axe: "Axe Fighting",
      club: "Club Fighting",
      distance: "Distance",
      shielding: "Shielding",
      fishing: "Fishing",
      fist: "Fist Fighting",
    };

    for (const [key, lvl] of Object.entries(this.skills || {})) {
      const prog = this.skillProgress?.[key] || 0;
      const needed = this.skillProgressNeeded?.[key] || 1;
      const rem = Math.max(0, needed - prog);
      const pct = Math.min(100, Math.max(0, Math.floor((prog / needed) * 100)));
      list.push({
        id: key,
        name: SKILL_NAMES[key] || key,
        level: lvl,
        progress: prog,
        needed,
        remaining: rem,
        percent: pct,
      });
    }
    return list;
  }

  getBestiaryKills(monsterName: string | null | undefined): number | null {
    if (!monsterName) return null;
    const clean = monsterName.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (this.bestiaryKills.has(clean)) return this.bestiaryKills.get(clean)!;
    return null;
  }

  recordDrop(it: {
    itemId?: number;
    name?: string;
    count?: number;
    value?: number;
  }): void {
    if (!it || !it.name || it.name.toLowerCase() === "unknown") return;
    const key = it.itemId || it.name;
    const count = it.count || 1;
    const defaultVal = it.value
      ? Math.floor(it.value / count)
      : it.itemId === 3031
        ? 1
        : 0;
    const unitVal = this.getItemEffectivePrice(it.itemId, defaultVal);
    const prev = this.lootMap.get(key) || {
      itemId: it.itemId,
      name: it.name,
      count: 0,
      value: 0,
      unitValue: unitVal,
      inBag: false,
    };
    prev.count += count;
    prev.unitValue = unitVal;
    prev.value = prev.count * prev.unitValue;
    this.lootMap.set(key, prev);
    this.loot = [...this.lootMap.values()].sort(
      (a, b) => (b.value || 0) - (a.value || 0),
    );
  }

  _recordDrop(it: {
    itemId?: number;
    name?: string;
    count?: number;
    value?: number;
  }): void {
    this.recordDrop(it);
  }

  handleMessage(message: IncomingGameMessage | Record<string, unknown>): void {
    if (!message || typeof message !== "object") return;
    this.lastMessageAt = new Date();

    const type = (message as { type: string }).type;
    switch (type) {
      case "creature-appear":
        handleCreatureAppear(this, message as any);
        break;
      case "creature-disappear":
        handleCreatureDisappear(this, message as any);
        break;
      case "experience-gain":
        handleExperienceGain(this, message as any);
        break;
      case "player-stats":
        handlePlayerStats(this, message as any);
        break;
      case "player-vitals":
        handlePlayerVitals(this, message as any);
        break;
      case "bestiary-progress":
      case "bestiary-update":
        handleBestiaryProgress(this, message as any);
        break;
      case "market-prices":
      case "item-values":
        handleMarketPrices(this, message as any);
        break;
      case "creature-say":
      case "creature-speech":
        handleCreatureSay(this, message as any);
        break;
      case "player-inventory":
      case "inventory-delta":
      case "inventory-update":
        handlePlayerInventory(this, message as any);
        break;
      case "equipped-items":
        handleEquippedItems(this, message as any);
        break;
      case "loot-add":
        handleLootAdd(this, message as any);
        break;
      case "item-on-ground":
        handleItemOnGround(this, message as any);
        break;
      case "hunt-pending":
        handleHuntPending(this, message as any);
        break;
      case "hunt-analyzer-session":
        handleHuntAnalyzerSession(this, message as any);
        break;
      case "hunt-analyzer-update":
        handleHuntAnalyzerUpdate(this, message as any);
        break;
      case "hunt-leave-pending":
        handleHuntLeavePending(this, message as any);
        break;
      case "instance-enter":
        handleInstanceEnter(this, message as any);
        break;
      case "action-bar-update":
        handleActionBarUpdate(this, message as any);
        break;
      case "welcome":
        if (typeof (message as any).playerId === "number") {
          this.gamePlayerId = (message as any).playerId;
        }
        break;
      case "training-update": {
        const trainMsg = message as any;
        this.training = {
          active: Boolean(trainMsg.active),
          skill: trainMsg.skill ?? null,
          etaMs: typeof trainMsg.etaMs === "number" ? trainMsg.etaMs : null,
          exercise: Boolean(trainMsg.exercise),
        };
        break;
      }
      case "action-bar-presets":
        handleActionBarPresets(this, message as any);
        break;
      case "friends-list":
      case "vip-list":
        handleFriendsList(this, message as any);
        break;
      case "vip-status":
        handleVipStatus(this, message as any);
        break;
      case "party-update":
        handlePartyUpdate(this, message as any);
        break;
      case "party-invited":
        handlePartyInvited(this, message as any);
        break;
      case "transfer-offer":
        handleTransferOffer(this, message as any);
        break;
      case "transfer-begin":
        handleTransferBegin(this, message as any);
        break;
      case "party-costs-cancelled":
        handlePartyCostsCancelled(this, message as any);
        break;
      case "party-invite-confirm":
        handlePartyInviteConfirm(this, message as any);
        break;
      case "creature-health":
        handleCreatureHealth(this, message as any);
        break;
      case "player-died":
        handlePlayerDied(this, message as any);
        break;
      case "death-film-offer":
        handleDeathFilmOffer(this, message as any);
        break;
      case "death-history":
        handleDeathHistory(this, message as any);
        break;
      case "blessings-status":
        handleBlessingsStatus(this, message as any);
        break;
      default:
        break;
    }
  }

  getElapsedTimeFormatted(): string {
    let elapsedMs = 0;
    if (this.durationMs > 0) {
      elapsedMs = this.durationMs;
    } else if (this.localStartedAt) {
      elapsedMs = Math.max(0, Date.now() - this.localStartedAt);
    } else if (this.startedAt) {
      elapsedMs = Math.max(0, Date.now() - this.startedAt);
    }
    return formatDuration(elapsedMs);
  }

  formatStatusLines(): string[] {
    const elapsed = this.getElapsedTimeFormatted();
    const hp =
      this.playerState.hp !== undefined &&
      this.playerState.maxHp !== undefined
        ? `HP ${this.playerState.hp}/${this.playerState.maxHp}`
        : "HP ?/?";
    const level =
      this.playerState.level !== undefined
        ? `Nível ${this.playerState.level}`
        : "Nível ?";
    const pending = this.huntPending ? " [ativa]" : "";
    const huntLabel = this.huntName ?? this.huntId ?? "Nenhuma";

    const sign = this.balance >= 0 ? "+" : "";
    const balanceFormatted = `${sign}${this.balance.toLocaleString("pt-BR")} gp`;
    const lootFormatted = `${this.lootValue.toLocaleString("pt-BR")} gp`;
    const wasteFormatted = `${this.waste.toLocaleString("pt-BR")} gp`;

    const killLines = [...this.killsByName.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => `    • ${name}: ${count}`);

    const staminaStr =
      this.playerState.staminaMs !== undefined &&
      this.playerState.staminaMs !== null
        ? ` | ⚡ Stamina: ${formatStamina(this.playerState.staminaMs)}`
        : "";

    const rates = this.getHourlyRates();
    const lines = [
      `── Caçada: ${huntLabel}${pending} ──────────────────────────────────────`,
      `   ⏱ Tempo: ${elapsed} | ${level} | ${hp}${staminaStr}`,
      `   💰 Lucro: ${balanceFormatted} (Loot: ${lootFormatted} | Gastos: ${wasteFormatted})`,
      `   ⭐ XP acumulada: ${this.experienceGained.toLocaleString("pt-BR")}`,
      `   🗡 Monstros mortos: ${this.monsterDeaths}${this.monsterDeaths === 0 ? " (aguardando abates…)" : ""}`,
      ...killLines,
    ];

    if (this.huntActive && rates.elapsedSeconds > 0) {
      lines.splice(
        3,
        0,
        `   📊 Por hora: Saldo: ${rates.balancePerHourFormatted} | Gold: ${rates.goldPerHourFormatted} | Prejuízo: -${rates.wastePerHourFormatted}`,
      );
      lines.splice(
        5,
        0,
        `   ⏳ Próx. Nível em: ${rates.timeToNextLevelFormatted} (${rates.xpPerHourFormatted})`,
      );
    }

    if (this.showDetails) {
      lines.push("   ── Itens Dropados (Loot) ───────────────────────────");
      if (this.loot.length === 0) {
        lines.push("      (Nenhum item dropado até o momento)");
      } else {
        const sortedLoot = [...this.loot].sort(
          (a, b) => (b.value ?? 0) - (a.value ?? 0),
        );
        for (const item of sortedLoot) {
          const val = item.value
            ? `${item.value.toLocaleString("pt-BR")} gp`
            : "0 gp";
          lines.push(`      • ${item.name} x${item.count} (${val})`);
        }
      }

      lines.push("   ── Suprimentos Utilizados (Gastos) ──────────────────");
      if (this.supplies.length === 0) {
        lines.push("      (Nenhum suprimento gasto)");
      } else {
        const sortedSupplies = [...(this.supplies as any[])].sort(
          (a, b) => (b.value ?? 0) - (a.value ?? 0),
        );
        for (const sup of sortedSupplies) {
          const val = sup.value
            ? `${sup.value.toLocaleString("pt-BR")} gp`
            : "0 gp";
          lines.push(`      • ${sup.name} x${sup.count} (${val})`);
        }
      }
    }

    if (this.leavePendingMs !== null) {
      const s = Math.ceil(this.leavePendingMs / 1000);
      lines.push(`   🚪 Saindo da caçada em ${s}s...`);
    }

    lines.push(`────────────────────────────────────────────────────────────`);
    lines.push(
      `[Comandos: (l) Sair da caçada | (d) ${this.showDetails ? "Ocultar" : "Ver"} detalhes | (q) Encerrar]`,
    );

    return lines;
  }

  renderStatus(out: NodeJS.WriteStream = process.stdout): void {
    if (!this.huntId && !this.huntName) return;

    const lines = this.formatStatusLines();

    if (out.isTTY && this.lastStatusLines > 0) {
      out.write(`\x1b[${lastStatusLinesA(this.lastStatusLines)}`);
    }

    out.write(lines.join("\n") + "\n");
    this.lastStatusLines = lines.length;
  }

  toJSON(): HuntSessionJSON {
    const elapsedMs =
      this.durationMs > 0
        ? this.durationMs
        : this.localStartedAt
          ? Math.max(0, Date.now() - this.localStartedAt)
          : this.startedAt
            ? Math.max(0, Date.now() - this.startedAt)
            : 0;

    const staminaMs = this.playerState.staminaMs ?? null;
    const staminaFormatted = formatStamina(staminaMs);
    const staminaTier = getStaminaTier(staminaMs);
    const rates = this.getHourlyRates();

    return {
      huntId: this.huntId,
      huntName: this.huntName,
      tier: this.tier,
      huntActive: this.huntActive,
      leavePendingMs: this.leavePendingMs,
      elapsedFormatted: this.getElapsedTimeFormatted(),
      elapsedMs,
      monsterDeaths: this.monsterDeaths,
      killsByName: Object.fromEntries(this.killsByName),
      experienceGained: this.experienceGained,
      playerState: {
        level: this.playerState.level ?? null,
        hp: this.playerState.hp ?? null,
        maxHp: this.playerState.maxHp ?? null,
        mana: this.playerState.mana ?? null,
        maxMana: this.playerState.maxMana ?? null,
        staminaMs,
        staminaFormatted,
        staminaTier,
        staminaDraining: this.playerState.staminaDraining ?? false,
      },
      staminaFormatted,
      experience: this.experience,
      experienceNeeded: this.experienceNeeded,
      remainingXp: this.getRemainingXp(),
      xpPercent: this.getXpProgressPercent(),
      skills: this.getSkillsSummary(),
      bestiary: {
        kills: Object.fromEntries(this.bestiaryKills),
        summary: this.bestiarySummary,
      },
      priceMode: this.priceMode,
      totalGold: this.inventory.gold || 0,
      goldGainedInBag: this.goldGainedInBag,
      itemsValue: this.getBagItemsValue(),
      lootValue: this.lootValue,
      waste: this.waste,
      balance: this.balance,
      rates,
      goldPerHour: rates.goldPerHour,
      wastePerHour: rates.wastePerHour,
      balancePerHour: rates.balancePerHour,
      xpPerHour: rates.xpPerHour,
      timeToNextLevelSeconds: rates.secondsToNextLevel,
      timeToNextLevelFormatted: rates.timeToNextLevelFormatted,
      killsDetailed: [...this.killsByName.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({
          name,
          count,
          bestiaryKills: this.getBestiaryKills(name),
        })),
      bagLoot: [...this.bagLootMap.values()],
      loot: this.loot,
      supplies: this.supplies,
      suppliesUsed:
        this.suppliesMap.size > 0
          ? [...this.suppliesMap.values()].sort(
              (a, b) => b.totalCost - a.totalCost,
            )
          : (this.supplies || [])
              .map((s: any) => ({
                itemId: s.itemId,
                name: s.name,
                count: s.count,
                unitPrice:
                  s.count && s.count > 0
                    ? Math.round((s.value || 0) / s.count)
                    : HUNTERA_SUPPLY_PRICES[s.itemId]?.cost || 0,
                totalCost: s.value || 0,
                category: HUNTERA_SUPPLY_PRICES[s.itemId]?.category || "potion",
              }))
              .sort((a, b) => b.totalCost - a.totalCost),
      totalSuppliesCost: this.realtimeWaste,
      inventory: {
        backpack: this.inventory.backpack.filter(Boolean),
        satchel: this.inventory.satchel.filter(Boolean),
        gold: this.inventory.gold || 0,
      },
      actionBar: {
        slots: this.actionBarSlots,
        presets: this.actionBarPresets,
        activePreset: this.activeActionBarPreset,
        managed: this.actionBarManaged,
      },
      friends: this.friends as any,
      party: this.party,
      partyInvite: this.partyInvite,
      transferOffer: this.transferOffer,
      deathInfo: { ...this.deathInfo },
      blessings: { ...this.blessings },
      training: { ...this.training },
      gamePlayerId: this.gamePlayerId,
    };
  }
}
