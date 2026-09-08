// ===== お知らせ・ニュース ルーター（顧客向け・公開） =====

import { Router } from 'express';
import { getPublicNews, getPublicNewsById } from '../controllers/newsController';

const router = Router();

// GET /api/news - 公開お知らせ一覧
router.get('/', getPublicNews);

// GET /api/news/:id - お知らせ詳細（公開のみ）
router.get('/:id', getPublicNewsById);

export default router;
