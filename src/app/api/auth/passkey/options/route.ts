import { generateRegistrationOptions } from "@simplewebauthn/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { fail, getCurrentUser, json } from "@/lib/auth";
import { setChallenge } from "@/lib/session";
import { relyingParty, RP_NAME } from "@/lib/webauthn";

/** Add a passkey for the signed-in player (new device, or after recovery). */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in first.", 401);

  const db = await getDb();
  const existing = await db
    .select({ id: schema.credentials.id, transports: schema.credentials.transports })
    .from(schema.credentials)
    .where(eq(schema.credentials.userId, user.id));

  const { rpID } = relyingParty(req);
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userName: user.name,
    userDisplayName: user.name,
    userID: new TextEncoder().encode(user.id),
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({ id: c.id, transports: c.transports?.split(",") })),
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
  });

  await setChallenge({ challenge: options.challenge, kind: "add-passkey", userId: user.id });
  return json(options);
}
