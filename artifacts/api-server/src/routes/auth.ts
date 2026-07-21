import { Router } from "express";
import bcrypt from "bcrypt";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";

const router = Router();

function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

function serializeUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name ?? null,
    balance: parseFloat(user.balance),
    totalInvested: parseFloat(user.totalInvested),
    totalGains: parseFloat(user.totalGains),
    referralCode: user.referralCode,
    referralBonus: parseFloat(user.referralBonus ?? "0"),
    isAdmin: user.isAdmin,
    createdAt: user.createdAt.toISOString(),
  };
}

router.post("/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Numéro de téléphone et code PIN requis" });
    return;
  }
  const { phone, pin } = parsed.data;
  const referralCode = (parsed.data as any).referralCode as string | undefined;

  if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    res.status(400).json({ error: "Le code PIN doit être composé de 4 chiffres" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
  if (existing.length > 0) {
    res.status(409).json({ error: "Ce numéro de téléphone est déjà enregistré" });
    return;
  }

  // Resolve referrer
  let referredById: number | undefined;
  if (referralCode) {
    const [referrer] = await db.select().from(usersTable).where(eq(usersTable.referralCode, referralCode.toUpperCase()));
    if (referrer) referredById = referrer.id;
  }

  const hashedPin = await bcrypt.hash(pin, 10);
  const newReferralCode = generateReferralCode();

  const [user] = await db.insert(usersTable).values({
    phone,
    pin: hashedPin,
    balance: "0",
    totalInvested: "0",
    totalGains: "0",
    referralCode: newReferralCode,
    referredBy: referredById,
    referralBonus: "0",
  }).returning();

  req.session.userId = user.id;

  res.status(201).json({
    user: serializeUser(user),
    message: "Compte créé avec succès",
  });
});

router.post("/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Numéro de téléphone et code PIN requis" });
    return;
  }
  const { phone, pin } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
  if (!user) {
    res.status(401).json({ error: "Numéro de téléphone ou code PIN incorrect" });
    return;
  }

  if (user.isBanned) {
    res.status(403).json({ error: "Ce compte a été suspendu. Contactez le support." });
    return;
  }

  const valid = await bcrypt.compare(pin, user.pin);
  if (!valid) {
    res.status(401).json({ error: "Numéro de téléphone ou code PIN incorrect" });
    return;
  }

  req.session.userId = user.id;

  res.json({
    user: serializeUser(user),
    message: "Connexion réussie",
  });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Déconnexion réussie" });
  });
});

router.get("/me", async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId));
  if (!user) {
    res.status(401).json({ error: "Utilisateur non trouvé" });
    return;
  }

  res.json(serializeUser(user));
});

export default router;
