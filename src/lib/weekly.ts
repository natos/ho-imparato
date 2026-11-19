import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { TOPICS } from "@/topics";
import type { Question } from "@/topics/types";
import { skillOf } from "./review";

/*
  La sfida della settimana: 10 questions built from the skills the players missed most
  in the last 3 weeks (skills missed by both players first), topped up with mixed review.
  Frozen in the database on first request, so everyone gets the same questions all week.
*/

export const WEEKLY_SIZE = 10;
export const WEEKLY_POINTS = 20; // per correct answer, first attempt of the week only

/** ISO week key, e.g. "2026-W47". Weeks start on Monday (UTC). */
export function weekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Monday 00:00 UTC after now. */
export function nextReset(d = new Date()) {
  const day = d.getUTCDay() || 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + (8 - day)));
}

const shuffle = <T,>(xs: T[]) => [...xs].sort(() => Math.random() - 0.5);

function fresh(topic: string, level: string | null, skill: string, last: Question | null): Question | null {
  const lv = TOPICS[topic]?.levels.find((l) => l.id === level);
  const pool = lv ? lv.build().filter((q) => skillOf(q) === skill) : [];
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : last;
}

async function buildChallenge(topic: string): Promise<Question[]> {
  const db = await getDb();
  const common = await db
    .select({
      skill: schema.reviewItems.itemId,
      level: sql<string | null>`max(${schema.reviewItems.level})`,
      question: sql<Question | null>`(array_agg(${schema.reviewItems.question}) filter (where ${schema.reviewItems.question} is not null))[1]`,
      players: sql<number>`count(distinct ${schema.reviewItems.userId})`.mapWith(Number),
      misses: sql<number>`sum(${schema.reviewItems.misses})`.mapWith(Number),
    })
    .from(schema.reviewItems)
    .where(and(eq(schema.reviewItems.topic, topic), sql`${schema.reviewItems.misses} > 0`, sql`${schema.reviewItems.updatedAt} > now() - interval '21 days'`))
    .groupBy(schema.reviewItems.itemId)
    .orderBy(sql`4 desc`, sql`5 desc`)
    .limit(WEEKLY_SIZE * 2);

  const out: Question[] = [];
  for (const c of common) {
    if (out.length >= WEEKLY_SIZE) break;
    const q = fresh(topic, c.level, c.skill, c.question);
    if (q) out.push({ ...q, skill: c.skill, level: c.level });
  }

  // Not enough shared mistakes yet: top up with a mix from every unlocked-by-anyone level.
  const levels = TOPICS[topic].levels.filter((l) => !l.timed);
  for (const l of shuffle(levels)) {
    if (out.length >= WEEKLY_SIZE) break;
    const q = shuffle(l.build()).find((x) => !out.some((o) => skillOf(o) === skillOf(x)));
    if (q) out.push({ ...q, level: l.id });
  }
  return shuffle(out).slice(0, WEEKLY_SIZE);
}

export async function getWeekly(topic: string) {
  const week = weekKey();
  const db = await getDb();
  const read = () =>
    db
      .select({ questions: schema.weeklyChallenges.questions })
      .from(schema.weeklyChallenges)
      .where(and(eq(schema.weeklyChallenges.week, week), eq(schema.weeklyChallenges.topic, topic)));
  let [row] = await read();
  if (!row) {
    const questions = await buildChallenge(topic);
    await db.insert(schema.weeklyChallenges).values({ week, topic, questions }).onConflictDoNothing();
    [row] = await read(); // if both players opened it at once, everyone gets the first one saved
  }
  return { week, questions: row.questions as Question[], resetsAt: nextReset() };
}

/** Has this player already played this week's challenge (and with what score)? */
export async function weeklyStatus(userId: string, topic: string) {
  const db = await getDb();
  const [row] = await db
    .select({ xp: sql<number>`max(${schema.plays.xp})`.mapWith(Number), n: sql<number>`count(*)`.mapWith(Number) })
    .from(schema.plays)
    .where(and(eq(schema.plays.userId, userId), eq(schema.plays.topic, topic), eq(schema.plays.level, `sfida:${weekKey()}`)));
  return { played: (row?.n ?? 0) > 0, xp: row?.xp ?? 0, resetsAt: nextReset() };
}
