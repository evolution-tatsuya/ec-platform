// ===== 管理者用トップページ編集ルーター（ヒーロー/メガカテゴリー） =====

import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { upload } from '../config/multer';
import {
  getAdminHeroSlides,
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
} from '../controllers/heroSlideController';
import {
  getAdminMegaCategories,
  createMegaCategory,
  updateMegaCategory,
  deleteMegaCategory,
} from '../controllers/megaCategoryController';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

const imageFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'original', maxCount: 1 },
]);

// ヒーロースライド
router.get('/hero-slides', getAdminHeroSlides);
router.post('/hero-slides', imageFields, createHeroSlide);
router.put('/hero-slides/:id', imageFields, updateHeroSlide);
router.delete('/hero-slides/:id', deleteHeroSlide);

// メガカテゴリー
router.get('/mega-categories', getAdminMegaCategories);
router.post('/mega-categories', imageFields, createMegaCategory);
router.put('/mega-categories/:id', imageFields, updateMegaCategory);
router.delete('/mega-categories/:id', deleteMegaCategory);

export default router;
