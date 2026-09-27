import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Initializing development database...');

  // 1. 管理者アカウント作成
  console.log('\n📝 Creating admin account...');
  const hashedPassword = await bcrypt.hash('TestAdmin2025!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ec-platform.local' },
    update: {},
    create: {
      email: 'admin@ec-platform.local',
      password: hashedPassword,
      name: '管理者',
      isAdmin: true,
    },
  });
  console.log('✅ Admin account created:', admin.email);

  // 2. カテゴリー作成
  console.log('\n📝 Creating categories...');
  const categories = [
    { name: '車パーツ', slug: 'car-parts', description: '自動車パーツ・アクセサリー' },
    { name: 'イベント', slug: 'event', description: 'カーイベント・ミーティング' },
    { name: 'デジタル', slug: 'digital', description: 'デジタル商品' },
  ];

  for (const cat of categories) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    console.log(`✅ Category created: ${category.name}`);
  }

  console.log('\n✨ Development database initialization completed!');
  console.log('\n📋 Summary:');
  console.log(`   - Admin: ${admin.email} / TestAdmin2025!`);
  console.log(`   - Categories: ${categories.length} items`);
}

main()
  .catch((e) => {
    console.error('❌ Error during initialization:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
