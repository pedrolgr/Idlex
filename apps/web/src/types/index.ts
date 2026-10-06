export interface UserProfile {
  id: string;
  email: string;
  role: string;
  emailVerified: boolean;
  plan?: string;
  screens?: number;
  twoFactorEnabled?: boolean;
}

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

export interface HuntSessionData {
  huntActive: boolean;
  huntName?: string;
  elapsedMs: number;
  kills?: number;
  monsterDeaths?: number;
  killsDetailed?: Array<{ name: string; count: number; bestiaryKills?: number }>;
  loot?: Array<{ itemId: number; name: string; count: number; value: number }>;
  suppliesUsed?: Array<{ itemId: number; name: string; count: number; totalCost: number }>;
  rates?: {
    goldPerHour: number;
    wastePerHour: number;
    balancePerHour: number;
    xpPerHour: number;
  };
  deathInfo?: {
    isDead: boolean;
    deathCount: number;
  };
  blessings?: Record<string, boolean>;
}

export interface SlotData {
  id: number;
  status: "idle" | "logging_in" | "connected" | "hunting" | "error" | "dead";
  errorMessage: string | null;
  account: { email: string } | null;
  character: CharacterSummary | null;
  session: HuntSessionData;
  catalogCount: number;
}
