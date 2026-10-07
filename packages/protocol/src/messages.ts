import type { IncomingType, OutgoingType } from "./codes.js";

// --- Entidades Comuns ---

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface OutfitColors {
  head: number;
  body: number;
  legs: number;
  feet: number;
}

export interface CreatureEntity {
  id: number;
  name?: string;
  kind?: "player" | "monster" | "npc" | string;
  position?: Position3D;
  direction?: string;
  healthPercent?: number;
  outfitId?: number;
  outfitColors?: OutfitColors;
  mountId?: number;
  speed?: number;
  level?: number;
  vocation?: string;
  [key: string]: unknown;
}

export interface InventoryItem {
  itemId: number;
  name: string;
  count?: number;
  value?: number;
  tier?: number;
  [key: string]: unknown;
}

export interface InventoryChange {
  container: "backpack" | "satchel" | string;
  index: number;
  item: InventoryItem | null;
}

export interface PartyMember {
  id: number;
  name: string;
  level: number;
  vocation?: string;
  healthPercent?: number;
  manaPercent?: number;
  isLeader?: boolean;
  staminaMinutes?: number | null;
  followsLeader?: boolean;
  dps?: number | null;
  damageTotal?: number | null;
  hps?: number | null;
  healTotal?: number | null;
  [key: string]: unknown;
}

export interface VipEntry {
  name: string;
  online: boolean;
  level?: number | null;
  vocation?: string | null;
  lastSeenAt?: number | null;
}

export interface CatalogMonster {
  name: string;
  outfitId?: number;
  [key: string]: unknown;
}

export interface CatalogHunt {
  id?: string;
  huntId?: string;
  name?: string;
  displayName?: string;
  minLevel?: number;
  monsters?: CatalogMonster[];
  tiers?: Array<{ tier: number; name?: string; count?: number }>;
  [key: string]: unknown;
}

export interface SupplyItem {
  itemId: number;
  name?: string;
  count?: number;
  value?: number;
  [key: string]: unknown;
}

export interface LootItem {
  itemId?: number;
  name: string;
  count?: number;
  value?: number;
  inBag?: boolean;
  [key: string]: unknown;
}

// --- Mensagens Recebidas (Incoming) ---

export interface CreatureAppearMessage {
  type: "creature-appear";
  creature?: CreatureEntity;
}

export interface CreatureDisappearMessage {
  type: "creature-disappear";
  id?: number;
}

export interface ExperienceGainMessage {
  type: "experience-gain";
  value?: number;
}

export interface PlayerStatsMessage {
  type: "player-stats";
  level?: number;
  health?: number;
  maxHealth?: number;
  hp?: number;
  maxHp?: number;
  mana?: number;
  maxMana?: number;
  staminaMs?: number;
  staminaDraining?: boolean;
  experience?: number;
  experienceNeeded?: number;
  magicLevel?: number;
  magicProgress?: number;
  magicProgressNeeded?: number;
  skills?: Record<string, number>;
  skillProgress?: Record<string, number>;
  skillProgressNeeded?: Record<string, number>;
  huntSessionRemainingMs?: number | null;
  vocation?: string;
  outfitId?: number;
  outfitColors?: OutfitColors;
  [key: string]: unknown;
}

export interface PlayerVitalsMessage {
  type: "player-vitals";
  hp?: number;
  maxHp?: number;
  health?: number;
  maxHealth?: number;
  mana?: number;
  maxMana?: number;
}

export interface BestiaryProgressMessage {
  type: "bestiary-progress" | "bestiary-update";
  kills?: Record<string, number>;
  completed?: number;
  total?: number;
  bonusPercent?: number;
}

export interface MarketPricesMessage {
  type: "market-prices";
  npc?: Array<[number, number]>;
  auction?: Array<[number, number]>;
}

export interface CreatureSayMessage {
  type: "creature-say" | "creature-speech";
  id?: number;
  itemId?: number;
  text?: string;
  [key: string]: unknown;
}

export interface PlayerInventoryMessage {
  type: "player-inventory" | "inventory-delta" | "inventory-update";
  gold?: number;
  slotCount?: number;
  satchelCount?: number;
  changes?: InventoryChange[];
  [key: string]: unknown;
}

export interface EquippedItemsMessage {
  type: "equipped-items";
  slots?: Array<InventoryItem | null>;
}

export interface LootAddMessage {
  type: "loot-add";
  item?: InventoryItem;
  [key: string]: unknown;
}

export interface ItemOnGroundMessage {
  type: "item-on-ground";
  item?: InventoryItem;
  [key: string]: unknown;
}

export interface HuntPendingMessage {
  type: "hunt-pending";
  hunt?: { huntId?: string; tier?: number } | null | boolean;
  remainingMs?: number;
}

