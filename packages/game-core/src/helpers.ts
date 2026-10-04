import type { CatalogHunt } from "@idlex/protocol";

export function formatDuration(ms: number | null | undefined): string {
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

export function formatStamina(ms: number | null | undefined): string | null {
  if (typeof ms !== "number" || ms < 0) return null;
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

export function getStaminaTier(
  ms: number | null | undefined,
): "green" | "orange" | "red" {
  if (typeof ms !== "number" || ms < 0) return "orange";
  const hours = ms / 3600000;
  if (hours >= 40) return "green";
  if (hours >= 14) return "orange";
  return "red";
}

export function searchHunts(
  catalog: CatalogHunt[] | undefined | null,
  query: string | undefined | null,
): CatalogHunt[] {
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

export function parseHuntTier(raw: string | number | undefined): number {
  if (raw === undefined || raw === "") return 0;
  const n = typeof raw === "number" ? raw : parseInt(raw, 10);
  if (Number.isNaN(n) || n < 0 || n > 2) {
    return 0;
  }
  return n;
}

export function formatEstimatedTime(
  seconds: number | null | undefined,
): string {
  if (
    seconds === null ||
    seconds === undefined ||
    Number.isNaN(seconds) ||
    seconds < 0
  ) {
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
