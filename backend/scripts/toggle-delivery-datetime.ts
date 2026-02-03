/**
 * 配達日時指定機能のON/OFF切り替えスクリプト
 *
 * 使い方:
 * - ON にする: npx tsx scripts/toggle-delivery-datetime.ts on
 * - OFF にする: npx tsx scripts/toggle-delivery-datetime.ts off
 * - 現在の状態確認: npx tsx scripts/toggle-delivery-datetime.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// .env.localを読み込む
config({ path: resolve(__dirname, '../../.env.local') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();

  // 現在の設定を取得
  let settings = await prisma.siteSettings.findFirst();

  if (!settings) {
    console.log('⚠️  設定が見つかりません。デフォルト設定を作成します...');
    settings = await prisma.siteSettings.create({
      data: {
        enableDeliveryDateTime: true,
        bankTransferDiscount: 0.036,
      },
    });
    console.log('✅ デフォルト設定を作成しました');
  }

  if (!command) {
    // 現在の状態を表示
    console.log('\n==== 現在のサイト設定 ====');
    console.log(`配達日時指定: ${settings.enableDeliveryDateTime ? 'ON ✅' : 'OFF ❌'}`);
    console.log(`銀行振込割引: ${(settings.bankTransferDiscount * 100).toFixed(1)}%`);
    console.log('==========================\n');
    console.log('💡 使い方:');
    console.log('  ON にする:  npx tsx scripts/toggle-delivery-datetime.ts on');
    console.log('  OFF にする: npx tsx scripts/toggle-delivery-datetime.ts off');
    return;
  }

  if (command === 'on') {
    if (settings.enableDeliveryDateTime) {
      console.log('ℹ️  配達日時指定は既にONになっています');
      return;
    }

    await prisma.siteSettings.update({
      where: { id: settings.id },
      data: { enableDeliveryDateTime: true },
    });

    console.log('✅ 配達日時指定を ON にしました');
    console.log('   → 顧客は配達希望日・時間帯を選択できます');
  } else if (command === 'off') {
    if (!settings.enableDeliveryDateTime) {
      console.log('ℹ️  配達日時指定は既にOFFになっています');
      return;
    }

    await prisma.siteSettings.update({
      where: { id: settings.id },
      data: { enableDeliveryDateTime: false },
    });

    console.log('✅ 配達日時指定を OFF にしました');
    console.log('   → 顧客には配達日時選択が表示されません');
  } else {
    console.error('❌ エラー: 無効なコマンドです');
    console.log('💡 使い方:');
    console.log('  ON にする:  npx tsx scripts/toggle-delivery-datetime.ts on');
    console.log('  OFF にする: npx tsx scripts/toggle-delivery-datetime.ts off');
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('❌ エラーが発生しました:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
