import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { cartAPI } from '../lib/api';

const BANK_TRANSFER_DISCOUNT_RATE = 0.036; // 3.6%

export default function CartPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // カートデータを取得
  const { data, isLoading, error } = useQuery({
    queryKey: ['cart'],
    queryFn: cartAPI.getCart,
    retry: 1,
  });

  // カートアイテムの数量を更新するMutation
  const updateQuantityMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      cartAPI.updateCartItem(itemId, { quantity }),
    onSuccess: () => {
      // カートデータを再取得
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (error: any) => {
      alert(error.message || 'カートの更新に失敗しました');
    },
  });

  // カートアイテムを削除するMutation
  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => cartAPI.removeFromCart(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (error: any) => {
      alert(error.message || 'カートからの削除に失敗しました');
    },
  });

  const handleQuantityChange = (itemId: string, currentStock: number, currentQuantity: number, delta: number) => {
    const newQuantity = currentQuantity + delta;
    const maxQuantity = Math.min(currentStock, 99);

    if (newQuantity >= 1 && newQuantity <= maxQuantity) {
      updateQuantityMutation.mutate({ itemId, quantity: newQuantity });
    } else if (newQuantity > currentStock) {
      alert(`この商品の在庫は${currentStock}個までです`);
    }
  };

  const handleRemoveItem = (itemId: string, productName: string) => {
    if (window.confirm(`${productName}をカートから削除しますか?`)) {
      removeItemMutation.mutate(itemId);
    }
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  const handleContinueShopping = () => {
    navigate('/');
  };

  const handleProductClick = (productId: string) => {
    navigate(`/products/${productId}`);
  };

  // ローディング状態
  if (isLoading) {
    return (
      <Box
        sx={{
          padding: '88px 16px 80px',
          backgroundColor: '#f5f5f5',
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  // エラー状態（認証エラーの場合はログインページへ誘導）
  if (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    const isAuthError = errorMessage.includes('ログイン');

    return (
      <Box
        sx={{
          padding: '88px 16px 80px',
          backgroundColor: '#f5f5f5',
          minHeight: '100vh',
        }}
      >
        <Box
          sx={{
            maxWidth: 1200,
            margin: '0 auto',
          }}
        >
          <Alert severity="error" sx={{ mb: 3 }}>
            {errorMessage}
          </Alert>
          {isAuthError && (
            <Button variant="contained" onClick={() => navigate('/auth/login')}>
              ログインページへ
            </Button>
          )}
        </Box>
      </Box>
    );
  }

  const cart = data?.cart;
  const items = cart?.items || [];

  // 銀行振込割引を計算
  const subtotal = cart?.totalAmount || 0;
  const discount = Math.floor(subtotal * BANK_TRANSFER_DISCOUNT_RATE);
  const total = subtotal - discount;
  const itemCount = cart?.totalItems || 0;

  // 空カートの場合
  if (items.length === 0) {
    return (
      <Box
        sx={{
          padding: '88px 16px 80px',
          backgroundColor: '#f5f5f5',
          minHeight: '100vh',
        }}
      >
        <Box
          sx={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '64px 32px',
            backgroundColor: 'white',
            borderRadius: 1,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            textAlign: 'center',
          }}
        >
          <Box
            sx={{
              width: 120,
              height: 120,
              margin: '0 auto 24px',
              backgroundColor: '#f5f5f5',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 48,
              color: '#bdbdbd',
            }}
          >
            🛒
          </Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            カートは空です
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            商品を追加して、お買い物をお楽しみください。
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={handleContinueShopping}
            sx={{
              fontSize: 16,
              fontWeight: 600,
              padding: '16px 32px',
              boxShadow: '0 4px 12px rgba(124, 77, 255, 0.3)',
              '&:hover': {
                boxShadow: '0 6px 16px rgba(124, 77, 255, 0.4)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            商品を見る
          </Button>
        </Box>
      </Box>
    );
  }

  // カートに商品がある場合
  return (
    <Box
      sx={{
        padding: '88px 16px 80px',
        backgroundColor: '#f5f5f5',
      }}
    >
      {/* タイトル */}
      <Box
        sx={{
          maxWidth: 1200,
          margin: '0 auto 24px',
        }}
      >
        <Typography variant="h4" fontWeight={700} color="#333">
          ショッピングカート
        </Typography>
      </Box>

      {/* カートレイアウト */}
      <Box
        sx={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 400px' },
          gap: 3,
        }}
      >
        {/* 左側: カート商品一覧 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {items.map((item) => (
            <Box
              key={item.id}
              sx={{
                backgroundColor: 'white',
                borderRadius: 1,
                padding: 3,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                display: 'grid',
                gridTemplateColumns: { xs: '80px 1fr', md: '120px 1fr auto' },
                gap: 3,
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'box-shadow 0.3s',
                '&:hover': {
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                },
                opacity: updateQuantityMutation.isPending || removeItemMutation.isPending ? 0.5 : 1,
                pointerEvents: updateQuantityMutation.isPending || removeItemMutation.isPending ? 'none' : 'auto',
              }}
              onClick={() => handleProductClick(item.productId)}
            >
              {/* 商品画像 */}
              <Box
                sx={{
                  width: { xs: 80, md: 120 },
                  height: { xs: 80, md: 120 },
                  background: item.product.images && item.product.images.length > 0
                    ? `url(${item.product.images[0]}) center/cover`
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: { xs: 12, md: 14 },
                  fontWeight: 500,
                }}
              >
                {(!item.product.images || item.product.images.length === 0) && '商品画像'}
              </Box>

              {/* 商品詳細 */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Chip
                  label={item.product.category?.name || item.product.productType}
                  color="primary"
                  variant="outlined"
                  size="small"
                  sx={{ width: 'fit-content' }}
                />
                <Typography variant="h6" fontWeight={600} color="#333">
                  {item.product.name}
                </Typography>
                <Typography variant="h5" fontWeight={700} color="primary">
                  ¥{item.product.price.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  在庫: {item.currentStock}個
                </Typography>
              </Box>

              {/* 数量変更・削除 */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'row', md: 'column' },
                  gap: 2,
                  alignItems: { xs: 'center', md: 'flex-end' },
                  justifyContent: { xs: 'space-between', md: 'flex-start' },
                  gridColumn: { xs: '1 / -1', md: 'auto' },
                }}
              >
                {/* 数量変更 */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    backgroundColor: '#f5f5f5',
                    padding: '8px 16px',
                    borderRadius: 1,
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuantityChange(item.id, item.currentStock, item.quantity, -1);
                    }}
                    disabled={item.quantity <= 1 || updateQuantityMutation.isPending}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover:not(:disabled)': {
                        backgroundColor: 'primary.main',
                        color: 'white',
                        borderColor: 'primary.main',
                      },
                      '&:disabled': {
                        opacity: 0.3,
                      },
                    }}
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="h6" fontWeight={600} sx={{ minWidth: 40, textAlign: 'center' }}>
                    {item.quantity}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuantityChange(item.id, item.currentStock, item.quantity, 1);
                    }}
                    disabled={item.quantity >= item.currentStock || updateQuantityMutation.isPending}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover:not(:disabled)': {
                        backgroundColor: 'primary.main',
                        color: 'white',
                        borderColor: 'primary.main',
                      },
                      '&:disabled': {
                        opacity: 0.3,
                      },
                    }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Box>

                {/* 削除ボタン */}
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveItem(item.id, item.product.name);
                  }}
                  disabled={removeItemMutation.isPending}
                  sx={{ textDecoration: 'underline' }}
                >
                  削除
                </Button>
              </Box>
            </Box>
          ))}
        </Box>

        {/* 右側: 注文サマリー */}
        <Box
          sx={{
            backgroundColor: 'white',
            borderRadius: 1,
            padding: 3,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            height: 'fit-content',
            position: { xs: 'static', md: 'sticky' },
            top: { xs: 'auto', md: 96 },
          }}
        >
          <Typography variant="h5" fontWeight={700} gutterBottom>
            注文内容
          </Typography>

          <Divider sx={{ my: 2 }} />

          {/* 小計 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="body1" color="text.secondary">
              小計（{itemCount}商品）
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              ¥{subtotal.toLocaleString()}
            </Typography>
          </Box>

          {/* 送料 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="body1" color="text.secondary">
              送料
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              無料
            </Typography>
          </Box>

          {/* 銀行振込割引 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body1" color="text.secondary">
                銀行振込割引 (3.6%)
              </Typography>
              <Chip
                label="お得!"
                size="small"
                sx={{
                  backgroundColor: '#fff3e0',
                  color: '#e65100',
                  fontWeight: 600,
                  fontSize: 12,
                }}
              />
            </Box>
            <Typography variant="body1" fontWeight={600} sx={{ color: '#e65100' }}>
              -¥{discount.toLocaleString()}
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* 合計 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h6" fontWeight={700}>
              合計
            </Typography>
            <Typography variant="h5" fontWeight={700} color="primary">
              ¥{total.toLocaleString()}
            </Typography>
          </Box>

          {/* 購入手続きボタン */}
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleCheckout}
            sx={{
              fontSize: 18,
              fontWeight: 600,
              padding: '16px',
              boxShadow: '0 4px 12px rgba(124, 77, 255, 0.3)',
              '&:hover': {
                boxShadow: '0 6px 16px rgba(124, 77, 255, 0.4)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            購入手続きへ進む
          </Button>

          {/* 買い物を続けるリンク */}
          <Button
            variant="text"
            fullWidth
            onClick={handleContinueShopping}
            sx={{ mt: 2, fontSize: 14, fontWeight: 500 }}
          >
            買い物を続ける
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
