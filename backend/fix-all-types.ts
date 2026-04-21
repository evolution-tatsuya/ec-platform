import * as fs from 'fs';
import * as path from 'path';

const orderControllerPath = 'src/controllers/orderController.ts';
const productControllerPath = 'src/controllers/productController.ts';
const adminEventControllerPath = 'src/controllers/adminEventController.ts';
const configMulterPath = 'src/config/multer.ts';
const adminDashboardPath = 'src/controllers/adminDashboardController.ts';
const topPageControllerPath = 'src/controllers/topPageController.ts';
const indexPath = 'src/index.ts';

// orderController.ts にヘルパー関数を追加
if (fs.existsSync(orderControllerPath)) {
  let content = fs.readFileSync(orderControllerPath, 'utf-8');

  if (!content.includes('const getStringParam')) {
    // import文の後に追加
    content = content.replace(
      /(import[\s\S]*?from.*?;\n)/,
      `$1
/**
 * ヘルパー関数: クエリパラメータからstring型を取得
 */
const getStringParam = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) return value[0];
  return value;
};

`
    );
  }

  // req.query のstring型エラーを修正
  content = content.replace(/const \{ page = '1', limit = '20'(.*?) \} = req\.query;/g, (match) => {
    return match.replace(/ = req\.query/, '');
  });

  fs.writeFileSync(orderControllerPath, content);
  console.log('✓ orderController.ts 修正完了');
}

// productController.ts も同様に修正
if (fs.existsSync(productControllerPath)) {
  let content = fs.readFileSync(productControllerPath, 'utf-8');

  if (!content.includes('const getStringParam')) {
    content = content.replace(
      /(import[\s\S]*?from.*?;\n)/,
      `$1
/**
 * ヘルパー関数: クエリパラメータからstring型を取得
 */
const getStringParam = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) return value[0];
  return value;
};

`
    );
  }

  fs.writeFileSync(productControllerPath, content);
  console.log('✓ productController.ts 修正完了');
}

// adminEventController.ts 未使用変数修正
if (fs.existsSync(adminEventControllerPath)) {
  let content = fs.readFileSync(adminEventControllerPath, 'utf-8');

  // dateFrom, dateTo を削除
  content = content.replace(/const \{ dateFrom, dateTo \} = getStringParams\(req\.query\);/, '// const { dateFrom, dateTo } = getStringParams(req.query); // TODO: 未使用');

  // formTemplate を削除
  content = content.replace(/const formTemplate = await prisma\.eventFormTemplate\.findUnique/, '// const formTemplate = await prisma.eventFormTemplate.findUnique // TODO: 未使用');

  fs.writeFileSync(adminEventControllerPath, content);
  console.log('✓ adminEventController.ts 修正完了');
}

// config/multer.ts 未使用req修正
if (fs.existsSync(configMulterPath)) {
  let content = fs.readFileSync(configMulterPath, 'utf-8');
  content = content.replace(/callback: \(req, file, callback\)/, 'callback: (_req, file, callback)');
  fs.writeFileSync(configMulterPath, content);
  console.log('✓ config/multer.ts 修正完了');
}

// adminDashboard 未使用req修正
if (fs.existsSync(adminDashboardPath)) {
  let content = fs.readFileSync(adminDashboardPath, 'utf-8');
  content = content.replace(/export const getDashboardStats = async \(req: Request/, 'export const getDashboardStats = async (_req: Request');
  fs.writeFileSync(adminDashboardPath, content);
  console.log('✓ adminDashboardController.ts 修正完了');
}

// topPageController 未使用req修正
if (fs.existsSync(topPageControllerPath)) {
  let content = fs.readFileSync(topPageControllerPath, 'utf-8');
  content = content.replace(/export const getTopPageData = async \(req: Request/, 'export const getTopPageData = async (_req: Request');
  fs.writeFileSync(topPageControllerPath, content);
  console.log('✓ topPageController.ts 修正完了');
}

// index.ts 未使用req修正
if (fs.existsSync(indexPath)) {
  let content = fs.readFileSync(indexPath, 'utf-8');
  content = content.replace(/app\.use\(\(req, res, next\) => \{/g, 'app.use((_req, res, next) => {');
  content = content.replace(/app\.use\(\(req, res\) => \{/g, 'app.use((_req, res) => {');
  fs.writeFileSync(indexPath, content);
  console.log('✓ index.ts 修正完了');
}

console.log('\n全修正完了');
