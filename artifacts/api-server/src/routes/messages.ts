import { Router } from "express";
import { db, usersTable, messagesTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

// User: get their conversation with admin
router.get("/", async (req, res) => {
  if (!req.session.userId) { res.status(401).json({ error: "Non authentifié" }); return; }
  const msgs = await db.select().from(messagesTable)
    .where(eq(messagesTable.userId, req.session.userId))
    .orderBy(desc(messagesTable.createdAt));
  // Mark admin messages as read
  await db.update(messagesTable)
    .set({ readAt: new Date() })
    .where(and(eq(messagesTable.userId, req.session.userId), eq(messagesTable.fromAdmin, true)));
  res.json(msgs.map(m => ({
    id: m.id, content: m.content, fromAdmin: m.fromAdmin,
    readAt: m.readAt?.toISOString() ?? null, createdAt: m.createdAt.toISOString(),
  })));
});

// User: send message to admin
router.post("/", async (req, res) => {
  if (!req.session.userId) { res.status(401).json({ error: "Non authentifié" }); return; }
  const { content } = req.body;
  if (!content || typeof content !== "string" || !content.trim()) {
    res.status(400).json({ error: "Message vide" }); return;
  }
  const [msg] = await db.insert(messagesTable).values({
    userId: req.session.userId,
    content: content.trim(),
    fromAdmin: false,
  }).returning();
  res.status(201).json({ id: msg.id, content: msg.content, fromAdmin: false, createdAt: msg.createdAt.toISOString() });
});

// User: delete one of their own messages
router.delete("/:id", async (req, res) => {
  if (!req.session.userId) { res.status(401).json({ error: "Non authentifié" }); return; }
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalide" }); return; }
  const [msg] = await db.select().from(messagesTable).where(eq(messagesTable.id, id));
  if (!msg || msg.userId !== req.session.userId || msg.fromAdmin) {
    res.status(403).json({ error: "Non autorisé" }); return;
  }
  await db.delete(messagesTable).where(eq(messagesTable.id, id));
  res.json({ ok: true });
});

// User: count unread admin replies
router.get("/unread", async (req, res) => {
  if (!req.session.userId) { res.status(401).json({ error: "Non authentifié" }); return; }
  const unread = await db.select().from(messagesTable)
    .where(and(eq(messagesTable.userId, req.session.userId), eq(messagesTable.fromAdmin, true)));
  const count = unread.filter(m => !m.readAt).length;
  res.json({ count });
});

export default router;
