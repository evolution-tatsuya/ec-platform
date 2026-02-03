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
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { useNavigate } from 'react-router-dom';
import { NavigationAxes, DigitalProductCard } from '../components';
import type { CategoryNavigationAxis, NavigationFilterState, DigitalProduct } from '../types';

/**
 * P-006: デジタル商品一覧ページ
 *
 * 機能:
 * - 2軸ナビゲーション（商品種類 → ジャンル）
 * - デジタル商品カード表示
 * - 並び替え
 * - ページネーション
 */
export const DigitalProductsListPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [filters, setFilters] = useState<NavigationFilterState>({
    productType: 'すべて',
    genre: 'すべて',
  });
  const [sortBy, setSortBy] = useState('人気順');
  const [currentPage, setCurrentPage] = useState(1);

  // モックデータ - ナビゲーション軸
  const navigationAxes: CategoryNavigationAxis[] = [
    {
      id: '1',
      categoryType: 'digital' as any,
      axisName: '商品種類',
      axisKey: 'productType',
      order: 1,
      axisType: 'select' as any,
      options: ['すべて', 'PDF', '音楽', '動画', 'デジタルチケット'],
      displayType: 'button' as any,
    },
    {
      id: '2',
      categoryType: 'digital' as any,
      axisName: 'ジャンル',
      axisKey: 'genre',
      order: 2,
      axisType: 'select' as any,
      options: ['すべて', 'ビジネス', '教育', 'エンタメ', '技術書'],
      displayType: 'button' as any,
    },
  ];

  // モックデータ - デジタル商品
  const products: DigitalProduct[] = [
    {
      id: '1',
      name: 'マーケティング戦略入門',
      description: '150ページ デジタル版',
      price: 1980,
      images: [],
      digitalType: 'PDF',
      genre: 'ビジネス',
      fileSize: '5MB',
      format: 'PDF',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      name: 'リラックスBGM集',
      description: '10曲収録 MP3形式',
      price: 1500,
      images: [],
      digitalType: '音楽',
      genre: 'エンタメ',
      fileSize: '50MB',
      format: 'MP3',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '3',
      name: 'Web開発入門講座',
      description: '5時間 フルHD画質',
      price: 4980,
      images: [],
      digitalType: '動画',
      genre: '教育',
      fileSize: '2GB',
      format: 'MP4',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '4',
      name: 'プログラミングセミナー',
      description: '2025年3月10日 オンライン',
      price: 3000,
      images: [],
      digitalType: 'デジタルチケット',
      genre: '教育',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '5',
      name: 'React完全ガイド',
      description: '300ページ サンプルコード付',
      price: 2800,
      images: [],
      digitalType: 'PDF',
      genre: '技術書',
      fileSize: '10MB',
      format: 'PDF',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '6',
      name: '効果音パック Vol.1',
      description: '100種類 WAV形式',
      price: 980,
      images: [],
      digitalType: '音楽',
      genre: 'エンタメ',
      fileSize: '200MB',
      format: 'WAV',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const handleFilterChange = (axisKey: string, value: string) => {
    setFilters((prev) => ({ ...prev, [axisKey]: value }));
  };

  const handleProductClick = () => {
    // TODO: 実際のデジタル商品データが実装されたら商品詳細ページに遷移
    // navigate(`/products/${productId}`);
    alert('デジタル商品詳細ページは現在準備中です');
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
            <Typography color="text.primary">デジタル商品一覧</Typography>
          </Breadcrumbs>
        </Paper>

        {/* ページタイトル */}
        <Paper elevation={2} sx={{ p: 4, mb: 3, borderRadius: 2, textAlign: 'center' }}>
          <Typography variant="h3" sx={{ mb: 1, fontWeight: 700 }}>
            💾 デジタル商品一覧
          </Typography>
          <Typography variant="body1" color="text.secondary">
            PDF、音楽、動画、デジタルチケットなど即時ダウンロード可能
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

        {/* 商品グリッド */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {products.map((product) => (
            <Grid xs={12} sm={6} md={4} key={product.id}>
              <DigitalProductCard product={product} onClick={() => handleProductClick()} />
            </Grid>
          ))}
        </Grid>

        {/* ページネーション */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination count={5} page={currentPage} onChange={(_, page) => setCurrentPage(page)} color="primary" size="large" />
        </Box>
      </Container>
    </Box>
  );
};

export default DigitalProductsListPage;
