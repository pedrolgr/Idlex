import { LRUCache } from "lru-cache";
import { z } from "zod";

export const ITEM_ID_TO_SLUG: Record<number, string> = {
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
  37109: "sliver",
  // Exercise Training Weapons & Shield (6 tipos de treino)
  35285: "lasting_exercise_sword",
  35286: "lasting_exercise_axe",
  35287: "lasting_exercise_club",
  35288: "lasting_exercise_bow",
  35290: "lasting_exercise_wand",
  44067: "lasting_exercise_shield",
  28552: "exercise_sword",
  28553: "exercise_axe",
  28554: "exercise_club",
  28555: "exercise_bow",
  28556: "exercise_rod",
  28557: "exercise_wand",
  44065: "exercise_shield",
};

export function sanitizeItemName(rawName: string | null | undefined): string {
  if (!rawName) return "";
  let s = rawName.trim();
  s = s.replace(/\s*\(?x?\d+\)?\s*$/i, "");
  s = s.replace(/^\d+\s+/, "");
  const lower = s.toLowerCase();
  if (lower === "gold coins") return "gold coin";
  if (lower === "platinum coins") return "platinum coin";
  if (lower === "crystal coins") return "crystal coin";
  if (lower === "worms") return "worm";
  return s.trim();
}

export const itemIconQuerySchema = z.object({
  id: z.coerce.number().int().min(0).max(100000).optional().default(0),
  name: z.string().max(64).optional().default(""),
});

export type ItemIconQuery = z.infer<typeof itemIconQuerySchema>;

interface CachedIcon {
  buffer: Buffer;
  contentType: string;
}

const itemIconCache = new LRUCache<string, CachedIcon>({
  max: 2000,
  maxSize: 50 * 1024 * 1024, // 50 MB
  sizeCalculation: (val) => val.buffer.length,
});

export async function fetchItemIcon(
  query: ItemIconQuery,
): Promise<{ buffer: Buffer; contentType: string; cacheControl: string }> {
  const rawName = query.name || "";
  const rawId = query.id || 0;
  const sanitized = sanitizeItemName(rawName);

  const slug =
    rawId && ITEM_ID_TO_SLUG[rawId]
      ? ITEM_ID_TO_SLUG[rawId]
      : sanitized
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "");

  if (!slug) {
    return {
      buffer: Buffer.from(generateItemFallbackSvg("?", rawId)),
      contentType: "image/svg+xml",
      cacheControl: "public, max-age=86400",
    };
  }

  if (itemIconCache.has(slug)) {
    const cached = itemIconCache.get(slug)!;
    return {
      buffer: cached.buffer,
      contentType: cached.contentType,
      cacheControl: "public, max-age=604800, immutable",
    };
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

        return {
          buffer,
          contentType,
          cacheControl: "public, max-age=604800, immutable",
        };
      }
    }
  } catch {}

  const svg = generateItemFallbackSvg(sanitized || rawName, rawId);
  const svgBuffer = Buffer.from(svg);
  itemIconCache.set(slug, { buffer: svgBuffer, contentType: "image/svg+xml" });

  return {
    buffer: svgBuffer,
    contentType: "image/svg+xml",
    cacheControl: "public, max-age=86400",
  };
}

export function generateItemFallbackSvg(
  name: string,
  itemId: number = 0,
): string {
  const n = (name || "").toLowerCase();
  const initial = (name || "?").slice(0, 2).toUpperCase();

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

  if (
    n.includes("potion") ||
    n.includes("poção") ||
    n.includes("flask") ||
    (itemId >= 236 && itemId <= 268)
  ) {
    const isMana = n.includes("mana");
    const liquidColor = isMana ? "#38bdf8" : "#f87171";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
      <rect x="13" y="4" width="6" height="4" fill="#94a3b8" rx="1"/>
      <path d="M12 8 L8 16 C7 23 9 28 16 28 C23 28 25 23 24 16 L20 8 Z" fill="#1e293b" stroke="#cbd5e1" stroke-width="1.5"/>
      <path d="M9.5 17 C9.5 24 11 26 16 26 C21 26 22.5 24 22.5 17 Z" fill="${liquidColor}"/>
      <circle cx="14" cy="20" r="1.5" fill="#ffffff" opacity="0.6"/>
    </svg>`;
  }

  if (
    n.includes("rune") ||
    n.includes("runa") ||
    (itemId >= 3155 && itemId <= 3202)
  ) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
      <polygon points="16,4 28,10 28,22 16,28 4,22 4,10" fill="#334155" stroke="#94a3b8" stroke-width="1.5"/>
      <path d="M16 10 L16 22 M11 13 L21 19 M21 13 L11 19" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`;
  }

  if (n.includes("arrow") || n.includes("bolt")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
      <line x1="6" y1="26" x2="24" y2="8" stroke="#d4af37" stroke-width="2"/>
      <polygon points="26,6 20,8 24,12" fill="#e2e8f0"/>
      <polygon points="6,26 9,21 11,23" fill="#ef4444"/>
      <polygon points="6,26 11,23 9,25" fill="#ef4444"/>
    </svg>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
    <rect width="32" height="32" rx="5" fill="#181d27" stroke="#d4af37" stroke-width="1.5"/>
    <text x="16" y="20" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#f5c518" text-anchor="middle" dominant-baseline="middle">${initial}</text>
  </svg>`;
}