export interface HuntAnalyzerSessionMessage {
  type: "hunt-analyzer-session";
  startedAt?: number;
  durationMs?: number;
}

export interface HuntAnalyzerUpdateMessage {
  type: "hunt-analyzer-update";
  startedAt?: number;
  durationMs?: number;
  kills?: number;
  experience?: number;
  waste?: number;
  lootValue?: number;
  supplies?: SupplyItem[];
  loot?: LootItem[];
}

export interface HuntLeavePendingMessage {
  type: "hunt-leave-pending";
  remainingMs?: number;
}

export interface InstanceEnterMessage {
  type: "instance-enter";
  scenarioId?: string;
  [key: string]: unknown;
}

export interface ActionBarUpdateMessage {
  type: "action-bar-update";
  slots?: unknown[];
  managed?: boolean;
}

export interface ActionBarPresetsMessage {
  type: "action-bar-presets";
  names?: string[];
  active?: number;
}

export interface VipListMessage {
  type: "vip-list" | "friends-list";
  entries?: VipEntry[];
}

export interface VipStatusMessage {
  type: "vip-status";
  name?: string;
  online?: boolean;
  level?: number | null;
  vocation?: string | null;
  lastSeenAt?: number | null;
}

export interface PartyUpdateMessage {
  type: "party-update";
  leaderId?: number | null;
  sharedCosts?: unknown;
  members?: PartyMember[];
}

export interface PartyInvitedMessage {
  type: "party-invited";
  fromId?: number;
  fromName?: string;
  members?: Array<{ name: string; level: number; vocation: string }>;
}

export interface TransferOfferMessage {
  type: "transfer-offer";
  fromName?: string;
}

export interface TransferBeginMessage {
  type: "transfer-begin";
}

export interface PartyCostsCancelledMessage {
  type: "party-costs-cancelled";
}

export interface PartyInviteConfirmMessage {
  type: "party-invite-confirm";
}

export interface CreatureHealthMessage {
  type: "creature-health";
  id?: number;
  healthPercent?: number;
}

export interface PlayerDiedMessage {
  type: "player-died";
  diedAt?: number;
  resumedAt?: number;
  killer?: string;
  penalty?: {
    lostExperience?: number;
    lostLevels?: number;
    blessingsSpent?: number;
    freeBless?: boolean;
    lostItems?: unknown[];
  };
  hits?: unknown[];
}

export interface DeathFilmOfferMessage {
  type: "death-film-offer";
  diedAt?: number;
  killer?: string;
  penalty?: {
    lostExperience?: number;
    lostLevels?: number;
    blessingsSpent?: number;
    freeBless?: boolean;
    lostItems?: unknown[];
  };
}

export interface DeathHistoryEntry {
  diedAt?: number;
  killer?: string;
  where?: string;
  skillsLost?: unknown[];
  hits?: unknown[];
  blessings?: unknown[];
  freeBless?: boolean;
  lostItems?: unknown[];
  levelBefore?: number;
  levelAfter?: number;
  experienceBefore?: number;
  experienceAfter?: number;
}

export interface DeathHistoryMessage {
  type: "death-history";
  entries?: DeathHistoryEntry[];
}

export interface BlessingsStatusMessage {
  type: "blessings-status";
  owned?: string[];
  cost?: number;
  freeUntilLevel?: number;
  lossReductionPercent?: number;
  equipmentLossPercent?: number;
}

export interface HuntCatalogMessage {
  type: "hunt-catalog";
  hunts?: CatalogHunt[];
}

export interface SystemMessage {
  type: "system-message";
  message?: string;
}

export interface CreatureOutfitMessage {
  type: "creature-outfit";
  id?: number;
  outfitId?: number;
  colors?: OutfitColors;
}

export interface TrainingUpdateMessage {
  type: "training-update";
  active: boolean;
  skill?: string;
  etaMs?: number;
  exercise?: boolean;
}

export interface IdleTrainingMessage {
  type: "idle-training";
  enabled: boolean;
  offlineSkill?: string | null;
}

export interface WelcomeMessage {
  type: "welcome";
  playerId?: number;
}

export interface PongMessage {
  type: "pong";
  t?: number;
}

export interface GenericIncomingMessage {
  type: IncomingType;
  [key: string]: unknown;
}

