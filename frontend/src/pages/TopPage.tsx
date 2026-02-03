import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swiper from 'swiper';
import { Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/swiper-bundle.css';
import { topPageAPI, type TopPageData } from '../lib/api';

// モックデータ（フォールバック用）
const mockTopPageData = {
  heroSlides: [
    {
      id: '1',
      imageUrl: '',
      title: 'スライド 1',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    {
      id: '2',
      imageUrl: '',
      title: 'スライド 2',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    },
    {
      id: '3',
      imageUrl: '',
      title: 'スライド 3',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    },
  ],
  megaCategories: [
    {
      id: '1',
      name: '車パーツ',
      description: '高品質な純正・社外パーツを\nメーカー・車種から簡単検索',
      backgroundImageUrl:
        'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&h=600&fit=crop&q=80',
      linkUrl: '/cars',
    },
    {
      id: '2',
      name: 'イベント',
      description: 'カーイベント・ミーティング\nチケット＆エントリー受付',
      backgroundImageUrl:
        'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=600&fit=crop&q=80',
      linkUrl: '/events',
    },
    {
      id: '3',
      name: 'デジタル商品',
      description: '整備マニュアル・写真集\n即座にダウンロード可能',
      backgroundImageUrl:
        'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&h=600&fit=crop&q=80',
      linkUrl: '/digital',
    },
  ],
  pickupProducts: [
    {
      id: '1',
      name: 'サンプル商品 1',
      price: 12800,
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    {
      id: '2',
      name: 'サンプル商品 2',
      price: 24500,
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    },
    {
      id: '3',
      name: 'サンプル商品 3',
      price: 8900,
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    },
    {
      id: '4',
      name: 'サンプル商品 4',
      price: 18300,
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    },
  ],
  newProducts: [
    {
      id: '1',
      name: '新着商品 1',
      price: 9800,
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    {
      id: '2',
      name: '新着商品 2',
      price: 15600,
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    },
    {
      id: '3',
      name: '新着商品 3',
      price: 22400,
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    },
    {
      id: '4',
      name: '新着商品 4',
      price: 12900,
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    },
  ],
  saleProducts: [
    {
      id: '1',
      name: 'セール商品 1',
      price: 7200,
      gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)',
    },
    {
      id: '2',
      name: 'セール商品 2',
      price: 11800,
      gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    },
    {
      id: '3',
      name: 'セール商品 3',
      price: 5400,
      gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    },
    {
      id: '4',
      name: 'セール商品 4',
      price: 9600,
      gradient: 'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)',
    },
  ],
  popularProducts: [
    {
      id: '1',
      name: '人気商品 1',
      price: 14200,
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    {
      id: '2',
      name: '人気商品 2',
      price: 19800,
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    },
    {
      id: '3',
      name: '人気商品 3',
      price: 16500,
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    },
    {
      id: '4',
      name: '人気商品 4',
      price: 21300,
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    },
  ],
  news: [
    { id: '1', date: '2025年12月20日', title: '年末年始の営業時間について' },
    { id: '2', date: '2025年12月18日', title: '新商品100点追加しました' },
    { id: '3', date: '2025年12月15日', title: 'ウィンターセール開催中' },
    { id: '4', date: '2025年12月10日', title: '配送料金改定のお知らせ' },
    { id: '5', date: '2025年12月05日', title: '会員特典プログラム開始' },
  ],
};

export default function TopPage() {
  const navigate = useNavigate();
  const heroSwiperRef = useRef<HTMLDivElement>(null);
  const pickupSwiperRef = useRef<HTMLDivElement>(null);

  // API統合: トップページデータを取得
  const [topPageData, setTopPageData] = useState<TopPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // トップページデータ取得
  useEffect(() => {
    const fetchTopPageData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await topPageAPI.getTopPageData();
        setTopPageData(response.data);
      } catch (err) {
        console.error('トップページデータ取得エラー:', err);
        setError('データの読み込みに失敗しました');
        // フォールバック: モックデータを使用
        setTopPageData(mockTopPageData as any);
      } finally {
        setLoading(false);
      }
    };

    fetchTopPageData();
  }, []);

  // Swiperの初期化はデータ取得後に実行
  useEffect(() => {
    if (!topPageData) return;
    // ヒーローセクションのスライダー（6秒切替、自動再生）
    if (heroSwiperRef.current) {
      new Swiper(heroSwiperRef.current, {
        modules: [Autoplay, EffectFade],
        loop: true,
        autoplay: {
          delay: 6000,
          disableOnInteraction: false,
        },
        effect: 'fade',
        fadeEffect: {
          crossFade: true,
        },
      });
    }

    // ピックアップ商品のスライダー（横スクロール）
    if (pickupSwiperRef.current) {
      new Swiper(pickupSwiperRef.current, {
        slidesPerView: 1,
        spaceBetween: 16,
        breakpoints: {
          640: {
            slidesPerView: 2,
            spaceBetween: 16,
          },
          768: {
            slidesPerView: 3,
            spaceBetween: 24,
          },
          1024: {
            slidesPerView: 4,
            spaceBetween: 24,
          },
        },
      });
    }
  }, [topPageData]);

  const handleProductClick = () => {
    // TODO: 実際の商品データが実装されたら商品詳細ページに遷移
    navigate('/cars/parts/categories');
  };

  const handleCategoryClick = (linkUrl: string) => {
    navigate(linkUrl);
  };

  const handleNewsClick = (newsId: string) => {
    navigate(`/news/${newsId}`);
  };

  // ローディング表示
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pt: 8,
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  // エラー表示（フォールバックでモックデータを使用）
  if (error && !topPageData) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pt: 8,
          px: 2,
        }}
      >
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  // データがない場合は何も表示しない
  if (!topPageData) {
    return null;
  }

  return (
    <Box
      sx={{
        pt: 8,
        pb: 10,
        backgroundColor: '#f5f5f5',
      }}
    >
      {/* ヒーローセクション */}
      <Box
        ref={heroSwiperRef}
        className="swiper"
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: 1200,
          margin: '24px auto',
          height: 400,
          background: 'white',
          borderRadius: 1,
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <Box className="swiper-wrapper">
          {topPageData.heroSlides.map((slide) => (
            <Box key={slide.id} className="swiper-slide">
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: slide.gradient,
                  color: 'white',
                  fontSize: 48,
                  fontWeight: 700,
                }}
              >
                {slide.title}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* メガカテゴリー選択 */}
      <Box
        component="section"
        sx={{
          maxWidth: 1200,
          margin: '40px auto',
          padding: '0 16px',
        }}
      >
        <Typography
          variant="h4"
          component="h2"
          sx={{
            fontSize: 28,
            fontWeight: 700,
            mb: 3,
            textAlign: 'center',
            color: '#333',
          }}
        >
          カテゴリーから探す
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 3,
          }}
        >
          {topPageData.megaCategories.map((category) => (
            <Box
              key={category.id}
              onClick={() => handleCategoryClick(category.linkUrl)}
              sx={{
                position: 'relative',
                height: 320,
                borderRadius: 1.5,
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                '&:hover': {
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  '& .mega-bg-image': {
                    transform: 'scale(1.1)',
                  },
                },
              }}
            >
              <Box
                component="img"
                src={category.backgroundImageUrl}
                alt={category.name}
                className="mega-bg-image"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transition: 'transform 0.5s ease',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background:
                    'linear-gradient(to bottom, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.6) 100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  p: 3,
                  textAlign: 'center',
                }}
              >
                <Typography
                  sx={{
                    fontSize: 32,
                    fontWeight: 700,
                    color: 'white',
                    mb: 1.5,
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
                  }}
                >
                  {category.name}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 16,
                    fontWeight: 400,
                    color: 'rgba(255, 255, 255, 0.95)',
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {category.description}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ピックアップ商品 */}
      <Box
        component="section"
        sx={{
          maxWidth: 1200,
          margin: '48px auto',
          padding: '0 16px',
        }}
      >
        <Typography
          variant="h4"
          component="h2"
          sx={{
            fontSize: 28,
            fontWeight: 700,
            mb: 3,
            color: '#333',
            borderLeft: '4px solid #1976d2',
            pl: 2,
          }}
        >
          ピックアップ商品
        </Typography>

        <Box
          ref={pickupSwiperRef}
          className="swiper"
          sx={{
            width: '100%',
            height: 320,
          }}
        >
          <Box className="swiper-wrapper">
            {topPageData.pickupProducts.map((product) => (
              <Box key={product.id} className="swiper-slide">
                <Box
                  onClick={() => handleProductClick()}
                  sx={{
                    background: 'white',
                    borderRadius: 1,
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: '100%',
                      height: 180,
                      background: product.gradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 18,
                      fontWeight: 500,
                    }}
                  >
                    商品画像 {product.id}
                  </Box>
                  <Box sx={{ p: 2 }}>
                    <Typography
                      sx={{
                        fontSize: 16,
                        fontWeight: 500,
                        mb: 1,
                        color: '#333',
                      }}
                    >
                      {product.name}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: '#1976d2',
                      }}
                    >
                      ¥{product.price.toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* 新着商品 */}
      <Box
        component="section"
        sx={{
          maxWidth: 1200,
          margin: '48px auto',
          padding: '0 16px',
        }}
      >
        <Typography
          variant="h4"
          component="h2"
          sx={{
            fontSize: 28,
            fontWeight: 700,
            mb: 3,
            color: '#333',
            borderLeft: '4px solid #1976d2',
            pl: 2,
          }}
        >
          新着商品
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 3,
          }}
        >
          {topPageData.newProducts.map((product) => (
            <Box
              key={product.id}
              onClick={() => handleProductClick(product.id)}
              sx={{
                background: 'white',
                borderRadius: 1,
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                },
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  height: 180,
                  background: product.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 18,
                  fontWeight: 500,
                }}
              >
                新着 {product.id}
              </Box>
              <Box sx={{ p: 2 }}>
                <Typography
                  sx={{
                    fontSize: 16,
                    fontWeight: 500,
                    mb: 1,
                    color: '#333',
                  }}
                >
                  {product.name}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: '#1976d2',
                  }}
                >
                  ¥{product.price.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* セール商品 */}
      <Box
        component="section"
        sx={{
          maxWidth: 1200,
          margin: '48px auto',
          padding: '0 16px',
        }}
      >
        <Typography
          variant="h4"
          component="h2"
          sx={{
            fontSize: 28,
            fontWeight: 700,
            mb: 3,
            color: '#333',
            borderLeft: '4px solid #1976d2',
            pl: 2,
          }}
        >
          セール商品
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 3,
          }}
        >
          {topPageData.saleProducts.map((product) => (
            <Box
              key={product.id}
              onClick={() => handleProductClick(product.id)}
              sx={{
                background: 'white',
                borderRadius: 1,
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                },
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  height: 180,
                  background: product.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 18,
                  fontWeight: 500,
                }}
              >
                セール {product.id}
              </Box>
              <Box sx={{ p: 2 }}>
                <Typography
                  sx={{
                    fontSize: 16,
                    fontWeight: 500,
                    mb: 1,
                    color: '#333',
                  }}
                >
                  {product.name}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: '#1976d2',
                  }}
                >
                  ¥{product.price.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* 人気商品 */}
      <Box
        component="section"
        sx={{
          maxWidth: 1200,
          margin: '48px auto',
          padding: '0 16px',
        }}
      >
        <Typography
          variant="h4"
          component="h2"
          sx={{
            fontSize: 28,
            fontWeight: 700,
            mb: 3,
            color: '#333',
            borderLeft: '4px solid #1976d2',
            pl: 2,
          }}
        >
          人気商品
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 3,
          }}
        >
          {topPageData.popularProducts.map((product) => (
            <Box
              key={product.id}
              onClick={() => handleProductClick(product.id)}
              sx={{
                background: 'white',
                borderRadius: 1,
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                },
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  height: 180,
                  background: product.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 18,
                  fontWeight: 500,
                }}
              >
                人気 {product.id}
              </Box>
              <Box sx={{ p: 2 }}>
                <Typography
                  sx={{
                    fontSize: 16,
                    fontWeight: 500,
                    mb: 1,
                    color: '#333',
                  }}
                >
                  {product.name}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: '#1976d2',
                  }}
                >
                  ¥{product.price.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* お知らせ・ニュース */}
      <Box
        component="section"
        sx={{
          maxWidth: 1200,
          margin: '48px auto 80px',
          padding: '0 16px',
        }}
      >
        <Typography
          variant="h4"
          component="h2"
          sx={{
            fontSize: 28,
            fontWeight: 700,
            mb: 3,
            color: '#333',
            borderLeft: '4px solid #1976d2',
            pl: 2,
          }}
        >
          お知らせ・ニュース
        </Typography>

        <Box
          sx={{
            background: 'white',
            borderRadius: 1,
            p: 3,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          {topPageData.news.map((newsItem, index) => (
            <Box
              key={newsItem.id}
              onClick={() => handleNewsClick(newsItem.id)}
              sx={{
                py: 2,
                borderBottom:
                  index !== topPageData.news.length - 1
                    ? '1px solid #e0e0e0'
                    : 'none',
                display: 'flex',
                gap: 2,
                cursor: 'pointer',
                transition: 'background 0.2s ease',
                '&:hover': {
                  background: '#f5f5f5',
                },
              }}
            >
              <Typography
                sx={{
                  fontSize: 14,
                  color: '#757575',
                  minWidth: 120,
                }}
              >
                {newsItem.date}
              </Typography>
              <Typography
                sx={{
                  fontSize: 16,
                  fontWeight: 500,
                  color: '#333',
                }}
              >
                {newsItem.title}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
