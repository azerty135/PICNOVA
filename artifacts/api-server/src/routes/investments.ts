import { Router } from "express";
import { db, usersTable, investmentsTable, transactionsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { CreateInvestmentBody } from "@workspace/api-zod";

const router = Router();

const VALID_AMOUNTS = [50, 100, 150, 200, 300, 500, 800, 1000, 1500, 2000, 3000, 5000, 8000, 10000];
const DAILY_RETURN_RATE = 0.03; // 3% flat for all amounts

router.get("/", async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }

  const investments = await db
    .select()
    .from(investmentsTable)
    .where(eq(investmentsTable.userId, req.session.userId))
    .orderBy(desc(investmentsTable.createdAt));

  const now = new Date();
  res.json(investments.map((inv) => {
    const amount = parseFloat(inv.amount);
    const dailyRate = parseFloat(inv.dailyReturnRate);
    // Compute gains dynamically (cron may not have run on Render free tier)
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysElapsed = inv.status === "active"
      ? Math.min(inv.durationDays, Math.floor((now.getTime() - new Date(inv.startDate).getTime()) / msPerDay))
      : inv.durationDays;
    const dynamicReturn = parseFloat((amount * dailyRate * daysElapsed).toFixed(2));

    return {
      id: inv.id,
      userId: inv.userId,
      amount,
      dailyReturnRate: dailyRate,
      totalReturn: dynamicReturn,
      status: inv.status,
      startDate: inv.startDate.toISOString(),
      endDate: inv.endDate ? inv.endDate.toISOString() : null,
      durationDays: inv.durationDays,
      createdAt: inv.createdAt.toISOString(),
    };
  }));
});

router.post("/", async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }

  const parsed = CreateInvestmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Montant invalide" });
    return;
  }

  const { amount } = parsed.data;

  if (!VALID_AMOUNTS.includes(amount)) {
    res.status(400).json({ error: "Montant non valide. Choisissez parmi les montants disponibles." });
    return;
  }

  const dailyReturnRate = DAILY_RETURN_RATE;
  const durationDays = 30;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId));
  if (!user) {
    res.status(401).json({ error: "Utilisateur non trouvé" });
    return;
  }

  const userBalance = parseFloat(user.balance);
  if (userBalance < amount) {
    res.status(400).json({ error: "Solde insuffisant pour cet investissement" });
    return;
  }

  const [investment] = await db.insert(investmentsTable).values({
    userId: req.session.userId,
    amount: amount.toString(),
    dailyReturnRate: dailyReturnRate.toString(),
    totalReturn: "0",
    status: "active",
    durationDays,
    startDate: new Date(),
  }).returning();

  const newBalance = userBalance - amount;
  const newTotalInvested = parseFloat(user.totalInvested) + amount;
  // Reduce depositedAmount so daily gains are only on remaining deposit
  const newDepositedAmount = Math.max(0, parseFloat(user.depositedAmount ?? "0") - amount);

  await db.update(usersTable).set({
    balance: newBalance.toFixed(2),
    totalInvested: newTotalInvested.toFixed(2),
    depositedAmount: newDepositedAmount.toFixed(2),
  }).where(eq(usersTable.id, req.session.userId));

  await db.insert(transactionsTable).values({
    userId: req.session.userId,
    type: "investment",
    amount: amount.toString(),
    description: `Investissement de $${amount}`,
    status: "completed",
  });

  res.status(201).json({
    id: investment.id,
    userId: investment.userId,
    amount: parseFloat(investment.amount),
    dailyReturnRate: parseFloat(investment.dailyReturnRate),
    totalReturn: parseFloat(investment.totalReturn),
    status: investment.status,
    startDate: investment.startDate.toISOString(),
    endDate: investment.endDate ? investment.endDate.toISOString() : null,
    durationDays: investment.durationDays,
    createdAt: investment.createdAt.toISOString(),
  });
});

router.get("/:id", async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID invalide" });
    return;
  }

  const [investment] = await db
    .select()
    .from(investmentsTable)
    .where(and(eq(investmentsTable.id, id), eq(investmentsTable.userId, req.session.userId)));

  if (!investment) {
    res.status(404).json({ error: "Investissement non trouvé" });
    return;
  }

  res.json({
    id: investment.id,
    userId: investment.userId,
    amount: parseFloat(investment.amount),
    dailyReturnRate: parseFloat(investment.dailyReturnRate),
    totalReturn: parseFloat(investment.totalReturn),
    status: investment.status,
    startDate: investment.startDate.toISOString(),
    endDate: investment.endDate ? investment.endDate.toISOString() : null,
    durationDays: investment.durationDays,
    createdAt: investment.createdAt.toISOString(),
  });
});

export default router;
