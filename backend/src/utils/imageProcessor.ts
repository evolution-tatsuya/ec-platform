/**
 * 画像処理ユーティリティ（sharp + WebP変換）
 *
 * 機能:
 * - WebP変換（品質80%）
 * - リサイズ（サムネイル200x200、一覧400x400、詳細800x800）
 * - 88%容量削減を目標
 */

import sharp from 'sharp';

/**
 * 画像サイズ定義
 */
export enum ImageSize {
  THUMBNAIL = 200, // サムネイル
  LIST = 400,      // 一覧用
  DETAIL = 800,    // 詳細用
}

/**
 * 画像をWebPに変換してリサイズ
 * @param imageBuffer 元画像のバッファ
 * @param size リサイズ後のサイズ（ピクセル）
 * @param quality 品質（0-100、デフォルト80）
 * @returns WebP形式の画像バッファ
 */
export async function convertToWebP(
  imageBuffer: Buffer,
  size?: number,
  quality: number = 80
): Promise<Buffer> {
  let sharpInstance = sharp(imageBuffer);

  // リサイズ指定がある場合
  if (size) {
    sharpInstance = sharpInstance.resize(size, size, {
      fit: 'cover',
      position: 'center',
    });
  }

  // WebP変換
  return await sharpInstance
    .webp({
      quality,
      effort: 4, // 圧縮効率（0-6、4は標準）
    })
    .toBuffer();
}

/**
 * 複数サイズの画像を生成
 * @param imageBuffer 元画像のバッファ
 * @param quality 品質（0-100、デフォルト80）
 * @returns サイズ別の画像バッファ
 */
export async function generateMultipleSizes(
  imageBuffer: Buffer,
  quality: number = 80
): Promise<{
  thumbnail: Buffer;
  list: Buffer;
  detail: Buffer;
}> {
  const [thumbnail, list, detail] = await Promise.all([
    convertToWebP(imageBuffer, ImageSize.THUMBNAIL, quality),
    convertToWebP(imageBuffer, ImageSize.LIST, quality),
    convertToWebP(imageBuffer, ImageSize.DETAIL, quality),
  ]);

  return { thumbnail, list, detail };
}

/**
 * 画像のメタデータを取得
 * @param imageBuffer 画像のバッファ
 * @returns 画像のメタデータ
 */
export async function getImageMetadata(imageBuffer: Buffer): Promise<{
  width: number;
  height: number;
  format: string;
  size: number;
}> {
  const metadata = await sharp(imageBuffer).metadata();

  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || 'unknown',
    size: imageBuffer.length,
  };
}

/**
 * 画像形式のバリデーション
 * @param imageBuffer 画像のバッファ
 * @returns 有効な画像形式かどうか
 */
export async function validateImageFormat(imageBuffer: Buffer): Promise<boolean> {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    // sharpがWebPに変換可能な形式は広く受け付ける（iPhoneのHEIC等も許可）。
    const validFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif', 'heif', 'heic', 'avif', 'tiff', 'svg'];
    return validFormats.includes(metadata.format || '');
  } catch (error) {
    return false;
  }
}
