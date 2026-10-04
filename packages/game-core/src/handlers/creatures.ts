import type {
  CreatureAppearMessage,
  CreatureDisappearMessage,
  CreatureHealthMessage,
  CreatureSayMessage,
} from "@idlex/protocol";
import { HUNTERA_SUPPLY_PRICES } from "../constants.js";
import type { HuntSession } from "../hunt-session.js";

export function handleCreatureAppear(
  session: HuntSession,
  message: CreatureAppearMessage,
): void {
  const c = message.creature;
  if (c && c.id !== undefined) {
    session.creatures.set(c.id, {
      id: c.id,
      name: c.name ?? "Desconhecido",
      kind: c.kind ?? "unknown",
    });
    if (c.kind === "player") {
      if (
        !session.gamePlayerId ||
        (session.playerName &&
          c.name &&
          c.name.toLowerCase() === session.playerName.toLowerCase())
      ) {
        session.gamePlayerId = c.id;
      }
    }
  }
}

export function handleCreatureDisappear(
  session: HuntSession,
  message: CreatureDisappearMessage,
): void {
  if (message.id !== undefined) {
    const appeared = session.creatures.get(message.id);
    if (appeared) {
      if (session.huntActive && appeared.kind === "monster") {
        const name = appeared.name;
        const isAllowed =
          !session.validMonsterNames ||
          session.validMonsterNames.has(name.toLowerCase());
        if (isAllowed) {
          session.killsByName.set(
            name,
            (session.killsByName.get(name) ?? 0) + 1,
          );
          session.monsterDeaths += 1;
        }
      }
      session.creatures.delete(message.id);
    }
  }
}

export function handleCreatureHealth(
  session: HuntSession,
  message: CreatureHealthMessage,
): void {
  if (
    message.id !== undefined &&
    (message.id === session.gamePlayerId || message.id === session.playerId)
  ) {
    if (typeof message.healthPercent === "number") {
      if (!session.playerState.maxHp && session.playerState.hp) {
        session.playerState.maxHp = session.playerState.hp;
      }
      if (session.playerState.maxHp) {
        session.playerState.hp = Math.round(
          (session.playerState.maxHp * message.healthPercent) / 100,
        );
      }
      if (message.healthPercent === 0) {
        session.deathInfo.isDead = true;
        session.huntActive = false;
        session.playerState.hp = 0;
      }
    }
  }
}

export function handleCreatureSay(
  session: HuntSession,
  message: CreatureSayMessage,
): void {
  if (message.itemId) {
    const isKnownSupply = Boolean(HUNTERA_SUPPLY_PRICES[message.itemId]);
    const isPlayerMessage =
      !session.gamePlayerId ||
      message.id === session.gamePlayerId ||
      message.id === session.playerId ||
      isKnownSupply;
    if (isPlayerMessage) {
      const supplyInfo = HUNTERA_SUPPLY_PRICES[message.itemId] || {
        id: `item-${message.itemId}`,
        name:
          message.text && message.text !== "Aaaah..."
            ? message.text
            : `Item #${message.itemId}`,
        cost: 0,
        category: "potion",
      };

      const prev = session.suppliesMap.get(message.itemId) || {
        itemId: message.itemId,
        name: supplyInfo.name,
        count: 0,
        unitPrice: supplyInfo.cost,
        totalCost: 0,
        category: supplyInfo.category,
      };

      prev.count += 1;
      prev.totalCost = prev.count * prev.unitPrice;
      session.suppliesMap.set(message.itemId, prev);

      session.realtimeWaste += supplyInfo.cost;
      session.waste = Math.max(session.waste, session.realtimeWaste);
      session.balance = session.lootValue - session.waste;
      session.supplies = [...session.suppliesMap.values()];
    }
  }
}
