import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";

export type Player = {
  id: string;
  name: string;
  avatarUrl: string | null;
  stars: number;
  points: number;
  /** index of the stop this player is at on the current route (0-based) */
  stop: number;
};

/**
 * Everyone's position, stars and points on a topic route — the duel source.
 * Note: subqueries reference "users"."id" explicitly; an interpolated column renders as bare "id",
 * which inside `from plays` silently means plays.id.
 */
export async function getBoard(topic: string): Promise<Player[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      avatarUrl: schema.users.avatarUrl,
      stars: sql<number>`coalesce((select sum(p.stars) from progress p where p.user_id = "users"."id" and p.topic = ${topic}), 0)`.mapWith(Number),
      cleared: sql<number>`coalesce((select count(*) from progress p where p.user_id = "users"."id" and p.topic = ${topic} and p.stars > 0), 0)`.mapWith(Number),
      points: sql<number>`coalesce((select sum(x.xp) from plays x where x.user_id = "users"."id" and x.topic = ${topic}), 0)`.mapWith(Number),
    })
    .from(schema.users)
    .orderBy(schema.users.createdAt);
  return rows.map((r) => ({ id: r.id, name: r.name, avatarUrl: r.avatarUrl, stars: r.stars, points: r.points, stop: r.cleared }));
}

/** level id → best stars for one player on one topic. */
export async function getMyStars(userId: string, topic: string): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db
    .select({ level: schema.progress.level, stars: schema.progress.stars })
    .from(schema.progress)
    .where(and(eq(schema.progress.userId, userId), eq(schema.progress.topic, topic)));
  return Object.fromEntries(rows.map((r) => [r.level, r.stars]));
}
