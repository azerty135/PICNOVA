import { db, usersTable, investmentsTable, transactionsTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { logger } from "../lib/logger";

const DAILY_RATE = 0.03;

export async function processDailyGains(): Promise<{ processed: number; totalPaid: number }> {
  logger.info("Starting daily gains processing");

  let processed = 0;
  let totalPaid = 0;
  const now = new Date();

  // ── 1. Investment gains (active 30-day plans) ──────────────────────────────
  const activeInvestments = await db
    .select()
    .from(investmentsTable)
    .where(eq(investmentsTable.status, "active"));

  for (const inv of activeInvestments) {
    try {
      const amount = parseFloat(inv.amount);
      const dailyRate = parseFloat(inv.dailyReturnRate);
      const gain = parseFloat((amount * dailyRate).toFixed(2));

      const startDate = new Date(inv.startDate);
      const daysElapsed = Math.floor(
        (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const isComplete = daysElapsed >= inv.durationDays;

      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, inv.userId));
      if (!user) continue;

      const newBalance = parseFloat(user.balance) + gain;
      const newTotalGains = parseFloat(user.totalGains) + gain;
      const newTotalReturn = parseFloat(inv.totalReturn) + gain;

      const updates: Record<string, string | Date> = {
        balance: newBalance.toFixed(2),
        totalGains: newTotalGains.toFixed(2),
      };

      // At maturity: principal returns to balance (already counted via gain loop, just mark complete)
      await db.update(usersTable).set(updates).where(eq(usersTable.id, inv.userId));

      await db.update(investmentsTable).set({
        totalReturn: newTotalReturn.toFixed(2),
        ...(isComplete ? { status: "completed", endDate: now } : {}),
      }).where(eq(investmentsTable.id, inv.id));

      // At maturity: return invested principal to balance
      if (isComplete) {
        const principal = parseFloat(inv.amount);
        const [latestUser] = await db.select().from(usersTable).where(eq(usersTable.id, inv.userId));
        if (latestUser) {
          await db.update(usersTable).set({
            balance: (parseFloat(latestUser.balance) + principal).toFixed(2),
            totalInvested: Math.max(0, parseFloat(latestUser.totalInvested) - principal).toFixed(2),
          }).where(eq(usersTable.id, inv.userId));
        }
        await db.insert(transactionsTable).values({
          userId: inv.userId,
          type: "gain",
          amount: principal.toFixed(2),
          description: `Investissement #${inv.id} arrivé à maturité — capital de $${principal} restitué`,
          status: "completed",
        });
        logger.info({ investmentId: inv.id, userId: inv.userId }, "Investment completed, principal returned");
      }

      await db.insert(transactionsTable).values({
        userId: inv.userId,
        type: "gain",
        amount: gain.toFixed(2),
        description: `Gain journalier — Investissement #${inv.id} (3%/jour)`,
        status: "completed",
      });

      processed++;
      totalPaid += gain;
      logger.info({ investmentId: inv.id, userId: inv.userId, gain, isComplete }, "Investment gain credited");
    } catch (err) {
      logger.error({ err, investmentId: inv.id }, "Failed to process investment gain");
    }
  }

  // ── 2. Deposit gains (locked deposit pool, earns 3%/day indefinitely) ──────
  const usersWithDeposits = await db
    .select()
    .from(usersTable)
    .where(gt(usersTable.depositedAmount, "0"));

  for (const user of usersWithDeposits) {
    try {
      const depositedAmount = parseFloat(user.depositedAmount ?? "0");
      if (depositedAmount <= 0) continue;

      const gain = parseFloat((depositedAmount * DAILY_RATE).toFixed(2));

      await db.update(usersTable).set({
        balance: (parseFloat(user.balance) + gain).toFixed(2),
        totalGains: (parseFloat(user.totalGains) + gain).toFixed(2),
      }).where(eq(usersTable.id, user.id));

      await db.insert(transactionsTable).values({
        userId: user.id,
        type: "gain",
        amount: gain.toFixed(2),
        description: `Gain journalier dépôt — $${depositedAmount} × 3%/jour`,
        status: "completed",
      });

      processed++;
      totalPaid += gain;
      logger.info({ userId: user.id, depositedAmount, gain }, "Deposit gain credited");
    } catch (err) {
      logger.error({ err, userId: user.id }, "Failed to process deposit gain");
    }
  }

  logger.info({ processed, totalPaid }, "Daily gains processing complete");
  return { processed, totalPaid };
}
