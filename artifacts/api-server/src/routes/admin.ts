import { Router } from "express";
import { db, usersTable, withdrawalsTable, transactionsTable, investmentsTable, notificationsTable } from "@workspace/db";
import { eq, count, sql, desc } from "drizzle-orm";
import { SendBroadcastBody } from "@workspace/api-zod";

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

  res.json(users.map((u) => ({
    id: u.id,
    phone: u.phone,
    balance: parseFloat(u.balance),
    totalInvested: parseFloat(u.totalInvested),
    totalGains: parseFloat(u.totalGains),
    isAdmin: u.isAdmin,
    createdAt: u.createdAt.toISOString(),
  })));
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

  await db.update(withdrawalsTable).set({
    status: "approved",
    processedAt: new Date(),
  }).where(eq(withdrawalsTable.id, id));

  await db.update(transactionsTable).set({ status: "completed" })
    .where(
      sql`${transactionsTable.userId} = ${withdrawal.userId}
        AND ${transactionsTable.type} = 'withdrawal'
        AND ${transactionsTable.amount} = ${withdrawal.amount}
        AND ${transactionsTable.status} = 'pending'`
    );

  res.json({ message: "Retrait approuvé avec succès" });
});

router.post("/withdrawals/:id/reject", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalide" }); return; }

  const [withdrawal] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, id));
  if (!withdrawal) { res.status(404).json({ error: "Retrait non trouvé" }); return; }
  if (withdrawal.status !== "pending") { res.status(400).json({ error: "Ce retrait n'est plus en attente" }); return; }

  await db.update(withdrawalsTable).set({
    status: "rejected",
    processedAt: new Date(),
  }).where(eq(withdrawalsTable.id, id));

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, withdrawal.userId));
  if (user) {
    const refundedBalance = parseFloat(user.balance) + parseFloat(withdrawal.amount);
    await db.update(usersTable).set({ balance: refundedBalance.toString() }).where(eq(usersTable.id, withdrawal.userId));
    await db.insert(transactionsTable).values({
      userId: withdrawal.userId,
      type: "deposit",
      amount: withdrawal.amount,
      description: "Remboursement — retrait rejeté",
      status: "completed",
    });
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

  const [notification] = await db.insert(notificationsTable).values({
    message: parsed.data.message.trim(),
  }).returning();

  res.status(201).json({ message: `Message diffusé avec succès (ID: ${notification.id})` });
});

router.get("/notifications", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  const notifications = await db
    .select()
    .from(notificationsTable)
    .orderBy(desc(notificationsTable.sentAt))
    .limit(20);

  res.json(notifications.map((n) => ({
    id: n.id,
    message: n.message,
    sentAt: n.sentAt.toISOString(),
  })));
});

export default router;
