import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { getDb, schema } from "@/db";
import { fail, getCurrentUser, json } from "@/lib/auth";
import { takeChallenge } from "@/lib/session";
import { relyingParty, toB64url } from "@/lib/webauthn";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in first.", 401);
  const pending = await takeChallenge("add-passkey");
  if (!pending || pending.userId !== user.id) return fail("The passkey request expired. Start again.");

  const { rpID, origin } = relyingParty(req);
  const body = await req.json().catch(() => null);
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: pending.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });
  } catch (e) {
    return fail(`Passkey couldn't be verified: ${(e as Error).message}`);
  }
  if (!verification.verified) return fail("Passkey couldn't be verified. Try again.");

  const { credential } = verification.registrationInfo;
  const db = await getDb();
  await db.insert(schema.credentials).values({
    id: credential.id,
    userId: user.id,
    publicKey: toB64url(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports?.join(",") ?? null,
  });
  return json({ ok: true });
}
