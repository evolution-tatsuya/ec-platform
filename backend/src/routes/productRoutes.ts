// ===== 商品ルーター =====
// 目的: 商品関連のエンドポイント定義

import { Router } from 'express';
import * as productController from '../controllers/productController';
import { optionalAuth } from '../middleware/auth';

const router = Router();

// GET /api/products/search - 商品検索（オートコンプリート用）
// Note: /search を先に定義しないと /:id にマッチしてしまう
router.get('/search', optionalAuth, productController.searchProducts);

// GET /api/products - 商品一覧取得
router.get('/', optionalAuth, productController.getProducts);

// GET /api/products/:id - 商品詳細取得
router.get('/:id', optionalAuth, productController.getProductById);

export default router;
