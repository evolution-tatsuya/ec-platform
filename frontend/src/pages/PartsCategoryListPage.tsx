import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Breadcrumbs,
  Link,
  Paper,
  MenuItem,
  Select,
  FormControl,
  Pagination,
  CircularProgress,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { NavigationAxes, ProductCard } from '../components';
import type { CategoryNavigationAxis, NavigationFilterState } from '../types';
import { productAPI } from '../lib/api';

/**
 * P-004: パーツカテゴリー一覧ページ
 *
 * 機能:
 * - 2軸ナビゲーション（パーツ種類 + 対応車種フィルター）
 * - 並び替え
 * - ページネーション
 */
export const PartsCategoryListPage: React.FC = () => {
  const navigate = useNavigate();
  const { category: _category } = useParams<{ category: string }>();

  // State
  const [filters, setFilters] = useState<NavigationFilterState>({
    partsType: 'すべて',
    vehicle: 'すべて',
  });
  const [sortBy, setSortBy] = useState('人気順');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // バックエンドから商品データを取得
  const { data, isLoading, error } = useQuery({
    queryKey: ['products', { limit: ITEMS_PER_PAGE, offset: (currentPage - 1) * ITEMS_PER_PAGE }],
    queryFn: () =>
      productAPI.getProducts({
        limit: ITEMS_PER_PAGE,
        offset: (currentPage - 1) * ITEMS_PER_PAGE,
      }),
  });

  const products = data?.products || [];
  const totalPages = data?.pagination ? Math.ceil(data.pagination.total / ITEMS_PER_PAGE) : 1;

  // モックデータ - ナビゲーション軸（将来的にAPIから取得）
  const navigationAxes: CategoryNavigationAxis[] = [
    {
      id: '1',
      categoryType: 'cars' as any,
      axisName: 'パーツ種類',
      axisKey: 'partsType',
      order: 1,
      axisType: 'select' as any,
      options: ['すべて', 'ブレーキパッド', 'ブレーキローター', 'ブレーキフルード', 'キャリパー'],
      displayType: 'button' as any,
    },
    {
      id: '2',
      categoryType: 'cars' as any,
      axisName: '対応車種フィルター',
      axisKey: 'vehicle',
      order: 2,
      axisType: 'select' as any,
      options: ['すべて', 'トヨタ プリウス', 'ホンダ シビック', '日産 スカイライン', 'マツダ ロードスター'],
      displayType: 'button' as any,
    },
  ];

  const handleFilterChange = (axisKey: string, value: string) => {
    setFilters((prev) => ({ ...prev, [axisKey]: value }));
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', pt: 10 }}>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* パンくずリスト */}
        <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Breadcrumbs>
            <Link underline="hover" color="primary" sx={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
              トップ
            </Link>
            <Link underline="hover" color="primary" sx={{ cursor: 'pointer' }} onClick={() => navigate('/cars')}>
              車パーツ
            </Link>
            <Typography color="text.primary">ブレーキパーツ</Typography>
          </Breadcrumbs>
        </Paper>

        {/* ページタイトル */}
        <Paper elevation={2} sx={{ p: 4, mb: 3, borderRadius: 2 }}>
          <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
            🔧 ブレーキパーツ
          </Typography>
          <Typography variant="body1" color="text.secondary">
            ブレーキパッド、ブレーキローター、ブレーキフルードなど
          </Typography>
        </Paper>

        {/* ナビゲーション軸 */}
        <NavigationAxes axes={navigationAxes} filters={filters} onFilterChange={handleFilterChange} />

        {/* コントロール（結果数・並び替え） */}
        <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            検索結果: {products.length}件
          </Typography>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <MenuItem value="人気順">人気順</MenuItem>
              <MenuItem value="価格が安い順">価格が安い順</MenuItem>
              <MenuItem value="価格が高い順">価格が高い順</MenuItem>
              <MenuItem value="新着順">新着順</MenuItem>
            </Select>
          </FormControl>
        </Paper>

        {/* ローディング状態 */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={60} />
          </Box>
        )}

        {/* エラー状態 */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            商品データの取得に失敗しました: {error instanceof Error ? error.message : '不明なエラー'}
          </Alert>
        )}

        {/* 商品データが空の場合 */}
        {!isLoading && !error && products.length === 0 && (
          <Paper elevation={1} sx={{ p: 6, textAlign: 'center', mb: 3 }}>
            <Typography variant="h6" color="text.secondary">
              商品が見つかりませんでした
            </Typography>
          </Paper>
        )}

        {/* 商品グリッド */}
        {!isLoading && !error && products.length > 0 && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {products.map((product) => (
              <Grid xs={12} sm={6} md={4} key={product.id}>
                <ProductCard
                  id={product.id}
                  name={product.name}
                  category={product.category?.name || product.productType}
                  description={product.description || ''}
                  price={product.price}
                  imageUrl={product.images && product.images.length > 0 ? product.images[0] : undefined}
                  inStock={product.isActive}
                  stockText={product.isActive ? '在庫あり' : '在庫なし'}
                />
              </Grid>
            ))}
          </Grid>
        )}

        {/* ページネーション - 商品がある場合のみ表示 */}
        {!isLoading && !error && products.length > 0 && totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination count={totalPages} page={currentPage} onChange={(_, page) => setCurrentPage(page)} color="primary" size="large" />
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default PartsCategoryListPage;
