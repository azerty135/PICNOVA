import { Router } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function maskNumber(num: string): string {
  if (num.length <= 4) return "****";
  return num.slice(0, 2) + "*".repeat(num.length - 4) + num.slice(-2);
}

router.get("/momo", async (_req, res) => {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, "momo_number"));
  const number = row?.value ?? "";
  res.json({
    available: !!number,
    maskedNumber: number ? maskNumber(number) : null,
    ussdTemplate: number ? `*144*2*${number}*{amount}#` : null,
  });
});

export default router;
