import React from 'react';
import {
  Card,
  CardMedia,
  CardContent,
  Typography,
  Chip,
  Box,
  Button,
} from '@mui/material';
import { Event as CalendarIcon, LocationOn, People } from '@mui/icons-material';
import type { Event } from '../types';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface EventCardProps {
  event: Event;
  onClick: () => void;
}

/**
 * イベントカードコンポーネント
 *
 * イベント情報を表示するカード
 * - イベント画像
 * - イベント名、日時、場所、定員情報
 * - 受付状況バッジ
 */
export const EventCard: React.FC<EventCardProps> = ({ event, onClick }) => {
  const isAlmostFull = event.remainingCapacity < event.capacity * 0.2;
  const isFull = event.remainingCapacity === 0;

  const getBadgeColor = () => {
    if (isFull) return 'error';
    if (isAlmostFull) return 'warning';
    return 'success';
  };

  const getBadgeLabel = () => {
    if (isFull) return '満員';
    if (isAlmostFull) return '残りわずか';
    return '受付中';
  };

  const formatEventDate = () => {
    const start = format(new Date(event.startDate), 'yyyy年M月d日', { locale: ja });
    const end = format(new Date(event.endDate), 'yyyy年M月d日', { locale: ja });

    if (start === end) {
      return start;
    }
    return `${start}〜${end}`;
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
      <CardMedia
        component="div"
        sx={{
          height: 200,
          background: 'linear-gradient(135deg, #667eea40 0%, #764ba240 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999',
          fontSize: 14,
        }}
      >
        {event.images.length > 0 ? (
          <img
            src={event.images[0]}
            alt={event.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          'イベント画像'
        )}
      </CardMedia>

      <CardContent>
        <Chip
          label={getBadgeLabel()}
          color={getBadgeColor()}
          size="small"
          sx={{ mb: 1, fontWeight: 600 }}
        />

        <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600 }}>
          {event.name}
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <CalendarIcon sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {formatEventDate()}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <LocationOn sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {event.location}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <People sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              定員: {event.capacity.toLocaleString()}名
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pt: 2,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="h5" color="primary" sx={{ fontWeight: 700 }}>
            ¥{event.price.toLocaleString()}
          </Typography>

          <Button
            variant="contained"
            size="small"
            disabled={isFull}
            sx={{ borderRadius: 2 }}
          >
            詳細を見る
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
