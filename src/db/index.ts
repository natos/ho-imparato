import "server-only";
import * as schema from "./schema";

/**
 * Production: Neon Postgres over HTTP (DATABASE_URL).
 * Local dev without DATABASE_URL: an embedded Postgres (PGlite) in ./.pglite,
 * migrated automatically, so the app runs with zero setup.
 */
async function createDb() {
  if (process.env.DATABASE_URL) {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    return drizzle(neon(process.env.DATABASE_URL), { schema });
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is not set");
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const db = drizzle(new PGlite("./.pglite"), { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  return db;
}

type Db = Awaited<ReturnType<typeof createDb>>;

const g = globalThis as unknown as { __dbPromise?: Promise<Db> };

export function getDb(): Promise<Db> {
  g.__dbPromise ??= createDb().catch((e) => {
    g.__dbPromise = undefined; // allow a retry instead of caching the failure
    throw e;
  });
  return g.__dbPromise;
}

export { schema };
