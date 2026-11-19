import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getSessionUserId } from "./session";

export type CurrentUser = { id: string; name: string; avatarUrl: string | null };

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const db = await getDb();
  const [user] = await db
    .select({ id: schema.users.id, name: schema.users.name, avatarUrl: schema.users.avatarUrl })
    .from(schema.users)
    .where(eq(schema.users.id, userId));
  return user ?? null;
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function fail(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
