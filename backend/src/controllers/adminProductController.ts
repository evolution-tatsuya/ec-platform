// ===== 管理者用商品コントローラー =====
// 目的: 商品のCRUD操作、在庫管理（管理者専用）

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { createError } from '../middleware/errorHandler';
import { validateImageFormat, generateMultipleSizes } from '../utils/imageProcessor';
import { uploadFile, deleteFile } from '../utils/r2Client';

// ヘルパー関数: string | string[] を string に変換
const getStringParam = (param: string | string[] | undefined): string | undefined => {
  if (Array.isArray(param)) return param[0];
  return param;
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
        },
        orderBy,
        take: limitNum,
        skip: offset,
      }),
      prisma.product.count({ where }),
    ]);

    // 各商品の在庫数を計算し、categoryTypeを追加
    let productsWithStock = await Promise.all(
      products.map(async (product) => {
        const inventorySum = await prisma.inventoryLog.aggregate({
          where: { productId: product.id },
          _sum: { quantity: true },
        });
        // tagsをJSON配列にパース
        const parsedTags = typeof product.tags === 'string' ? JSON.parse(product.tags) : product.tags;
        return {
          ...product,
          tags: parsedTags,
          categoryType: product.category?.slug, // categoryTypeをスラッグから追加
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
    console.log('=== 商品作成API リクエストデバッグ ===');
    console.log('req.body:', req.body);
    console.log('req.file:', req.file);

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

    // categoryType（スラッグ）からcategoryIdを解決（商品一覧取得APIと同じロジック）
    let categoryId = requestCategoryId;
    if (categoryType && !categoryId) {
      const category = await prisma.category.findUnique({
        where: { slug: categoryType as string },
      });
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

    // 画像アップロード処理
    let imageKeys: { thumbnail: string; list: string; detail: string } | null = null;

    if (req.file) {
      // 画像形式バリデーション
      const isValid = await validateImageFormat(req.file.buffer);
      if (!isValid) {
        return next(createError('サポートされていない画像形式です（JPEG, PNG, WebPのみ）', 400));
      }

      // 3サイズのWebP画像を生成
      const images = await generateMultipleSizes(req.file.buffer);

      // R2にアップロード（仮のproductIdで保存、後でトランザクション内で実際のIDに置き換え）
      const tempId = Date.now().toString();
      imageKeys = {
        thumbnail: `products/${tempId}/thumbnail.webp`,
        list: `products/${tempId}/list.webp`,
        detail: `products/${tempId}/detail.webp`,
      };

      await Promise.all([
        uploadFile(imageKeys.thumbnail, images.thumbnail, 'image/webp'),
        uploadFile(imageKeys.list, images.list, 'image/webp'),
        uploadFile(imageKeys.detail, images.detail, 'image/webp'),
      ]);
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

      // 画像がアップロードされている場合、R2の画像キーを更新してProductImageレコード作成
      if (imageKeys) {
        const actualImageKeys = {
          thumbnail: `products/${newProduct.id}/thumbnail.webp`,
          list: `products/${newProduct.id}/list.webp`,
          detail: `products/${newProduct.id}/detail.webp`,
        };

        // 仮キーから実際のキーにR2上でコピー（実際にはキーを変更できないので削除して再アップロード）
        // ここでは簡略化のため、実際のキーで最初からアップロードし直す
        const images = await generateMultipleSizes(req.file!.buffer);
        await Promise.all([
          uploadFile(actualImageKeys.thumbnail, images.thumbnail, 'image/webp'),
          uploadFile(actualImageKeys.list, images.list, 'image/webp'),
          uploadFile(actualImageKeys.detail, images.detail, 'image/webp'),
        ]);

        // 仮キーを削除
        await Promise.all([
          deleteFile(imageKeys.thumbnail),
          deleteFile(imageKeys.list),
          deleteFile(imageKeys.detail),
        ]);

        // ProductImageレコード作成
        await Promise.all([
          tx.productImage.create({
            data: {
              productId: newProduct.id,
              imageKey: actualImageKeys.thumbnail,
              sizeType: 'thumbnail',
              order: 0,
            },
          }),
          tx.productImage.create({
            data: {
              productId: newProduct.id,
              imageKey: actualImageKeys.list,
              sizeType: 'list',
              order: 0,
            },
          }),
          tx.productImage.create({
            data: {
              productId: newProduct.id,
              imageKey: actualImageKeys.detail,
              sizeType: 'detail',
              order: 0,
            },
          }),
        ]);
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

    return res.json({
      success: true,
      product: {
        ...product,
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

    // 画像アップロード処理
    if (req.file) {
      // 画像形式バリデーション
      const isValid = await validateImageFormat(req.file.buffer);
      if (!isValid) {
        return next(createError('サポートされていない画像形式です（JPEG, PNG, WebPのみ）', 400));
      }

      // 既存の画像を削除
      const existingImages = await prisma.productImage.findMany({
        where: { productId: id },
      });

      for (const img of existingImages) {
        await deleteFile(img.imageKey);
        await prisma.productImage.delete({ where: { id: img.id } });
      }

      // 3サイズのWebP画像を生成
      const images = await generateMultipleSizes(req.file.buffer);

      // R2にアップロード
      const imageKeys = {
        thumbnail: `products/${id}/thumbnail.webp`,
        list: `products/${id}/list.webp`,
        detail: `products/${id}/detail.webp`,
      };

      await Promise.all([
        uploadFile(imageKeys.thumbnail, images.thumbnail, 'image/webp'),
        uploadFile(imageKeys.list, images.list, 'image/webp'),
        uploadFile(imageKeys.detail, images.detail, 'image/webp'),
      ]);

      // ProductImageレコード作成
      await Promise.all([
        prisma.productImage.create({
          data: {
            productId: id,
            imageKey: imageKeys.thumbnail,
            sizeType: 'thumbnail',
            order: 0,
          },
        }),
        prisma.productImage.create({
          data: {
            productId: id,
            imageKey: imageKeys.list,
            sizeType: 'list',
            order: 0,
          },
        }),
        prisma.productImage.create({
          data: {
            productId: id,
            imageKey: imageKeys.detail,
            sizeType: 'detail',
            order: 0,
          },
        }),
      ]);
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
      },
    });

    // 在庫数を計算
    const inventorySum = await prisma.inventoryLog.aggregate({
      where: { productId: id },
      _sum: { quantity: true },
    });

    // tagsをJSON配列にパース
    const parsedResponseTags = typeof updatedProduct.tags === 'string' ? JSON.parse(updatedProduct.tags) : updatedProduct.tags;

    return res.json({
      success: true,
      product: {
        ...updatedProduct,
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
