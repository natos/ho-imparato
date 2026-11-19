import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { json } from "@/lib/auth";
import { setChallenge } from "@/lib/session";
import { relyingParty } from "@/lib/webauthn";

export async function POST(req: Request) {
  const { rpID } = relyingParty(req);
  // No allowCredentials: discoverable passkeys let the device pick the account.
  const options = await generateAuthenticationOptions({ rpID, userVerification: "preferred" });
  await setChallenge({ challenge: options.challenge, kind: "login" });
  return json(options);
}
