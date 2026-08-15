import React from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Breadcrumbs,
  Link,
  Paper,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { DirectionsCar, Build } from '@mui/icons-material';

/**
 * P-002: 車パーツトップページ
 *
 * 機能:
 * - 二軸ナビゲーション（車種から/パーツから）
 * - 注目車種表示
 * - タグクラウド
 * - 新着パーツ表示
 */
export const CarsTopPage: React.FC = () => {
  const navigate = useNavigate();

  // モックデータ
  const featuredCars = [
    { id: 1, maker: 'トヨタ', name: 'プリウス', model: 'ZVW30', years: '2009-2015' },
    { id: 2, maker: 'ホンダ', name: 'シビック', model: 'FK7', years: '2017-2021' },
    { id: 3, maker: '日産', name: 'スカイライン', model: 'R34', years: '1998-2002' },
    { id: 4, maker: 'マツダ', name: 'ロードスター', model: 'ND5RC', years: '2015-' },
  ];

  const popularTags = [
    'セール',
    '新商品',
    '送料無料',
    '在庫処分',
    '純正品',
    '社外品',
    'チューニング',
    'メンテナンス',
  ];

  const newParts = [
    { id: 1, name: 'ブレーキパッド（フロント）', price: 12800, stock: 5 },
    { id: 2, name: 'エアフィルター', price: 3200, stock: 10 },
    { id: 3, name: 'スパークプラグ 4本セット', price: 4800, stock: 8 },
    { id: 4, name: 'ワイパーブレード', price: 2400, stock: 15 },
  ];

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', pt: 10 }}>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* パンくずリスト */}
        <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Breadcrumbs>
            <Link
              underline="hover"
              color="primary"
              sx={{ cursor: 'pointer' }}
              onClick={() => navigate('/')}
            >
              トップ
            </Link>
            <Typography color="text.primary">車パーツ</Typography>
          </Breadcrumbs>
        </Paper>

        {/* ページタイトル */}
        <Paper elevation={2} sx={{ p: 4, mb: 3, borderRadius: 2, textAlign: 'center' }}>
          <Typography variant="h3" sx={{ mb: 1, fontWeight: 700 }}>
            🚗 車パーツトップ
          </Typography>
          <Typography variant="body1" color="text.secondary">
            お探しのパーツを車種別またはパーツ種類別に検索できます
          </Typography>
        </Paper>

        {/* 二軸ナビゲーション（CSS Gridでカード間の余白を確実に確保） */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 3,
            mb: 5,
          }}
        >
          {/* 車種から探す */}
            <Card
              elevation={3}
              sx={{
                p: 4,
                height: '100%',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
              onClick={() => navigate('/cars/search/by-model')}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DirectionsCar sx={{ fontSize: 32, mr: 1, color: 'primary.main' }} />
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  車種から探す
                </Typography>
              </Box>

              <Box component="ul" sx={{ pl: 2, mb: 3 }}>
                <li>メーカーを選択</li>
                <li>車種を選択</li>
                <li>型式を選択</li>
                <li>パーツ種類を選択</li>
              </Box>

              <Button
                variant="contained"
                fullWidth
                size="large"
                sx={{ borderRadius: 2 }}
              >
                車種から探す
              </Button>
            </Card>

          {/* パーツから探す */}
            <Card
              elevation={3}
              sx={{
                p: 4,
                height: '100%',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
              onClick={() => navigate('/cars/search/by-category')}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Build sx={{ fontSize: 32, mr: 1, color: 'primary.main' }} />
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  パーツから探す
                </Typography>
              </Box>

              <Box component="ul" sx={{ pl: 2, mb: 3 }}>
                <li>エンジンパーツ</li>
                <li>ブレーキパーツ</li>
                <li>外装パーツ</li>
                <li>内装パーツ</li>
              </Box>

              <Button
                variant="contained"
                fullWidth
                size="large"
                sx={{ borderRadius: 2 }}
              >
                パーツから探す
              </Button>
            </Card>
        </Box>

        {/* 注目車種 */}
        <Box sx={{ mb: 5, mt: 2 }}>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
            注目車種
          </Typography>

          {/* トップページと同じCSS Gridでカード間の余白を確実に確保 */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: 3,
            }}
          >
            {featuredCars.map((car) => (
              <Card
                key={car.id}
                sx={{
                  // トップページの商品カードと同じスタイルに統一
                  borderRadius: 1,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                  },
                }}
                onClick={() => navigate(`/cars/${car.maker}/${car.name}/${car.model}`)}
              >
                {/* 画像部分: トップページと同じ 高さ180px + 中央テキスト */}
                <Box
                  sx={{
                    width: '100%',
                    height: 180,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 18,
                    fontWeight: 500,
                  }}
                >
                  車種画像
                </Box>

                {/* 情報部分: トップページと同じ p:2 + fontSize統一 */}
                <Box sx={{ p: 2 }}>
                  <Typography sx={{ fontSize: 16, fontWeight: 500, mb: 1, color: '#333' }}>
                    {car.maker} {car.name}
                  </Typography>
                  <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
                    {car.model} / {car.years}
                  </Typography>
                </Box>
              </Card>
            ))}
          </Box>
        </Box>

        {/* タグクラウド */}
        <Paper elevation={2} sx={{ p: 3, mb: 5, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            人気タグ
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {popularTags.map((tag) => (
              <Chip
                key={tag}
                label={`#${tag}`}
                onClick={() => navigate(`/cars/search?tag=${tag}`)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'primary.main',
                    color: 'white',
                  },
                }}
              />
            ))}
          </Box>
        </Paper>

        {/* 新着パーツ */}
        <Box>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
            新着パーツ
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 2.5,
            }}
          >
            {newParts.map((part) => (
                <Card
                  key={part.id}
                  sx={{
                    cursor: 'pointer',
                    borderRadius: 2,
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                    },
                  }}
                  onClick={() => navigate('/cars/parts/categories')}
                >
                  <Box
                    sx={{
                      height: 200,
                      background: 'linear-gradient(135deg, #667eea30 0%, #764ba230 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#999',
                      fontSize: 14,
                    }}
                  >
                    パーツ画像
                  </Box>

                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                      {part.name}
                    </Typography>

                    <Typography variant="h6" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
                      ¥{part.price.toLocaleString()}
                    </Typography>

                    <Typography variant="caption" color="text.secondary">
                      在庫: {part.stock}個
                    </Typography>
                  </CardContent>
                </Card>
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default CarsTopPage;
