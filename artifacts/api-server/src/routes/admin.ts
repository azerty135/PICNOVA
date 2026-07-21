import { Router } from "express";
import { db, usersTable, withdrawalsTable, transactionsTable, investmentsTable, notificationsTable, settingsTable } from "@workspace/db";
import { eq, count, sql, desc } from "drizzle-orm";
import { SendBroadcastBody } from "@workspace/api-zod";
import { processDailyGains } from "../jobs/dailyGains";

const router = Router();

async function requireAdmin(req: any, res: any): Promise<boolean> {
  if (!req.session.userId) {
    res.status(401).json({ error: "Non authentifié" });
    return false;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId));
  if (!user?.isAdmin) {
    res.status(403).json({ error: "Accès refusé. Droits administrateur requis." });
    return false;
  }
  return true;
}

router.get("/stats", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  const [totalUsers] = await db.select({ count: count() }).from(usersTable);

  const [totalDeposited] = await db
    .select({ total: sql<string>`coalesce(sum(${transactionsTable.amount}), 0)` })
    .from(transactionsTable)
    .where(eq(transactionsTable.type, "deposit"));

  const [totalWithdrawn] = await db
    .select({ total: sql<string>`coalesce(sum(${transactionsTable.amount}), 0)` })
    .from(transactionsTable)
    .where(eq(transactionsTable.type, "withdrawal"));

  const [totalInvested] = await db
    .select({ total: sql<string>`coalesce(sum(${investmentsTable.amount}), 0)` })
    .from(investmentsTable);

  const [pendingWithdrawals] = await db
    .select({ count: count() })
    .from(withdrawalsTable)
    .where(eq(withdrawalsTable.status, "pending"));

  const [activeInvestments] = await db
    .select({ count: count() })
    .from(investmentsTable)
    .where(eq(investmentsTable.status, "active"));

  res.json({
    totalUsers: totalUsers.count,
    totalDeposited: parseFloat(totalDeposited.total ?? "0"),
    totalWithdrawn: parseFloat(totalWithdrawn.total ?? "0"),
    totalInvested: parseFloat(totalInvested.total ?? "0"),
    pendingWithdrawals: pendingWithdrawals.count,
    activeInvestments: activeInvestments.count,
  });
});

router.get("/users", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  const users = await db
    .select()
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt));

  // Count referrals per user
  const referralCounts = await db
    .select({ referredBy: usersTable.referredBy, cnt: count() })
    .from(usersTable)
    .groupBy(usersTable.referredBy);

  const countMap = new Map<number, number>();
  for (const row of referralCounts) {
    if (row.referredBy) countMap.set(row.referredBy, row.cnt);
  }

  res.json(users.map((u) => ({
    id: u.id,
    phone: u.phone,
    name: u.name ?? null,
    balance: parseFloat(u.balance),
    totalInvested: parseFloat(u.totalInvested),
    totalGains: parseFloat(u.totalGains),
    isAdmin: u.isAdmin,
    isBanned: u.isBanned,
    referralCount: countMap.get(u.id) ?? 0,
    createdAt: u.createdAt.toISOString(),
  })));
});

router.post("/users/:id/promote", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalide" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "Utilisateur non trouvé" }); return; }
  await db.update(usersTable).set({ isAdmin: true }).where(eq(usersTable.id, id));
  res.json({ message: `${user.phone} est maintenant administrateur` });
});

router.post("/users/:id/demote", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalide" }); return; }
  if (id === req.session.userId) { res.status(400).json({ error: "Vous ne pouvez pas retirer vos propres droits" }); return; }
  await db.update(usersTable).set({ isAdmin: false }).where(eq(usersTable.id, id));
  res.json({ message: "Droits administrateur retirés" });
});

router.post("/users/:id/ban", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalide" }); return; }
  if (id === req.session.userId) { res.status(400).json({ error: "Vous ne pouvez pas vous bannir vous-même" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "Utilisateur non trouvé" }); return; }
  await db.update(usersTable).set({ isBanned: true }).where(eq(usersTable.id, id));
  res.json({ message: `${user.phone} a été suspendu` });
});

router.post("/users/:id/unban", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalide" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "Utilisateur non trouvé" }); return; }
  await db.update(usersTable).set({ isBanned: false }).where(eq(usersTable.id, id));
  res.json({ message: `${user.phone} a été réactivé` });
});

