import { Router } from "express";
import { db, usersTable, transactionsTable, withdrawalsTable, settingsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateWithdrawalBody } from "@workspace/api-zod";

const router = Router();

async function isWithdrawalsOpen(): Promise<boolean> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, "withdrawals_open"));
  return row?.value === "true";
}

router.get("/status", async (_req, res) => {
  const open = await isWithdrawalsOpen();
  res.json({ open });
});

router.get("/", async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }

  const withdrawals = await db
    .select()
    .from(withdrawalsTable)
    .where(eq(withdrawalsTable.userId, req.session.userId))
    .orderBy(desc(withdrawalsTable.createdAt));

  res.json(withdrawals.map((w) => ({
    id: w.id,
    userId: w.userId,
    amount: parseFloat(w.amount),
    method: w.method,
    accountDetails: w.accountDetails,
    status: w.status,
    createdAt: w.createdAt.toISOString(),
    processedAt: w.processedAt ? w.processedAt.toISOString() : null,
  })));
});

router.post("/", async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }

  // Check if withdrawals are open
  const open = await isWithdrawalsOpen();
  if (!open) {
    res.status(403).json({ error: "Les retraits sont actuellement fermés. Réessayez plus tard." });
    return;
  }

  const parsed = CreateWithdrawalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides" });
    return;
  }

  const { amount, method, accountDetails } = parsed.data;

  if (amount <= 0) {
    res.status(400).json({ error: "Le montant doit être supérieur à 0" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId));
  if (!user) {
    res.status(401).json({ error: "Utilisateur non trouvé" });
    return;
  }

  // Only gains and referral bonuses are withdrawable (not invested capital)
  // balance = current balance (invested capital was already deducted on investment)
  // withdrawable = balance (gains + referral bonuses that have accumulated)
  const withdrawableBalance = parseFloat(user.balance);

  if (withdrawableBalance < amount) {
    res.status(400).json({ error: "Solde disponible insuffisant pour ce retrait" });
    return;
  }

  const newBalance = withdrawableBalance - amount;

  await db.update(usersTable).set({
    balance: newBalance.toString(),
  }).where(eq(usersTable.id, req.session.userId));

  const [withdrawal] = await db.insert(withdrawalsTable).values({
    userId: req.session.userId,
    amount: amount.toString(),
    method,
    accountDetails,
    status: "pending",
  }).returning();

  await db.insert(transactionsTable).values({
    userId: req.session.userId,
    type: "withdrawal",
    amount: amount.toString(),
    description: `Retrait via ${method}`,
    status: "pending",
  });

  res.status(201).json({
    id: withdrawal.id,
    userId: withdrawal.userId,
    amount: parseFloat(withdrawal.amount),
    method: withdrawal.method,
    accountDetails: withdrawal.accountDetails,
    status: withdrawal.status,
    createdAt: withdrawal.createdAt.toISOString(),
    processedAt: null,
  });
});

export default router;
