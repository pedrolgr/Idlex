import { getDb } from "./client.js";
import { plans } from "./schema/plans.js";

export const DEFAULT_PLANS = [
  {
    id: "screens1",
    screens: 1,
    priceCents: 1500, // R$ 15,00
    active: true,
  },
  {
    id: "screens2",
    screens: 2,
    priceCents: 2500, // R$ 25,00
    active: true,
  },
  {
    id: "screens3",
    screens: 3,
    priceCents: 3500, // R$ 35,00
    active: true,
  },
  {
    id: "screens4",
    screens: 4,
    priceCents: 4000, // R$ 40,00
    active: true,
  },
] as const;

export async function seedPlans(): Promise<void> {
  const db = getDb();
  for (const plan of DEFAULT_PLANS) {
    await db
      .insert(plans)
      .values(plan)
      .onConflictDoUpdate({
        target: plans.id,
        set: {
          screens: plan.screens,
          priceCents: plan.priceCents,
          active: plan.active,
        },
      });
  }
}
