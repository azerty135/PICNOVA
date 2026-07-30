import { Router } from "express";
import { db, usersTable, transactionsTable, investmentsTable, withdrawalsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Non authentifié" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId));
  if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

  const transactions = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, req.session.userId))
    .orderBy(desc(transactionsTable.createdAt));

  const investments = await db
    .select()
    .from(investmentsTable)
    .where(eq(investmentsTable.userId, req.session.userId))
    .orderBy(desc(investmentsTable.startDate));

  const withdrawals = await db
    .select()
    .from(withdrawalsTable)
    .where(eq(withdrawalsTable.userId, req.session.userId))
    .orderBy(desc(withdrawalsTable.createdAt));

  // Compute summary totals from transactions
  const totalDeposited = transactions
    .filter(t => t.type === "deposit" && t.status === "completed")
    .reduce((s, t) => s + parseFloat(t.amount), 0);

  const totalWithdrawn = transactions
    .filter(t => t.type === "withdrawal" && t.status === "completed")
    .reduce((s, t) => s + parseFloat(t.amount), 0);

  const totalGainsFromTx = transactions
    .filter(t => t.type === "gain" && t.status === "completed")
    .reduce((s, t) => s + parseFloat(t.amount), 0);

  res.json({
    generatedAt: new Date().toISOString(),
    user: {
      phone: user.phone,
      name: user.name ?? null,
      createdAt: user.createdAt.toISOString(),
    },
    summary: {
      balance: parseFloat(user.balance),
      depositedAmount: parseFloat(user.depositedAmount ?? "0"),
      totalInvested: parseFloat(user.totalInvested),
      totalGains: parseFloat(user.totalGains),
      referralBonus: parseFloat(user.referralBonus ?? "0"),
      totalDeposited,
      totalWithdrawn,
      totalGainsFromTx,
    },
    transactions: transactions.map(t => ({
      id: t.id,
      type: t.type,
      amount: parseFloat(t.amount),
      description: t.description,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    })),
    investments: investments.map(i => ({
      id: i.id,
      amount: parseFloat(i.amount),
      dailyReturnRate: parseFloat(i.dailyReturnRate),
      totalReturn: parseFloat(i.totalReturn),
      durationDays: i.durationDays,
      status: i.status,
      startDate: i.startDate ? new Date(i.startDate).toISOString() : null,
      endDate: i.endDate ? new Date(i.endDate).toISOString() : null,
    })),
    withdrawals: withdrawals.map(w => ({
      id: w.id,
      amount: parseFloat(w.amount),
      method: w.method,
      accountDetails: w.accountDetails,
      status: w.status,
      createdAt: w.createdAt.toISOString(),
      processedAt: w.processedAt ? w.processedAt.toISOString() : null,
    })),
  });
});

export default router;
