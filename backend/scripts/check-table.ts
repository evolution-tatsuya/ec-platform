import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../../.env.local') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRaw`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'site_settings'
  ` as any[];

  console.log('site_settings テーブルの構造:');
  console.table(result);
}

main().finally(() => prisma.$disconnect());
