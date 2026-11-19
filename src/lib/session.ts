import "server-only";
import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

const SESSION_COOKIE = "hi_session";
const CHALLENGE_COOKIE = "hi_challenge";
const SESSION_DAYS = 30;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is not set");
    return new TextEncoder().encode("dev-only-secret-change-me-dev-only-secret");
  }
  return new TextEncoder().encode(s);
}

const cookieBase = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

async function sign(payload: Record<string, unknown>, expiresIn: string) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret());
}

async function verify<T>(token: string | undefined): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as T;
  } catch {
    return null;
  }
}

// ── Session ────────────────────────────────────────────────────────────────

export async function setSession(userId: string) {
  const token = await sign({ sub: userId }, `${SESSION_DAYS}d`);
  (await cookies()).set(SESSION_COOKIE, token, {
    ...cookieBase,
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function getSessionUserId(): Promise<string | null> {
  const payload = await verify<{ sub?: string }>((await cookies()).get(SESSION_COOKIE)?.value);
  return payload?.sub ?? null;
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

// ── WebAuthn challenge (short-lived, between options and verify) ───────────

export type PendingChallenge = {
  challenge: string;
  kind: "register" | "login" | "add-passkey";
  userId?: string;
  name?: string;
};

export async function setChallenge(data: PendingChallenge) {
  const token = await sign(data, "5m");
  (await cookies()).set(CHALLENGE_COOKIE, token, { ...cookieBase, maxAge: 5 * 60 });
}

export async function takeChallenge(kind: PendingChallenge["kind"]) {
  const store = await cookies();
  const data = await verify<PendingChallenge>(store.get(CHALLENGE_COOKIE)?.value);
  store.delete(CHALLENGE_COOKIE);
  return data && data.kind === kind ? data : null;
}
