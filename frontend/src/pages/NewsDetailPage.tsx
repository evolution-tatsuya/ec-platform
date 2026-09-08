import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Box, Button, Chip, CircularProgress, Typography } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { format } from 'date-fns';
import { getPublicNewsById, NEWS_CATEGORY_LABELS } from '../services/api/news';
import type { NewsCategory } from '../types';

const NewsDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: news, isLoading, error } = useQuery({
    queryKey: ['publicNews', id],
    queryFn: () => getPublicNewsById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !news) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', p: 4, textAlign: 'center' }}>
        <Typography color="error" mb={2}>
          お知らせが見つかりませんでした
        </Typography>
        <Button variant="contained" onClick={() => navigate('/')}>
          トップへ戻る
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: { xs: 2, md: 4 } }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        戻る
      </Button>

      <Box
        sx={{
          bgcolor: 'white',
          borderRadius: 1,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          p: { xs: 3, md: 5 },
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5} mb={2}>
          <Chip
            size="small"
            color="primary"
            label={NEWS_CATEGORY_LABELS[news.category as NewsCategory] || news.category}
          />
          <Typography variant="body2" color="text.secondary">
            {format(new Date(news.publishedAt), 'yyyy年M月d日')}
          </Typography>
        </Box>

        <Typography variant="h4" fontWeight="bold" mb={3}>
          {news.title}
        </Typography>

        {news.content && (
          <Typography
            variant="body1"
            sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.9, color: 'text.primary' }}
          >
            {news.content}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default NewsDetailPage;
