ALTER TABLE "payments" ADD COLUMN "captured_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "refunded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "refunded_paise" integer;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "razorpay_refund_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_razorpayRefundId_unique" UNIQUE("razorpay_refund_id");--> statement-breakpoint
UPDATE "payments" SET "captured_at" = "updated_at" WHERE "status" = 'captured';