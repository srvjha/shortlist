CREATE TABLE "pdf_downloads" (
	"user_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pdf_downloads_user_id_version_id_pk" PRIMARY KEY("user_id","version_id")
);
--> statement-breakpoint
ALTER TABLE "promo_codes" ALTER COLUMN "plan" SET DEFAULT 'pro';--> statement-breakpoint
ALTER TABLE "pdf_downloads" ADD CONSTRAINT "pdf_downloads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;