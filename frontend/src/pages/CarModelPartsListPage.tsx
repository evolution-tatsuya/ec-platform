import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Breadcrumbs,
  Link,
  Paper,
  MenuItem,
  Select,
  FormControl,
  Pagination,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { useNavigate, useParams } from 'react-router-dom';
import { NavigationAxes, TagFilter } from '../components';
import type { CategoryNavigationAxis, NavigationFilterState, Tag } from '../types';

/**
 * P-003: 車種別パーツ一覧ページ
 *
 * 機能:
 * - 4軸ナビゲーション（メーカー→車種→型式→パーツ種類）
 * - タグフィルター
 * - 並び替え
 * - ページネーション
 */
export const CarModelPartsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { maker, model, type } = useParams<{ maker: string; model: string; type: string }>();

  // State
  const [filters, setFilters] = useState<NavigationFilterState>({
    maker: maker || 'トヨタ',
    model: model || 'プリウス',
    type: type || '',
    partsType: 'すべて',
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('人気順');
  const [currentPage, setCurrentPage] = useState(1);

  // モックデータ - ナビゲーション軸
  const navigationAxes: CategoryNavigationAxis[] = [
    {
      id: '1',
      categoryType: 'cars' as any,
      axisName: 'メーカー',
      axisKey: 'maker',
      order: 1,
      axisType: 'select' as any,
      options: ['トヨタ', 'ホンダ', '日産', 'マツダ', 'スバル'],
      displayType: 'button' as any,
    },
    {
      id: '2',
      categoryType: 'cars' as any,
      axisName: '車種',
      axisKey: 'model',
      order: 2,
      axisType: 'select' as any,
      options: ['プリウス', 'カローラ', 'クラウン', 'ハリアー'],
      displayType: 'button' as any,
    },
    {
      id: '3',
      categoryType: 'cars' as any,
      axisName: '型式',
      axisKey: 'type',
      order: 3,
      axisType: 'select' as any,
      options: ['ZVW30 (2009-2015)', 'ZVW50 (2015-2018)', 'ZVW51 (2015-2018)'],
      displayType: 'button' as any,
    },
    {
      id: '4',
      categoryType: 'cars' as any,
      axisName: 'パーツ種類',
      axisKey: 'partsType',
      order: 4,
      axisType: 'select' as any,
      options: ['すべて', 'エンジン', 'ブレーキ', '外装', '内装'],
      displayType: 'button' as any,
    },
  ];

  // モックデータ - タグ
  const tags: Tag[] = [
    { id: '1', name: 'セール' },
    { id: '2', name: '純正品' },
    { id: '3', name: '送料無料' },
    { id: '4', name: '新商品' },
  ];

  // モックデータ - 商品
  const products = [
    { id: '1', name: 'ブレーキパッド フロント', category: 'ブレーキパーツ', description: 'プリウス ZVW30専用 純正品質', price: 12800, stock: '在庫あり' },
    { id: '2', name: 'エアフィルター', category: 'エンジンパーツ', description: '高効率フィルター 長寿命タイプ', price: 3200, stock: '在庫あり' },
    { id: '3', name: 'スパークプラグ 4本セット', category: 'エンジンパーツ', description: 'NGK製 イリジウムプラグ', price: 4800, stock: '在庫あり' },
    { id: '4', name: 'ワイパーブレード', category: '外装パーツ', description: '撥水コーティング仕様', price: 2400, stock: '残り3個' },
    { id: '5', name: 'ブレーキローター リア', category: 'ブレーキパーツ', description: 'スリット入り 冷却性能向上', price: 18500, stock: '在庫あり' },
    { id: '6', name: 'フロアマット セット', category: '内装パーツ', description: '高級絨毯生地 防水加工', price: 8900, stock: '在庫あり' },
  ];

  const handleFilterChange = (axisKey: string, value: string) => {
    setFilters((prev) => ({ ...prev, [axisKey]: value }));
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
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
            <Link underline="hover" color="primary" sx={{ cursor: 'pointer' }}>
              {filters.maker}
            </Link>
            <Link underline="hover" color="primary" sx={{ cursor: 'pointer' }}>
              {filters.model}
            </Link>
            <Typography color="text.primary">ZVW30</Typography>
          </Breadcrumbs>
        </Paper>

        {/* ナビゲーション軸 */}
        <NavigationAxes axes={navigationAxes} filters={filters} onFilterChange={handleFilterChange} />

        {/* タグフィルター */}
        <TagFilter tags={tags} selectedTags={selectedTags} onTagToggle={handleTagToggle} />

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
              <Card
                sx={{
                  cursor: 'pointer',
                  borderRadius: 2,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
                onClick={() => {
                  // TODO: 実際の商品データが実装されたら商品詳細ページに遷移
                  // navigate(`/products/${product.id}`);
                  navigate('/cars/parts/categories');
                }}
              >
                <CardMedia
                  component="div"
                  sx={{
                    height: 220,
                    background: 'linear-gradient(135deg, #667eea30 0%, #764ba230 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#999',
                    fontSize: 14,
                  }}
                >
                  商品画像
                </CardMedia>

                <CardContent>
                  <Typography variant="caption" color="primary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
                    {product.category}
                  </Typography>

                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, fontSize: '1rem' }}>
                    {product.name}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, height: 40, overflow: 'hidden' }}>
                    {product.description}
                  </Typography>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" color="primary" sx={{ fontWeight: 700 }}>
                      ¥{product.price.toLocaleString()}
                    </Typography>

                    <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                      {product.stock}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* ページネーション */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination count={4} page={currentPage} onChange={(_, page) => setCurrentPage(page)} color="primary" size="large" />
        </Box>
      </Container>
    </Box>
  );
};

export default CarModelPartsListPage;
