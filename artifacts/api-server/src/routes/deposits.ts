import { Router } from "express";
import { db, usersTable, transactionsTable, depositRequestsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

// Create a deposit REQUEST (pending, no balance credit until admin approves)
router.post("/", async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }

  const { amount, method, proofMessage } = req.body;
  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    res.status(400).json({ error: "Montant invalide" });
    return;
  }
  if (!proofMessage || typeof proofMessage !== "string" || !proofMessage.trim()) {
    res.status(400).json({ error: "Le message de preuve est requis" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId));
  if (!user) {
    res.status(401).json({ error: "Utilisateur non trouvé" });
    return;
  }

  const [req_] = await db.insert(depositRequestsTable).values({
    userId: req.session.userId,
    amount: numAmount.toFixed(2),
    method: method ?? "mobile_money",
    proofMessage: proofMessage.trim(),
    status: "pending",
  }).returning();

  res.status(201).json({
    id: req_.id,
    amount: parseFloat(req_.amount),
    status: req_.status,
    createdAt: req_.createdAt.toISOString(),
  });
});

// Get current user's deposit requests
router.get("/my", async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }
  const rows = await db
    .select()
    .from(depositRequestsTable)
    .where(eq(depositRequestsTable.userId, req.session.userId))
    .orderBy(desc(depositRequestsTable.createdAt));
  res.json(rows.map((r) => ({
    id: r.id,
    amount: parseFloat(r.amount),
    method: r.method,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    processedAt: r.processedAt ? r.processedAt.toISOString() : null,
  })));
});

export default router;
