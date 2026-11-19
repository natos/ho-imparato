import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { fail, json } from "@/lib/auth";
import { setSession } from "@/lib/session";
import { cleanName, hashRecoveryCode, newRecoveryCode, safeEqual } from "@/lib/webauthn";

/** Sign in with name + recovery code. The code is single-use: a new one is issued. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = cleanName(body.name);
  const code = typeof body.code === "string" ? body.code : "";
  if (!name || !code) return fail("Enter your name and recovery code.");

  const db = await getDb();
  const [user] = await db
    .select()
    .from(schema.users)
    .where(sql`lower(${schema.users.name}) = lower(${name})`);
  if (!user || !safeEqual(user.recoveryHash, hashRecoveryCode(code))) {
    return fail("That name and recovery code don't match.", 401);
  }

  const next = newRecoveryCode();
  await db
    .update(schema.users)
    .set({ recoveryHash: hashRecoveryCode(next) })
    .where(eq(schema.users.id, user.id));
  await setSession(user.id);
  return json({ ok: true, recoveryCode: next });
}
