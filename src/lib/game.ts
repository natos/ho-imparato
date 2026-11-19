/** Rules shared by the round (client) and the progress API (server). */

export const HEARTS = 3;
export const BASE_POINTS = 10;
export const MAX_MULTIPLIER = 3;
export const BOSS_SECONDS = 150;

/** Streak multiplier: ×1, then +0.5 every 3 correct in a row, up to ×3. */
export function multiplier(streak: number) {
  return Math.min(MAX_MULTIPLIER, 1 + 0.5 * Math.floor(streak / 3));
}

export function maxScore(questions: number) {
  return questions * BASE_POINTS * MAX_MULTIPLIER;
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

/** Case and punctuation never matter. A missing accent (e for è) counts, with a nudge. */
export function checkTyped(input: string, answers: string[]): Verdict {
  const a = strip(input);
  if (!a) return "wrong";
  if (answers.some((x) => strip(x) === a)) return "right";
  if (answers.some((x) => noAccents(strip(x)) === noAccents(a))) return "accent";
  return "wrong";
}
