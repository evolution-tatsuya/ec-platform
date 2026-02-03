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
import Grid from '@mui/material/GridLegacy';
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

        {/* 二軸ナビゲーション */}
        <Grid container spacing={ 3} sx={{ mb: 5 }}>
          {/* 車種から探す */}
          <Grid xs={12} md={6}>
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
          </Grid>

          {/* パーツから探す */}
          <Grid xs={12} md={6}>
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
          </Grid>
        </Grid>

        {/* 注目車種 */}
        <Box sx={{ mb: 5 }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
            注目車種
          </Typography>

          <Grid container spacing={3}>
            {featuredCars.map((car) => (
              <Grid xs={12} sm={6} md={3} key={car.id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    borderRadius: 2,
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                    },
                  }}
                  onClick={() => navigate(`/cars/${car.maker}/${car.name}/${car.model}`)}
                >
                  <Box
                    sx={{
                      height: 200,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                    }}
                  >
                    <DirectionsCar sx={{ fontSize: 64 }} />
                  </Box>

                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {car.maker} {car.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {car.model} / {car.years}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
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

          <Grid container spacing={2.5}>
            {newParts.map((part) => (
              <Grid xs={12} sm={6} md={3} key={part.id}>
                <Card
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
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
    </Box>
  );
};

export default CarsTopPage;
