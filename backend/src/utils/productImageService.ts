/**
 * 商品画像サービス
 *
 * 複数画像の保存・削除・URL生成をまとめたユーティリティ。
 * 1つの論理画像 = thumbnail/list/detail の3サイズ（同じ order を共有）。
 * R2キー: products/{productId}/{imageId}/{sizeType}.webp （imageIdで複数画像を区別）
 */

import type { Prisma, PrismaClient, ProductImage } from '@prisma/client';
import { uploadFile, deleteFile, generateSignedUrl } from './r2Client';
import { generateMultipleSizes, validateImageFormat } from './imageProcessor';

type TxClient = Prisma.TransactionClient | PrismaClient;

const SIZE_TYPES = ['thumbnail', 'list', 'detail'] as const;

/**
 * 単純なユニークID（画像ごとのフォルダ名に使用）
 * Date.now + index + ランダムで衝突を避ける
 */
const genImageId = (index: number): string =>
  `${Date.now().toString(36)}-${index}-${Math.floor(Math.random() * 1e6).toString(36)}`;

/**
 * 複数の画像ファイルを処理してR2に保存し、ProductImageレコードを作成する。
 * @param tx Prismaトランザクションクライアント
 * @param productId 対象商品ID
 * @param files アップロードされたファイル群（Buffer）
 * @param startOrder 採番の開始order（既存画像の後ろに追加する場合に使用）
 */
export async function saveProductImages(
  tx: TxClient,
  productId: string,
  files: { buffer: Buffer }[],
  startOrder = 0,
): Promise<void> {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    const isValid = await validateImageFormat(file.buffer);
    if (!isValid) {
      throw Object.assign(
        new Error('サポートされていない画像形式です（JPEG, PNG, WebPのみ）'),
        { statusCode: 400 },
      );
    }

    const sizes = await generateMultipleSizes(file.buffer);
    const imageId = genImageId(i);
    const order = startOrder + i;

    for (const sizeType of SIZE_TYPES) {
      const imageKey = `products/${productId}/${imageId}/${sizeType}.webp`;
      await uploadFile(imageKey, sizes[sizeType], 'image/webp');
      await tx.productImage.create({
        data: { productId, imageKey, sizeType, order },
      });
    }
  }
}

/**
 * 指定商品の全画像（R2オブジェクト + DBレコード）を削除する。
 */
export async function deleteAllProductImages(
  tx: TxClient,
  productId: string,
): Promise<void> {
  const existing = await tx.productImage.findMany({ where: { productId } });
  for (const img of existing) {
    try {
      await deleteFile(img.imageKey);
    } catch {
      // R2側の削除失敗はDB削除を止めない（孤児オブジェクトは許容）
    }
  }
  await tx.productImage.deleteMany({ where: { productId } });
}

/**
 * ProductImage行（3サイズ×N画像）を、order順の論理画像リストに畳み込み、
 * 各サイズの署名付きURLを付与して返す。
 * @returns [{ id(=imageIdフォルダ), order, thumbnailUrl, listUrl, detailUrl }]
 */
export async function buildProductImageList(
  rows: ProductImage[],
): Promise<
  {
    id: string;
    order: number;
    thumbnailUrl: string;
    listUrl: string;
    detailUrl: string;
  }[]
> {
  // imageKey: products/{productId}/{imageId}/{sizeType}.webp
  // 旧形式(products/{productId}/{sizeType}.webp)は imageId部分が無いので order+sizeType で束ねる
  const groups = new Map<string, Partial<Record<string, ProductImage>>>();

  for (const row of rows) {
    const parts = row.imageKey.split('/');
    // 新形式: [..., imageId, sizeType.webp] / 旧形式: [..., sizeType.webp]
    const hasImageId = parts.length >= 4;
    const groupKey = hasImageId ? `${row.order}:${parts[parts.length - 2]}` : `${row.order}`;
    const current = groups.get(groupKey) || {};
    current[row.sizeType] = row;
    groups.set(groupKey, current);
  }

  const result: {
    id: string;
    order: number;
    thumbnailUrl: string;
    listUrl: string;
    detailUrl: string;
  }[] = [];

  for (const [groupKey, sizes] of groups) {
    const anyRow = sizes.thumbnail || sizes.list || sizes.detail;
    if (!anyRow) continue;

    const [thumbnailUrl, listUrl, detailUrl] = await Promise.all([
      sizes.thumbnail ? generateSignedUrl(sizes.thumbnail.imageKey) : Promise.resolve(''),
      sizes.list ? generateSignedUrl(sizes.list.imageKey) : Promise.resolve(''),
      sizes.detail ? generateSignedUrl(sizes.detail.imageKey) : Promise.resolve(''),
    ]);

    result.push({
      id: groupKey,
      order: anyRow.order,
      thumbnailUrl,
      listUrl: listUrl || detailUrl || thumbnailUrl,
      detailUrl: detailUrl || listUrl || thumbnailUrl,
    });
  }

  result.sort((a, b) => a.order - b.order);
  return result;
}

/**
 * order順の表示用URL文字列配列（detail優先）。
 * 既存の images: string[] 消費側（カード等）との互換用。
 */
export async function buildProductImageUrls(rows: ProductImage[]): Promise<string[]> {
  const list = await buildProductImageList(rows);
  return list.map((img) => img.detailUrl).filter(Boolean);
}
