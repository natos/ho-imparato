import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { fail, json } from "@/lib/auth";
import { setSession, takeChallenge } from "@/lib/session";
import { fromB64url, relyingParty } from "@/lib/webauthn";

export async function POST(req: Request) {
  const pending = await takeChallenge("login");
  if (!pending) return fail("The sign-in request expired. Try again.");

  const body = await req.json().catch(() => null);
  if (!body?.id) return fail("No passkey was sent.");

  const db = await getDb();
  const [cred] = await db.select().from(schema.credentials).where(eq(schema.credentials.id, body.id));
  if (!cred) return fail("This passkey isn't linked to a player here. Create an account or use your recovery code.", 404);

  const { rpID, origin } = relyingParty(req);
  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: pending.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
      credential: {
        id: cred.id,
        publicKey: fromB64url(cred.publicKey),
        counter: cred.counter,
        transports: cred.transports?.split(",") ?? undefined,
      },
    });
  } catch (e) {
    return fail(`Passkey couldn't be verified: ${(e as Error).message}`);
  }
  if (!verification.verified) return fail("Passkey couldn't be verified. Try again.");

  await db
    .update(schema.credentials)
    .set({ counter: verification.authenticationInfo.newCounter })
    .where(eq(schema.credentials.id, cred.id));

  await setSession(cred.userId);
  return json({ ok: true });
}
