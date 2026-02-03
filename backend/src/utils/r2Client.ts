/**
 * Cloudflare R2クライアント
 *
 * 機能:
 * - 署名付きURL生成（24時間有効）
 * - ファイルアップロード
 * - ファイル削除
 */

import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

/**
 * 署名付きURLを生成（ダウンロード用）
 * @param fileKey R2のファイルキー
 * @param expiresIn 有効期限（秒）デフォルト24時間
 */
export async function generateSignedUrl(
  fileKey: string,
  expiresIn: number = 24 * 60 * 60 // 24時間
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: fileKey,
  });

  return await getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * ファイルをR2にアップロード
 * @param fileKey R2のファイルキー
 * @param fileBuffer ファイルのバッファ
 * @param contentType MIMEタイプ
 */
export async function uploadFile(
  fileKey: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: fileKey,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await r2Client.send(command);
}

/**
 * ファイルをR2から削除
 * @param fileKey R2のファイルキー
 */
export async function deleteFile(fileKey: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: fileKey,
  });

  await r2Client.send(command);
}

export default r2Client;
