import type { ServerResponse } from "node:http";

interface CachedAvatar {
  buffer: Buffer;
  contentType: string;
}

const avatarCache = new Map<string, CachedAvatar>();

export async function handleAvatarRequest(
  url: URL,
  res: ServerResponse,
): Promise<void> {
  const outfitId = parseInt(url.searchParams.get("outfitId") || "128", 10);
  const head = parseInt(url.searchParams.get("head") || "0", 10);
  const body = parseInt(url.searchParams.get("body") || "0", 10);
  const legs = parseInt(url.searchParams.get("legs") || "0", 10);
  const feet = parseInt(url.searchParams.get("feet") || "0", 10);
  const animate = url.searchParams.get("animate") !== "0";
  const vocation = (url.searchParams.get("vocation") || "none").toLowerCase();

  const cacheKey = `${animate ? "anim" : "static"}-${outfitId}-${head}-${body}-${legs}-${feet}`;
  if (avatarCache.has(cacheKey)) {
    const cached = avatarCache.get(cacheKey)!;
    res.writeHead(200, {
      "Content-Type": cached.contentType,
      "Cache-Control": "public, max-age=86400",
    });
    res.end(cached.buffer);
    return;
  }

  const endpoint = animate ? "animate" : "static";
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
        (animate ? "image/gif" : "image/png");
      avatarCache.set(cacheKey, { buffer, contentType });

      res.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      });
      res.end(buffer);
      return;
    }
  } catch {}

  const fallbackSvg = generateVocationSvg(vocation);
  res.writeHead(200, {
    "Content-Type": "image/svg+xml",
    "Cache-Control": "public, max-age=3600",
  });
  res.end(fallbackSvg);
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
