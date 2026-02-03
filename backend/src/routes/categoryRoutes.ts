// ===== カテゴリールーター =====
// 目的: カテゴリー関連のエンドポイント定義

import { Router } from 'express';
import * as categoryController from '../controllers/categoryController';
import { optionalAuth } from '../middleware/auth';

const router = Router();

// GET /api/categories/tree - カテゴリー階層取得
router.get('/tree', optionalAuth, categoryController.getCategoryTree);

// GET /api/categories - カテゴリー一覧取得
router.get('/', optionalAuth, categoryController.getCategories);

// GET /api/categories/:id - カテゴリー詳細取得
router.get('/:id', optionalAuth, categoryController.getCategoryById);

export default router;
