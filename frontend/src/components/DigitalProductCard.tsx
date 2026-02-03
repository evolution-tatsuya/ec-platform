import React from 'react';
import {
  Card,
  CardMedia,
  CardContent,
  Typography,
  Chip,
  Box,
} from '@mui/material';
import {
  PictureAsPdf,
  MusicNote,
  VideoLibrary,
  ConfirmationNumber,
} from '@mui/icons-material';
import type { DigitalProduct } from '../types';

interface DigitalProductCardProps {
  product: DigitalProduct;
  onClick: () => void;
}

/**
 * デジタル商品カードコンポーネント
 *
 * デジタル商品情報を表示するカード
 * - 商品画像
 * - 商品名、説明、価格
 * - 種類バッジ（PDF、音楽、動画、デジタルチケット）
 */
export const DigitalProductCard: React.FC<DigitalProductCardProps> = ({
  product,
  onClick,
}) => {
  const getDigitalTypeIcon = () => {
    switch (product.digitalType) {
      case 'PDF':
        return <PictureAsPdf sx={{ mr: 0.5, fontSize: 16 }} />;
      case '音楽':
        return <MusicNote sx={{ mr: 0.5, fontSize: 16 }} />;
      case '動画':
        return <VideoLibrary sx={{ mr: 0.5, fontSize: 16 }} />;
      case 'デジタルチケット':
        return <ConfirmationNumber sx={{ mr: 0.5, fontSize: 16 }} />;
      default:
        return null;
    }
  };

  const getDigitalTypeLabel = () => {
    switch (product.digitalType) {
      case 'PDF':
        return '📄 PDF';
      case '音楽':
        return '🎵 音楽';
      case '動画':
        return '🎬 動画';
      case 'デジタルチケット':
        return '🎫 チケット';
      default:
        return product.digitalType;
    }
  };

  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        borderRadius: 2,
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
    >
      <Box sx={{ position: 'relative' }}>
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
          {product.images.length > 0 ? (
            <img
              src={product.images[0]}
              alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            '商品画像'
          )}
        </CardMedia>

        <Chip
          icon={getDigitalTypeIcon() || undefined}
          label={getDigitalTypeLabel()}
          color="success"
          size="small"
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            fontWeight: 600,
          }}
        />
      </Box>

      <CardContent>
        <Typography
          variant="caption"
          color="primary"
          sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}
        >
          {product.genre}
        </Typography>

        <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
          {product.name}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 1.5,
            height: 40,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {product.description}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="h5" color="primary" sx={{ fontWeight: 700 }}>
            ¥{product.price.toLocaleString()}
          </Typography>

          <Typography variant="caption" color="text.secondary">
            即ダウンロード
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};
