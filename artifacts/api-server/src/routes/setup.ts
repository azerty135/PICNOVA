import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// One-time admin setup — requires the SESSION_SECRET as ?key=
router.post("/setup-admin", async (req, res) => {
  const key = req.query["key"] as string;
  const secret = process.env.SESSION_SECRET ?? "";

  if (!key || key !== secret) {
    res.status(403).json({ error: "Clé invalide" });
    return;
  }

  const { phone } = req.body as { phone?: string };
  if (!phone) {
    res.status(400).json({ error: "Numéro de téléphone requis" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
  if (!user) {
    res.status(404).json({ error: "Utilisateur introuvable" });
    return;
  }

  await db.update(usersTable).set({ isAdmin: true }).where(eq(usersTable.id, user.id));
  res.json({ message: `✅ ${user.name || user.phone} est maintenant admin` });
});

export default router;
