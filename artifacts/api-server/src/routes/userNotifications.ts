import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router = Router();

// User notifications: broadcasts from admin (shared, most recent 20)
router.get("/", async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }

  const notifications = await db
    .select()
    .from(notificationsTable)
    .orderBy(desc(notificationsTable.sentAt))
    .limit(20);

  res.json(notifications.map((n) => ({
    id: n.id,
    message: n.message,
    type: "broadcast",
    isRead: false,
    createdAt: n.sentAt.toISOString(),
  })));
});

router.patch("/", async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }
  // In this simple version, notifications are global — mark-as-read is a no-op success
  res.json({ message: "Notifications marquées comme lues" });
});

export default router;
