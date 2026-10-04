import type {
  CatalogMonster,
  PartyMember,
  VipEntry,
} from "@idlex/protocol";

export interface HuntSessionOptions {
  huntId?: string | null;
  huntName?: string | null;
  tier?: number;
  validMonsters?: Array<string | CatalogMonster> | null;
}

export interface PlayerState {
  level?: number | null;
  hp?: number | null;
  maxHp?: number | null;
  mana?: number | null;
  maxMana?: number | null;
  staminaMs?: number | null;
  staminaDraining?: boolean;
}

export interface SuppliesEntry {
  itemId: number;
  name: string;
  count: number;
  unitPrice: number;
  totalCost: number;
  category: string;
}

export interface BagLootEntry {
  itemId?: number;
  name: string;
  count: number;
  unitValue: number;
  totalValue: number;
}

export interface FloorDropEntry {
  itemId?: number;
  name: string;
  count: number;
  time: number;
}

export interface LootEntry {
  itemId?: number;
  name: string;
  count: number;
  value?: number;
  unitValue?: number;
  inBag?: boolean;
}

export interface InventoryState {
  backpack: Array<unknown>;
  satchel: Array<unknown>;
  gold: number;
}

export interface DeathInfo {
  isDead: boolean;
  diedAt: number | null;
  killer: string | null;
  where: string | null;
  lostExperience: number | null;
  lostLevels: number | null;
  skillsLost: unknown[];
  blessingsSpent: number;
  blessings: unknown[];
  freeBless: boolean;
  lostItems: unknown[];
  hits: unknown[];
  levelBefore: number | null;
  levelAfter: number | null;
  experienceBefore: number | null;
  experienceAfter: number | null;
}

export interface BlessingsState {
  owned: string[];
  cost: number;
  freeUntilLevel: number;
  lossReductionPercent: number;
  equipmentLossPercent: number;
}

export interface SkillSummaryItem {
  id: string;
  name: string;
  level: number;
  progress: number;
  needed: number;
  remaining: number;
  percent: number;
}

export interface HourlyRates {
  elapsedSeconds: number;
  goldPerHour: number;
  wastePerHour: number;
  balancePerHour: number;
  xpPerHour: number;
  secondsToNextLevel: number | null;
  timeToNextLevelFormatted: string;
  goldPerHourFormatted: string;
  wastePerHourFormatted: string;
  balancePerHourFormatted: string;
  xpPerHourFormatted: string;
}

export interface PartyState {
  leaderId: number;
  sharedCosts?: unknown;
  members: PartyMember[];
}

export interface PartyInviteState {
  fromId?: number;
  fromName: string;
  members: Array<{ name: string; level: number; vocation: string }>;
  receivedAt: number;
}

export interface TransferOfferState {
  fromName: string;
  receivedAt: number;
}

export type PriceMode = "npc" | "auction" | "custom";

export interface HuntSessionJSON {
  huntId: string | null;
  huntName: string | null;
  tier: number;
  huntActive: boolean;
  leavePendingMs: number | null;
  elapsedFormatted: string;
  elapsedMs: number;
  monsterDeaths: number;
  killsByName: Record<string, number>;
  experienceGained: number;
  playerState: {
    level: number | null;
    hp: number | null;
    maxHp: number | null;
    mana: number | null;
    maxMana: number | null;
    staminaMs: number | null;
    staminaFormatted: string | null;
    staminaTier: string;
    staminaDraining: boolean;
  };
  staminaFormatted: string | null;
  experience: number;
  experienceNeeded: number;
  remainingXp: number;
  xpPercent: number;
  skills: SkillSummaryItem[];
  bestiary: {
    kills: Record<string, number>;
    summary: {
      completed: number;
      total: number;
      bonusPercent: number;
    };
  };
  priceMode: PriceMode;
  totalGold: number;
  goldGainedInBag: number;
  itemsValue: number;
  lootValue: number;
  waste: number;
  balance: number;
  rates: HourlyRates;
  goldPerHour: number;
  wastePerHour: number;
  balancePerHour: number;
  xpPerHour: number;
  timeToNextLevelSeconds: number | null;
  timeToNextLevelFormatted: string;
  killsDetailed: Array<{
    name: string;
    count: number;
    bestiaryKills: number | null;
  }>;
  bagLoot: BagLootEntry[];
  loot: LootEntry[];
  supplies: unknown[];
  suppliesUsed: SuppliesEntry[];
  totalSuppliesCost: number;
  inventory: {
    backpack: unknown[];
    satchel: unknown[];
    gold: number;
  };
  actionBar: {
    slots: unknown[];
    presets: string[];
    activePreset: number;
    managed: boolean;
  };
  friends: VipEntry[];
  party: PartyState | null;
  partyInvite: PartyInviteState | null;
  transferOffer: TransferOfferState | null;
  deathInfo: DeathInfo;
  blessings: BlessingsState;
  gamePlayerId: number | null;
}
