CREATE TABLE "weekly_challenges" (
	"week" text NOT NULL,
	"topic" text NOT NULL,
	"questions" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_challenges_week_topic_pk" PRIMARY KEY("week","topic")
);
--> statement-breakpoint
ALTER TABLE "review_items" ADD COLUMN "level" text;--> statement-breakpoint
ALTER TABLE "review_items" ADD COLUMN "question" jsonb;--> statement-breakpoint
ALTER TABLE "review_items" ADD COLUMN "misses" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "review_items" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "review_due_idx" ON "review_items" USING btree ("user_id","due_at");