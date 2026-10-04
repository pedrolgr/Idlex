import {
  boolean,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const plans = pgTable("plans", {
  id: varchar("id", { length: 32 }).primaryKey(),
  screens: smallint("screens").notNull(),
  priceCents: integer("price_cents").notNull(),
  abacateProductIdSub: varchar("abacate_product_id_sub", { length: 128 }),
  abacateProductIdOnce: varchar("abacate_product_id_once", { length: 128 }),
  active: boolean("active").notNull().default(true),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  planId: varchar("plan_id", { length: 32 })
    .notNull()
    .references(() => plans.id),
  abacateSubscriptionId: varchar("abacate_subscription_id", { length: 128 }),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  planId: varchar("plan_id", { length: 32 })
    .notNull()
    .references(() => plans.id),
  amountCents: integer("amount_cents").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  abacateBillingId: varchar("abacate_billing_id", { length: 128 }),
  pixQrcode: text("pix_qrcode"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
