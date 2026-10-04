import type {
  ActionBarPresetsMessage,
  ActionBarUpdateMessage,
} from "@idlex/protocol";
import type { HuntSession } from "../hunt-session.js";

export function handleActionBarUpdate(
  session: HuntSession,
  message: ActionBarUpdateMessage,
): void {
  if (Array.isArray(message.slots)) {
    session.actionBarSlots = message.slots;
  }
  if (typeof message.managed === "boolean") {
    session.actionBarManaged = message.managed;
  }
}

export function handleActionBarPresets(
  session: HuntSession,
  message: ActionBarPresetsMessage,
): void {
  if (Array.isArray(message.names)) {
    session.actionBarPresets = message.names;
  }
  if (typeof message.active === "number") {
    session.activeActionBarPreset = message.active;
  }
}
