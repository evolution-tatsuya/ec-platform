import React from 'react';
import { Box, Card, CardContent, CardMedia, Typography, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface ProductCardProps {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  imageUrl?: string;
  inStock?: boolean;
  stockText?: string;
}

/**
 * 商品カードコンポーネント
 *
 * 機能:
 * - 商品画像表示（未設定時はグラデーション背景）
 * - カテゴリーラベル表示
 * - 商品名、説明、価格表示
 * - 在庫状態表示
 * - クリック時に商品詳細ページへ遷移
 * - ホバー時にカード浮き上がりアニメーション
 */
export const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  category,
  description,
  price,
  imageUrl,
  inStock = true,
  stockText = '在庫あり',
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/products/${id}`);
  };

  const formatPrice = (price: number) => {
    return `¥${price.toLocaleString()}`;
  };

  return (
    <Card
      onClick={handleClick}
      sx={{
        cursor: 'pointer',
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        },
      }}
    >
      {/* 商品画像 */}
      <CardMedia
        sx={{
          height: 180,
          background: imageUrl
            ? 'none'
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 18,
          fontWeight: 500,
        }}
        image={imageUrl}
      >
        {!imageUrl && name}
      </CardMedia>

      {/* 商品情報 */}
      <CardContent sx={{ p: 2 }}>
        {/* カテゴリー */}
        <Typography
          variant="caption"
          sx={{
            color: 'primary.main',
            fontSize: 12,
            mb: 0.5,
            display: 'block',
          }}
        >
          {category}
        </Typography>

        {/* 商品名 */}
        <Typography
          variant="h6"
          sx={{
            fontSize: 16,
            fontWeight: 'bold',
            mb: 1,
            color: '#333',
          }}
        >
          {name}
        </Typography>

        {/* 説明 */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 1.5,
            height: 40,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {description}
        </Typography>

        {/* フッター（価格 + 在庫） */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* 価格 */}
          <Typography
            variant="h6"
            sx={{
              fontSize: 20,
              fontWeight: 'bold',
              color: 'primary.main',
            }}
          >
            {formatPrice(price)}
          </Typography>

          {/* 在庫状態 */}
          <Chip
            label={stockText}
            size="small"
            sx={{
              fontSize: 12,
              fontWeight: 600,
              bgcolor: inStock ? '#e8f5e9' : '#ffebee',
              color: inStock ? '#4caf50' : '#f44336',
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};
