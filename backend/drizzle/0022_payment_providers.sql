CREATE TYPE "public"."payment_provider" AS ENUM('razorpay', 'polar');--> statement-breakpoint
ALTER TABLE "payments" RENAME COLUMN "razorpay_order_id" TO "provider_checkout_id";--> statement-breakpoint
ALTER TABLE "payments" RENAME COLUMN "razorpay_payment_id" TO "provider_payment_id";--> statement-breakpoint
ALTER TABLE "payments" RENAME COLUMN "amount_paise" TO "amount";--> statement-breakpoint
ALTER TABLE "payments" RENAME COLUMN "refunded_paise" TO "refunded_amount";--> statement-breakpoint
ALTER TABLE "payments" RENAME COLUMN "razorpay_refund_id" TO "provider_refund_id";--> statement-breakpoint
ALTER TABLE "payments" RENAME CONSTRAINT "payments_razorpayPaymentId_unique" TO "payments_providerPaymentId_unique";--> statement-breakpoint
ALTER TABLE "payments" RENAME CONSTRAINT "payments_razorpayRefundId_unique" TO "payments_providerRefundId_unique";--> statement-breakpoint
ALTER INDEX "payments_razorpay_order_id_index" RENAME TO "payments_provider_checkout_id_index";--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "provider" "payment_provider" DEFAULT 'razorpay' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" RENAME COLUMN "razorpay_subscription_id" TO "provider_subscription_id";--> statement-breakpoint
ALTER TABLE "subscriptions" RENAME CONSTRAINT "subscriptions_razorpaySubscriptionId_unique" TO "subscriptions_providerSubscriptionId_unique";--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "provider" "payment_provider";--> statement-breakpoint
UPDATE "subscriptions" SET "provider" = 'razorpay' WHERE "provider_subscription_id" IS NOT NULL OR "id" IN (SELECT "subscription_id" FROM "payments" WHERE "subscription_id" IS NOT NULL);
