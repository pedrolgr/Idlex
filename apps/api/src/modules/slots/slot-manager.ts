import { Slot } from "../../slot.js";

/**
 * Manages slots scoped per user.
 * Each authenticated user gets their own 4 isolated slots (1..4).
 * Unauthenticated / guest users get a fallback default scope.
 */
export class SlotManager {
  private userSlots = new Map<string, Slot[]>();
  private defaultSlots: Slot[];
  private onBroadcast?: () => void;

  constructor(defaultSlots: Slot[], onBroadcast?: () => void) {
    this.defaultSlots = defaultSlots;
    this.onBroadcast = onBroadcast;
  }

  getSlotsForUser(userId?: string): Slot[] {
    if (!userId) {
      return this.defaultSlots;
    }

    let slots = this.userSlots.get(userId);
    if (!slots) {
      slots = [
        new Slot(1, this.onBroadcast),
        new Slot(2, this.onBroadcast),
        new Slot(3, this.onBroadcast),
        new Slot(4, this.onBroadcast),
      ];
      this.userSlots.set(userId, slots);
    }

    return slots;
  }

  getSlot(userId: string | undefined, slotId: number): Slot | undefined {
    const slots = this.getSlotsForUser(userId);
    return slots.find((s) => s.id === slotId);
  }

  async disconnectUserSlots(userId: string): Promise<void> {
    const slots = this.userSlots.get(userId);
    if (slots) {
      for (const slot of slots) {
        await slot.disconnect();
      }
      this.userSlots.delete(userId);
    }
  }

  async disconnectAll(): Promise<void> {
    for (const slot of this.defaultSlots) {
      await slot.disconnect();
    }
    for (const slots of this.userSlots.values()) {
      for (const slot of slots) {
        await slot.disconnect();
      }
    }
    this.userSlots.clear();
  }
}
