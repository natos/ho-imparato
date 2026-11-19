import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { getDb, schema } from "@/db";
import { fail, json } from "@/lib/auth";
import { setSession, takeChallenge } from "@/lib/session";
import { hashRecoveryCode, newRecoveryCode, relyingParty, toB64url } from "@/lib/webauthn";

export async function POST(req: Request) {
  const pending = await takeChallenge("register");
  if (!pending?.userId || !pending.name) return fail("The passkey request expired. Start again.", 400);

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
  const recoveryCode = newRecoveryCode();
  const db = await getDb();

  try {
    await db.insert(schema.users).values({
      id: pending.userId,
      name: pending.name,
      recoveryHash: hashRecoveryCode(recoveryCode),
    });
  } catch {
    return fail(`"${pending.name}" was just taken. Pick another name.`, 409);
  }
  await db.insert(schema.credentials).values({
    id: credential.id,
    userId: pending.userId,
    publicKey: toB64url(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports?.join(",") ?? null,
  });

  await setSession(pending.userId);
  return json({ ok: true, recoveryCode });
}
