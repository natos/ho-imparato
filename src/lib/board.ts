import "server-only";
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";

export type Player = {
  id: string;
  name: string;
  avatarUrl: string | null;
  stars: number;
  /** index of the stop this player is at on the current route (0-based) */
  stop: number;
};

/** Everyone's position and stars on a topic route — the duel/leaderboard source. */
export async function getBoard(topic: string): Promise<Player[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      avatarUrl: schema.users.avatarUrl,
      stars: sql<number>`coalesce(sum(${schema.progress.stars}), 0)`.mapWith(Number),
      cleared: sql<number>`count(${schema.progress.level}) filter (where ${schema.progress.stars} > 0)`.mapWith(Number),
    })
    .from(schema.users)
    .leftJoin(
      schema.progress,
      sql`${schema.progress.userId} = ${schema.users.id} and ${schema.progress.topic} = ${topic}`,
    )
    .groupBy(schema.users.id)
    .orderBy(sql`2 desc`, schema.users.createdAt);
  return rows.map((r) => ({ id: r.id, name: r.name, avatarUrl: r.avatarUrl, stars: r.stars, stop: r.cleared }));
}

export async function getMyStars(userId: string, topic: string) {
  const db = await getDb();
  return db
    .select({ level: schema.progress.level, stars: schema.progress.stars })
    .from(schema.progress)
    .where(sql`${eq(schema.progress.userId, userId)} and ${eq(schema.progress.topic, topic)}`);
}
