import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 テストデータ作成開始...');

  // 管理者作成
  const hashedPassword = await bcrypt.hash('TestAdmin2025!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ec-platform.local' },
    update: {},
    create: {
      email: 'admin@ec-platform.local',
      password: hashedPassword,
      name: 'テスト管理者',
      isAdmin: true,
    },
  });
  console.log('✅ 管理者作成完了');

  // 商品作成
  const product = await prisma.product.upsert({
    where: { slug: 'test-product-1' },
    update: {},
    create: {
      name: 'テスト商品1',
      slug: 'test-product-1',
      price: 10000,
      description: 'E2Eテスト用商品',
      productType: 'physical',
      isActive: true,
    },
  });
  console.log('✅ 商品作成完了');

  // 在庫追加
  await prisma.inventoryLog.create({
    data: {
      productId: product.id,
      quantity: 100,
      type: 'purchase',
      note: '初期在庫',
    },
  });

  // 注文作成（20件）
  for (let i = 1; i <= 20; i++) {
    await prisma.order.create({
      data: {
        orderNumber: `ORD-2026-${String(i).padStart(6, '0')}`,
        userId: admin.id,
        customerName: `テスト顧客${i}`,
        customerEmail: `customer${i}@test.com`,
        customerPhone: `090-1234-${String(i).padStart(4, '0')}`,
        shippingPostalCode: '100-0001',
        shippingAddress: `東京都千代田区千代田1-1-${i}`,
        totalAmount: 10000 + (i * 1000),
        status: i % 3 === 0 ? 'preparing' : i % 3 === 1 ? 'shipped' : 'pending',
        paymentMethod: i % 3 === 0 ? 'bank_transfer' : i % 3 === 1 ? 'credit_card' : 'bank_transfer',
        items: {
          create: [{
            productId: product.id,
            quantity: i,
            price: 10000,
          }],
        },
      },
    });
  }
  console.log('✅ テストデータ作成完了（注文20件）');
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
