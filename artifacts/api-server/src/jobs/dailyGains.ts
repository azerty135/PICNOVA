import { db, usersTable, investmentsTable, transactionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";

export async function processDailyGains(): Promise<{ processed: number; totalPaid: number }> {
  logger.info("Starting daily gains processing");

  const activeInvestments = await db
    .select()
    .from(investmentsTable)
    .where(eq(investmentsTable.status, "active"));

  if (activeInvestments.length === 0) {
    logger.info("No active investments to process");
    return { processed: 0, totalPaid: 0 };
  }

  let processed = 0;
  let totalPaid = 0;
  const now = new Date();

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

      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, inv.userId));

      if (!user) continue;

      const newBalance = parseFloat(user.balance) + gain;
      const newTotalGains = parseFloat(user.totalGains) + gain;
      const newTotalReturn = parseFloat(inv.totalReturn) + gain;

      await db.update(usersTable).set({
        balance: newBalance.toFixed(2),
        totalGains: newTotalGains.toFixed(2),
      }).where(eq(usersTable.id, inv.userId));

      await db.update(investmentsTable).set({
        totalReturn: newTotalReturn.toFixed(2),
        ...(isComplete ? { status: "completed", endDate: now } : {}),
      }).where(eq(investmentsTable.id, inv.id));

      await db.insert(transactionsTable).values({
        userId: inv.userId,
        type: "gain",
        amount: gain.toFixed(2),
        description: `Gain journalier — Investissement #${inv.id} (${(dailyRate * 100).toFixed(1)}%/j)`,
        status: "completed",
      });

      if (isComplete) {
        await db.insert(transactionsTable).values({
          userId: inv.userId,
          type: "gain",
          amount: "0",
          description: `Investissement #${inv.id} arrivé à maturité après ${inv.durationDays} jours`,
          status: "completed",
        });
        logger.info({ investmentId: inv.id, userId: inv.userId }, "Investment completed");
      }

      processed++;
      totalPaid += gain;

      logger.info(
        { investmentId: inv.id, userId: inv.userId, gain, isComplete },
        "Gain credited"
      );
    } catch (err) {
      logger.error({ err, investmentId: inv.id }, "Failed to process gain for investment");
    }
  }

  logger.info({ processed, totalPaid }, "Daily gains processing complete");
  return { processed, totalPaid };
}