export type KnownIncomingMessage =
  | CreatureAppearMessage
  | CreatureDisappearMessage
  | ExperienceGainMessage
  | PlayerStatsMessage
  | PlayerVitalsMessage
  | BestiaryProgressMessage
  | MarketPricesMessage
  | CreatureSayMessage
  | PlayerInventoryMessage
  | EquippedItemsMessage
  | LootAddMessage
  | ItemOnGroundMessage
  | HuntPendingMessage
  | HuntAnalyzerSessionMessage
  | HuntAnalyzerUpdateMessage
  | HuntLeavePendingMessage
  | InstanceEnterMessage
  | ActionBarUpdateMessage
  | ActionBarPresetsMessage
  | VipListMessage
  | VipStatusMessage
  | PartyUpdateMessage
  | PartyInvitedMessage
  | TransferOfferMessage
  | TransferBeginMessage
  | PartyCostsCancelledMessage
  | PartyInviteConfirmMessage
  | CreatureHealthMessage
  | PlayerDiedMessage
  | DeathFilmOfferMessage
  | DeathHistoryMessage
  | BlessingsStatusMessage
  | HuntCatalogMessage
  | SystemMessage
  | CreatureOutfitMessage
  | TrainingUpdateMessage
  | IdleTrainingMessage
  | WelcomeMessage
  | PongMessage;

export type IncomingMessage = KnownIncomingMessage | GenericIncomingMessage;
export type IncomingGameMessage = IncomingMessage;

// --- Mensagens Enviadas (Outgoing) ---

export interface AuthenticateOutgoing {
  type: "authenticate";
  clientVersion: string;
  ticket: string;
}

export interface PingOutgoing {
  type: "ping";
  t?: number;
}

export interface LogoutOutgoing {
  type: "logout";
}

export interface StartHuntOutgoing {
  type: "start-hunt";
  huntId: string;
  tier?: number;
  withTeam?: boolean;
}

export interface LeaveHuntOutgoing {
  type: "leave-hunt";
}

export interface StartTrainingOutgoing {
  type: "start-training";
  mode: "online";
  skill: string;
  repeat?: boolean;
}

export interface LeaveTrainingOutgoing {
  type: "leave-training";
}

export interface BlessingBuyOutgoing {
  type: "blessing-buy";
  id: string;
}

export interface BlessingsOpenOutgoing {
  type: "blessings-open";
}

export interface ReviveOutgoing {
  type: "revive";
}

export interface SetActionSlotOutgoing {
  type: "set-action-slot";
  slot: number;
  rule: unknown;
}

export interface SelectActionBarPresetOutgoing {
  type: "select-action-bar-preset";
  index: number;
}

export interface SaveActionBarPresetOutgoing {
  type: "save-action-bar-preset";
  name: string;
}

export interface PartyInviteNameOutgoing {
  type: "party-invite-name";
  name: string;
}

export interface PartyRespondOutgoing {
  type: "party-respond";
  accept: boolean;
  followLeader?: boolean;
}

export interface PartyLeaveOutgoing {
  type: "party-leave";
}

export interface PartyFollowLeaderOutgoing {
  type: "party-follow-leader";
  follow: boolean;
}

export interface PartyKickOutgoing {
  type: "party-kick";
  playerId: number;
}

export interface PartyCostsOfferOutgoing {
  type: "party-costs-offer";
  enabled: boolean;
}

export interface PartyCostsCancelOutgoing {
  type: "party-costs-cancel";
}

export interface PartyCostsRespondOutgoing {
  type: "party-costs-respond";
  accept: boolean;
}

export interface TransferRespondOutgoing {
  type: "transfer-respond";
  fromName?: string;
  accept: boolean;
}

export interface RequestDeathHistoryOutgoing {
  type: "request-death-history";
}

export interface CoinsRefreshOutgoing {
  type: "coins-refresh";
}

export interface GenericOutgoingMessage {
  type: OutgoingType;
  [key: string]: unknown;
}

export type KnownOutgoingMessage =
  | AuthenticateOutgoing
  | PingOutgoing
  | LogoutOutgoing
  | StartHuntOutgoing
  | LeaveHuntOutgoing
  | StartTrainingOutgoing
  | LeaveTrainingOutgoing
  | BlessingBuyOutgoing
  | BlessingsOpenOutgoing
  | ReviveOutgoing
  | SetActionSlotOutgoing
  | SelectActionBarPresetOutgoing
  | SaveActionBarPresetOutgoing
  | PartyInviteNameOutgoing
  | PartyRespondOutgoing
  | PartyLeaveOutgoing
  | PartyFollowLeaderOutgoing
  | PartyKickOutgoing
  | PartyCostsOfferOutgoing
  | PartyCostsCancelOutgoing
  | PartyCostsRespondOutgoing
  | TransferRespondOutgoing
  | RequestDeathHistoryOutgoing
  | CoinsRefreshOutgoing;

export type OutgoingMessage = KnownOutgoingMessage | GenericOutgoingMessage;
