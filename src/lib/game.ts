/** Rules shared by the round (client) and the progress API (server). */

export const HEARTS = 3;
export const BASE_POINTS = 10;
export const MAX_MULTIPLIER = 3;
export const MAX_RETRIES = 2; // misses asked again per round

/** Boss timer per question: typing on a phone needs longer than tapping. */
export function secondsFor(kind: "choice" | "type" | "tiles") {
  return kind === "choice" ? 10 : kind === "type" ? 20 : 25;
}

/** Streak multiplier: ×1, then +0.5 every 3 correct in a row, up to ×3. */
export function multiplier(streak: number) {
  return Math.min(MAX_MULTIPLIER, 1 + 0.5 * Math.floor(streak / 3));
}

export function maxScore(questions: number) {
  return (questions + MAX_RETRIES) * BASE_POINTS * MAX_MULTIPLIER;
}

/** Stars = hearts left at the end. Running out of hearts (or time) = 0 stars. */
export function starsFor(heartsLeft: number, finished: boolean) {
  return finished ? Math.max(0, Math.min(HEARTS, heartsLeft)) : 0;
}

// ── answer checking ────────────────────────────────────────────────────

const strip = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[.,!?;:"]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const noAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

export type Verdict = "right" | "accent" | "wrong";

/** "e'" / "e`" (English keyboards) → è, so they compare as an accented letter. */
const apostropheAccents = (s: string) => s.replace(/([aeiou])['`]/g, (_, v: string) => ({ a: "à", e: "è", i: "ì", o: "ò", u: "ù" })[v] ?? v);

/**
 * Case and punctuation never matter. A wrong or missing accent inside a word counts,
 * with a nudge. But "è" (is) typed as "e" (and) is a different word, so it's wrong.
 */
export function checkTyped(input: string, answers: string[]): Verdict {
  const a = strip(apostropheAccents(input.toLowerCase()));
  if (!a) return "wrong";
  if (answers.some((x) => strip(x) === a)) return "right";
  const nearMiss = (x: string) => {
    const want = strip(x).split(" ");
    const got = a.split(" ");
    if (want.length !== got.length) return false;
    return want.every((w, k) => {
      if (w === "è") return ["è", "é"].includes(got[k]);
      return noAccents(w) === noAccents(got[k]);
    });
  };
  return answers.some(nearMiss) ? "accent" : "wrong";
}
