-- Rename existing columns first
ALTER TABLE "orders" RENAME COLUMN "shippingAddress" TO "shipping_address";
ALTER TABLE "orders" RENAME COLUMN "trackingNumber" TO "tracking_number";

-- AlterTable with default values, then remove defaults
ALTER TABLE "orders" ADD COLUMN "customer_name" TEXT NOT NULL DEFAULT 'Unknown';
ALTER TABLE "orders" ADD COLUMN "customer_email" TEXT NOT NULL DEFAULT 'unknown@example.com';
ALTER TABLE "orders" ADD COLUMN "customer_phone" TEXT NOT NULL DEFAULT '000-0000-0000';
ALTER TABLE "orders" ADD COLUMN "shipping_postal_code" TEXT;
ALTER TABLE "orders" ADD COLUMN "carrier" TEXT;
ALTER TABLE "orders" ADD COLUMN "shipped_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN "cancel_reason" TEXT;
ALTER TABLE "orders" ADD COLUMN "cancelled_at" TIMESTAMP(3);

-- Update existing rows with user data
UPDATE "orders" SET
  "customer_name" = u.name,
  "customer_email" = u.email,
  "customer_phone" = COALESCE(u."default_phone", '000-0000-0000')
FROM "users" u
WHERE "orders"."userId" = u.id;

-- Remove default values (for new schema enforcement)
ALTER TABLE "orders" ALTER COLUMN "customer_name" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "customer_email" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "customer_phone" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "orders_customer_email_idx" ON "orders"("customer_email");
