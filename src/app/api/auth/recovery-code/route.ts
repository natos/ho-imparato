import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { fail, getCurrentUser, json } from "@/lib/auth";
import { hashRecoveryCode, newRecoveryCode } from "@/lib/webauthn";

/** Issue a fresh recovery code for the signed-in player. The old one stops working. */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in first.", 401);
  const code = newRecoveryCode();
  const db = await getDb();
  await db.update(schema.users).set({ recoveryHash: hashRecoveryCode(code) }).where(eq(schema.users.id, user.id));
  return json({ ok: true, recoveryCode: code });
}
