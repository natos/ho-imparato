import "server-only";
import { and, asc, eq, lt, lte, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { findLevel, TOPICS } from "@/topics";
import type { Question } from "@/topics/types";
import type { Verdict } from "./game";

/*
  Ripasso: a Leitner deck per player, one row per skill.
  box 1–5 → due after 1h / 1d / 3d / 7d / 21d; box 6 = remembered.
*/

export const GRADUATED = 6;
const HOUR = 3600_000;
const DAY = 24 * HOUR;
const INTERVAL: Record<number, number> = { 1: HOUR, 2: DAY, 3: 3 * DAY, 4: 7 * DAY, 5: 21 * DAY };
const dueIn = (box: number) => new Date(Date.now() + (INTERVAL[box] ?? 365 * DAY));

export const skillOf = (q: Question) => q.skill ?? q.id;

export type Result = { question: Question; verdict: Verdict; level: string | null };

/** Only keep what we need from a client-sent question, and make sure it's one of ours in shape. */
export function cleanQuestion(raw: unknown): Question | null {
  if (!raw || typeof raw !== "object") return null;
  const q = raw as Record<string, unknown>;
  if (typeof q.id !== "string" || typeof q.prompt !== "string" || typeof q.task !== "string") return null;
  if (!["choice", "type", "tiles"].includes(String(q.kind))) return null;
  if (JSON.stringify(q).length > 4000) return null;
  const { retry: _retry, ...rest } = q; // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest as unknown as Question;
}

/**
 * After a normal round: a miss puts the skill in box 1 (due in an hour) and counts the miss;
 * a first-time correct answer enters at box 2 (due tomorrow), so Ripasso isn't only failures.
 */
export async function recordRoundResults(userId: string, topic: string, results: Result[]) {
  const db = await getDb();
  for (const { question, verdict, level } of results) {
    const itemId = skillOf(question);
    if (verdict === "wrong") {
      await db
        .insert(schema.reviewItems)
        .values({ userId, topic, itemId, level, question, box: 1, misses: 1, dueAt: dueIn(1) })
        .onConflictDoUpdate({
          target: [schema.reviewItems.userId, schema.reviewItems.topic, schema.reviewItems.itemId],
          set: { box: 1, misses: sql`${schema.reviewItems.misses} + 1`, dueAt: dueIn(1), question, level, updatedAt: sql`now()` },
        });
    } else {
      await db
        .insert(schema.reviewItems)
        .values({ userId, topic, itemId, level, question, box: 2, dueAt: dueIn(2) })
        .onConflictDoNothing();
    }
  }
}

/** In Ripasso itself: right moves a skill up one box, wrong sends it back to box 1. */
export async function recordReviewResults(userId: string, topic: string, results: Result[]) {
  const db = await getDb();
  let promoted = 0;
  let reset = 0;
  for (const { question, verdict } of results) {
    const itemId = skillOf(question);
    const key = and(eq(schema.reviewItems.userId, userId), eq(schema.reviewItems.topic, topic), eq(schema.reviewItems.itemId, itemId));
    const [row] = await db.select({ box: schema.reviewItems.box }).from(schema.reviewItems).where(key);
    if (!row) continue;
    if (verdict === "wrong") {
      reset++;
      await db
        .update(schema.reviewItems)
        .set({ box: 1, misses: sql`${schema.reviewItems.misses} + 1`, dueAt: dueIn(1), updatedAt: sql`now()` })
        .where(key);
    } else {
      promoted++;
      const box = Math.min(GRADUATED, row.box + 1);
      await db.update(schema.reviewItems).set({ box, dueAt: dueIn(box), updatedAt: sql`now()` }).where(key);
    }
  }
  return { promoted, reset };
}

/** Ask the skill again in a fresh form when the level can generate one; otherwise reuse the last version. */
function freshQuestion(topic: string, level: string | null, skill: string, last: Question | null): Question | null {
  const found = level ? findLevel(topic, level) : null;
  if (found) {
    const pool = found.level.build().filter((q) => skillOf(q) === skill);
    const different = pool.filter((q) => q.id !== last?.id);
    const pickFrom = different.length ? different : pool;
    if (pickFrom.length) return pickFrom[Math.floor(Math.random() * pickFrom.length)];
  }
  return last;
}

/** Up to n due skills: oldest first, at most 3 from the same level so practice is mixed. */
export async function dueQuestions(userId: string, topic: string, n = 10): Promise<Question[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.reviewItems)
    .where(and(eq(schema.reviewItems.userId, userId), eq(schema.reviewItems.topic, topic), lt(schema.reviewItems.box, GRADUATED), lte(schema.reviewItems.dueAt, new Date())))
    .orderBy(asc(schema.reviewItems.dueAt))
    .limit(60);
  const perLevel = new Map<string, number>();
  const out: Question[] = [];
  for (const r of rows) {
    if (out.length >= n) break;
    const lvl = r.level ?? "?";
    if ((perLevel.get(lvl) ?? 0) >= 3) continue;
    const q = freshQuestion(topic, r.level, r.itemId, (r.question as Question | null) ?? null);
    if (!q) continue; // legacy rows from before skills existed
    perLevel.set(lvl, (perLevel.get(lvl) ?? 0) + 1);
    out.push({ ...q, skill: r.itemId, level: r.level });
  }
  return out;
}

export async function reviewCounts(userId: string, topic: string) {
  const db = await getDb();
  const [row] = await db
    .select({
      due: sql<number>`count(*) filter (where ${schema.reviewItems.box} < ${GRADUATED} and ${schema.reviewItems.dueAt} <= now() and ${schema.reviewItems.question} is not null)`.mapWith(Number),
      remembered: sql<number>`count(*) filter (where ${schema.reviewItems.box} >= 4)`.mapWith(Number),
    })
    .from(schema.reviewItems)
    .where(and(eq(schema.reviewItems.userId, userId), eq(schema.reviewItems.topic, topic)));
  return row ?? { due: 0, remembered: 0 };
}

/** Validate client-sent results: [{ question, verdict, level? }]. */
export function parseResults(raw: unknown, max: number, level: string | null): Result[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, max).flatMap((r) => {
    const question = cleanQuestion(r?.question);
    const verdict = r?.verdict;
    if (!question || !["right", "accent", "wrong"].includes(verdict)) return [];
    return [{ question, verdict, level: typeof r?.level === "string" ? r.level : level }];
  });
}

export const topicExists = (topic: string) => Boolean(TOPICS[topic]);
