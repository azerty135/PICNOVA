import { Router } from "express";
import bcrypt from "bcrypt";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.patch("/", async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }

  const { name, currentPin, newPin } = req.body as { name?: string; currentPin?: string; newPin?: string };

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId));
  if (!user) {
    res.status(401).json({ error: "Utilisateur non trouvé" });
    return;
  }

  const updates: Partial<typeof usersTable.$inferInsert> = {};

  if (name !== undefined) {
    const trimmed = name.trim();
    if (trimmed.length > 50) {
      res.status(400).json({ error: "Le nom ne peut pas dépasser 50 caractères" });
      return;
    }
    updates.name = trimmed || null;
  }

  if (newPin !== undefined) {
    if (!/^\d{4}$/.test(newPin) && !/^\d{8}$/.test(newPin)) {
      res.status(400).json({ error: "Le nouveau PIN doit être composé de 4 ou 8 chiffres" });
      return;
    }
    if (!currentPin) {
      res.status(400).json({ error: "Le PIN actuel est requis pour changer de PIN" });
      return;
    }
    const valid = await bcrypt.compare(currentPin, user.pin);
    if (!valid) {
      res.status(400).json({ error: "Code PIN actuel incorrect" });
      return;
    }
    updates.pin = await bcrypt.hash(newPin, 10);
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Aucune modification à effectuer" });
    return;
  }

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id)).returning();

  res.json({
    id: updated.id,
    phone: updated.phone,
    name: updated.name ?? null,
    balance: parseFloat(updated.balance),
    totalInvested: parseFloat(updated.totalInvested),
    totalGains: parseFloat(updated.totalGains),
    referralCode: updated.referralCode,
    referralBonus: parseFloat(updated.referralBonus ?? "0"),
    isAdmin: updated.isAdmin,
    createdAt: updated.createdAt.toISOString(),
  });
});

export default router;
