// Applies pending SQL migrations from ./drizzle before each build.
// Runs on Vercel deploys (DATABASE_URL set); skipped locally, where the
// embedded PGlite database migrates itself on first use.
if (!process.env.DATABASE_URL) {
  console.log("migrate: DATABASE_URL not set, skipping");
  process.exit(0);
}

const { neon } = await import("@neondatabase/serverless");
const { drizzle } = await import("drizzle-orm/neon-http");
const { migrate } = await import("drizzle-orm/neon-http/migrator");

await migrate(drizzle(neon(process.env.DATABASE_URL)), { migrationsFolder: "./drizzle" });
console.log("migrate: database is up to date");
