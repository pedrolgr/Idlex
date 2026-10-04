/**
 * hunt-session.mjs
 *
 * Módulo de gerenciamento de estado e métricas de uma sessão de caçada.
 * Contém a lógica de rastreamento de criaturas, experiência, vitais,
 * métricas financeiras (loot, gastos/waste, saldo) e formatação de status.
 */

/**
 * Tabela oficial de custos de suprimentos e munições do Huntera (Tabelas Da e Qn)
 */
export const HUNTERA_SUPPLY_PRICES = {
  // Potions
  7876: { id: "lesser-health-potion", name: "Lesser Health Potion", cost: 0, category: "potion" },
  266: { id: "health-potion", name: "Health Potion", cost: 50, category: "potion" },
  236: { id: "strong-health-potion", name: "Strong Health Potion", cost: 115, category: "potion" },
  239: { id: "great-health-potion", name: "Great Health Potion", cost: 225, category: "potion" },
  7643: { id: "ultimate-health-potion", name: "Ultimate Health Potion", cost: 379, category: "potion" },
  23375: { id: "supreme-health-potion", name: "Supreme Health Potion", cost: 650, category: "potion" },
  268: { id: "mana-potion", name: "Mana Potion", cost: 56, category: "potion" },
  237: { id: "strong-mana-potion", name: "Strong Mana Potion", cost: 108, category: "potion" },
  238: { id: "great-mana-potion", name: "Great Mana Potion", cost: 158, category: "potion" },
  23373: { id: "ultimate-mana-potion", name: "Ultimate Mana Potion", cost: 488, category: "potion" },
  7642: { id: "great-spirit-potion", name: "Great Spirit Potion", cost: 90, category: "potion" },
  23374: { id: "ultimate-spirit-potion", name: "Ultimate Spirit Potion", cost: 195, category: "potion" },

  // Runes
  3200: { id: "explosion-rune", name: "Explosion Rune", cost: 25, category: "rune" },
  3189: { id: "fireball-rune", name: "Fireball Rune", cost: 30, category: "rune" },
  3191: { id: "great-fireball-rune", name: "Great Fireball Rune", cost: 60, category: "rune" },
  3161: { id: "avalanche-rune", name: "Avalanche Rune", cost: 55, category: "rune" },
  3202: { id: "thunderstorm-rune", name: "Thunderstorm Rune", cost: 45, category: "rune" },
  3175: { id: "stone-shower-rune", name: "Stone Shower Rune", cost: 40, category: "rune" },
  3198: { id: "heavy-magic-missile-rune", name: "Heavy Magic Missile Rune", cost: 15, category: "rune" },
  3158: { id: "icicle-rune", name: "Icicle Rune", cost: 30, category: "rune" },
  3182: { id: "holy-missile-rune", name: "Holy Missile Rune", cost: 14, category: "rune" },
  3155: { id: "sudden-death-rune", name: "Sudden Death Rune", cost: 150, category: "rune" },
  3160: { id: "ultimate-healing-rune", name: "Ultimate Healing Rune", cost: 160, category: "rune" },

  // Munições (Arrows & Bolts)
  21470: { id: "simple-arrow", name: "Simple Arrow", cost: 0, category: "arrow" },
  3447: { id: "arrow", name: "Arrow", cost: 3, category: "arrow" },
  3446: { id: "bolt", name: "Bolt", cost: 4, category: "bolt" },
  3448: { id: "poison-arrow", name: "Poison Arrow", cost: 5, category: "arrow" },
  774: { id: "earth-arrow", name: "Earth Arrow", cost: 5, category: "arrow" },
  763: { id: "flaming-arrow", name: "Flaming Arrow", cost: 5, category: "arrow" },
  761: { id: "flash-arrow", name: "Flash Arrow", cost: 5, category: "arrow" },
  762: { id: "shiver-arrow", name: "Shiver Arrow", cost: 5, category: "arrow" },
  7364: { id: "sniper-arrow", name: "Sniper Arrow", cost: 5, category: "arrow" },
  7363: { id: "piercing-bolt", name: "Piercing Bolt", cost: 5, category: "bolt" },
  14251: { id: "tarsal-arrow", name: "Tarsal Arrow", cost: 6, category: "arrow" },
  14252: { id: "vortex-bolt", name: "Vortex Bolt", cost: 6, category: "bolt" },
  7365: { id: "onyx-arrow", name: "Onyx Arrow", cost: 7, category: "arrow" },
  3450: { id: "power-bolt", name: "Power Bolt", cost: 7, category: "bolt" },
  3449: { id: "burst-arrow", name: "Burst Arrow", cost: 15, category: "arrow" },
  16143: { id: "envenomed-arrow", name: "Envenomed Arrow", cost: 12, category: "arrow" },
  16142: { id: "drill-bolt", name: "Drill Bolt", cost: 19, category: "bolt" },
  15793: { id: "crystalline-arrow", name: "Crystalline Arrow", cost: 20, category: "arrow" },
  16141: { id: "prismatic-bolt", name: "Prismatic Bolt", cost: 34, category: "bolt" },
  6528: { id: "infernal-bolt", name: "Infernal Bolt", cost: 49, category: "bolt" },
  35901: { id: "diamond-arrow", name: "Diamond Arrow", cost: 130, category: "arrow" },
  35902: { id: "spectral-bolt", name: "Spectral Bolt", cost: 70, category: "bolt" },
};

/**
 * Preços padrão de venda no NPC no Huntera para itens comuns
 */
export const HUNTERA_ITEM_SELL_PRICES = {
  3031: 1,     // gold coin
  3607: 2,     // cheese
  3492: 1,     // worm
  9649: 90,    // gauze bandage
  11444: 60,   // protective charm
  37109: 100,  // sliver
  11466: 30,   // flask of embalming fluid
  3007: 250,   // crystal ring
  3017: 150,   // silver brooch
  3027: 280,   // black pearl
  3054: 50,    // silver amulet
  3045: 30,    // strange talisman
  3046: 35,    // magic light wand
  3299: 50,    // poison dagger
  3429: 800,   // black shield
  5914: 150,   // yellow piece of cloth
  10290: 4000, // mini mummy
};

