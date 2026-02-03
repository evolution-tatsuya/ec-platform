import express from 'express';
import * as cartController from '../controllers/cartController';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// 全てのカートエンドポイントは認証必須
router.use(requireAuth);

// POST /api/cart - カートに商品を追加
router.post('/', cartController.addToCart);

// GET /api/cart - カート内容を取得
router.get('/', cartController.getCart);

// PUT /api/cart/:itemId - カートアイテムの数量を更新
router.put('/:itemId', cartController.updateCartItem);

// DELETE /api/cart/:itemId - カートアイテムを削除
router.delete('/:itemId', cartController.removeFromCart);

// DELETE /api/cart - カートを全てクリア
// Note: このルートは /:itemId の前に定義する必要があります
// しかし、そうすると /clear が itemId として解釈されるので、明示的なパスを使用します
router.delete('/clear/all', cartController.clearCart);

export default router;
