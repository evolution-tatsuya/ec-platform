import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('=== ログイン検証テスト ===\n');

  const email = 'demo@example.com';
  const password = 'demo1234';

  // ユーザー取得
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.log('❌ ユーザーが見つかりません');
    return;
  }

  console.log('✅ ユーザー情報:');
  console.log(`   Email: ${user.email}`);
  console.log(`   Name: ${user.name}`);
  console.log(`   isAdmin: ${user.isAdmin}`);
  console.log(`   Password hash: ${user.password.substring(0, 30)}...`);
  console.log();

  // パスワード検証
  console.log('パスワード検証中...');
  console.log(`   入力パスワード: "${password}"`);
  console.log(`   保存されたハッシュ: ${user.password.substring(0, 30)}...`);

  const isValid = await bcrypt.compare(password, user.password);

  console.log();
  if (isValid) {
    console.log('✅ パスワードが一致しました！');
  } else {
    console.log('❌ パスワードが一致しません');

    // テスト: demo1234 でハッシュを作ってみる
    const testHash = await bcrypt.hash('demo1234', 10);
    console.log('\nテスト用に新しいハッシュを生成:');
    console.log(`   新ハッシュ: ${testHash.substring(0, 30)}...`);

    const testMatch = await bcrypt.compare('demo1234', testHash);
    console.log(`   新ハッシュとの照合: ${testMatch ? '✅ 一致' : '❌ 不一致'}`);
  }
}

main()
  .catch((e) => {
    console.error('エラー:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
