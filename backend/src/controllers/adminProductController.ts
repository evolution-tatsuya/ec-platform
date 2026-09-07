// ===== 管理者用商品コントローラー =====
// 目的: 商品のCRUD操作、在庫管理（管理者専用）

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { createError } from '../middleware/errorHandler';
import { deleteFile } from '../utils/r2Client';
import {
  saveProductImages,
  buildProductImageList,
  buildProductImageUrls,
} from '../utils/productImageService';

// ヘルパー関数: string | string[] を string に変換
const getStringParam = (param: string | string[] | undefined): string | undefined => {
  if (Array.isArray(param)) return param[0];
  return param;
};

// DBカテゴリーのslug → フロントのcategoryType(enum: cars/events/digital) に逆変換する。
// フロントの編集フォームはenum値を期待するため、slug(car-parts等)のまま返すと選択肢に一致せず空になる。
const slugToCategoryType = (slug?: string | null): string | undefined => {
  if (!slug) return undefined;
  const REVERSE: Record<string, string> = {
    'car-parts': 'cars', cars: 'cars',
    events: 'events', event: 'events',
    digital: 'digital', 'digital-products': 'digital',
  };
  return REVERSE[slug] || slug;
};

/**
 * 管理者用商品一覧取得
 * GET /api/admin/products
 * クエリパラメータ:
 *   - categoryId: カテゴリーID（オプション）
 *   - productType: 商品タイプ（オプション）
 *   - isActive: アクティブ状態（オプション）
 *   - search: 検索キーワード（オプション）
 *   - sortBy: ソート項目（createdAt, name, price）
 *   - sortOrder: ソート順序（asc, desc）
 *   - page: ページ番号（デフォルト: 1）
 *   - limit: 取得件数（デフォルト: 20）
 */
