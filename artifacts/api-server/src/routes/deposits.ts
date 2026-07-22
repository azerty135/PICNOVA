import { Router } from "express";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateDepositBody } from "@workspace/api-zod";

const router = Router();

router.post("/", async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }

  const parsed = CreateDepositBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides" });
    return;
  }

  const { amount, method } = parsed.data;

  if (amount <= 0) {
    res.status(400).json({ error: "Le montant doit être supérieur à 0" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId));
  if (!user) {
    res.status(401).json({ error: "Utilisateur non trouvé" });
    return;
  }

  const newBalance = parseFloat(user.balance) + amount;

  await db.update(usersTable).set({
    balance: newBalance.toString(),
  }).where(eq(usersTable.id, req.session.userId));

  const [transaction] = await db.insert(transactionsTable).values({
    userId: req.session.userId,
    type: "deposit",
    amount: amount.toString(),
    description: `Dépôt via ${method}`,
    status: "completed",
  }).returning();

  // Credit 10% referral bonus to the referrer on each deposit
  if (user.referredBy) {
    const [referrer] = await db.select().from(usersTable).where(eq(usersTable.id, user.referredBy));
    if (referrer) {
      const bonus = parseFloat((amount * 0.10).toFixed(2));
      const newReferrerBalance = parseFloat(referrer.balance) + bonus;
      const newReferralBonus = parseFloat(referrer.referralBonus ?? "0") + bonus;
      await db.update(usersTable).set({
        balance: newReferrerBalance.toFixed(2),
        referralBonus: newReferralBonus.toFixed(2),
      }).where(eq(usersTable.id, referrer.id));
      await db.insert(transactionsTable).values({
        userId: referrer.id,
        type: "gain",
        amount: bonus.toFixed(2),
        description: `Bonus parrainage — ${user.phone} a déposé $${amount} (10%)`,
        status: "completed",
      });
    }
  }

  res.status(201).json({
    id: transaction.id,
    userId: transaction.userId,
    type: transaction.type,
    amount: parseFloat(transaction.amount),
    description: transaction.description,
    status: transaction.status,
    createdAt: transaction.createdAt.toISOString(),
  });
});

export default router;