export class HuntSession {
  constructor({ huntId = null, huntName = null, tier = 0, validMonsters = null } = {}) {
    this.huntId = huntId;
    this.huntName = huntName;
    this.tier = tier;
    this.playerId = null;
    this.playerName = null;
    this.gamePlayerId = null;

    /** @type {Set<string>|null} */
    this.validMonsterNames = Array.isArray(validMonsters)
      ? new Set(validMonsters.map((m) => (typeof m === "string" ? m : m.name).toLowerCase()))
      : null;

    /** @type {Map<number, { id: number, name: string, kind: string }>} */
    this.creatures = new Map();

    /** @type {Map<string, number>} */
    this.killsByName = new Map();

    this.monsterDeaths = 0;
    this.experienceGained = 0;

    /** @type {{ level?: number, hp?: number, maxHp?: number, mana?: number, maxMana?: number, staminaMs?: number, staminaDraining?: boolean }} */
    this.playerState = {};

    this.huntPending = false;
    this.huntSessionRemainingMs = null;
    this.lastMessageAt = new Date();
    this.lastStatusLines = 0;

    // Métricas analíticas oficiais (hunt-analyzer-update / hunt-analyzer-session)
    this.startedAt = null;
    this.localStartedAt = null;
    this.durationMs = 0;
    this.lootValue = 0;
    this.waste = 0;
    this.balance = 0;

    // Rastreamento instantâneo de suprimentos (poções, runas, munição)
    /** @type {Map<number, { itemId: number, name: string, count: number, unitPrice: number, totalCost: number, category: string }>} */
    this.suppliesMap = new Map();
    this.realtimeWaste = 0;

    // Rastreamento estrito de itens que ENTRARAM NA BAG
    this.huntStartGold = null;
    this.goldGainedInBag = 0;
    /** @type {Map<string|number, { itemId?: number, name: string, count: number, unitValue: number, totalValue: number }>} */
    this.bagLootMap = new Map();
    this.floorDrops = [];
    /** @type {Map<number, number>} */
    this.npcSellPrices = new Map();

    // Inventário atual do personagem (mochila, satchel, ouro)
    this.inventory = {
      backpack: [],
      satchel: [],
      gold: 0,
    };

    /** @type {Map<string|number, { itemId?: number, name: string, count: number, value?: number }>} */
    this.lootMap = new Map();

    /** @type {Array<{ itemId: number, name: string, count: number, value: number }>} */
    this.supplies = [];

    /** @type {Array<{ itemId?: number, name: string, count: number, value?: number, inBag?: boolean }>} */
    this.loot = [];

    // Estado de saída e atividade da caçada
    this.leavePendingMs = null;
    this.huntActive = Boolean(huntId);

    // Alternância de visão detalhada
    this.showDetails = false;

    // Estatísticas de Progressão (XP e Nível)
    this.experience = 0;
    this.experienceNeeded = 0;

    // Habilidades (Skills)
    this.magicLevel = 0;
    this.magicProgress = 0;
    this.magicProgressNeeded = 0;
    this.skills = {};
    this.skillProgress = {};
    this.skillProgressNeeded = {};

    // Bestiário
    /** @type {Map<string, number>} */
    this.bestiaryKills = new Map();
    this.bestiarySummary = { completed: 0, total: 0, bonusPercent: 0 };

    // Modos de Precificação (npc | auction | custom)
    /** @type {"npc"|"auction"|"custom"} */
    this.priceMode = "npc";
    /** @type {Map<number, number>} */
    this.auctionPrices = new Map();
    /** @type {Map<number, number>} */
    this.customPrices = new Map();

    // Sequência & Condições (Action Bar oficial)
    this.actionBarSlots = Array(20).fill(null);
    this.actionBarPresets = ["Default"];
    this.activeActionBarPreset = 0;
    this.actionBarManaged = false;

    // Amigos & Party
    this.friends = [];
    this.party = null; // { leaderId, members: [{ id, name, level, vocation, healthPercent, manaPercent }] }
    this.partyInvite = null; // { fromId, fromName, members: [{ name, level, vocation }] }
    this.transferOffer = null; // { fromName, receivedAt }

    // Estado de Morte & Histórico de Morte
    this.deathInfo = {
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
    this.dismissedDeathAt = null;

    // Status de Bênçãos (Blessings)
    this.blessings = {
      owned: [],
      cost: 0,
      freeUntilLevel: 80,
      lossReductionPercent: 40,
      equipmentLossPercent: 0,
    };
  }

  revive() {
    if (this.deathInfo) {
      this.dismissedDeathAt = this.deathInfo.diedAt || Date.now();
      this.deathInfo.isDead = false;
    }
    this.huntActive = false;
  }

  dismissDeath() {
    if (this.deathInfo) {
      this.dismissedDeathAt = this.deathInfo.diedAt || Date.now();
      this.deathInfo.isDead = false;
    }
  }

  setLocalActionSlot(slot, rule) {
    const s = Number(slot);
    if (s >= 0 && s < 20) {
      while (this.actionBarSlots.length < 20) this.actionBarSlots.push(null);
      this.actionBarSlots[s] = rule ?? null;
    }
  }

  setPlayerId(id) {
    if (id !== undefined && id !== null) {
      this.playerId = Number(id);
    }
  }

  setPlayerName(name) {
    if (name) {
      this.playerName = String(name);
    }
  }

  setHunt(huntId, huntName, validMonsters = null) {
    this.huntId = huntId;
    this.huntName = huntName;
    this.huntActive = true;
    this.localStartedAt = Date.now();
    this.leavePendingMs = null;

    // Inicializa rastreadores de ouro e itens que entram na bag durante esta caçada
    this.huntStartGold = (this.inventory && typeof this.inventory.gold === "number" && this.inventory.gold > 0)
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

    // Limpa quaisquer criaturas da cidade/templo capturadas antes da entrada na arena
    this.creatures.clear();
    this.killsByName.clear();
    this.monsterDeaths = 0;

    this.validMonsterNames = Array.isArray(validMonsters)
      ? new Set(validMonsters.map((m) => (typeof m === "string" ? m : m.name).toLowerCase()))
      : null;
  }

  resetSession() {
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

  toggleDetails() {
    this.showDetails = !this.showDetails;
    return this.showDetails;
  }

  get bagTrackingActive() {
    return this.huntStartGold !== null || this.bagLootMap.size > 0;
  }

  setPriceMode(mode) {
    if (["npc", "auction", "custom"].includes(mode)) {
      this.priceMode = mode;
      this.recalculateFinancials();
    }
  }

  setCustomPrice(itemId, price) {
    const id = Number(itemId);
    const p = Number(price);
    if (!Number.isNaN(id) && !Number.isNaN(p) && p >= 0) {
      this.customPrices.set(id, p);
      this.recalculateFinancials();
    }
  }

  getItemEffectivePrice(itemId, defaultNpc = 0) {
    if (this.priceMode === "custom" && this.customPrices.has(itemId)) {
      return this.customPrices.get(itemId);
    }
    if (this.priceMode === "auction" && this.auctionPrices.has(itemId)) {
      return this.auctionPrices.get(itemId);
    }
    return this.npcSellPrices.get(itemId) ?? (HUNTERA_ITEM_SELL_PRICES[itemId] ?? defaultNpc);
  }

  recalculateFinancials() {
    // Recalcula o valor dos itens da bag com o preço efetivo do modo atual
    for (const item of this.bagLootMap.values()) {
      if (item.itemId) {
        item.unitValue = this.getItemEffectivePrice(item.itemId, item.unitValue || 0);
        item.totalValue = item.count * item.unitValue;
      }
    }

    // Recalcula o valor dos drops registrados
    for (const drop of this.lootMap.values()) {
      if (drop.itemId) {
        drop.unitValue = this.getItemEffectivePrice(drop.itemId, drop.unitValue || 0);
        drop.value = drop.count * drop.unitValue;
      }
    }
    this.loot = [...this.lootMap.values()].sort((a, b) => (b.value || 0) - (a.value || 0));

    if (this.huntActive || this.bagTrackingActive) {
      this.lootValue = this.getBagLootValue();
      this.balance = this.lootValue - this.waste;
    }
  }

  getBagItemsValue() {
    return Array.from(this.bagLootMap.values())
      .filter((it) => it.itemId !== 3031) // gold coin já está somado em goldGainedInBag
      .reduce((sum, it) => sum + (it.totalValue || 0), 0);
  }

  getBagLootValue() {
    return this.goldGainedInBag + this.getBagItemsValue();
  }

  getRemainingXp() {
    if (this.experienceNeeded > this.experience) {
      return this.experienceNeeded - this.experience;
    }
    return 0;
  }

  getXpProgressPercent() {
    if (this.experienceNeeded > 0) {
      return Math.min(100, Math.max(0, Math.floor((this.experience / this.experienceNeeded) * 100)));
    }
    return 0;
  }

  /**
   * Calcula as estimativas e taxas por hora (gold/h, prejuízo/h, total/h, xp/h e tempo para próximo level).
   * Se em x segundos ganhou y, então em 3600 segundos (1 hora) ganhará (y / x) * 3600.
   * O tempo para o próximo level é calculado estimando o tempo necessário para alcançar a XP restante.
   * @returns {object}
   */
  getHourlyRates() {
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

    let secondsToNextLevel = null;
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

  getSkillsSummary() {
    const list = [];
    if (this.magicLevel > 0) {
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

    const SKILL_NAMES = {
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

  getBestiaryKills(monsterName) {
    if (!monsterName) return null;
    const clean = monsterName.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (this.bestiaryKills.has(clean)) return this.bestiaryKills.get(clean);
    return null;
  }

  /**
   * Registra um item dropado (no chão ou loot direto) sem influenciar o saldo da bag.
   * @param {object} it
   */
  _recordDrop(it) {
    if (!it || !it.name || it.name.toLowerCase() === "unknown") return;
    const key = it.itemId || it.name;
    const count = it.count || 1;
    const defaultVal = it.value ? Math.floor(it.value / count) : (it.itemId === 3031 ? 1 : 0);
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
    this.loot = [...this.lootMap.values()].sort((a, b) => (b.value || 0) - (a.value || 0));
  }

  /**
   * Processa uma mensagem WebSocket recebida do servidor.
   * @param {object} message
   */
  handleMessage(message) {
    if (!message || typeof message !== "object") return;
    this.lastMessageAt = new Date();

    switch (message.type) {
      case "creature-appear": {
        const c = message.creature;
        if (c && c.id !== undefined) {
          this.creatures.set(c.id, {
            id: c.id,
            name: c.name ?? "Desconhecido",
            kind: c.kind ?? "unknown",
          });
          if (c.kind === "player") {
            if (!this.gamePlayerId || (this.playerName && c.name && c.name.toLowerCase() === this.playerName.toLowerCase())) {
              this.gamePlayerId = c.id;
            }
          }
        }
        break;
      }

      case "creature-disappear": {
        if (message.id !== undefined) {
          const appeared = this.creatures.get(message.id);
          if (appeared) {
            // Só contabiliza se:
            // 1. A caçada estiver ativa (não conta entidades desaparecendo na cidade/teleporte)
            // 2. A criatura for estritamente do tipo "monster" (ignora "player", "npc", "statue")
            // 3. Se houver catálogo de monstros da caçada, o nome deve pertencer à caçada
            if (this.huntActive && appeared.kind === "monster") {
              const name = appeared.name;
              const isAllowed = !this.validMonsterNames || this.validMonsterNames.has(name.toLowerCase());
              if (isAllowed) {
                this.killsByName.set(name, (this.killsByName.get(name) ?? 0) + 1);
                this.monsterDeaths += 1;
              }
            }
            this.creatures.delete(message.id);
          }
        }
        break;
      }

      case "experience-gain": {
        if (typeof message.value === "number") {
          this.experienceGained += message.value;
        }
        break;
      }

      case "player-stats": {
        if (typeof message.level === "number") {
          this.playerState.level = message.level;
        }
        if (typeof message.huntSessionRemainingMs === "number") {
          this.huntSessionRemainingMs = message.huntSessionRemainingMs;
        }
        if (typeof message.mana === "number") this.playerState.mana = message.mana;
        if (typeof message.maxMana === "number") this.playerState.maxMana = message.maxMana;
        if (typeof message.health === "number") this.playerState.hp = message.health;
        if (typeof message.maxHealth === "number") this.playerState.maxHp = message.maxHealth;
        if (typeof message.hp === "number") this.playerState.hp = message.hp;
        if (typeof message.maxHp === "number") this.playerState.maxHp = message.maxHp;
        if (typeof message.staminaMs === "number") this.playerState.staminaMs = message.staminaMs;
        if (typeof message.staminaDraining === "boolean") this.playerState.staminaDraining = message.staminaDraining;

        // XP e Nível
        if (typeof message.experience === "number") this.experience = message.experience;
        if (typeof message.experienceNeeded === "number") this.experienceNeeded = message.experienceNeeded;

        // Magic Level
        if (typeof message.magicLevel === "number") this.magicLevel = message.magicLevel;
        if (typeof message.magicProgress === "number") this.magicProgress = message.magicProgress;
        if (typeof message.magicProgressNeeded === "number") this.magicProgressNeeded = message.magicProgressNeeded;

        // Habilidades (Skills)
        if (message.skills && typeof message.skills === "object") this.skills = { ...this.skills, ...message.skills };
        if (message.skillProgress && typeof message.skillProgress === "object") this.skillProgress = { ...this.skillProgress, ...message.skillProgress };
        if (message.skillProgressNeeded && typeof message.skillProgressNeeded === "object") this.skillProgressNeeded = { ...this.skillProgressNeeded, ...message.skillProgressNeeded };
        break;
      }

      case "player-vitals": {
        if (typeof message.hp === "number") this.playerState.hp = message.hp;
        if (typeof message.maxHp === "number") this.playerState.maxHp = message.maxHp;
        if (typeof message.health === "number") this.playerState.hp = message.health;
        if (typeof message.maxHealth === "number") this.playerState.maxHp = message.maxHealth;
        if (typeof message.mana === "number") this.playerState.mana = message.mana;
        if (typeof message.maxMana === "number") this.playerState.maxMana = message.maxMana;
        break;
      }

      case "bestiary-progress":
      case "bestiary-update": {
        if (message.kills && typeof message.kills === "object") {
          for (const [monster, count] of Object.entries(message.kills)) {
            const clean = monster.toLowerCase().replace(/[^a-z0-9]/g, "");
            this.bestiaryKills.set(clean, count);
          }
        }
        if (typeof message.completed === "number") this.bestiarySummary.completed = message.completed;
        if (typeof message.total === "number") this.bestiarySummary.total = message.total;
        if (typeof message.bonusPercent === "number") this.bestiarySummary.bonusPercent = message.bonusPercent;
        break;
      }

      case "market-prices": {
        if (Array.isArray(message.npc)) {
          for (const [id, price] of message.npc) {
            this.npcSellPrices.set(id, price);
          }
        }
        if (Array.isArray(message.auction)) {
          for (const [id, price] of message.auction) {
            this.auctionPrices.set(id, price);
          }
        }
        this.recalculateFinancials();
        break;
      }

      case "creature-say":
      case "creature-speech": {
        // Mensagem de uso de magia ou consumível (poção, runa, etc.)
        if (message.itemId) {
          const isKnownSupply = Boolean(HUNTERA_SUPPLY_PRICES[message.itemId]);
          const isPlayerMessage = !this.gamePlayerId || message.id === this.gamePlayerId || message.id === this.playerId || isKnownSupply;
          if (isPlayerMessage) {
            const supplyInfo = HUNTERA_SUPPLY_PRICES[message.itemId] || {
              id: `item-${message.itemId}`,
              name: message.text && message.text !== "Aaaah..." ? message.text : `Item #${message.itemId}`,
              cost: 0,
              category: "potion"
            };

            const prev = this.suppliesMap.get(message.itemId) || {
              itemId: message.itemId,
              name: supplyInfo.name,
              count: 0,
              unitPrice: supplyInfo.cost,
              totalCost: 0,
              category: supplyInfo.category
            };

            prev.count += 1;
            prev.totalCost = prev.count * prev.unitPrice;
            this.suppliesMap.set(message.itemId, prev);

            this.realtimeWaste += supplyInfo.cost;
            this.waste = Math.max(this.waste, this.realtimeWaste);
            this.balance = this.lootValue - this.waste;
            this.supplies = [...this.suppliesMap.values()];
          }
        }
        break;
      }

      case "player-inventory":
      case "inventory-delta":
      case "inventory-update": {
        if (typeof message.gold === "number") {
          this.inventory.gold = message.gold;
          if (this.huntActive) {
            if (this.huntStartGold === null) {
              this.huntStartGold = message.gold;
            } else {
              this.goldGainedInBag = Math.max(0, message.gold - this.huntStartGold);
            }
          }
        }
        if (typeof message.slotCount === "number") {
          while (this.inventory.backpack.length < message.slotCount) this.inventory.backpack.push(null);
          if (this.inventory.backpack.length > message.slotCount) {
            this.inventory.backpack = this.inventory.backpack.slice(0, message.slotCount);
          }
        }
        if (typeof message.satchelCount === "number") {
          while (this.inventory.satchel.length < message.satchelCount) this.inventory.satchel.push(null);
          if (this.inventory.satchel.length > message.satchelCount) {
            this.inventory.satchel = this.inventory.satchel.slice(0, message.satchelCount);
          }
        }
        if (Array.isArray(message.changes)) {
          for (const change of message.changes) {
            if (change.container === "backpack" && typeof change.index === "number") {
              const oldItem = this.inventory.backpack[change.index];
              const newItem = change.item ?? null;
              this.inventory.backpack[change.index] = newItem;

              // Contabiliza APENAS itens que entraram na bag durante a hunt ativa
              if (this.huntActive && newItem && newItem.name) {
                const oldCount = (oldItem && oldItem.name === newItem.name) ? (oldItem.count || 1) : 0;
                const newCount = newItem.count || 1;
                const diff = newCount - oldCount;
                if (diff > 0) {
                  const key = newItem.itemId || newItem.name;
                  const defaultVal = newItem.value ? Math.floor(newItem.value / newCount) : (newItem.itemId === 3031 ? 1 : 0);
                  const unitVal = this.getItemEffectivePrice(newItem.itemId, defaultVal);
                  const prev = this.bagLootMap.get(key) || {
                    itemId: newItem.itemId,
                    name: newItem.name,
                    count: 0,
                    unitValue: unitVal,
                    totalValue: 0
                  };
                  prev.count += diff;
                  prev.totalValue = prev.count * prev.unitValue;
                  this.bagLootMap.set(key, prev);

                  // Marca na lista de drops se o item já existia, ou adiciona se foi loot direto
                  if (this.lootMap.has(key)) {
                    const l = this.lootMap.get(key);
                    l.inBag = true;
                    if (l.count < prev.count) {
                      l.count = prev.count;
                      l.value = l.count * l.unitValue;
                    }
                  } else {
                    this.lootMap.set(key, {
                      itemId: newItem.itemId,
                      name: newItem.name,
                      count: diff,
                      value: diff * unitVal,
                      unitValue: unitVal,
                      inBag: true,
                    });
                  }
                }
              }
            } else if (change.container === "satchel" && typeof change.index === "number") {
              this.inventory.satchel[change.index] = change.item ?? null;
            }
          }
        }

        // Marca gold como coletado na bolsa se houver ganho
        if (this.goldGainedInBag > 0) {
          if (this.lootMap.has(3031)) {
            const goldEntry = this.lootMap.get(3031);
            goldEntry.inBag = true;
            if (goldEntry.count < this.goldGainedInBag) {
              goldEntry.count = this.goldGainedInBag;
              goldEntry.value = this.goldGainedInBag;
            }
          } else {
            this.lootMap.set(3031, {
              itemId: 3031,
              name: "gold coin",
              count: this.goldGainedInBag,
              value: this.goldGainedInBag,
              unitValue: 1,
              inBag: true,
            });
          }
        }

        this.loot = [...this.lootMap.values()].sort((a, b) => (b.value || 0) - (a.value || 0));

        // Recalcula o saldo de gold da hunt estritamente pelos itens e moedas que entraram na bag:
        if (this.huntActive) {
          this.lootValue = this.getBagLootValue();
          this.balance = this.lootValue - this.waste;
        }
        break;
      }

      case "equipped-items": {
        if (Array.isArray(message.slots)) {
          for (let i = 0; i < message.slots.length; i++) {
            if (message.slots[i]) {
              this.inventory.backpack[i] = message.slots[i];
            }
          }
        }
        break;
      }

      case "loot-add": {
        // Registra o drop para visualização na aba Drops (não afeta o saldo de gold até entrar na bag)
        const it = message.item ?? message;
        if (it && it.name && it.name.toLowerCase() !== "unknown") {
          this._recordDrop(it);
        }
        break;
      }

      case "item-on-ground": {
        // Registra apenas que o item caiu no chão, NÃO soma no saldo de gold nem em lootValue!
        const it = message.item ?? message;
        if (it && it.name && it.name.toLowerCase() !== "unknown") {
          this._recordDrop(it);
          this.floorDrops.push({
            itemId: it.itemId,
            name: it.name,
            count: it.count || 1,
            time: Date.now()
          });
        }
        break;
      }

      case "hunt-pending": {
        if (message.hunt !== undefined) {
          this.huntPending = Boolean(message.hunt);
          if (message.hunt) {
            this.huntActive = true;
            if (typeof message.hunt.huntId === "string" && !this.huntId) {
              this.huntId = message.hunt.huntId;
            }
          } else if (this.leavePendingMs !== null) {
            this.huntActive = false;
          }
        } else {
          this.huntPending = true;
        }
        if (typeof message.remainingMs === "number") {
          this.huntSessionRemainingMs = message.remainingMs;
        }
        break;
      }

      case "hunt-analyzer-session": {
        if (typeof message.startedAt === "number") {
          this.startedAt = message.startedAt;
        }
        if (typeof message.durationMs === "number") {
          this.durationMs = message.durationMs;
        }
        break;
      }

      case "hunt-analyzer-update": {
        if (typeof message.startedAt === "number") this.startedAt = message.startedAt;
        if (typeof message.durationMs === "number") this.durationMs = message.durationMs;
        if (typeof message.kills === "number" && message.kills > this.monsterDeaths) {
          this.monsterDeaths = message.kills;
        }
        if (typeof message.experience === "number" && message.experience > this.experienceGained) {
          this.experienceGained = message.experience;
        }
        if (typeof message.waste === "number") {
          this.waste = Math.max(this.waste, message.waste);
        }

        // Saldo estrito da bag: não sobrescreve se houver rastreamento ativo da bolsa
        if (this.bagTrackingActive) {
          this.lootValue = this.getBagLootValue();
        } else if (typeof message.lootValue === "number") {
          this.lootValue = message.lootValue;
        }
        this.balance = this.lootValue - this.waste;

        if (Array.isArray(message.supplies)) {
          this.supplies = message.supplies;
          for (const sup of message.supplies) {
            if (!sup || !sup.itemId) continue;
            const supplyInfo = HUNTERA_SUPPLY_PRICES[sup.itemId] || {
              id: `item-${sup.itemId}`,
              name: sup.name || `Item #${sup.itemId}`,
              cost: (sup.count && sup.count > 0) ? Math.round((sup.value || 0) / sup.count) : 0,
              category: "potion",
            };
            const prev = this.suppliesMap.get(sup.itemId) || {
              itemId: sup.itemId,
              name: sup.name || supplyInfo.name,
              count: 0,
              unitPrice: supplyInfo.cost,
              totalCost: 0,
              category: supplyInfo.category,
            };
            if ((sup.count || 0) >= prev.count) {
              prev.count = sup.count || 0;
              prev.totalCost = sup.value ?? (prev.count * prev.unitPrice);
            }
            this.suppliesMap.set(sup.itemId, prev);
          }
        }
        if (Array.isArray(message.loot) && this.loot.length === 0) {
          this.loot = message.loot;
        }
        break;
      }

      case "hunt-leave-pending": {
        if (typeof message.remainingMs === "number") {
          this.leavePendingMs = message.remainingMs;
        }
        break;
      }

      case "instance-enter": {
        if (typeof message.scenarioId === "string") {
          // Se entrou em cenário da cidade, não está mais em hunt
          if (message.scenarioId === "city" || message.scenarioId.includes("temple")) {
            this.huntActive = false;
          }
        }
        break;
      }

      case "action-bar-update": {
        if (Array.isArray(message.slots)) {
          this.actionBarSlots = message.slots;
        }
        if (typeof message.managed === "boolean") {
          this.actionBarManaged = message.managed;
        }
        break;
      }

      case "action-bar-presets": {
        if (Array.isArray(message.names)) {
          this.actionBarPresets = message.names;
        }
        if (typeof message.active === "number") {
          this.activeActionBarPreset = message.active;
        }
        break;
      }

      case "friends-list":
      case "vip-list": {
        if (Array.isArray(message.entries)) {
          this.friends = message.entries.map((f) => ({
            name: f.name,
            online: Boolean(f.online),
            level: f.level ?? null,
            vocation: f.vocation ?? null,
            lastSeenAt: f.lastSeenAt ?? null,
          }));
        }
        break;
      }

      case "vip-status": {
        if (message && message.name) {
          const idx = this.friends.findIndex((f) => f.name.toLowerCase() === message.name.toLowerCase());
          const updated = {
            name: message.name,
            online: Boolean(message.online),
            level: message.level ?? (idx !== -1 ? this.friends[idx].level : null),
            vocation: message.vocation ?? (idx !== -1 ? this.friends[idx].vocation : null),
            lastSeenAt: message.lastSeenAt ?? (idx !== -1 ? this.friends[idx].lastSeenAt : null),
          };
          if (idx !== -1) {
            this.friends[idx] = updated;
          } else {
            this.friends.push(updated);
          }
        }
        break;
      }

      case "party-update": {
        if (message.leaderId === null || !message.members || message.members.length === 0) {
          this.party = null;
        } else {
          this.party = {
            leaderId: message.leaderId,
            sharedCosts: message.sharedCosts || null,
            members: (message.members || []).map((m) => ({
              id: m.id,
              name: m.name,
              level: m.level,
              vocation: m.vocation ?? "none",
              healthPercent: m.healthPercent ?? 100,
              manaPercent: m.manaPercent ?? 100,
              isLeader: m.id === message.leaderId,
              staminaMinutes: m.staminaMinutes ?? null,
              followsLeader: Boolean(m.followsLeader),
              dps: typeof m.dps === "number" ? m.dps : null,
              damageTotal: typeof m.damageTotal === "number" ? m.damageTotal : null,
              hps: typeof m.hps === "number" ? m.hps : null,
              healTotal: typeof m.healTotal === "number" ? m.healTotal : null,
            })),
          };

          // Sincroniza HP e Mana do jogador a partir do update da party
          const me = (message.members || []).find(
            (m) =>
              m.id === this.playerId ||
              m.id === this.gamePlayerId ||
              (this.playerName && m.name && m.name.toLowerCase() === this.playerName.toLowerCase())
          );
          if (me) {
            if (typeof me.healthPercent === "number" && this.playerState.maxHp) {
              this.playerState.hp = Math.round((this.playerState.maxHp * me.healthPercent) / 100);
            }
            if (typeof me.manaPercent === "number" && this.playerState.maxMana) {
              this.playerState.mana = Math.round((this.playerState.maxMana * me.manaPercent) / 100);
            }
          }
        }
        break;
      }

      case "party-invited": {
        if (message.fromName) {
          this.partyInvite = {
            fromId: message.fromId,
            fromName: message.fromName,
            members: Array.isArray(message.members) ? message.members : [],
            receivedAt: Date.now(),
          };
        }
        break;
      }

      case "transfer-offer": {
        if (message.fromName) {
          this.transferOffer = {
            fromName: message.fromName,
            receivedAt: Date.now(),
          };
        }
        break;
      }

      case "transfer-begin": {
        this.transferOffer = null;
        break;
      }

      case "party-costs-cancelled": {
        if (this.party?.sharedCosts) {
          this.party.sharedCosts.offerPending = false;
        }
        break;
      }

      case "party-invite-confirm": {
        // Confirmação de que o convite enviado foi entregue ao alvo
        break;
      }

      case "creature-health": {
        if (message.id !== undefined && (message.id === this.gamePlayerId || message.id === this.playerId)) {
          if (typeof message.healthPercent === "number") {
            if (!this.playerState.maxHp && this.playerState.hp) {
              this.playerState.maxHp = this.playerState.hp;
            }
            if (this.playerState.maxHp) {
              this.playerState.hp = Math.round((this.playerState.maxHp * message.healthPercent) / 100);
            }
            if (message.healthPercent === 0) {
              this.deathInfo.isDead = true;
              this.huntActive = false;
              this.playerState.hp = 0;
            }
          }
        }
        break;
      }

      case "player-died": {
        this.deathInfo.isDead = true;
        this.huntActive = false;
        if (this.playerState.hp !== undefined) {
          this.playerState.hp = 0;
        }
        const diedAt = message.resumedAt ?? message.diedAt ?? Date.now();
        this.deathInfo.diedAt = diedAt;
        if (message.killer) this.deathInfo.killer = message.killer;
        if (message.penalty) {
          if (typeof message.penalty.lostExperience === "number") this.deathInfo.lostExperience = message.penalty.lostExperience;
          if (typeof message.penalty.lostLevels === "number") this.deathInfo.lostLevels = message.penalty.lostLevels;
          if (typeof message.penalty.blessingsSpent === "number") this.deathInfo.blessingsSpent = message.penalty.blessingsSpent;
          if (typeof message.penalty.freeBless === "boolean") this.deathInfo.freeBless = message.penalty.freeBless;
          if (Array.isArray(message.penalty.lostItems)) this.deathInfo.lostItems = message.penalty.lostItems;
        }
        if (Array.isArray(message.hits) && message.hits.length > 0) {
          this.deathInfo.hits = message.hits;
        }
        break;
      }

      case "death-film-offer": {
        // Oferta de gravação da morte anterior (pode ser de dias atrás).
        // NÃO define isDead = true. A morte ativa é sinalizada exclusivamente por player-died.
        if (message.diedAt) this.deathInfo.diedAt = message.diedAt;
        if (message.killer) this.deathInfo.killer = message.killer;
        if (message.penalty) {
          if (typeof message.penalty.lostExperience === "number") this.deathInfo.lostExperience = message.penalty.lostExperience;
          if (typeof message.penalty.lostLevels === "number") this.deathInfo.lostLevels = message.penalty.lostLevels;
          if (typeof message.penalty.blessingsSpent === "number") this.deathInfo.blessingsSpent = message.penalty.blessingsSpent;
          if (typeof message.penalty.freeBless === "boolean") this.deathInfo.freeBless = message.penalty.freeBless;
          if (Array.isArray(message.penalty.lostItems)) this.deathInfo.lostItems = message.penalty.lostItems;
        }
        break;
      }

      case "death-history": {
        if (Array.isArray(message.entries) && message.entries.length > 0) {
          const latest = message.entries[0];
          if (latest) {
            // Nota: Não marcamos isDead = true aqui!
            // A tela de morte só é ativada se houver tela de morte ativa no jogo (player-died ou death-film-offer).
            if (latest.diedAt) this.deathInfo.diedAt = latest.diedAt;
            if (latest.killer) this.deathInfo.killer = latest.killer;
            if (latest.where) this.deathInfo.where = latest.where;
            if (Array.isArray(latest.skillsLost)) this.deathInfo.skillsLost = latest.skillsLost;
            if (Array.isArray(latest.hits) && latest.hits.length > 0) this.deathInfo.hits = latest.hits;
            if (Array.isArray(latest.blessings)) this.deathInfo.blessings = latest.blessings;
            if (typeof latest.freeBless === "boolean") this.deathInfo.freeBless = latest.freeBless;
            if (Array.isArray(latest.lostItems)) this.deathInfo.lostItems = latest.lostItems;
            if (typeof latest.levelBefore === "number") this.deathInfo.levelBefore = latest.levelBefore;
            if (typeof latest.levelAfter === "number") this.deathInfo.levelAfter = latest.levelAfter;
            if (typeof latest.experienceBefore === "number") this.deathInfo.experienceBefore = latest.experienceBefore;
            if (typeof latest.experienceAfter === "number") this.deathInfo.experienceAfter = latest.experienceAfter;
            if ((this.deathInfo.lostExperience === null || this.deathInfo.lostExperience === undefined) && typeof latest.experienceBefore === "number" && typeof latest.experienceAfter === "number") {
              this.deathInfo.lostExperience = Math.max(0, latest.experienceBefore - latest.experienceAfter);
            }
            if ((this.deathInfo.lostLevels === null || this.deathInfo.lostLevels === undefined) && typeof latest.levelBefore === "number" && typeof latest.levelAfter === "number") {
              this.deathInfo.lostLevels = Math.max(0, latest.levelBefore - latest.levelAfter);
            }
          }
        }
        break;
      }

      case "blessings-status": {
        this.blessings = {
          owned: Array.isArray(message.owned) ? message.owned : [],
          cost: typeof message.cost === "number" ? message.cost : 0,
          freeUntilLevel: typeof message.freeUntilLevel === "number" ? message.freeUntilLevel : 80,
          lossReductionPercent: typeof message.lossReductionPercent === "number" ? message.lossReductionPercent : 40,
          equipmentLossPercent: typeof message.equipmentLossPercent === "number" ? message.equipmentLossPercent : 0,
        };
        break;
      }

      default:
        break;
    }
  }

  /**
   * Calcula o tempo decorrido formatado da sessão.
   * @returns {string}
   */
  getElapsedTimeFormatted() {
    let elapsedMs = 0;
    if (this.durationMs > 0) {
      elapsedMs = this.durationMs;
    } else if (this.localStartedAt) {
      elapsedMs = Math.max(0, Date.now() - this.localStartedAt);
    }
    return formatDuration(elapsedMs);
  }

  /**
   * Retorna as linhas formatadas de status para exibição no terminal.
   * @returns {string[]}
   */
  formatStatusLines() {
    const ts = this.lastMessageAt.toLocaleTimeString("pt-BR");
    const elapsed = this.getElapsedTimeFormatted();
    const hp = this.playerState.hp !== undefined && this.playerState.maxHp !== undefined
      ? `HP ${this.playerState.hp}/${this.playerState.maxHp}`
      : "HP ?/?";
    const level = this.playerState.level !== undefined ? `Nível ${this.playerState.level}` : "Nível ?";
    const pending = this.huntPending ? " [ativa]" : "";
    const huntLabel = this.huntName ?? this.huntId ?? "Nenhuma";

    // Formatação financeira
    const sign = this.balance >= 0 ? "+" : "";
    const balanceFormatted = `${sign}${this.balance.toLocaleString("pt-BR")} gp`;
    const lootFormatted = `${this.lootValue.toLocaleString("pt-BR")} gp`;
    const wasteFormatted = `${this.waste.toLocaleString("pt-BR")} gp`;

    // Lista de mortes por criatura
    const killLines = [...this.killsByName.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => `    • ${name}: ${count}`);

    const staminaStr = this.playerState.staminaMs !== undefined && this.playerState.staminaMs !== null
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
      lines.splice(3, 0, `   📊 Por hora: Saldo: ${rates.balancePerHourFormatted} | Gold: ${rates.goldPerHourFormatted} | Prejuízo: -${rates.wastePerHourFormatted}`);
      lines.splice(5, 0, `   ⏳ Próx. Nível em: ${rates.timeToNextLevelFormatted} (${rates.xpPerHourFormatted})`);
    }

    // Detalhes extras de drops e suprimentos se showDetails estiver ativo
    if (this.showDetails) {
      lines.push("   ── Itens Dropados (Loot) ───────────────────────────");
      if (this.loot.length === 0) {
        lines.push("      (Nenhum item dropado até o momento)");
      } else {
        const sortedLoot = [...this.loot].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
        for (const item of sortedLoot) {
          const val = item.value ? `${item.value.toLocaleString("pt-BR")} gp` : "0 gp";
          lines.push(`      • ${item.name} x${item.count} (${val})`);
        }
      }

      lines.push("   ── Suprimentos Utilizados (Gastos) ──────────────────");
      if (this.supplies.length === 0) {
        lines.push("      (Nenhum suprimento gasto)");
      } else {
        const sortedSupplies = [...this.supplies].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
        for (const sup of sortedSupplies) {
          const val = sup.value ? `${sup.value.toLocaleString("pt-BR")} gp` : "0 gp";
          lines.push(`      • ${sup.name} x${sup.count} (${val})`);
        }
      }
    }

    // Alerta de saída pendente se houver
    if (this.leavePendingMs !== null) {
      const s = Math.ceil(this.leavePendingMs / 1000);
      lines.push(`   🚪 Saindo da caçada em ${s}s...`);
    }

    lines.push(`────────────────────────────────────────────────────────────`);
    lines.push(`[Comandos: (l) Sair da caçada | (d) ${this.showDetails ? "Ocultar" : "Ver"} detalhes | (q) Encerrar]`);

    return lines;
  }

  /**
   * Imprime o status no terminal, apagando as linhas anteriores caso seja TTY.
   * @param {NodeJS.WriteStream} [out=process.stdout]
   */
  renderStatus(out = process.stdout) {
    if (!this.huntId && !this.huntName) return;

    const lines = this.formatStatusLines();

    if (out.isTTY && this.lastStatusLines > 0) {
      out.write(`\x1b[${lastStatusLinesA(this.lastStatusLines)}`);
    }

    out.write(lines.join("\n") + "\n");
    this.lastStatusLines = lines.length;
  }

  /**
   * Retorna um objeto JSON serializável com todas as métricas da sessão.
   */
  toJSON() {
    const elapsedMs = this.durationMs > 0
      ? this.durationMs
      : (this.localStartedAt ? Math.max(0, Date.now() - this.localStartedAt) : 0);

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
      suppliesUsed: this.suppliesMap.size > 0
        ? [...this.suppliesMap.values()].sort((a, b) => b.totalCost - a.totalCost)
        : (this.supplies || []).map((s) => ({
            itemId: s.itemId,
            name: s.name,
            count: s.count,
            unitPrice: (s.count && s.count > 0) ? Math.round((s.value || 0) / s.count) : (HUNTERA_SUPPLY_PRICES[s.itemId]?.cost || 0),
            totalCost: s.value || 0,
            category: HUNTERA_SUPPLY_PRICES[s.itemId]?.category || "potion",
          })).sort((a, b) => b.totalCost - a.totalCost),
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
      friends: this.friends,
      party: this.party,
      partyInvite: this.partyInvite,
      transferOffer: this.transferOffer,
      deathInfo: { ...this.deathInfo },
      blessings: { ...this.blessings },
    };
  }
}

function lastStatusLinesA(n) {
  return `${n}A\x1b[J`;
}

/**
 * Formata milissegundos para string amigável (ex: 2m 15s ou 1h 04m 10s).
 * @param {number} ms
 * @returns {string}
 */
export function formatDuration(ms) {
  if (!ms || ms < 0) return "00s";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
  }
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

/**
 * Formata milissegundos de stamina para horas e minutos (ex: 11h 47m ou 42h 00m).
 * @param {number|null|undefined} ms
 * @returns {string|null}
 */
export function formatStamina(ms) {
  if (typeof ms !== "number" || ms < 0) return null;
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

/**
 * Retorna o nível/tier da stamina ('green', 'orange', 'red').
 * @param {number|null|undefined} ms
 * @returns {string}
 */
export function getStaminaTier(ms) {
  if (typeof ms !== "number" || ms < 0) return "orange";
  const hours = ms / 3600000;
  if (hours >= 40) return "green";
  if (hours >= 14) return "orange";
  return "red";
}

/**
 * Busca case-insensitive no catálogo por nome, displayName ou id.
 * @param {object[]} catalog
 * @param {string} query
 * @returns {object[]}
 */
export function searchHunts(catalog, query) {
  if (!Array.isArray(catalog) || !query) return [];
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return catalog.filter((h) => {
    const name = (h.name ?? "").toLowerCase();
    const displayName = (h.displayName ?? "").toLowerCase();
    const id = (h.id ?? h.huntId ?? "").toLowerCase();
    return name.includes(q) || displayName.includes(q) || id.includes(q);
  });
}

/**
 * Valida e parseia o tier de hunt. Aceita 0, 1 ou 2; usa 0 como padrão.
 * @param {string|undefined} raw
 * @returns {number}
 */
export function parseHuntTier(raw) {
  if (raw === undefined || raw === "") return 0;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n) || n < 0 || n > 2) {
    return 0;
  }
  return n;
}

/**
 * Formata segundos restantes para estimativa amigável (ex: 45s, 12m 30s, 1h 15m, 2d 4h).
 * @param {number|null|undefined} seconds
 * @returns {string}
 */
export function formatEstimatedTime(seconds) {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds) || seconds < 0) {
    return "--";
  }
  if (seconds === 0) return "0s";
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const remSec = s % 60;
  if (m < 60) {
    return remSec > 0 ? `${m}m ${remSec}s` : `${m}m`;
  }
  const h = Math.floor(m / 60);
  const remMin = m % 60;
  if (h < 24) {
    return remMin > 0 ? `${h}h ${String(remMin).padStart(2, "0")}m` : `${h}h`;
  }
  const d = Math.floor(h / 24);
  const remHours = h % 24;
  return `${d}d ${remHours}h`;
}

