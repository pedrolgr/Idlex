import crypto from "node:crypto";
import type { CatalogHunt } from "@idlex/protocol";
import type { SlotJSON } from "../../slot.js";

export interface CompactSlotState {
  id: number;
  status: string;
  errorMessage: string | null;
  account: { email: string } | null;
  character: {
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
  } | null;
  catalogHash?: string;
  catalogCount: number;
  session: SlotJSON["session"];
}

export type SlotPatch =
  | { type: "status"; slot: number; status: string; errorMessage: string | null }
  | { type: "character"; slot: number; character: CompactSlotState["character"] }
  | { type: "catalog-loaded"; slot: number; catalogHash: string; catalogCount: number }
  | { type: "vitals"; slot: number; hp?: number; maxHp?: number; mana?: number; maxMana?: number }
  | { type: "session"; slot: number; session: CompactSlotState["session"] }
  | { type: "heartbeat"; timestamp: number };

// In-memory catalog cache shared across all slots
const catalogCache = new Map<string, CatalogHunt[]>();

export function storeCatalog(catalog: CatalogHunt[]): string {
  const json = JSON.stringify(catalog);
  const hash = crypto.createHash("sha256").update(json).digest("hex").slice(0, 16);
  if (!catalogCache.has(hash)) {
    catalogCache.set(hash, catalog);
  }
  return hash;
}

export function getCachedCatalog(hash: string): CatalogHunt[] | undefined {
  return catalogCache.get(hash);
}

/**
 * Creates a compact representation of a Slot, omitting huge static catalog arrays
 */
export function toCompactSlot(slotJson: SlotJSON): CompactSlotState {
  const catalogHash =
    slotJson.catalog && slotJson.catalog.length > 0
      ? storeCatalog(slotJson.catalog)
      : undefined;

  return {
    id: slotJson.id,
    status: slotJson.status,
    errorMessage: slotJson.errorMessage,
    account: slotJson.account,
    character: slotJson.character,
    catalogHash,
    catalogCount: slotJson.catalogCount,
    session: slotJson.session,
  };
}

/**
 * Compares two compact slot states and produces granular delta patches
 */
export function computeSlotDeltas(
  prev: CompactSlotState | undefined,
  curr: CompactSlotState,
): SlotPatch[] {
  if (!prev) {
    return [
      { type: "status", slot: curr.id, status: curr.status, errorMessage: curr.errorMessage },
      { type: "character", slot: curr.id, character: curr.character },
      { type: "session", slot: curr.id, session: curr.session },
    ];
  }

  const patches: SlotPatch[] = [];

  if (prev.status !== curr.status || prev.errorMessage !== curr.errorMessage) {
    patches.push({
      type: "status",
      slot: curr.id,
      status: curr.status,
      errorMessage: curr.errorMessage,
    });
  }

  if (JSON.stringify(prev.character) !== JSON.stringify(curr.character)) {
    patches.push({
      type: "character",
      slot: curr.id,
      character: curr.character,
    });
  }

  if (prev.catalogHash !== curr.catalogHash && curr.catalogHash) {
    patches.push({
      type: "catalog-loaded",
      slot: curr.id,
      catalogHash: curr.catalogHash,
      catalogCount: curr.catalogCount,
    });
  }

  if (JSON.stringify(prev.session) !== JSON.stringify(curr.session)) {
    patches.push({
      type: "session",
      slot: curr.id,
      session: curr.session,
    });
  }

  return patches;
}
