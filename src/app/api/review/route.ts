import { fail, getCurrentUser, json } from "@/lib/auth";
import { getDb, schema } from "@/db";
import { parseResults, recordReviewResults, topicExists } from "@/lib/review";
import { recordAnswers } from "@/lib/answers";

const RIPASSO_POINTS = 15;

/** Finish a Ripasso session: move skills between boxes and award points. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in first.", 401);
  const body = await req.json().catch(() => ({}));
  const topic = String(body.topic);
  if (!topicExists(topic)) return fail("Unknown topic.");
  const results = parseResults(body.results, 12, null);
  if (!results.length) return fail("Nothing to save.");

  const { promoted, reset } = await recordReviewResults(user.id, topic, results);
  await recordAnswers(user.id, topic, "ripasso", body.answers, 12);
  const xp = promoted * RIPASSO_POINTS;
  const db = await getDb();
  await db.insert(schema.plays).values({ id: crypto.randomUUID(), userId: user.id, topic, level: "ripasso", score: xp, xp });
  return json({ promoted, reset, xp });
}
