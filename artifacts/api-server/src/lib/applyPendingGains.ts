import { db, usersTable, transactionsTable, investmentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";

const DAILY_RATE = 0.03;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function midnightUTC(d: Date): Date {
  const m = new Date(d);
  m.setUTCHours(0, 0, 0, 0);
  return m;
}

/**
 * On-demand gains engine (replaces unreliable cron on Render free tier).
 *
 * Investment plan (30j):
 *   - Daily: only updates investmentsTable.totalReturn (display only).
 *     Does NOT touch user balance or totalGains → not withdrawable yet.
 *   - At maturity: principal returns to balance (neutral to totalGains),
 *     accumulated gains credited to balance AND totalGains (withdrawable).
 *
 * Deposit gains:
 *   - 3%/day on (depositedAmount − active investments) using calendar days
 *     (midnight UTC) → credited to balance + totalGains immediately.
 */
export async function applyPendingGains(userId: number): Promise<void> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return;

  const now = new Date();
  const todayMidnight = midnightUTC(now);

  // Separate trackers: principal vs gains (different accounting)
  let principalToRestore = 0; // goes to balance only
  let gainsToCredit = 0;      // goes to balance AND totalGains
  let activeTotal = 0;

  // ── 1. Active investments ─────────────────────────────────────────────────
  const activeInvs = await db
    .select()
    .from(investmentsTable)
    .where(and(eq(investmentsTable.userId, userId), eq(investmentsTable.status, "active")));

  for (const inv of activeInvs) {
    const amount = parseFloat(inv.amount);
    const dailyRate = parseFloat(inv.dailyReturnRate);
    const startMidnight = midnightUTC(new Date(inv.startDate));
    const daysElapsed = Math.floor(
      (todayMidnight.getTime() - startMidnight.getTime()) / MS_PER_DAY
    );

    if (daysElapsed >= inv.durationDays) {
      // ── Maturity ──────────────────────────────────────────────────────────
      const fullReturn = parseFloat((amount * dailyRate * inv.durationDays).toFixed(2));
      const alreadyCredited = parseFloat(inv.totalReturn);
      const pendingGains = parseFloat((fullReturn - alreadyCredited).toFixed(2));

      await db.update(investmentsTable).set({
        totalReturn: fullReturn.toFixed(2),
        status: "completed",
        endDate: now,
      }).where(eq(investmentsTable.id, inv.id));

      // Restore principal to depositedAmount
      const latest = await db.select().from(usersTable).where(eq(usersTable.id, userId)).then(r => r[0]);
      if (latest) {
        await db.update(usersTable).set({
          depositedAmount: (parseFloat(latest.depositedAmount ?? "0") + amount).toFixed(2),
          totalInvested: Math.max(0, parseFloat(latest.totalInvested) - amount).toFixed(2),
        }).where(eq(usersTable.id, userId));
      }

      principalToRestore += amount;
      gainsToCredit += pendingGains;

      await db.insert(transactionsTable).values({
        userId,
        type: "gain",
        amount: (amount + pendingGains).toFixed(2),
        description: `Plan 30j maturité — capital $${amount} + gains $${pendingGains} retirables`,
        status: "completed",
      });

      logger.info({ userId, invId: inv.id, amount, pendingGains }, "Investment matured");
    } else {
      // ── Still active: update display only, do NOT credit anything ─────────
      activeTotal += amount;
      if (daysElapsed > 0) {
        const expectedReturn = parseFloat((amount * dailyRate * daysElapsed).toFixed(2));
        if (expectedReturn > parseFloat(inv.totalReturn)) {
          await db.update(investmentsTable)
            .set({ totalReturn: expectedReturn.toFixed(2) })
            .where(eq(investmentsTable.id, inv.id));
        }
      }
    }
  }

  // ── 2. Deposit gains (calendar days, immediately withdrawable) ────────────
  const effectiveDeposited = Math.max(0, parseFloat(user.depositedAmount ?? "0") - activeTotal);

  if (effectiveDeposited > 0) {
    const lastGainMidnight = midnightUTC(new Date(user.lastGainDate ?? user.createdAt));
    const daysElapsed = Math.floor(
      (todayMidnight.getTime() - lastGainMidnight.getTime()) / MS_PER_DAY
    );

    if (daysElapsed > 0) {
      const depositGain = parseFloat((effectiveDeposited * DAILY_RATE * daysElapsed).toFixed(2));
      if (depositGain > 0) {
        gainsToCredit += depositGain;
        await db.insert(transactionsTable).values({
          userId,
          type: "gain",
          amount: depositGain.toFixed(2),
          description: `Gains dépôt — ${daysElapsed}j × 3% × $${effectiveDeposited}`,
          status: "completed",
        });
        logger.info({ userId, daysElapsed, effectiveDeposited, depositGain }, "Deposit gain credited");
      }
    }
  }

  // ── 3. Commit to DB ───────────────────────────────────────────────────────
  const hasChanges = principalToRestore > 0 || gainsToCredit > 0 || !user.lastGainDate;
  if (hasChanges) {
    const fresh = await db.select().from(usersTable).where(eq(usersTable.id, userId)).then(r => r[0]);
    if (fresh) {
      await db.update(usersTable).set({
        // Principal + gains go to balance; only gains go to totalGains
        balance: (parseFloat(fresh.balance) + principalToRestore + gainsToCredit).toFixed(2),
        totalGains: (parseFloat(fresh.totalGains) + gainsToCredit).toFixed(2),
        lastGainDate: todayMidnight,
      }).where(eq(usersTable.id, userId));
    }
  }
}
