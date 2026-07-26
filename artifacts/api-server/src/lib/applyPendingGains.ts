import { db, usersTable, transactionsTable, investmentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";

const DAILY_RATE = 0.03;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Calculates and credits all pending gains for a user on-demand:
 *   1. Deposit gains: 3%/day on (depositedAmount - active investments)
 *   2. Investment gains: 3%/day per active plan, based on days since startDate
 *      vs already-credited totalReturn
 * Called whenever the user loads their profile/dashboard so it works
 * even when the server sleeps (Render free tier — no reliable cron).
 */
export async function applyPendingGains(userId: number): Promise<void> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return;

  const now = new Date();
  let totalCredited = 0;

  // ── 1. Active investment gains ────────────────────────────────────────────
  const activeInvs = await db
    .select()
    .from(investmentsTable)
    .where(and(eq(investmentsTable.userId, userId), eq(investmentsTable.status, "active")));

  let activeTotal = 0;

  for (const inv of activeInvs) {
    const amount = parseFloat(inv.amount);
    const dailyRate = parseFloat(inv.dailyReturnRate);
    activeTotal += amount;

    const daysElapsed = Math.min(
      inv.durationDays,
      Math.floor((now.getTime() - new Date(inv.startDate).getTime()) / MS_PER_DAY)
    );
    if (daysElapsed <= 0) continue;

    const expectedReturn = parseFloat((amount * dailyRate * daysElapsed).toFixed(2));
    const alreadyCredited = parseFloat(inv.totalReturn);
    const pending = parseFloat((expectedReturn - alreadyCredited).toFixed(2));
    if (pending <= 0) continue;

    // Credit the pending investment gain
    await db.update(investmentsTable)
      .set({ totalReturn: expectedReturn.toFixed(2) })
      .where(eq(investmentsTable.id, inv.id));

    await db.insert(transactionsTable).values({
      userId,
      type: "gain",
      amount: pending.toFixed(2),
      description: `Gain plan 30j — $${amount} × 3%/j × ${daysElapsed}j`,
      status: "completed",
    });

    totalCredited += pending;
    logger.info({ userId, invId: inv.id, daysElapsed, pending }, "Investment gain credited on-demand");
  }

  // ── 2. Deposit gains ──────────────────────────────────────────────────────
  const effectiveDeposited = Math.max(0, parseFloat(user.depositedAmount ?? "0") - activeTotal);

  if (effectiveDeposited > 0) {
    const lastGain = user.lastGainDate ?? user.createdAt;
    const daysElapsed = Math.floor((now.getTime() - new Date(lastGain).getTime()) / MS_PER_DAY);

    if (daysElapsed > 0) {
      const depositGain = parseFloat((effectiveDeposited * DAILY_RATE * daysElapsed).toFixed(2));
      if (depositGain > 0) {
        totalCredited += depositGain;

        await db.update(usersTable).set({ lastGainDate: now })
          .where(eq(usersTable.id, userId));

        await db.insert(transactionsTable).values({
          userId,
          type: "gain",
          amount: depositGain.toFixed(2),
          description: `Gains journaliers — ${daysElapsed}j × 3% × $${effectiveDeposited}`,
          status: "completed",
        });

        logger.info({ userId, daysElapsed, effectiveDeposited, depositGain }, "Deposit gain credited on-demand");
      }
    }
  }

  // ── 3. Update balance + totalGains in one shot ────────────────────────────
  if (totalCredited > 0) {
    const fresh = await db.select().from(usersTable).where(eq(usersTable.id, userId)).then(r => r[0]);
    if (fresh) {
      await db.update(usersTable).set({
        balance: (parseFloat(fresh.balance) + totalCredited).toFixed(2),
        totalGains: (parseFloat(fresh.totalGains) + totalCredited).toFixed(2),
        lastGainDate: now,
      }).where(eq(usersTable.id, userId));
    }
  }
}
