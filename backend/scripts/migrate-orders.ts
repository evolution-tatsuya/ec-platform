/**
 * 注文テーブルマイグレーションスクリプト
 * 既存のordersテーブルに新しいカラムを追加
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting orders table migration...');

  try {
    // マイグレーションSQLを直接実行
    await prisma.$executeRawUnsafe(`
      -- Rename existing columns first (if they exist)
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='shippingAddress') THEN
          ALTER TABLE "orders" RENAME COLUMN "shippingAddress" TO "shipping_address";
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='trackingNumber') THEN
          ALTER TABLE "orders" RENAME COLUMN "trackingNumber" TO "tracking_number";
        END IF;
      END $$;
    `);

    console.log('✅ Renamed existing columns');

    // 新しいカラムを追加（存在しない場合のみ）
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='customer_name') THEN
          ALTER TABLE "orders" ADD COLUMN "customer_name" TEXT NOT NULL DEFAULT 'Unknown';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='customer_email') THEN
          ALTER TABLE "orders" ADD COLUMN "customer_email" TEXT NOT NULL DEFAULT 'unknown@example.com';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='customer_phone') THEN
          ALTER TABLE "orders" ADD COLUMN "customer_phone" TEXT NOT NULL DEFAULT '000-0000-0000';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='shipping_postal_code') THEN
          ALTER TABLE "orders" ADD COLUMN "shipping_postal_code" TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='carrier') THEN
          ALTER TABLE "orders" ADD COLUMN "carrier" TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='shipped_at') THEN
          ALTER TABLE "orders" ADD COLUMN "shipped_at" TIMESTAMP(3);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='cancel_reason') THEN
          ALTER TABLE "orders" ADD COLUMN "cancel_reason" TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='cancelled_at') THEN
          ALTER TABLE "orders" ADD COLUMN "cancelled_at" TIMESTAMP(3);
        END IF;
      END $$;
    `);

    console.log('✅ Added new columns');

    // 既存データを更新
    await prisma.$executeRawUnsafe(`
      UPDATE "orders" SET
        "customer_name" = COALESCE(u.name, 'Unknown'),
        "customer_email" = u.email,
        "customer_phone" = COALESCE(u."default_phone", '000-0000-0000')
      FROM "users" u
      WHERE "orders"."userId" = u.id
        AND ("orders"."customer_name" = 'Unknown' OR "orders"."customer_email" = 'unknown@example.com');
    `);

    console.log('✅ Updated existing rows with user data');

    // デフォルト値を削除（今後のINSERTで必須にする）
    await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ALTER COLUMN "customer_name" DROP DEFAULT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ALTER COLUMN "customer_email" DROP DEFAULT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ALTER COLUMN "customer_phone" DROP DEFAULT`);

    console.log('✅ Removed default values');

    // インデックス作成（存在しない場合のみ）
    try {
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "orders_customer_email_idx" ON "orders"("customer_email")`);
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }

    console.log('✅ Created indexes');

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
