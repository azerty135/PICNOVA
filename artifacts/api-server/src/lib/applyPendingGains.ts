import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const DAILY_RATE = 0.03;

/**
 * Calculates and credits any pending daily gains for a user based on
 * days elapsed since lastGainDate. Called on-demand so it works even
 * when the server sleeps (Render free tier).
 */
export async function applyPendingGains(userId: number): Promise<void> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return;

  const depositedAmount = parseFloat(user.depositedAmount ?? "0");
  if (depositedAmount <= 0) return;

  const now = new Date();

  // Determine start: either lastGainDate or account creation date
  const lastGain = user.lastGainDate ?? user.createdAt;

  // Calculate full days elapsed (each past midnight counts as one day)
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysElapsed = Math.floor((now.getTime() - new Date(lastGain).getTime()) / msPerDay);

  if (daysElapsed <= 0) return;

  const totalGain = parseFloat((depositedAmount * DAILY_RATE * daysElapsed).toFixed(2));
  if (totalGain <= 0) return;

  const newBalance = parseFloat(user.balance) + totalGain;
  const newTotalGains = parseFloat(user.totalGains) + totalGain;

  await db.update(usersTable).set({
    balance: newBalance.toFixed(2),
    totalGains: newTotalGains.toFixed(2),
    lastGainDate: now,
  }).where(eq(usersTable.id, userId));

  await db.insert(transactionsTable).values({
    userId,
    type: "gain",
    amount: totalGain.toFixed(2),
    description: `Gains journaliers — ${daysElapsed} jour(s) × 3% × $${depositedAmount}`,
    status: "completed",
  });

  logger.info({ userId, daysElapsed, depositedAmount, totalGain }, "Pending gains applied on-demand");
}
