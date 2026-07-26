import { db, usersTable, transactionsTable, investmentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";

const DAILY_RATE = 0.03;

/**
 * Calculates and credits any pending daily gains for a user based on
 * days elapsed since lastGainDate. Uses effective deposited amount
 * (depositedAmount - active investments) so investing reduces the base.
 * Called on-demand so it works even when the server sleeps (Render free tier).
 */
export async function applyPendingGains(userId: number): Promise<void> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return;

  // Sum active investments to get effective deposited base
  const activeInvs = await db
    .select()
    .from(investmentsTable)
    .where(and(eq(investmentsTable.userId, userId), eq(investmentsTable.status, "active")));

  const activeTotal = activeInvs.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
  const effectiveDeposited = Math.max(0, parseFloat(user.depositedAmount ?? "0") - activeTotal);

  if (effectiveDeposited <= 0) return;

  const now = new Date();
  const lastGain = user.lastGainDate ?? user.createdAt;
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysElapsed = Math.floor((now.getTime() - new Date(lastGain).getTime()) / msPerDay);

  if (daysElapsed <= 0) return;

  const totalGain = parseFloat((effectiveDeposited * DAILY_RATE * daysElapsed).toFixed(2));
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
    description: `Gains journaliers — ${daysElapsed} jour(s) × 3% × $${effectiveDeposited}`,
    status: "completed",
  });

  logger.info({ userId, daysElapsed, effectiveDeposited, totalGain }, "Pending gains applied on-demand");
}
