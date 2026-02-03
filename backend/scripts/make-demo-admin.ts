/**
 * demoアカウントを管理者に昇格
 */
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../../.env.local') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 demo@example.comを管理者に昇格中...\n');

  const user = await prisma.user.update({
    where: { email: 'demo@example.com' },
    data: { isAdmin: true },
  });

  console.log('✅ 完了！\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`👤 ${user.name} (${user.email})`);
  console.log(`🔐 管理者権限: ${user.isAdmin ? 'あり' : 'なし'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('このアカウントで以下のページにアクセスできます:');
  console.log('- http://localhost:5173/admin (管理画面)');
  console.log('- http://localhost:5173/admin/checkin (QR受付スキャナー)');
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
