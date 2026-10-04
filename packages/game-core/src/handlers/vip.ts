import type { VipListMessage, VipStatusMessage } from "@idlex/protocol";
import type { HuntSession } from "../hunt-session.js";

export function handleFriendsList(
  session: HuntSession,
  message: VipListMessage,
): void {
  if (Array.isArray(message.entries)) {
    session.friends = message.entries.map((f) => ({
      name: f.name,
      online: Boolean(f.online),
      level: f.level ?? null,
      vocation: f.vocation ?? null,
      lastSeenAt: f.lastSeenAt ?? null,
    }));
  }
}

export function handleVipStatus(
  session: HuntSession,
  message: VipStatusMessage,
): void {
  if (message && message.name) {
    const idx = session.friends.findIndex(
      (f) => f.name.toLowerCase() === message.name!.toLowerCase(),
    );
    const existing = idx !== -1 ? session.friends[idx] : undefined;
    const updated = {
      name: message.name,
      online: Boolean(message.online),
      level: message.level ?? existing?.level ?? null,
      vocation: message.vocation ?? existing?.vocation ?? null,
      lastSeenAt: message.lastSeenAt ?? existing?.lastSeenAt ?? null,
    };
    if (idx !== -1) {
      session.friends[idx] = updated;
    } else {
      session.friends.push(updated);
    }
  }
}
