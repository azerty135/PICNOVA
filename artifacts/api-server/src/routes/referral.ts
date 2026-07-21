import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/team", async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId));
  if (!user) {
    res.status(401).json({ error: "Utilisateur non trouvé" });
    return;
  }

  const members = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.referredBy, user.id));

  res.json({
    referralCode: user.referralCode,
    totalMembers: members.length,
    totalBonus: parseFloat(user.referralBonus ?? "0"),
    members: members.map((m) => ({
      id: m.id,
      phone: m.phone,
      name: m.name ?? null,
      totalInvested: parseFloat(m.totalInvested),
      joinedAt: m.createdAt.toISOString(),
    })),
  });
});

export default router;
