import * as fs from 'fs';
import * as path from 'path';

const fixes = [
  // adminCustomerController.ts - _sum undefined チェック (既に修正済み)

  // adminTicketController.ts - default_phone → defaultPhone
  {
    file: 'src/controllers/adminTicketController.ts',
    patterns: [
      { from: /\.default_phone/g, to: '.defaultPhone' },
    ],
  },

  // 未使用変数の削除
  {
    file: 'src/config/multer.ts',
    patterns: [
      { from: /callback: \(req, file, callback\) =>/, to: 'callback: (_req, file, callback) =>' },
    ],
  },
  {
    file: 'src/controllers/adminCustomerController.ts',
    patterns: [
      { from: /export const getCustomerStats = async \(req: Request, res: Response\)/, to: 'export const getCustomerStats = async (_req: Request, res: Response)' },
    ],
  },
  {
    file: 'src/controllers/adminDashboardController.ts',
    patterns: [
      { from: /export const getDashboardStats = async \(req: Request, res: Response\)/, to: 'export const getDashboardStats = async (_req: Request, res: Response)' },
    ],
  },
  {
    file: 'src/controllers/adminEventController.ts',
    patterns: [
      { from: /const \{ dateFrom, dateTo \} = getStringParams\(req\.query\);/, to: '// const { dateFrom, dateTo } = getStringParams(req.query); // TODO: 実装予定' },
      { from: /const formTemplate = await prisma\.eventFormTemplate\.findUnique/, to: '// const formTemplate = await prisma.eventFormTemplate.findUnique // TODO: 使用予定' },
    ],
  },
  {
    file: 'src/controllers/topPageController.ts',
    patterns: [
      { from: /export const getTopPageData = async \(req: Request, res: Response\)/, to: 'export const getTopPageData = async (_req: Request, res: Response)' },
    ],
  },
  {
    file: 'src/index.ts',
    patterns: [
      { from: /app\.use\(\(req, res, next\) => \{/, to: 'app.use((_req, res, next) => {' },
      { from: /app\.use\(\(req, res\) => \{/, to: 'app.use((_req, res) => {' },
    ],
  },
  {
    file: 'src/scripts/createAdmin.ts',
    patterns: [
      { from: /const admin = await prisma\.user\.create/, to: 'await prisma.user.create' },
    ],
  },
];

for (const fix of fixes) {
  const filePath = path.join(process.cwd(), fix.file);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${fix.file} が見つかりません`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  for (const pattern of fix.patterns) {
    if (pattern.from.test(content)) {
      content = content.replace(pattern.from, pattern.to);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ ${fix.file} を修正しました`);
  }
}

console.log('\n修正完了');