export const getAdminProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      categoryId,
      categoryType,
      productType,
      isActive,
      search,
      stockStatus,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = '1',
      limit = '20',
    } = req.query;

    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);
    const offset = (pageNum - 1) * limitNum;

    // クエリ条件構築（管理者は全商品を閲覧可能）
    const where: any = {};

    // categoryType（スラッグ）からcategoryIdを解決
    if (categoryType) {
      const category = await prisma.category.findUnique({
        where: { slug: categoryType as string },
      });
      if (category) {
        where.categoryId = category.id;
      }
    } else if (categoryId) {
      // 互換性のためcategoryIdも受け付ける
      where.categoryId = categoryId as string;
    }

    if (productType) {
      where.productType = productType as string;
    }

    // isActiveフィルター
    // 管理者一覧は公開・非公開の両方を表示するため、未指定なら絞り込まない。
    // （非公開にした商品が一覧から消えないようにする）
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { description: { contains: search as string } },
        { slug: { contains: search as string } },
      ];
    }

    // ソート設定
    const orderBy: any = {};
    orderBy[sortBy as string] = sortOrder as string;

    // 商品取得
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          images: true,
        },
        orderBy,
        take: limitNum,
        skip: offset,
      }),
      prisma.product.count({ where }),
    ]);

    // 各商品の在庫数を計算し、categoryTypeと画像URLを追加
    let productsWithStock = await Promise.all(
      products.map(async (product) => {
        const inventorySum = await prisma.inventoryLog.aggregate({
          where: { productId: product.id },
          _sum: { quantity: true },
        });
        // tagsをJSON配列にパース
        const parsedTags = typeof product.tags === 'string' ? JSON.parse(product.tags) : product.tags;
        // 画像を order順の [{id, order, thumbnailUrl, listUrl, detailUrl}] と URL文字列配列に変換
        const productImages = await buildProductImageList(product.images);
        return {
          ...product,
          images: productImages.map((img) => img.detailUrl), // 互換: images: string[]
          productImages, // 管理UI用の詳細（並べ替え・削除に使用）
          tags: parsedTags,
          categoryType: slugToCategoryType(product.category?.slug), // enum値に変換して返す
          currentStock: inventorySum._sum?.quantity || 0,
        };
      })
    );

    // 在庫状況フィルター（在庫数計算後にフィルタリング）
    if (stockStatus) {
      productsWithStock = productsWithStock.filter((product) => {
        const stock = product.currentStock;
        if (stockStatus === 'out_of_stock') return stock === 0;
        if (stockStatus === 'low_stock') return stock > 0 && stock < 10;
        if (stockStatus === 'in_stock') return stock >= 10;
        return true;
      });
    }

    console.log(`=== 商品一覧取得 ===`);
    console.log(`返却件数: ${productsWithStock.length}件`);
    console.log(`総件数: ${total}件`);
    console.log(`最初の商品名: ${productsWithStock[0]?.name || 'なし'}`);

    return res.json({
      success: true,
      products: productsWithStock,
      pagination: {
        total: stockStatus ? productsWithStock.length : total,
        page: pageNum,
        limit: limitNum,
        totalPages: stockStatus ? Math.ceil(productsWithStock.length / limitNum) : Math.ceil(total / limitNum),
        hasMore: stockStatus ? false : (offset + limitNum < total),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * 商品登録
 * POST /api/admin/products
 * Body: { name, slug, description, price, categoryId, productType, preparationDays, allowWeekendDelivery, initialStock }
 */
export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // フロントは 'images'（複数）で送信する
    const uploadedFiles = (req.files as Express.Multer.File[] | undefined) || [];

    console.log('=== 商品作成API リクエストデバッグ ===');
    console.log('req.body:', req.body);
    console.log('画像枚数:', uploadedFiles.length);

    const {
      name,
      slug: requestSlug,
      description,
      price,
      categoryId: requestCategoryId,
      categoryType,
      productType,
      preparationDays = 3,
      allowWeekendDelivery = true,
      initialStock = 0,
    } = req.body;

    // multipart/form-dataの場合、全て文字列として送信されるので変換
    const parsedAllowWeekendDelivery = typeof allowWeekendDelivery === 'string'
      ? allowWeekendDelivery === 'true'
      : allowWeekendDelivery;

    // categoryType（cars/events/digital 等）からcategoryIdを解決。
    // フロントのcategoryTypeとDBのslugを対応付け、存在しなければ自動作成する。
    let categoryId = requestCategoryId;
    if (categoryType && !categoryId) {
      // フロントのcategoryType → DBカテゴリー定義のマップ
      const CATEGORY_MAP: Record<string, { slugs: string[]; name: string; slug: string }> = {
        cars: { slugs: ['cars', 'car-parts'], name: '車パーツ', slug: 'car-parts' },
        events: { slugs: ['events', 'event'], name: 'イベント', slug: 'events' },
        digital: { slugs: ['digital', 'digital-products'], name: 'デジタル', slug: 'digital' },
      };
      const def = CATEGORY_MAP[categoryType as string];
      // 対応する候補slugのいずれかで既存カテゴリーを探す
      const candidateSlugs = def ? def.slugs : [categoryType as string];
      let category = await prisma.category.findFirst({
        where: { slug: { in: candidateSlugs } },
      });
      // 無ければ自動作成（運営初期にカテゴリー未整備でも商品登録できるように）
      if (!category && def) {
        category = await prisma.category.create({
          data: { name: def.name, slug: def.slug, description: `${def.name}カテゴリー` },
        });
      }
      if (category) {
        categoryId = category.id;
      } else {
        return next(createError('指定されたカテゴリーが存在しません', 404));
      }
    }

    // slugの自動生成（フロントエンドから送信されない場合）
    let slug = requestSlug;
    if (!slug && name) {
      // 商品名から簡易的なslugを生成（小文字化、スペースをハイフンに変換、タイムスタンプ追加）
      const baseSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      slug = `${baseSlug}-${Date.now()}`;
    }

    // バリデーション
    if (!name || !categoryId || !productType) {
      return next(createError('必須項目が不足しています', 400));
    }

    if (!slug) {
      return next(createError('スラッグの生成に失敗しました', 400));
    }

    if (price < 0) {
      return next(createError('価格は0以上である必要があります', 400));
    }

    // スラッグ重複チェック
    const existingProduct = await prisma.product.findUnique({
      where: { slug },
    });

    if (existingProduct) {
      return next(createError('このスラッグは既に使用されています', 400));
    }

    // カテゴリー存在チェック（既にcategoryTypeから解決済みの場合はスキップ）
    if (!categoryType) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        return next(createError('指定されたカテゴリーが存在しません', 404));
      }
    }

    // トランザクション処理
    const product = await prisma.$transaction(async (tx) => {
      // 商品作成
      const newProduct = await tx.product.create({
        data: {
          name,
          slug,
          description,
          price: parseInt(price, 10),
          categoryId,
          productType,
          preparationDays: parseInt(preparationDays, 10),
          allowWeekendDelivery: parsedAllowWeekendDelivery,
          isActive: true,
        },
        include: {
          category: true,
        },
      });

      // 画像がアップロードされている場合、複数画像を保存
      if (uploadedFiles.length > 0) {
        await saveProductImages(tx, newProduct.id, uploadedFiles);
      }

      // 初期在庫がある場合、在庫ログ作成
      if (initialStock > 0) {
        await tx.inventoryLog.create({
          data: {
            productId: newProduct.id,
            quantity: parseInt(initialStock, 10),
            type: 'purchase',
            note: '初期在庫登録',
          },
        });
      }

      return newProduct;
    });

    console.log('=== 商品作成成功 ===');
    console.log('product:', product);

    return res.status(201).json({
      success: true,
      product,
      message: '商品を登録しました',
    });
  } catch (error) {
    console.error('=== 商品作成エラー ===');
    console.error('error:', error);
    return next(error);
  }
};

