// ===== 管理者アカウント作成スクリプト =====
import { prisma } from '../src/config/prisma';
import bcrypt from 'bcrypt';

async function createAdmin() {
  const email = 'admin@ec-platform.local';
  const password = 'TestAdmin2025!';
  const name = '管理者';

  // 既存確認
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('✅ 管理者アカウントは既に存在します');
    console.log({
      id: existing.id,
      email: existing.email,
      isAdmin: existing.isAdmin,
    });
    return;
  }

  // パスワードハッシュ化
  const passwordHash = await bcrypt.hash(password, 10);

  // 管理者作成
  const admin = await prisma.user.create({
    data: {
      email,
      password: passwordHash,
      name,
      isAdmin: true,
    },
  });

  console.log('✅ 管理者アカウント作成成功');
  console.log({
    id: admin.id,
    email: admin.email,
    name: admin.name,
    isAdmin: admin.isAdmin,
  });
}

createAdmin()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error('❌ エラー:', error);
    prisma.$disconnect();
    process.exit(1);
  });
