import { Router } from "express";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq, desc, count, and, sql } from "drizzle-orm";
import { investmentsTable, withdrawalsTable } from "@workspace/db";
import { applyPendingGains } from "../lib/applyPendingGains";

const router = Router();

router.get("/summary", async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }

  const userId = req.session.userId;

  // Credit any pending daily gains before returning data
  await applyPendingGains(userId);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "Utilisateur non trouvé" });
    return;
  }

  const [activeInvestmentsResult] = await db
    .select({ count: count() })
    .from(investmentsTable)
    .where(and(eq(investmentsTable.userId, userId), eq(investmentsTable.status, "active")));

  const [pendingWithdrawalsResult] = await db
    .select({ total: sql<string>`coalesce(sum(${withdrawalsTable.amount}), 0)` })
    .from(withdrawalsTable)
    .where(and(eq(withdrawalsTable.userId, userId), eq(withdrawalsTable.status, "pending")));

  const recentTransactions = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, userId))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(5);

  const depositedAmount = parseFloat(user.depositedAmount ?? "0");
  const totalGains = parseFloat(user.totalGains);
  const referralBonus = parseFloat(user.referralBonus ?? "0");
  const balance = parseFloat(user.balance);
  // Withdrawable = gains + bonuses, capped at actual balance
  const withdrawable = Math.min(balance, totalGains + referralBonus);

  res.json({
    balance,
    depositedAmount,
    withdrawable,
    totalInvested: parseFloat(user.totalInvested),
    totalGains,
    referralBonus,
    activeInvestments: activeInvestmentsResult.count,
    pendingWithdrawals: parseFloat(pendingWithdrawalsResult.total ?? "0"),
    recentTransactions: recentTransactions.map((t) => ({
      id: t.id,
      userId: t.userId,
      type: t.type,
      amount: parseFloat(t.amount),
      description: t.description,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    })),
  });
});

export default router;