/**
 * 商品詳細取得
 * GET /api/admin/products/:id
 */
export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req.params.id);
    if (!id) return next(createError('商品IDが必要です', 400));

    // 商品取得
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: true,
      },
    });

    if (!product) {
      return next(createError('商品が見つかりません', 404));
    }

    // 在庫数を計算
    const inventorySum = await prisma.inventoryLog.aggregate({
      where: { productId: id },
      _sum: { quantity: true },
    });

    // tagsをJSON配列にパース
    const parsedTags = typeof product.tags === 'string' ? JSON.parse(product.tags) : product.tags;
    const productImages = await buildProductImageList(product.images);

    return res.json({
      success: true,
      product: {
        ...product,
        images: productImages.map((img) => img.detailUrl),
        productImages,
        categoryType: slugToCategoryType(product.category?.slug), // enum値に変換（編集フォームの必須項目）
        tags: parsedTags,
        currentStock: inventorySum._sum?.quantity || 0,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * 商品更新
 * PUT /api/admin/products/:id
 * Body: { name, slug, description, price, categoryId, productType, preparationDays, allowWeekendDelivery, isActive }
 */
export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // フロントは新規画像を 'images'（複数）で送信する
    const uploadedFiles = (req.files as Express.Multer.File[] | undefined) || [];

    const id = getStringParam(req.params.id);
    if (!id) return next(createError('商品IDが必要です', 400));

    const {
      name,
      slug,
      description,
      price,
      categoryId,
      categoryType,
      productType,
      externalUrl,
      preparationDays,
      allowWeekendDelivery,
      isActive,
      tags,
      existingImages, // 残す既存画像の [{ id, order }] をJSON文字列で受け取る（並べ替え・削除に対応）
    } = req.body;

    // 商品存在チェック
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return next(createError('商品が見つかりません', 404));
    }

    // スラッグ重複チェック（自分以外）
    if (slug && slug !== existingProduct.slug) {
      const duplicateSlug = await prisma.product.findUnique({
        where: { slug },
      });

      if (duplicateSlug) {
        return next(createError('このスラッグは既に使用されています', 400));
      }
    }

    // categoryType（スラッグ）からcategoryIdを解決（createProductと同様のロジック）
    let resolvedCategoryId = categoryId;
    if (categoryType && !categoryId) {
      const category = await prisma.category.findUnique({
        where: { slug: categoryType as string },
      });
      if (category) {
        resolvedCategoryId = category.id;
      } else {
        return next(createError('指定されたカテゴリーが存在しません', 404));
      }
    }

    // カテゴリー存在チェック
    if (resolvedCategoryId) {
      const category = await prisma.category.findUnique({
        where: { id: resolvedCategoryId },
      });

      if (!category) {
        return next(createError('指定されたカテゴリーが存在しません', 404));
      }
    }

    // ===== 画像の更新処理 =====
    // existingImages(残す既存画像) が送られてきた場合のみ画像を再構成する。
    // 未送信(フィールド無し)の場合は画像に触れない（他項目だけの更新を壊さない）。
    if (existingImages !== undefined || uploadedFiles.length > 0) {
      // 残す既存画像: [{ id: '<order>:<imageId>' | '<order>', order: number }]
      let keep: { id: string; order: number }[] = [];
      if (existingImages) {
        try {
          keep = typeof existingImages === 'string' ? JSON.parse(existingImages) : existingImages;
        } catch {
          keep = [];
        }
      }

      const currentRows = await prisma.productImage.findMany({ where: { productId: id } });

      // 論理画像ごとにグルーピング（buildProductImageListと同じキー規則）
      const keepIds = new Set(keep.map((k) => k.id));
      const orderById = new Map(keep.map((k) => [k.id, k.order]));
      const groupKeyOf = (row: typeof currentRows[number]): string => {
        const parts = row.imageKey.split('/');
        const hasImageId = parts.length >= 4;
        return hasImageId ? `${row.order}:${parts[parts.length - 2]}` : `${row.order}`;
      };

      await prisma.$transaction(async (tx) => {
        // 残さない画像はR2/DBから削除、残す画像はorderを更新
        for (const row of currentRows) {
          const gkey = groupKeyOf(row);
          if (!keepIds.has(gkey)) {
            try {
              await deleteFile(row.imageKey);
            } catch {
              // R2削除失敗は許容
            }
            await tx.productImage.delete({ where: { id: row.id } });
          } else {
            const newOrder = orderById.get(gkey);
            if (newOrder !== undefined && newOrder !== row.order) {
              await tx.productImage.update({ where: { id: row.id }, data: { order: newOrder } });
            }
          }
        }

        // 新規画像を末尾に追加
        if (uploadedFiles.length > 0) {
          const maxKeepOrder = keep.length > 0 ? Math.max(...keep.map((k) => k.order)) : -1;
          await saveProductImages(tx, id, uploadedFiles, maxKeepOrder + 1);
        }
      });
    }

    // multipart/form-dataの場合、全て文字列として送信されるので変換
    const parsedPrice = price !== undefined ? parseInt(price, 10) : undefined;
    const parsedPreparationDays = preparationDays !== undefined ? parseInt(preparationDays, 10) : undefined;
    const parsedAllowWeekendDelivery = typeof allowWeekendDelivery === 'string'
      ? allowWeekendDelivery === 'true'
      : allowWeekendDelivery;
    const parsedIsActive = typeof isActive === 'string'
      ? isActive === 'true'
      : isActive;
    // tagsはJSON文字列としてDBに保存
    const parsedTags = tags !== undefined
      ? (typeof tags === 'string' ? tags : JSON.stringify(tags))
      : undefined;

    // 商品更新
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(description !== undefined && { description }),
        ...(parsedPrice !== undefined && { price: parsedPrice }),
        ...(resolvedCategoryId && { categoryId: resolvedCategoryId }),
        ...(productType && { productType }),
        ...(externalUrl !== undefined && { externalUrl }),
        ...(parsedPreparationDays !== undefined && { preparationDays: parsedPreparationDays }),
        ...(parsedAllowWeekendDelivery !== undefined && { allowWeekendDelivery: parsedAllowWeekendDelivery }),
        ...(parsedIsActive !== undefined && { isActive: parsedIsActive }),
        ...(parsedTags !== undefined && { tags: parsedTags }),
      },
      include: {
        category: true,
        images: true,
      },
    });

    // 在庫数を計算
    const inventorySum = await prisma.inventoryLog.aggregate({
      where: { productId: id },
      _sum: { quantity: true },
    });

    // tagsをJSON配列にパース
    const parsedResponseTags = typeof updatedProduct.tags === 'string' ? JSON.parse(updatedProduct.tags) : updatedProduct.tags;
    const productImages = await buildProductImageList(updatedProduct.images);

    return res.json({
      success: true,
      product: {
        ...updatedProduct,
        images: productImages.map((img) => img.detailUrl),
        productImages,
        tags: parsedResponseTags,
        currentStock: inventorySum._sum?.quantity || 0,
      },
      message: '商品を更新しました',
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * 商品削除
 * DELETE /api/admin/products/:id
 * ※物理削除ではなく論理削除（isActive = false）
 */
export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req.params.id);
    if (!id) return next(createError('商品IDが必要です', 400));

    // 商品存在チェック
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return next(createError('商品が見つかりません', 404));
    }

    // 注文に紐づいているかチェック
    const orderItemsCount = await prisma.orderItem.count({
      where: { productId: id },
    });

    if (orderItemsCount > 0) {
      // 注文に紐づいている場合は論理削除のみ
      const updatedProduct = await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });

      return res.json({
        success: true,
        product: updatedProduct,
        message: '商品を非公開にしました（注文履歴に紐づいているため物理削除できません）',
      });
    }

    // 注文に紐づいていない場合は物理削除も可能
    // ここでは論理削除のみ実装
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    return res.json({
      success: true,
      product: updatedProduct,
      message: '商品を削除しました',
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * 在庫調整
 * POST /api/admin/products/:id/inventory
 * Body: { quantity, type, note }
 */
export const adjustInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req.params.id);
    if (!id) return next(createError('商品IDが必要です', 400));

    const { quantity, type = 'adjustment', note } = req.body;

    // バリデーション
    if (quantity === undefined || quantity === 0) {
      return next(createError('数量を指定してください', 400));
    }

    // 商品存在チェック
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return next(createError('商品が見つかりません', 404));
    }

    // 在庫ログ作成
    const inventoryLog = await prisma.inventoryLog.create({
      data: {
        productId: id,
        quantity: parseInt(quantity, 10),
        type,
        note,
      },
    });

    // 現在の在庫数を計算
    const inventorySum = await prisma.inventoryLog.aggregate({
      where: { productId: id },
      _sum: { quantity: true },
    });

    const currentStock = inventorySum._sum?.quantity || 0;

    return res.json({
      success: true,
      inventoryLog,
      currentStock,
      message: '在庫を調整しました',
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * 在庫ログ取得
 * GET /api/admin/products/:id/inventory-logs
 * クエリパラメータ:
 *   - limit: 取得件数（デフォルト: 50）
 *   - offset: オフセット（デフォルト: 0）
 */
export const getInventoryLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req.params.id);
    if (!id) return next(createError('商品IDが必要です', 400));

    const { limit = '50', offset = '0' } = req.query;

    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);

    // 商品存在チェック
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return next(createError('商品が見つかりません', 404));
    }

    // 在庫ログ取得
    const [logs, total] = await Promise.all([
      prisma.inventoryLog.findMany({
        where: { productId: id },
        orderBy: {
          createdAt: 'desc',
        },
        take: limitNum,
        skip: offsetNum,
      }),
      prisma.inventoryLog.count({ where: { productId: id } }),
    ]);

    // 現在の在庫数を計算
    const inventorySum = await prisma.inventoryLog.aggregate({
      where: { productId: id },
      _sum: { quantity: true },
    });

    const currentStock = inventorySum._sum?.quantity || 0;

    return res.json({
      success: true,
      logs,
      currentStock,
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < total,
      },
    });
  } catch (error) {
    return next(error);
  }
};
