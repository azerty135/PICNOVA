import { Router } from "express";
import { db, usersTable, messagesTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

async function requireAdmin(req: any, res: any): Promise<boolean> {
  if (!req.session.userId) { res.status(401).json({ error: "Non authentifié" }); return false; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId));
  if (!user?.isAdmin) { res.status(403).json({ error: "Accès refusé" }); return false; }
  return true;
}

// Admin: list all conversations (one entry per user who has messages)
router.get("/", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  const conversations = await db
    .select({
      userId: messagesTable.userId,
      lastMessage: sql<string>`MAX(${messagesTable.createdAt})`,
      unreadCount: sql<number>`COUNT(*) FILTER (WHERE ${messagesTable.fromAdmin} = false AND ${messagesTable.readAt} IS NULL)`,
    })
    .from(messagesTable)
    .groupBy(messagesTable.userId)
    .orderBy(desc(sql`MAX(${messagesTable.createdAt})`));

  const userIds = conversations.map((c) => c.userId);
  const allUsers = userIds.length > 0
    ? await db.select().from(usersTable).where(sql`${usersTable.id} = ANY(${sql.raw(`ARRAY[${userIds.join(",")}]`)}::int[])`)
    : [];
  const phoneMap = new Map(allUsers.map((u) => [u.id, u.phone]));

  res.json(conversations.map((c) => ({
    userId: c.userId,
    phone: phoneMap.get(c.userId) ?? "?",
    lastMessage: c.lastMessage,
    unreadCount: Number(c.unreadCount),
  })));
});

// Admin: get conversation with a specific user
router.get("/:userId", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) { res.status(400).json({ error: "ID invalide" }); return; }

  const msgs = await db.select().from(messagesTable)
    .where(eq(messagesTable.userId, userId))
    .orderBy(messagesTable.createdAt);

  // Mark user messages as read by admin
  await db.update(messagesTable)
    .set({ readAt: new Date() })
    .where(eq(messagesTable.userId, userId));

  res.json(msgs.map((m) => ({
    id: m.id, content: m.content, fromAdmin: m.fromAdmin,
    readAt: m.readAt?.toISOString() ?? null, createdAt: m.createdAt.toISOString(),
  })));
});

// Admin: reply to a user
router.post("/:userId", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) { res.status(400).json({ error: "ID invalide" }); return; }
  const { content } = req.body;
  if (!content?.trim()) { res.status(400).json({ error: "Message vide" }); return; }

  const [msg] = await db.insert(messagesTable).values({
    userId,
    content: content.trim(),
    fromAdmin: true,
  }).returning();

  res.status(201).json({ id: msg.id, content: msg.content, fromAdmin: true, createdAt: msg.createdAt.toISOString() });
});

export default router;
