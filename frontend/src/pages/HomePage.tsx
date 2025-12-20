import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Card,
  CardActionArea,
  CardContent,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import EventIcon from '@mui/icons-material/Event';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';

interface CategoryCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  path: string;
}

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const categories: CategoryCard[] = [
    {
      title: '車パーツ',
      description: '高品質な車パーツを豊富に取り揃えています',
      icon: <DirectionsCarIcon sx={{ fontSize: 80 }} />,
      color: '#1976d2',
      path: '/cars',
    },
    {
      title: 'イベント',
      description: '様々なイベントに参加しよう',
      icon: <EventIcon sx={{ fontSize: 80 }} />,
      color: '#9c27b0',
      path: '/events',
    },
    {
      title: 'デジタル商品',
      description: 'すぐに使えるデジタルコンテンツ',
      icon: <CloudDownloadIcon sx={{ fontSize: 80 }} />,
      color: '#2e7d32',
      path: '/digital',
    },
  ];

  return (
    <Box>
      {/* ヒーローセクション */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          py: 8,
          mb: 6,
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="h2"
            component="h1"
            gutterBottom
            sx={{ fontWeight: 'bold' }}
          >
            多機能ECプラットフォーム
          </Typography>
          <Typography variant="h5" sx={{ mt: 2, opacity: 0.9 }}>
            車パーツからイベント参加まで、すべてをここで
          </Typography>
        </Container>
      </Box>

      {/* カテゴリーセクション */}
      <Container maxWidth="lg" sx={{ pb: 8 }}>
        <Typography
          variant="h4"
          component="h2"
          gutterBottom
          sx={{ mb: 4, textAlign: 'center' }}
        >
          カテゴリーから探す
        </Typography>

        <Grid container spacing={4}>
          {categories.map((category) => (
            <Grid item xs={12} md={4} key={category.title}>
              <Card
                sx={{
                  height: '100%',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 6,
                  },
                }}
              >
                <CardActionArea
                  onClick={() => navigate(category.path)}
                  sx={{ height: '100%' }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      bgcolor: category.color,
                      color: 'white',
                      py: 4,
                    }}
                  >
                    {category.icon}
                  </Box>
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <Typography
                      variant="h5"
                      component="h3"
                      gutterBottom
                      sx={{ fontWeight: 'bold' }}
                    >
                      {category.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {category.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* サービス紹介セクション */}
        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <Typography variant="h4" component="h2" gutterBottom sx={{ mb: 4 }}>
            私たちのサービス
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  豊富な品揃え
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  車パーツから限定イベントまで、幅広い商品を取り扱っています
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  安心の決済
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  銀行振込・クレジットカードに対応。安全な決済システムを提供
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  迅速な配送
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  配達日時指定も可能。お客様のご都合に合わせてお届けします
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
};
