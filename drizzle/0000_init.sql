CREATE TABLE "credentials" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"public_key" text NOT NULL,
	"counter" integer DEFAULT 0 NOT NULL,
	"transports" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plays" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"topic" text NOT NULL,
	"level" text NOT NULL,
	"score" integer NOT NULL,
	"xp" integer NOT NULL,
	"played_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "progress" (
	"user_id" text NOT NULL,
	"topic" text NOT NULL,
	"level" text NOT NULL,
	"stars" integer DEFAULT 0 NOT NULL,
	"best_score" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "progress_user_id_topic_level_pk" PRIMARY KEY("user_id","topic","level")
);
--> statement-breakpoint
CREATE TABLE "review_items" (
	"user_id" text NOT NULL,
	"topic" text NOT NULL,
	"item_id" text NOT NULL,
	"box" integer DEFAULT 1 NOT NULL,
	"due_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_items_user_id_topic_item_id_pk" PRIMARY KEY("user_id","topic","item_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"avatar_url" text,
	"recovery_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plays" ADD CONSTRAINT "plays_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress" ADD CONSTRAINT "progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_items" ADD CONSTRAINT "review_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credentials_user_idx" ON "credentials" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "plays_played_at_idx" ON "plays" USING btree ("played_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_name_lower_idx" ON "users" USING btree (lower("name"));