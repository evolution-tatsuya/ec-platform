// ===== トップページルーター =====
// 目的: トップページ関連のエンドポイント定義

import { Router } from 'express';
import * as topPageController from '../controllers/topPageController';
import { optionalAuth } from '../middleware/auth';

const router = Router();

// GET /api/top-page - トップページデータ取得
// 認証: 不要（ゲスト可）
router.get('/', optionalAuth, topPageController.getTopPageData);

export default router;
