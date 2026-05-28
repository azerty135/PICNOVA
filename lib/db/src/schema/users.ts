import { pgTable, text, serial, timestamp, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  pin: text("pin").notNull(),
  balance: numeric("balance", { precision: 18, scale: 2 }).notNull().default("0"),
  totalInvested: numeric("total_invested", { precision: 18, scale: 2 }).notNull().default("0"),
  totalGains: numeric("total_gains", { precision: 18, scale: 2 }).notNull().default("0"),
  referralCode: text("referral_code").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
