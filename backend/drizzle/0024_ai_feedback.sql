ALTER TABLE "ai_runs" ADD COLUMN "helpful" boolean;--> statement-breakpoint
ALTER TABLE "ai_runs" ADD COLUMN "feedback" text;--> statement-breakpoint
ALTER TABLE "ai_runs" ADD COLUMN "feedback_contact_ok" boolean;--> statement-breakpoint
ALTER TABLE "ai_runs" ADD COLUMN "feedback_at" timestamp with time zone;