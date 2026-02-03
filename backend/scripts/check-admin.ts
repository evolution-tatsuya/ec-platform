import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  try {
    // 管理者ユーザーをチェック
    const admins = await prisma.user.findMany({
      where: { isAdmin: true },
      select: { id: true, email: true, name: true, isAdmin: true },
    });

    console.log('=== 既存の管理者ユーザー ===');
    if (admins.length === 0) {
      console.log('管理者ユーザーが見つかりませんでした。作成します...');

      // CLAUDE.mdに記載されているテストアカウントを作成
      const hashedPassword = await bcrypt.hash('TestAdmin2025!', 10);
      const admin = await prisma.user.create({
        data: {
          email: 'admin@ec-platform.local',
          password: hashedPassword,
          name: '管理者',
          isAdmin: true,
        },
      });

      console.log('✅ 管理者ユーザーを作成しました:');
      console.log(`   Email: ${admin.email}`);
      console.log(`   Password: TestAdmin2025!`);
      console.log(`   isAdmin: ${admin.isAdmin}`);
    } else {
      console.log(`管理者ユーザー数: ${admins.length}`);
      admins.forEach((admin, index) => {
        console.log(`\n${index + 1}. ID: ${admin.id}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   Name: ${admin.name}`);
        console.log(`   isAdmin: ${admin.isAdmin}`);
      });
    }

    // 一般ユーザーもチェック
    const customers = await prisma.user.findMany({
      where: { isAdmin: false },
      select: { id: true, email: true, name: true, isAdmin: true },
      take: 5,
    });

    console.log('\n=== 一般ユーザー（最大5件） ===');
    if (customers.length === 0) {
      console.log('一般ユーザーが見つかりませんでした。');
      console.log('一般ユーザーは会員登録ページから作成できます。');
    } else {
      console.log(`一般ユーザー数（表示分）: ${customers.length}`);
      customers.forEach((user, index) => {
        console.log(`\n${index + 1}. ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.name}`);
      });
    }

  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
