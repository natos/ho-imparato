import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { fail, getCurrentUser, json } from "@/lib/auth";
import { getMyStars } from "@/lib/board";
import { HEARTS, maxScore, starsFor } from "@/lib/game";
import { isUnlocked } from "@/lib/unlock";
import { parseResults, recordRoundResults } from "@/lib/review";
import { recordAnswers } from "@/lib/answers";
import { findLevel } from "@/topics";

const int = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : null;

/** Record a finished (or failed) round. Stars and limits are recomputed here, not trusted. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in first.", 401);

  const body = await req.json().catch(() => ({}));
  const found = findLevel(String(body.topic), String(body.level));
  if (!found) return fail("Unknown level.");
  const { topic, level, index } = found;
  const qpr = level.questionsPerRound;

  const total = int(body.total, 1, qpr);
  const correct = total === null ? null : int(body.correct, 0, total);
  const hearts = int(body.hearts, 0, HEARTS);
  const score = int(body.score, 0, maxScore(qpr));
  if (total === null || correct === null || hearts === null || score === null) return fail("That round doesn't add up.");
  const finished = body.finished === true && total === qpr && hearts > 0;
  const results = parseResults(body.results, qpr + 2, level.id);

  const before = await getMyStars(user.id, topic.id);
  if (!isUnlocked(topic, index, before)) return fail("This stop is still locked.", 403);

  const stars = starsFor(hearts, finished);
  const prevStars = before[level.id] ?? 0;
  const db = await getDb();

  const [prev] = await db
    .select({ bestScore: schema.progress.bestScore })
    .from(schema.progress)
    .where(and(eq(schema.progress.userId, user.id), eq(schema.progress.topic, topic.id), eq(schema.progress.level, level.id)));
  const newBest = finished && score > (prev?.bestScore ?? 0);

  await db
    .insert(schema.progress)
    .values({ userId: user.id, topic: topic.id, level: level.id, stars, bestScore: finished ? score : 0 })
    .onConflictDoUpdate({
      target: [schema.progress.userId, schema.progress.topic, schema.progress.level],
      set: {
        stars: sql`greatest(${schema.progress.stars}, ${stars})`,
        bestScore: sql`greatest(${schema.progress.bestScore}, ${finished ? score : 0})`,
        updatedAt: sql`now()`,
      },
    });

  // Points reward learning, not grinding: a stop you've already mastered (3 stars) pays 25%,
  // and failing a mastered stop pays nothing. Failing a new stop still pays half.
  const mastered = prevStars === 3;
  const xp = finished ? Math.round(score * (mastered ? 0.25 : 1)) : mastered ? 0 : Math.floor(score / 2);
  await db.insert(schema.plays).values({
    id: crypto.randomUUID(),
    userId: user.id,
    topic: topic.id,
    level: level.id,
    score,
    xp,
  });

  // Every answer feeds the Ripasso deck: misses come back in an hour, first-time rights tomorrow.
  await recordRoundResults(user.id, topic.id, results);
  await recordAnswers(user.id, topic.id, "level", body.answers, qpr + 2);

  return json({
    xp,
    mastered,
    stars: Math.max(stars, prevStars),
    best: Math.max(score, prev?.bestScore ?? 0),
    newBest,
    unlockedNext: prevStars === 0 && stars > 0 && index + 1 < topic.levels.length,
  });
}
