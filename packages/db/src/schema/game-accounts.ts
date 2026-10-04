import {
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const gameAccounts = pgTable(
  "game_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slotIndex: smallint("slot_index").notNull(),
    credentialsSealed: text("credentials_sealed").notNull(),
    keyVersion: smallint("key_version").notNull().default(1),
    emailBlindIndex: varchar("email_blind_index", { length: 128 })
      .notNull()
      .unique(),
    emailHint: varchar("email_hint", { length: 255 }).notNull(),
    characterId: varchar("character_id", { length: 64 }),
    characterName: varchar("character_name", { length: 128 }),
    desiredState: varchar("desired_state", { length: 32 })
      .notNull()
      .default("disconnected"),
    lastStatus: varchar("last_status", { length: 32 }).notNull().default("idle"),
    lastConnectedAt: timestamp("last_connected_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("user_slot_idx").on(table.userId, table.slotIndex),
  ],
);

export const slotPreferences = pgTable("slot_preferences", {
  gameAccountId: uuid("game_account_id")
    .primaryKey()
    .references(() => gameAccounts.id, { onDelete: "cascade" }),
  priceMode: varchar("price_mode", { length: 16 }).notNull().default("npc"),
  customPrices: jsonb("custom_prices").default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
