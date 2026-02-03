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

// @MOCK_TO_API: ProductDetailPageData
// 本番環境では GET /api/products/:id から取得
const mockProductDetail: ProductDetail = {
  id: '1',
  name: '86用 高性能ブレーキパッド',
  price: 15800, // ベース価格（最安値）
  salePrice: undefined,
  description:
    'トヨタ86専用に開発された高性能ブレーキパッドです。\nサーキット走行にも対応した高い制動力と耐久性を実現。\n純正比で約30%の制動距離短縮を実現しています。\n\n主な特徴:\n• 高温時でも安定した制動力\n• ダストが少なく、ホイールの汚れを軽減\n• 低ノイズ設計で快適な走行\n• 車検対応',
  productType: 'PHYSICAL' as ProductType,
  categoryType: 'cars' as CategoryType,
  images: ['', '', '', ''], // 実際はCloudflare R2のURL
  stockQuantity: 0, // バリエーションごとに在庫管理
  shippingSettings: {
    allowWeekendDelivery: true,
    allowDateSelection: true,
    allowTimeSelection: true,
    preparationDays: 2,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  attributes: [],
  tags: [
    { id: '1', name: '#トヨタ' },
    { id: '2', name: '#86' },
    { id: '3', name: '#ブレーキ' },
    { id: '4', name: '#サーキット' },
  ],

  // バリエーション選択肢
  variantOptions: [
    {
      name: 'グレード',
      key: 'grade',
      required: true,
      values: [
        { value: 'standard', label: 'スタンダード' },
        { value: 'high-grip', label: 'ハイグリップ' },
        { value: 'racing', label: 'レーシング' },
      ],
    },
    {
      name: '取付位置',
      key: 'position',
      required: true,
      values: [
        { value: 'front', label: 'フロント' },
        { value: 'rear', label: 'リア' },
      ],
    },
  ],

  // バリエーション一覧
  variants: [
    {
      id: 'brake-pad-standard-front',
      name: '86用 高性能ブレーキパッド - スタンダード（フロント）',
      price: 15800,
      stockQuantity: 20,
      sku: 'BRK-STD-FRT',
      selectedOptions: { grade: 'standard', position: 'front' },
    },
    {
      id: 'brake-pad-standard-rear',
      name: '86用 高性能ブレーキパッド - スタンダード（リア）',
      price: 13800,
      stockQuantity: 15,
      sku: 'BRK-STD-RER',
      selectedOptions: { grade: 'standard', position: 'rear' },
    },
    {
      id: 'brake-pad-high-grip-front',
      name: '86用 高性能ブレーキパッド - ハイグリップ（フロント）',
      price: 28800,
      salePrice: 25800,
      stockQuantity: 12,
      sku: 'BRK-HG-FRT',
      selectedOptions: { grade: 'high-grip', position: 'front' },
    },
    {
      id: 'brake-pad-high-grip-rear',
      name: '86用 高性能ブレーキパッド - ハイグリップ（リア）',
      price: 24800,
      stockQuantity: 8,
      sku: 'BRK-HG-RER',
      selectedOptions: { grade: 'high-grip', position: 'rear' },
    },
    {
      id: 'brake-pad-racing-front',
      name: '86用 高性能ブレーキパッド - レーシング（フロント）',
      price: 45000,
      stockQuantity: 5,
      sku: 'BRK-RC-FRT',
      selectedOptions: { grade: 'racing', position: 'front' },
    },
    {
      id: 'brake-pad-racing-rear',
      name: '86用 高性能ブレーキパッド - レーシング（リア）',
      price: 38000,
      stockQuantity: 3,
      sku: 'BRK-RC-RER',
      selectedOptions: { grade: 'racing', position: 'rear' },
    },
  ],

  relatedProducts: [
    {
      id: '2',
      name: '86用 スポーツマフラー',
      price: 89800,
      imageUrl: '',
      categoryType: 'cars' as CategoryType,
    },
    {
      id: '3',
      name: '86用 車高調キット',
      price: 128000,
      imageUrl: '',
      categoryType: 'cars' as CategoryType,
    },
    {
      id: '4',
      name: '86用 エアフィルター',
      price: 12800,
      imageUrl: '',
      categoryType: 'cars' as CategoryType,
    },
    {
      id: '5',
      name: '86用 オイルフィルター',
      price: 3200,
      imageUrl: '',
      categoryType: 'cars' as CategoryType,
    },
  ],
};

const mockBreadcrumb = [
  { label: 'トップ', url: '/' },
  { label: '車パーツ', url: '/cars' },
  { label: 'トヨタ', url: '/cars/toyota' },
  { label: '86用 高性能ブレーキパッド' }, // 最後はリンクなし
];

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

      // 認証エラーの場合はログインページへ
      if (errorMessage.includes('ログイン')) {
        alert('カートに追加するにはログインが必要です');
        navigate('/auth/login');
      } else {
        alert(errorMessage || 'カートへの追加に失敗しました');
      }
    },
  });

  // バックエンドデータをProductDetail型に変換（バリエーション機能は今後実装）
  const product: ProductDetail = productData?.product
    ? {
        ...mockProductDetail, // バリエーション設定などはモックから継承
        id: productData.product.id,
        name: productData.product.name,
        price: productData.product.price,
        description: productData.product.description || '',
        productType: productData.product.productType as ProductType,
        categoryType: (productData.product.category?.categoryType || 'cars') as CategoryType,
        images: productData.product.images || [],
        stockQuantity: productData.product.isActive ? 10 : 0, // 在庫管理は今後実装
        createdAt: new Date(productData.product.createdAt),
        updatedAt: new Date(productData.product.updatedAt),
      }
    : mockProductDetail;

  const breadcrumb = mockBreadcrumb;

  // 選択されたバリエーションを取得
  const selectedVariant = product.variants?.find((variant) => {
    return Object.keys(selectedVariantOptions).every(
      (key) => variant.selectedOptions[key] === selectedVariantOptions[key]
    );
  });

  // 表示用の商品情報（バリエーション選択時は上書き）
  const displayProduct = selectedVariant
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
    !product.variantOptions ||
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
    const maxQuantity = isAllRequiredOptionsSelected ? displayProduct.stockQuantity : 99;
    if (newQuantity >= 1 && newQuantity <= maxQuantity) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = async () => {
    if (!isAllRequiredOptionsSelected) {
      alert('すべての選択肢を選んでください');
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
    if (displayProduct.stockQuantity === 0) {
      return { text: '在庫切れ', color: 'error' as const };
    } else if (displayProduct.stockQuantity <= 5) {
      return { text: `残りわずか（残り${displayProduct.stockQuantity}個）`, color: 'warning' as const };
    } else {
      return { text: `在庫あり（残り${displayProduct.stockQuantity}個）`, color: 'success' as const };
    }
  };

  const stockStatus = getStockStatus();

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
  if (error) {
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
            商品データの取得に失敗しました
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* メイン画像 */}
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
              cursor: 'zoom-in',
            }}
          >
            メイン画像
          </Box>

          {/* サムネイル */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 1.5,
            }}
          >
            {product.images.map((_, index) => (
              <Box
                key={index}
                onClick={() => setSelectedImageIndex(index)}
                sx={{
                  aspectRatio: '1',
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  borderRadius: 0.5,
                  cursor: 'pointer',
                  border: selectedImageIndex === index ? '2px solid' : '2px solid transparent',
                  borderColor: 'primary.main',
                  transition: 'border-color 0.2s',
                }}
              />
            ))}
          </Box>
        </Box>

        {/* 商品情報 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
            {displayProduct.name}
          </Typography>

          {/* バリエーション選択 */}
          {product.variantOptions && product.variantOptions.length > 0 && (
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
            {isAllRequiredOptionsSelected ? (
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

          {/* 在庫状況 */}
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
            {product.description}
          </Typography>

          {/* タグ */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {product.tags.map((tag) => (
              <Chip key={tag.id} label={tag.name} size="small" />
            ))}
          </Box>

          {/* 配送オプション */}
          {product.shippingSettings && (
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
                {product.shippingSettings.allowWeekendDelivery && (
                  <li>土日配達可能</li>
                )}
                {product.shippingSettings.allowDateSelection && (
                  <li>日時指定可能</li>
                )}
                <li>
                  通常{product.shippingSettings.preparationDays}〜
                  {product.shippingSettings.preparationDays + 1}営業日でお届け
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
                      ? quantity >= displayProduct.stockQuantity
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
                displayProduct.stockQuantity === 0 ||
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
                : displayProduct.stockQuantity === 0
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
