import type {
  EquippedItemsMessage,
  ItemOnGroundMessage,
  LootAddMessage,
  MarketPricesMessage,
  PlayerInventoryMessage,
} from "@idlex/protocol";
import type { HuntSession } from "../hunt-session.js";

export function handleMarketPrices(
  session: HuntSession,
  message: MarketPricesMessage,
): void {
  if (Array.isArray(message.npc)) {
    for (const [id, price] of message.npc) {
      session.npcSellPrices.set(id, price);
    }
  }
  if (Array.isArray(message.auction)) {
    for (const [id, price] of message.auction) {
      session.auctionPrices.set(id, price);
    }
  }
  session.recalculateFinancials();
}

export function handlePlayerInventory(
  session: HuntSession,
  message: PlayerInventoryMessage,
): void {
  if (typeof message.gold === "number") {
    session.inventory.gold = message.gold;
    if (session.huntActive) {
      if (session.huntStartGold === null) {
        session.huntStartGold = message.gold;
      } else {
        session.goldGainedInBag = Math.max(0, message.gold - session.huntStartGold);
      }
    }
  }

  if (typeof message.slotCount === "number") {
    while (session.inventory.backpack.length < message.slotCount) {
      session.inventory.backpack.push(null);
    }
    if (session.inventory.backpack.length > message.slotCount) {
      session.inventory.backpack = session.inventory.backpack.slice(0, message.slotCount);
    }
  }

  if (typeof message.satchelCount === "number") {
    while (session.inventory.satchel.length < message.satchelCount) {
      session.inventory.satchel.push(null);
    }
    if (session.inventory.satchel.length > message.satchelCount) {
      session.inventory.satchel = session.inventory.satchel.slice(0, message.satchelCount);
    }
  }

  if (Array.isArray(message.changes)) {
    for (const change of message.changes) {
      if (change.container === "backpack" && typeof change.index === "number") {
        const oldItem = session.inventory.backpack[change.index] as any;
        const newItem = change.item ?? null;
        session.inventory.backpack[change.index] = newItem;

        // Contabiliza APENAS itens que entraram na bag durante a hunt ativa
        if (session.huntActive && newItem && newItem.name) {
          const oldCount =
            oldItem && oldItem.name === newItem.name
              ? oldItem.count || 1
              : 0;
          const newCount = newItem.count || 1;
          const diff = newCount - oldCount;
          if (diff > 0) {
            const key = newItem.itemId || newItem.name;
            const defaultVal = newItem.value
              ? Math.floor(newItem.value / newCount)
              : newItem.itemId === 3031
                ? 1
                : 0;
            const unitVal = session.getItemEffectivePrice(
              newItem.itemId,
              defaultVal,
            );
            const prev = session.bagLootMap.get(key) || {
              itemId: newItem.itemId,
              name: newItem.name,
              count: 0,
              unitValue: unitVal,
              totalValue: 0,
            };
            prev.count += diff;
            prev.totalValue = prev.count * prev.unitValue;
            session.bagLootMap.set(key, prev);

            // Marca na lista de drops se o item já existia, ou adiciona se foi loot direto
            if (session.lootMap.has(key)) {
              const l = session.lootMap.get(key)!;
              l.inBag = true;
              if (l.count < prev.count) {
                l.count = prev.count;
                l.value = l.count * l.unitValue!;
              }
            } else {
              session.lootMap.set(key, {
                itemId: newItem.itemId,
                name: newItem.name,
                count: diff,
                value: diff * unitVal,
                unitValue: unitVal,
                inBag: true,
              });
            }
          }
        }
      } else if (change.container === "satchel" && typeof change.index === "number") {
        session.inventory.satchel[change.index] = change.item ?? null;
      }
    }
  }

  // Marca gold como coletado na bolsa se houver ganho
  if (session.goldGainedInBag > 0) {
    if (session.lootMap.has(3031)) {
      const goldEntry = session.lootMap.get(3031)!;
      goldEntry.inBag = true;
      if (goldEntry.count < session.goldGainedInBag) {
        goldEntry.count = session.goldGainedInBag;
        goldEntry.value = session.goldGainedInBag;
      }
    } else {
      session.lootMap.set(3031, {
        itemId: 3031,
        name: "gold coin",
        count: session.goldGainedInBag,
        value: session.goldGainedInBag,
        unitValue: 1,
        inBag: true,
      });
    }
  }

  session.loot = [...session.lootMap.values()].sort(
    (a, b) => (b.value || 0) - (a.value || 0),
  );

  // Recalcula o saldo de gold da hunt estritamente pelos itens e moedas que entraram na bag:
  if (session.huntActive) {
    session.lootValue = session.getBagLootValue();
    session.balance = session.lootValue - session.waste;
  }
}

export function handleEquippedItems(
  session: HuntSession,
  message: EquippedItemsMessage,
): void {
  if (Array.isArray(message.slots)) {
    for (let i = 0; i < message.slots.length; i++) {
      if (message.slots[i]) {
        session.inventory.backpack[i] = message.slots[i];
      }
    }
  }
}

export function handleLootAdd(
  session: HuntSession,
  message: LootAddMessage,
): void {
  const it = (message.item ?? message) as any;
  if (it && it.name && String(it.name).toLowerCase() !== "unknown") {
    session.recordDrop(it);
  }
}

export function handleItemOnGround(
  session: HuntSession,
  message: ItemOnGroundMessage,
): void {
  const it = (message.item ?? message) as any;
  if (it && it.name && String(it.name).toLowerCase() !== "unknown") {
    session.recordDrop(it);
    session.floorDrops.push({
      itemId: it.itemId,
      name: it.name,
      count: it.count || 1,
      time: Date.now(),
    });
  }
}
