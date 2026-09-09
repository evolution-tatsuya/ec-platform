import { Box, Typography, CircularProgress, Alert, Chip, Button } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swiper from 'swiper';
import { Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/swiper-bundle.css';
import { topPageAPI } from '../lib/api';
import type { TopPageData } from '../types';

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
        setTopPageData(response.data as any);
      } catch (err) {
        console.error('トップページデータ取得エラー:', err);
        setError('データの読み込みに失敗しました。APIサーバーとの接続を確認してください。');
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

  const handleProductClick = (productId: string) => {
    // TODO: 実際の商品データが実装されたら商品詳細ページに遷移
    navigate(`/products/${productId}`);
  };

  const handleCategoryClick = (category: { linkUrl?: string; categoryType?: string }) => {
    // linkUrlが設定されていればそれを優先。無ければcategoryTypeから各総合ページへ。
    if (category.linkUrl) {
      navigate(category.linkUrl);
      return;
    }
    const routeMap: Record<string, string> = {
      cars: '/cars',
      events: '/events',
      digital: '/digital-products',
    };
    navigate(routeMap[category.categoryType || ''] || '/');
  };

  const handleNewsClick = (newsItem: { id: string; linkUrl?: string | null }) => {
    // 外部リンクが指定されていればそのURLへ、無ければ詳細ページへ
    if (newsItem.linkUrl) {
      window.open(newsItem.linkUrl, '_blank', 'noopener');
    } else {
      navigate(`/news/${newsItem.id}`);
    }
  };

  const NEWS_CATEGORY_LABELS: Record<string, string> = {
    new_product: '新商品',
    holiday: '休業',
    shipping: '発送案内',
    other: 'その他',
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

  // エラー表示
  if (error) {
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
        <Box className="swiper-wrapper" sx={{ height: '100%' }}>
          {topPageData.heroSlides.map((slide) => (
            <Box
              key={slide.id}
              className="swiper-slide"
              sx={{
                height: '100%',
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: slide.imageUrl
                    ? `url(${slide.imageUrl}) center/cover no-repeat`
                    : (slide as any).gradient ||
                      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontSize: 48,
                  fontWeight: 700,
                }}
              >
                {!slide.imageUrl && slide.title}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* メガカテゴリー選択（設定がある時のみ表示） */}
      {topPageData.megaCategories.length > 0 && (
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
              onClick={() => handleCategoryClick(category)}
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
      )}

      {/* ピックアップ商品（設定がある時のみ表示） */}
      {topPageData.pickupProducts.length > 0 && (
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
            borderLeft: '4px solid #7c4dff',
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
            // スライドを最も高いカードに合わせて揃える（新着商品グリッドと同じ挙動に）
            '& .swiper-slide': {
              height: 'auto',
            },
          }}
        >
          <Box className="swiper-wrapper" sx={{ alignItems: 'stretch' }}>
            {topPageData.pickupProducts.map((product) => (
              <Box
                key={product.id}
                className="swiper-slide"
                sx={{ display: 'flex', height: 'auto' }}
              >
                <Box
                  onClick={() => handleProductClick(product.id)}
                  sx={{
                    background: 'white',
                    borderRadius: 1,
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    // カードをスライド高さいっぱいに伸ばし、全カードの高さを揃える
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    '&:hover': {
                      boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: '100%',
                      height: 180,
                      flexShrink: 0,
                      background:
                        (product as any).gradient ||
                        (product.product.images && product.product.images[0]
                          ? `url(${product.product.images[0]}) center/cover no-repeat`
                          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 18,
                      fontWeight: 500,
                    }}
                  >
                    {!(product as any).gradient &&
                      (!product.product.images || !product.product.images[0]) &&
                      `商品画像`}
                  </Box>
                  {/* 商品情報: flexGrowで残り領域を埋め、価格を下端に揃える */}
                  <Box
                    sx={{
                      p: 2,
                      flexGrow: 1,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 16,
                        fontWeight: 500,
                        mb: 1,
                        color: '#333',
                      }}
                    >
                      {product.product.name}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: '#7c4dff',
                        mt: 'auto',
                      }}
                    >
                      ¥{product.product.price.toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
      )}

      {/* 新着商品 */}
      {topPageData.newProducts.length > 0 && (
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
            borderLeft: '4px solid #7c4dff',
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
                  background:
                    (product as any).gradient ||
                    (product.images && product.images[0]
                      ? `url(${product.images[0]}) center/cover no-repeat`
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 18,
                  fontWeight: 500,
                }}
              >
                {!(product as any).gradient &&
                  (!product.images || !product.images[0]) &&
                  `新着`}
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
                    color: '#7c4dff',
                  }}
                >
                  ¥{product.price.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      )}

      {/* セール商品 */}
      {topPageData.saleProducts.length > 0 && (
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
            borderLeft: '4px solid #7c4dff',
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
                  background:
                    (product as any).gradient ||
                    (product.images && product.images[0]
                      ? `url(${product.images[0]}) center/cover no-repeat`
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 18,
                  fontWeight: 500,
                }}
              >
                {!(product as any).gradient &&
                  (!product.images || !product.images[0]) &&
                  `セール`}
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
                    color: '#7c4dff',
                  }}
                >
                  ¥{product.price.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      )}

      {/* 人気商品 */}
      {topPageData.popularProducts.length > 0 && (
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
            borderLeft: '4px solid #7c4dff',
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
                  background:
                    (product as any).gradient ||
                    (product.images && product.images[0]
                      ? `url(${product.images[0]}) center/cover no-repeat`
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 18,
                  fontWeight: 500,
                }}
              >
                {!(product as any).gradient &&
                  (!product.images || !product.images[0]) &&
                  `人気`}
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
                    color: '#7c4dff',
                  }}
                >
                  ¥{product.price.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
      )}

      {/* お知らせ・ニュース（お知らせがある時のみ表示） */}
      {topPageData.news.length > 0 && (
        <Box
          component="section"
          sx={{
            maxWidth: 1200,
            margin: '48px auto 80px',
            padding: '0 16px',
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography
              variant="h4"
              component="h2"
              sx={{
                fontSize: 28,
                fontWeight: 700,
                color: '#333',
                borderLeft: '4px solid #7c4dff',
                pl: 2,
              }}
            >
              お知らせ・ニュース
            </Typography>
            <Button size="small" onClick={() => navigate('/news')}>
              すべて見る
            </Button>
          </Box>

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
                onClick={() => handleNewsClick(newsItem)}
                sx={{
                  py: 2,
                  borderBottom:
                    index !== topPageData.news.length - 1
                      ? '1px solid #e0e0e0'
                      : 'none',
                  display: 'flex',
                  alignItems: 'center',
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
                    minWidth: 100,
                  }}
                >
                  {new Date(newsItem.publishedAt).toLocaleDateString('ja-JP')}
                </Typography>
                <Chip
                  size="small"
                  label={NEWS_CATEGORY_LABELS[(newsItem as any).category] || 'お知らせ'}
                  sx={{ minWidth: 72 }}
                />
                <Typography
                  sx={{
                    fontSize: 16,
                    fontWeight: 500,
                    color: '#333',
                    flex: 1,
                  }}
                >
                  {newsItem.title}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
