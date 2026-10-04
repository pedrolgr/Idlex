export interface SupplyDefinition {
  id: string;
  name: string;
  cost: number;
  category: "potion" | "rune" | "arrow" | "bolt" | string;
}

export const HUNTERA_SUPPLY_PRICES: Record<number, SupplyDefinition> = {
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

export const HUNTERA_ITEM_SELL_PRICES: Record<number, number> = {
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
