import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productAPI, cartAPI } from '../lib/api';
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Breadcrumbs,
  Link,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  ShoppingCart as CartIcon,
} from '@mui/icons-material';
import type {
  ProductDetail,
  ProductType,
  CategoryType,
} from '../types';

export default function ProductDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();

  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariantOptions, setSelectedVariantOptions] = useState<Record<string, string>>({});

  // ページ表示時に一番上にスクロール
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  // バックエンドから商品データを取得
  const { data: productData, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productAPI.getProductById(id!),
    enabled: !!id,
  });

  // カート追加Mutation
  const addToCartMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      cartAPI.addToCart({ productId, quantity }),
    onSuccess: () => {
      // カートデータを再取得
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (error: any) => {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';

      // 認証エラーの場合はログイン/新規登録へ誘導し、完了後この商品ページへ戻す
      if (errorMessage.includes('ログイン')) {
        const goRegister = window.confirm(
          'カートに入れるにはログインが必要です。\n' +
            '［OK］新規登録　／　［キャンセル］ログイン'
        );
        const redirect = encodeURIComponent(`/products/${id}`);
        navigate(`/auth/login?redirect=${redirect}${goRegister ? '&tab=register' : ''}`);
      } else {
        alert(errorMessage || 'カートへの追加に失敗しました');
      }
    },
  });

  // バックエンドデータをProductDetail型に変換
  const product: ProductDetail | null = productData?.product
    ? {
        id: productData.product.id,
        name: productData.product.name,
        price: productData.product.price,
        salePrice: productData.product.salePrice ?? undefined,
        description: productData.product.description || '',
        productType: productData.product.productType as ProductType,
        categoryType: (productData.product.category?.categoryType || 'cars') as CategoryType,
        images: productData.product.images || [],
        stockQuantity: productData.product.isActive ? 10 : 0, // TODO: 在庫管理機能は未実装
        shippingSettings: {
          allowWeekendDelivery: true,
          allowDateSelection: true,
          allowTimeSelection: true,
          preparationDays: 2,
        },
        createdAt: new Date(productData.product.createdAt),
        updatedAt: new Date(productData.product.updatedAt),
        attributes: [],
        tags: [],
        // TODO: バリエーション機能は未実装
        variantOptions: [],
        variants: [],
        relatedProducts: [],
      }
    : null;

  // TODO: パンくずリスト生成機能は未実装
  const breadcrumb = product
    ? [
        { label: 'トップ', url: '/' },
        { label: 'すべての商品', url: '/products' },
        { label: product.name },
      ]
    : [];

  // 選択されたバリエーションを取得
  const selectedVariant = product?.variants?.find((variant) => {
    return Object.keys(selectedVariantOptions).every(
      (key) => variant.selectedOptions[key] === selectedVariantOptions[key]
    );
  });

  // 表示用の商品情報（バリエーション選択時は上書き）
  const displayProduct = selectedVariant && product
    ? {
        ...product,
        name: selectedVariant.name,
        price: selectedVariant.price,
        salePrice: selectedVariant.salePrice,
        stockQuantity: selectedVariant.stockQuantity,
      }
    : product;

  // すべての必須オプションが選択されているか
  const isAllRequiredOptionsSelected =
    !product?.variantOptions ||
    product.variantOptions
      .filter((opt) => opt.required)
      .every((opt) => selectedVariantOptions[opt.key]);

  const handleVariantOptionChange = (key: string, value: string) => {
    setSelectedVariantOptions((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    // バリエーション選択時のみ在庫上限をチェック
    const maxQuantity = isAllRequiredOptionsSelected ? (displayProduct?.stockQuantity ?? 99) : 99;
    if (newQuantity >= 1 && newQuantity <= maxQuantity) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = async () => {
    if (!isAllRequiredOptionsSelected) {
      alert('すべての選択肢を選んでください');
      return;
    }

    if (!product || !displayProduct) {
      alert('商品情報の取得に失敗しました');
      return;
    }

    try {
      // カート追加処理（バックエンドAPI呼び出し）
      await addToCartMutation.mutateAsync({
        productId: product.id,
        quantity,
      });

      alert(`${displayProduct.name} を ${quantity}個 カートに追加しました`);

      // カートページへ遷移するか選択肢を表示
      const goToCart = window.confirm('カートを確認しますか?');
      if (goToCart) {
        navigate('/cart');
      }
    } catch (error) {
      // エラーはonErrorで処理済み
    }
  };

  const getStockStatus = () => {
    if (!isAllRequiredOptionsSelected) {
      return { text: 'オプションを選択してください', color: 'warning' as const };
    }
    const stockQuantity = displayProduct?.stockQuantity ?? 0;
    if (stockQuantity === 0) {
      return { text: '在庫切れ', color: 'error' as const };
    } else if (stockQuantity <= 5) {
      return { text: `残りわずか（残り${stockQuantity}個）`, color: 'warning' as const };
    } else {
      return { text: `在庫あり（残り${stockQuantity}個）`, color: 'success' as const };
    }
  };

  const stockStatus = getStockStatus();

  // サブスク商品かどうか（DB値は小文字 'subscription'）と課金周期ラベル
  const rawProductType = String(
    (productData?.product as { productType?: string } | undefined)?.productType ?? ''
  ).toLowerCase();
  const isSubscriptionProduct = rawProductType === 'subscription';
  const rawBillingType =
    (productData?.product as { billingType?: string } | undefined)?.billingType ?? 'monthly';
  const subscriptionBillingLabel =
    rawBillingType === 'yearly' ? '年額' : rawBillingType === 'onetime' ? '買い切り' : '月額';

  // ローディング状態
  if (isLoading) {
    return (
      <Box
        sx={{
          padding: '88px 16px 80px',
          backgroundColor: '#f5f5f5',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
          gap: 2,
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary">読み込み中...</Typography>
      </Box>
    );
  }

  // エラー状態
  if (error || !product) {
    return (
      <Box
        sx={{
          padding: '88px 16px 80px',
          backgroundColor: '#f5f5f5',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" color="error" gutterBottom>
            {error ? '商品データの取得に失敗しました' : '商品が見つかりませんでした'}
          </Typography>
          <Button variant="contained" onClick={() => navigate(-1)} sx={{ mt: 2 }}>
            戻る
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        padding: '88px 16px 80px',
        backgroundColor: '#f5f5f5',
      }}
    >
      {/* パンくずリスト */}
      <Box
        sx={{
          maxWidth: 1200,
          margin: '0 auto 24px',
        }}
      >
        <Breadcrumbs>
          {breadcrumb.map((item, index) =>
            item.url ? (
              <Link
                key={index}
                href={item.url}
                underline="hover"
                color="primary"
                sx={{ cursor: 'pointer' }}
              >
                {item.label}
              </Link>
            ) : (
              <Typography key={index} color="text.primary">
                {item.label}
              </Typography>
            )
          )}
        </Breadcrumbs>
      </Box>

      {/* 商品詳細 */}
      <Box
        sx={{
          maxWidth: 1200,
          margin: '0 auto 48px',
          padding: '32px',
          backgroundColor: 'white',
          borderRadius: 1,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 6,
        }}
      >
        {/* 画像ギャラリー */}
        {/* minWidth:0 でグリッド列(1fr)がはみ出さないようにする */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          {/* メイン画像 */}
          {product?.images && product.images.length > 0 ? (
            <Box
              component="img"
              src={product.images[selectedImageIndex] || product.images[0]}
              alt={product.name}
              sx={{
                width: '100%',
                maxWidth: '100%',
                aspectRatio: '1',
                objectFit: 'cover',
                borderRadius: 1,
                cursor: 'zoom-in',
                bgcolor: 'grey.100',
                display: 'block',
              }}
            />
          ) : (
            <Box
              sx={{
                width: '100%',
                aspectRatio: '1',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 24,
                fontWeight: 500,
              }}
            >
              画像なし
            </Box>
          )}

          {/* サムネイル（2枚以上のときのみ表示） */}
          {product?.images && product.images.length > 1 && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 1.5,
                minWidth: 0,
                width: '100%',
              }}
            >
              {product.images.map((url, index) => (
                <Box
                  key={index}
                  component="img"
                  src={url}
                  alt={`${product.name} ${index + 1}`}
                  onClick={() => setSelectedImageIndex(index)}
                  sx={{
                    width: '100%',
                    minWidth: 0,
                    aspectRatio: '1',
                    objectFit: 'cover',
                    borderRadius: 0.5,
                    cursor: 'pointer',
                    display: 'block',
                    bgcolor: 'grey.100',
                    border: selectedImageIndex === index ? '2px solid' : '2px solid transparent',
                    borderColor: selectedImageIndex === index ? 'primary.main' : 'transparent',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box',
                  }}
                />
              ))}
            </Box>
          )}
        </Box>

        {/* 商品情報 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
          {/* カテゴリーバッジ */}
          <Box>
            <Chip
              label="車パーツ"
              color="primary"
              variant="outlined"
              size="small"
            />
          </Box>

          {/* 商品名 */}
          <Typography variant="h4" component="h1" fontWeight={700}>
            {displayProduct?.name ?? product?.name ?? '商品名'}
          </Typography>

          {/* バリエーション選択 */}
          {product?.variantOptions && product.variantOptions.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {product.variantOptions.map((option) => (
                <FormControl key={option.key} fullWidth required={option.required}>
                  <InputLabel>{option.name}</InputLabel>
                  <Select
                    value={selectedVariantOptions[option.key] || ''}
                    label={option.name}
                    onChange={(e) => handleVariantOptionChange(option.key, e.target.value)}
                  >
                    <MenuItem value="">
                      <em>選択してください...</em>
                    </MenuItem>
                    {option.values.map((val) => (
                      <MenuItem key={val.value} value={val.value}>
                        {val.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ))}
            </Box>
          )}

          {/* 価格 */}
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            {isAllRequiredOptionsSelected && displayProduct ? (
              <>
                <Typography variant="h3" fontWeight={700} color="primary">
                  ¥{(displayProduct.salePrice || displayProduct.price).toLocaleString()}
                </Typography>
                {displayProduct.salePrice && displayProduct.salePrice < displayProduct.price && (
                  <Typography
                    variant="h5"
                    color="text.secondary"
                    sx={{ textDecoration: 'line-through' }}
                  >
                    ¥{displayProduct.price.toLocaleString()}
                  </Typography>
                )}
              </>
            ) : (
              <Typography variant="h5" color="text.secondary">
                オプションを選択すると価格が表示されます
              </Typography>
            )}
          </Box>

          {/* 在庫状況（サブスク商品は在庫概念がないため非表示） */}
          {!isSubscriptionProduct && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor:
                    stockStatus.color === 'success'
                      ? 'success.main'
                      : stockStatus.color === 'warning'
                      ? 'warning.main'
                      : 'error.main',
                }}
              />
              <Typography variant="body1" fontWeight={500}>
                {stockStatus.text}
              </Typography>
            </Box>
          )}

          {/* サブスク商品の案内（周期・ライセンスキー） */}
          {isSubscriptionProduct && (
            <Box
              sx={{
                padding: 2,
                backgroundColor: '#ede7f6',
                borderLeft: '4px solid #7c4dff',
                borderRadius: 0.5,
              }}
            >
              <Typography variant="body2" fontWeight={600} gutterBottom>
                {subscriptionBillingLabel}のサブスクリプション
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ご購入後、運営者よりライセンスキーをメールでお届けします。届いたキーをアプリに入力してご利用ください。
              </Typography>
            </Box>
          )}

          {/* 商品説明 */}
          <Typography
            variant="body1"
            sx={{
              whiteSpace: 'pre-line',
              lineHeight: 1.8,
              padding: 2,
              backgroundColor: '#f5f5f5',
              borderRadius: 0.5,
            }}
          >
            {product?.description ?? ''}
          </Typography>

          {/* タグ */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {product?.tags?.map((tag) => (
              <Chip key={tag.id} label={tag.name} size="small" />
            ))}
          </Box>

          {/* 配送オプション（サブスク商品は配送しないため非表示） */}
          {!isSubscriptionProduct && product?.shippingSettings && (
            <Box
              sx={{
                padding: 2,
                backgroundColor: '#fff3e0',
                borderRadius: 0.5,
              }}
            >
              <Typography variant="body2" fontWeight={600} gutterBottom>
                配送オプション
              </Typography>
              <Box component="ul" sx={{ margin: 0, paddingLeft: 2.5 }}>
                {product.shippingSettings?.allowWeekendDelivery && (
                  <li>土日配達可能</li>
                )}
                {product.shippingSettings?.allowDateSelection && (
                  <li>日時指定可能</li>
                )}
                <li>
                  通常{product.shippingSettings?.preparationDays ?? 2}〜
                  {(product.shippingSettings?.preparationDays ?? 2) + 1}営業日でお届け
                </li>
                <li>全国送料無料（一部地域を除く）</li>
              </Box>
            </Box>
          )}

          {/* 購入アクション */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              paddingTop: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            {/* 数量選択 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body1" fontWeight={500}>
                数量:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      backgroundColor: 'primary.main',
                      color: 'white',
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  <RemoveIcon />
                </IconButton>
                <Typography variant="h6" fontWeight={600} sx={{ minWidth: 40, textAlign: 'center' }}>
                  {quantity}
                </Typography>
                <IconButton
                  onClick={() => handleQuantityChange(1)}
                  disabled={
                    isAllRequiredOptionsSelected
                      ? quantity >= (displayProduct?.stockQuantity ?? 0)
                      : quantity >= 99
                  }
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      backgroundColor: 'primary.main',
                      color: 'white',
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  <AddIcon />
                </IconButton>
              </Box>
            </Box>

            {/* カートに追加ボタン */}
            <Button
              variant="contained"
              size="large"
              startIcon={addToCartMutation.isPending ? <CircularProgress size={20} color="inherit" /> : <CartIcon />}
              onClick={handleAddToCart}
              disabled={
                !isAllRequiredOptionsSelected ||
                (displayProduct?.stockQuantity ?? 0) === 0 ||
                addToCartMutation.isPending
              }
              sx={{
                fontSize: 18,
                fontWeight: 600,
                padding: '16px',
                boxShadow: '0 4px 12px rgba(124, 77, 255, 0.3)',
                '&:hover': {
                  boxShadow: '0 6px 16px rgba(124, 77, 255, 0.4)',
                  transform: 'translateY(-2px)',
                },
                '&:disabled': {
                  backgroundColor: '#e0e0e0',
                  color: '#9e9e9e',
                  boxShadow: 'none',
                  transform: 'none',
                },
              }}
            >
              {addToCartMutation.isPending
                ? 'カートに追加中...'
                : !isAllRequiredOptionsSelected
                ? 'オプションを選択してください'
                : (displayProduct?.stockQuantity ?? 0) === 0
                ? '在庫切れ'
                : 'カートに追加'}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* 関連商品 - TODO: バックエンドから実際の関連商品を取得する実装が必要 */}
      {/*
      <Box
        sx={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '32px',
          backgroundColor: 'white',
          borderRadius: 1,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <Typography variant="h5" fontWeight={700} gutterBottom>
          関連商品
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 3,
            marginTop: 3,
          }}
        >
          {product.relatedProducts.map((related) => (
            <Box
              key={related.id}
              onClick={() => handleRelatedProductClick(related)}
              sx={{
                backgroundColor: 'white',
                borderRadius: 1,
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                },
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  aspectRatio: '1',
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 18,
                  fontWeight: 500,
                }}
              >
                商品{related.id}
              </Box>
              <Box sx={{ padding: 2 }}>
                <Typography variant="body1" fontWeight={500} gutterBottom>
                  {related.name}
                </Typography>
                <Typography variant="h6" fontWeight={700} color="primary">
                  ¥{related.price.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
      */}
    </Box>
  );
}
