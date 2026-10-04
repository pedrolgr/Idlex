import type {
  HuntAnalyzerSessionMessage,
  HuntAnalyzerUpdateMessage,
  HuntLeavePendingMessage,
  HuntPendingMessage,
  InstanceEnterMessage,
} from "@idlex/protocol";
import { HUNTERA_SUPPLY_PRICES } from "../constants.js";
import type { HuntSession } from "../hunt-session.js";

export function handleHuntPending(
  session: HuntSession,
  message: HuntPendingMessage,
): void {
  if (message.hunt !== undefined) {
    session.huntPending = Boolean(message.hunt);
    if (message.hunt) {
      session.huntActive = true;
      if (
        typeof message.hunt === "object" &&
        typeof message.hunt?.huntId === "string" &&
        !session.huntId
      ) {
        session.huntId = message.hunt.huntId;
      }
    } else if (session.leavePendingMs !== null) {
      session.huntActive = false;
    }
  } else {
    session.huntPending = true;
  }
  if (typeof message.remainingMs === "number") {
    session.huntSessionRemainingMs = message.remainingMs;
  }
}

export function handleHuntAnalyzerSession(
  session: HuntSession,
  message: HuntAnalyzerSessionMessage,
): void {
  if (typeof message.startedAt === "number") {
    session.startedAt = message.startedAt;
  }
  if (typeof message.durationMs === "number") {
    session.durationMs = message.durationMs;
  }
}

export function handleHuntAnalyzerUpdate(
  session: HuntSession,
  message: HuntAnalyzerUpdateMessage,
): void {
  if (typeof message.startedAt === "number")
    session.startedAt = message.startedAt;
  if (typeof message.durationMs === "number")
    session.durationMs = message.durationMs;
  if (
    typeof message.kills === "number" &&
    message.kills > session.monsterDeaths
  ) {
    session.monsterDeaths = message.kills;
  }
  if (
    typeof message.experience === "number" &&
    message.experience > session.experienceGained
  ) {
    session.experienceGained = message.experience;
  }
  if (typeof message.waste === "number") {
    session.waste = Math.max(session.waste, message.waste);
  }

  // Saldo estrito da bag: não sobrescreve se houver rastreamento ativo da bolsa
  if (session.bagTrackingActive) {
    session.lootValue = session.getBagLootValue();
  } else if (typeof message.lootValue === "number") {
    session.lootValue = message.lootValue;
  }
  session.balance = session.lootValue - session.waste;

  if (Array.isArray(message.supplies)) {
    session.supplies = message.supplies;
    for (const sup of message.supplies) {
      if (!sup || !sup.itemId) continue;
      const supplyInfo = HUNTERA_SUPPLY_PRICES[sup.itemId] || {
        id: `item-${sup.itemId}`,
        name: sup.name || `Item #${sup.itemId}`,
        cost:
          sup.count && sup.count > 0
            ? Math.round((sup.value || 0) / sup.count)
            : 0,
        category: "potion",
      };
      const prev = session.suppliesMap.get(sup.itemId) || {
        itemId: sup.itemId,
        name: sup.name || supplyInfo.name,
        count: 0,
        unitPrice: supplyInfo.cost,
        totalCost: 0,
        category: supplyInfo.category,
      };
      if ((sup.count || 0) >= prev.count) {
        prev.count = sup.count || 0;
        prev.totalCost = sup.value ?? prev.count * prev.unitPrice;
      }
      session.suppliesMap.set(sup.itemId, prev);
    }
  }
  if (Array.isArray(message.loot) && session.loot.length === 0) {
    session.loot = message.loot as any;
  }
}

export function handleHuntLeavePending(
  session: HuntSession,
  message: HuntLeavePendingMessage,
): void {
  if (typeof message.remainingMs === "number") {
    session.leavePendingMs = message.remainingMs;
  }
}

export function handleInstanceEnter(
  session: HuntSession,
  message: InstanceEnterMessage,
): void {
  if (typeof message.scenarioId === "string") {
    // Se entrou em cenário da cidade, não está mais em hunt
    if (
      message.scenarioId === "city" ||
      message.scenarioId.includes("temple")
    ) {
      session.huntActive = false;
    }
  }
}
