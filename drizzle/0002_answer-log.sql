CREATE TABLE "answers" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"topic" text NOT NULL,
	"level" text,
	"mode" text NOT NULL,
	"skill" text NOT NULL,
	"kind" text NOT NULL,
	"verdict" text NOT NULL,
	"retry" integer DEFAULT 0 NOT NULL,
	"ms" integer,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "answers_user_idx" ON "answers" USING btree ("user_id","answered_at");--> statement-breakpoint
CREATE INDEX "answers_skill_idx" ON "answers" USING btree ("topic","skill");