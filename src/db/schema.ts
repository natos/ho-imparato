import { sql } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    avatarUrl: text("avatar_url"),
    recoveryHash: text("recovery_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("users_name_lower_idx").on(sql`lower(${t.name})`)],
);

export const credentials = pgTable(
  "credentials",
  {
    id: text("id").primaryKey(), // base64url credential id
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    publicKey: text("public_key").notNull(), // base64url
    counter: integer("counter").notNull().default(0),
    transports: text("transports"), // comma-separated
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("credentials_user_idx").on(t.userId)],
);

/** Best result per level. */
export const progress = pgTable(
  "progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    level: text("level").notNull(),
    stars: integer("stars").notNull().default(0),
    bestScore: integer("best_score").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.topic, t.level] })],
);

/**
 * Spaced-repetition review deck (Leitner boxes), one row per skill.
 * box 1–5 → due after 1h / 1d / 3d / 7d / 21d; box 6 = remembered (graduated).
 * misses counts every miss ever, and feeds the weekly challenge.
 */
export const reviewItems = pgTable(
  "review_items",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    itemId: text("item_id").notNull(), // the skill key, e.g. "pp:fare"
    level: text("level"),
    question: jsonb("question"), // last version seen, used if the skill can't be regenerated
    box: integer("box").notNull().default(1),
    misses: integer("misses").notNull().default(0),
    dueAt: timestamp("due_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.topic, t.itemId] }), index("review_due_idx").on(t.userId, t.dueAt)],
);

/** Every finished round — the leaderboard is computed from this. */
export const plays = pgTable(
  "plays",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    level: text("level").notNull(),
    score: integer("score").notNull(),
    xp: integer("xp").notNull(),
    playedAt: timestamp("played_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("plays_played_at_idx").on(t.playedAt)],
);

/** One shared challenge per ISO week, frozen on first request so both players get the same questions. */
export const weeklyChallenges = pgTable(
  "weekly_challenges",
  {
    week: text("week").notNull(), // e.g. "2026-W47"
    topic: text("topic").notNull(),
    questions: jsonb("questions").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.week, t.topic] })],
);

export type User = typeof users.$inferSelect;
