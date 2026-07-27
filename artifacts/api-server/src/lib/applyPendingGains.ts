import { db, usersTable, transactionsTable, investmentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";

const DAILY_RATE = 0.03;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Returns midnight UTC of the given date (strips time component). */
function midnightUTC(d: Date): Date {
  const m = new Date(d);
  m.setUTCHours(0, 0, 0, 0);
  return m;
}

/**
 * Calculates and credits all pending gains for a user on-demand:
 *   1. Investment gains: 3%/day per active plan, tracked via totalReturn in DB
 *   2. Deposit gains: 3%/day on (depositedAmount - active investments),
 *      tracked via lastGainDate using CALENDAR DAYS (midnight UTC) so the
 *      time-of-day the function last ran doesn't cause skipped days.
 */
export async function applyPendingGains(userId: number): Promise<void> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return;

  const now = new Date();
  const todayMidnight = midnightUTC(now);
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

    // Use calendar days from startDate midnight
    const startMidnight = midnightUTC(new Date(inv.startDate));
    const daysElapsed = Math.min(
      inv.durationDays,
      Math.floor((todayMidnight.getTime() - startMidnight.getTime()) / MS_PER_DAY)
    );
    if (daysElapsed <= 0) continue;

    const expectedReturn = parseFloat((amount * dailyRate * daysElapsed).toFixed(2));
    const alreadyCredited = parseFloat(inv.totalReturn);
    const pending = parseFloat((expectedReturn - alreadyCredited).toFixed(2));
    if (pending <= 0) continue;

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

  // ── 2. Deposit gains (calendar-day based) ─────────────────────────────────
  const effectiveDeposited = Math.max(0, parseFloat(user.depositedAmount ?? "0") - activeTotal);

  if (effectiveDeposited > 0) {
    // Use calendar days: compare today midnight vs last-gain midnight
    const lastGainRaw = user.lastGainDate ?? user.createdAt;
    const lastGainMidnight = midnightUTC(new Date(lastGainRaw));
    const daysElapsed = Math.floor(
      (todayMidnight.getTime() - lastGainMidnight.getTime()) / MS_PER_DAY
    );

    if (daysElapsed > 0) {
      const depositGain = parseFloat((effectiveDeposited * DAILY_RATE * daysElapsed).toFixed(2));
      if (depositGain > 0) {
        totalCredited += depositGain;

        await db.insert(transactionsTable).values({
          userId,
          type: "gain",
          amount: depositGain.toFixed(2),
          description: `Gains dépôt — ${daysElapsed}j × 3% × $${effectiveDeposited}`,
          status: "completed",
        });

        logger.info({ userId, daysElapsed, effectiveDeposited, depositGain }, "Deposit gain credited on-demand");
      }
    }
  }

  // ── 3. Update balance + totalGains + lastGainDate in one shot ─────────────
  if (totalCredited > 0 || !user.lastGainDate) {
    const fresh = await db.select().from(usersTable).where(eq(usersTable.id, userId)).then(r => r[0]);
    if (fresh) {
      await db.update(usersTable).set({
        balance: (parseFloat(fresh.balance) + totalCredited).toFixed(2),
        totalGains: (parseFloat(fresh.totalGains) + totalCredited).toFixed(2),
        lastGainDate: todayMidnight, // always store as midnight so next comparison is calendar-day aligned
      }).where(eq(usersTable.id, userId));
    }
  }
}
