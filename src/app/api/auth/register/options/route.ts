import { generateRegistrationOptions } from "@simplewebauthn/server";
import { sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { fail, json } from "@/lib/auth";
import { setChallenge } from "@/lib/session";
import { checkInvite, cleanName, relyingParty, RP_NAME } from "@/lib/webauthn";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = cleanName(body.name);
  if (!name) return fail("Use a name between 2 and 24 characters.");
  if (process.env.NODE_ENV === "production" && !process.env.INVITE_CODE) {
    return fail("Sign-up isn't open yet. Ask whoever runs this game to set an invite code.", 403);
  }
  if (!checkInvite(body.invite)) return fail("That invite code doesn't match. Check it and try again.", 403);

  const db = await getDb();
  const taken = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(sql`lower(${schema.users.name}) = lower(${name})`);
  if (taken.length) return fail(`"${name}" is already playing. Pick another name, or sign in.`, 409);

  const userId = crypto.randomUUID();
  const { rpID } = relyingParty(req);
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userName: name,
    userDisplayName: name,
    userID: new TextEncoder().encode(userId),
    attestationType: "none",
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
  });

  await setChallenge({ challenge: options.challenge, kind: "register", userId, name });
  return json(options);
}
