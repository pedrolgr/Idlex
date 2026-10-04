import { LRUCache } from "lru-cache";
import { z } from "zod";

export const avatarQuerySchema = z.object({
  outfitId: z.coerce.number().int().min(1).max(2000).default(128),
  head: z.coerce.number().int().min(0).max(255).default(0),
  body: z.coerce.number().int().min(0).max(255).default(0),
  legs: z.coerce.number().int().min(0).max(255).default(0),
  feet: z.coerce.number().int().min(0).max(255).default(0),
  animate: z
    .enum(["0", "1", "true", "false"])
    .optional()
    .transform((val) => val !== "0" && val !== "false"),
  vocation: z.string().max(64).default("none"),
});

export type AvatarQuery = z.infer<typeof avatarQuerySchema>;

export interface CachedAvatar {
  buffer: Buffer;
  contentType: string;
}

const avatarCache = new LRUCache<string, CachedAvatar>({
  max: 2000,
  maxSize: 50 * 1024 * 1024, // 50 MB
  sizeCalculation: (val) => val.buffer.length,
});

export async function fetchAvatar(
  query: AvatarQuery,
): Promise<{ buffer: Buffer; contentType: string; cacheControl: string }> {
  const { outfitId, head, body, legs, feet, animate, vocation } = query;
  const isAnimate = animate ?? true;
  const cacheKey = `${isAnimate ? "anim" : "static"}-${outfitId}-${head}-${body}-${legs}-${feet}`;

  if (avatarCache.has(cacheKey)) {
    const cached = avatarCache.get(cacheKey)!;
    return {
      buffer: cached.buffer,
      contentType: cached.contentType,
      cacheControl: "public, max-age=604800, immutable",
    };
  }

  const endpoint = isAnimate ? "animate" : "static";
  const remoteUrl = `https://gunzot-outfits.gunzo.eu/${endpoint}/${outfitId}?head=${head}&body=${body}&legs=${legs}&feet=${feet}&addons=0`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const resp = await fetch(remoteUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (resp.ok) {
      const arrayBuffer = await resp.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType =
        resp.headers.get("content-type") ||
        (isAnimate ? "image/gif" : "image/png");
      avatarCache.set(cacheKey, { buffer, contentType });

      return {
        buffer,
        contentType,
        cacheControl: "public, max-age=604800, immutable",
      };
    }
  } catch {}

  const fallbackSvg = generateVocationSvg(vocation);
  return {
    buffer: Buffer.from(fallbackSvg),
    contentType: "image/svg+xml",
    cacheControl: "public, max-age=3600",
  };
}

export function generateVocationSvg(vocation: string): string {
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
