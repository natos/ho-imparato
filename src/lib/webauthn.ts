import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const RP_NAME = "Ho imparato";

/**
 * Passkeys are bound to one domain. In production RP_ID / RP_ORIGIN must be the
 * fixed production domain (passkeys will not work on Vercel preview URLs).
 * In dev we derive them from the request (localhost).
 */
export function relyingParty(req: Request) {
  const url = new URL(req.url);
  const rpID = process.env.RP_ID ?? url.hostname;
  const origin = process.env.RP_ORIGIN ?? url.origin;
  if (process.env.NODE_ENV === "production" && !process.env.RP_ID) {
    throw new Error("RP_ID is not set");
  }
  return { rpID, origin };
}

export function toB64url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64url");
}

export function fromB64url(s: string) {
  return new Uint8Array(Buffer.from(s, "base64url"));
}

// ── Recovery codes ─────────────────────────────────────────────────────────
// Format: XXXX-XXXX-XXXX (no ambiguous characters). Stored as sha256.

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function newRecoveryCode() {
  const bytes = randomBytes(12);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
  return [0, 4, 8].map((i) => chars.slice(i, i + 4).join("")).join("-");
}

export function hashRecoveryCode(code: string) {
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return createHash("sha256").update(normalized).digest("hex");
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function checkInvite(code: unknown) {
  const expected = process.env.INVITE_CODE;
  if (!expected) return process.env.NODE_ENV !== "production"; // open in dev
  return typeof code === "string" && safeEqual(code.trim().toLowerCase(), expected.trim().toLowerCase());
}

export function cleanName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const n = name.trim().replace(/\s+/g, " ");
  return n.length >= 2 && n.length <= 24 ? n : null;
}
