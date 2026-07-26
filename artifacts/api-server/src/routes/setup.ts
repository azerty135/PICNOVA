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

// One-time data correction
router.post("/fix-user-data", async (req, res) => {
  const key = req.query["key"] as string;
  const secret = process.env.SESSION_SECRET ?? "";
  if (!key || key !== secret) { res.status(403).json({ error: "Clé invalide" }); return; }

  const { phone, balance, totalGains, depositedAmount } = req.body as {
    phone?: string; balance?: number; totalGains?: number; depositedAmount?: number;
  };
  if (!phone) { res.status(400).json({ error: "phone requis" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
  if (!user) { res.status(404).json({ error: "Utilisateur introuvable" }); return; }

  const updates: Record<string, string> = {};
  if (balance !== undefined) updates.balance = balance.toFixed(2);
  if (totalGains !== undefined) updates.totalGains = totalGains.toFixed(2);
  if (depositedAmount !== undefined) updates.depositedAmount = depositedAmount.toFixed(2);

  await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id));
  res.json({ message: `✅ Données corrigées`, updates });
});

export default router;