router.get("/withdrawals", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  const rows = await db
    .select({
      id: withdrawalsTable.id,
      userId: withdrawalsTable.userId,
      phone: usersTable.phone,
      amount: withdrawalsTable.amount,
      method: withdrawalsTable.method,
      accountDetails: withdrawalsTable.accountDetails,
      status: withdrawalsTable.status,
      createdAt: withdrawalsTable.createdAt,
      processedAt: withdrawalsTable.processedAt,
    })
    .from(withdrawalsTable)
    .leftJoin(usersTable, eq(withdrawalsTable.userId, usersTable.id))
    .orderBy(desc(withdrawalsTable.createdAt));

  res.json(rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    userPhone: r.phone ?? "—",
    amount: parseFloat(r.amount),
    method: r.method,
    accountDetails: r.accountDetails,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    processedAt: r.processedAt ? r.processedAt.toISOString() : null,
  })));
});

router.post("/withdrawals/:id/approve", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalide" }); return; }
  const [withdrawal] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, id));
  if (!withdrawal) { res.status(404).json({ error: "Retrait non trouvé" }); return; }
  if (withdrawal.status !== "pending") { res.status(400).json({ error: "Ce retrait n'est plus en attente" }); return; }
  await db.update(withdrawalsTable).set({ status: "approved", processedAt: new Date() }).where(eq(withdrawalsTable.id, id));
  await db.update(transactionsTable).set({ status: "completed" })
    .where(sql`${transactionsTable.userId} = ${withdrawal.userId} AND ${transactionsTable.type} = 'withdrawal' AND ${transactionsTable.amount} = ${withdrawal.amount} AND ${transactionsTable.status} = 'pending'`);
  res.json({ message: "Retrait approuvé avec succès" });
});

router.post("/withdrawals/:id/reject", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalide" }); return; }
  const [withdrawal] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, id));
  if (!withdrawal) { res.status(404).json({ error: "Retrait non trouvé" }); return; }
  if (withdrawal.status !== "pending") { res.status(400).json({ error: "Ce retrait n'est plus en attente" }); return; }
  await db.update(withdrawalsTable).set({ status: "rejected", processedAt: new Date() }).where(eq(withdrawalsTable.id, id));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, withdrawal.userId));
  if (user) {
    await db.update(usersTable).set({ balance: (parseFloat(user.balance) + parseFloat(withdrawal.amount)).toString() }).where(eq(usersTable.id, withdrawal.userId));
    await db.insert(transactionsTable).values({ userId: withdrawal.userId, type: "deposit", amount: withdrawal.amount, description: "Remboursement — retrait rejeté", status: "completed" });
  }
  res.json({ message: "Retrait rejeté et montant remboursé" });
});

router.post("/broadcast", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const parsed = SendBroadcastBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.message.trim()) {
    res.status(400).json({ error: "Message requis" });
    return;
  }
  const [notification] = await db.insert(notificationsTable).values({ message: parsed.data.message.trim() }).returning();
  res.status(201).json({ message: `Message diffusé avec succès (ID: ${notification.id})` });
});

router.get("/notifications", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const notifications = await db.select().from(notificationsTable).orderBy(desc(notificationsTable.sentAt)).limit(20);
  res.json(notifications.map((n) => ({ id: n.id, message: n.message, sentAt: n.sentAt.toISOString() })));
});

router.post("/trigger-gains", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    const result = await processDailyGains();
    res.json({ message: `Gains traités : ${result.processed} investissement(s) — $${result.totalPaid.toFixed(2)} distribués` });
  } catch {
    res.status(500).json({ error: "Erreur lors du traitement des gains" });
  }
});

// Withdrawal toggle
router.get("/withdrawals/status", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, "withdrawals_open"));
  res.json({ open: row?.value === "true" });
});

router.post("/withdrawals/open", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  await db.update(settingsTable)
    .set({ value: "true", updatedAt: new Date() })
    .where(eq(settingsTable.key, "withdrawals_open"));
  res.json({ message: "Les retraits sont maintenant ouverts pour tous les utilisateurs." });
});

router.post("/withdrawals/close", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  await db.update(settingsTable)
    .set({ value: "false", updatedAt: new Date() })
    .where(eq(settingsTable.key, "withdrawals_open"));
  res.json({ message: "Les retraits sont maintenant fermés." });
});

export default router;
