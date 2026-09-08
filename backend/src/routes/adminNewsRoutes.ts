// ===== 管理者用お知らせ管理ルーター =====

import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import {
  getAdminNews,
  createNews,
  updateNews,
  deleteNews,
} from '../controllers/newsController';

const router = Router();

// 全エンドポイントに管理者認証を適用
router.use(requireAdmin);

// GET /api/admin/news - お知らせ一覧（非公開含む）
router.get('/', getAdminNews);

// POST /api/admin/news - お知らせ作成
router.post('/', createNews);

// PUT /api/admin/news/:id - お知らせ更新
router.put('/:id', updateNews);

// DELETE /api/admin/news/:id - お知らせ削除
router.delete('/:id', deleteNews);

export default router;
