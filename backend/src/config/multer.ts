/**
 * Multer設定
 * 画像アップロード用のメモリストレージ設定
 */

import multer from 'multer';

// メモリストレージ設定（Buffer形式で受け取る）
const storage = multer.memoryStorage();

// ファイルフィルター（画像のみ許可）
const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) => {
  // 画像MIMEタイプのチェック
  if (file.mimetype.startsWith('image/')) {
    callback(null, true);
  } else {
    callback(new Error('画像ファイルのみアップロード可能です'));
  }
};

// Multerインスタンス
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});
