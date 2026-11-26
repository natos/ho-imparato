import { fail, getCurrentUser, json } from "@/lib/auth";
import { getDb, schema } from "@/db";
import { parseResults, recordRoundResults, topicExists } from "@/lib/review";
import { recordAnswers } from "@/lib/answers";
import { WEEKLY_POINTS, WEEKLY_SIZE, weekKey, weeklyStatus } from "@/lib/weekly";

/** Finish the weekly challenge. Only the first attempt each week scores; misses feed Ripasso. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in first.", 401);
  const body = await req.json().catch(() => ({}));
  const topic = String(body.topic);
  if (!topicExists(topic)) return fail("Unknown topic.");
  if (body.week !== weekKey()) return fail("This challenge has ended — a new one is waiting.", 409);
  const results = parseResults(body.results, WEEKLY_SIZE, null);
  if (!results.length) return fail("Nothing to save.");

  const { played } = await weeklyStatus(user.id, topic);
  const correct = results.filter((r) => r.verdict !== "wrong").length;
  const xp = played ? 0 : correct * WEEKLY_POINTS;
  const db = await getDb();
  await db.insert(schema.plays).values({ id: crypto.randomUUID(), userId: user.id, topic, level: `sfida:${weekKey()}`, score: correct * WEEKLY_POINTS, xp });
  await recordRoundResults(user.id, topic, results);
  await recordAnswers(user.id, topic, "sfida", body.answers, WEEKLY_SIZE);
  return json({ xp, firstAttempt: !played, correct, total: results.length });
}
