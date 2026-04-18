// ===== 管理者アカウント作成スクリプト =====
// 目的: 開発用の管理者アカウントを作成

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const email = 'admin@ec-platform.local';
    const password = 'TestAdmin2025!';

    // 既存のアカウントを確認
    const existingAdmin = await prisma.user.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      console.log('✅ 管理者アカウントは既に存在します');
      console.log(`メールアドレス: ${email}`);
      console.log(`パスワード: ${password}`);
      console.log(`管理者権限: ${existingAdmin.isAdmin ? 'はい' : 'いいえ'}`);
      return;
    }

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10);

    // 管理者アカウントを作成
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: 'システム管理者',
        isAdmin: true, // 管理者フラグ
      },
    });

    console.log('✅ 管理者アカウントを作成しました！');
    console.log('');
    console.log('==========================================');
    console.log('📧 メールアドレス: admin@ec-platform.local');
    console.log('🔑 パスワード: TestAdmin2025!');
    console.log('==========================================');
    console.log('');
    console.log('このアカウントで http://localhost:3250/admin/login からログインできます');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
