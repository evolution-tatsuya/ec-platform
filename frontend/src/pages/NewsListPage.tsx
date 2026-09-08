import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Box, Chip, CircularProgress, Typography } from '@mui/material';
import { format } from 'date-fns';
import { getPublicNews, NEWS_CATEGORY_LABELS } from '../services/api/news';
import type { NewsItem, NewsCategory } from '../types';

const NewsListPage = () => {
  const navigate = useNavigate();

  const { data: news = [], isLoading } = useQuery<NewsItem[]>({
    queryKey: ['publicNews'],
    queryFn: getPublicNews,
  });

  const handleClick = (item: NewsItem) => {
    if (item.linkUrl) {
      window.open(item.linkUrl, '_blank', 'noopener');
    } else {
      navigate(`/news/${item.id}`);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        お知らせ・ニュース
      </Typography>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : news.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
          現在お知らせはありません
        </Typography>
      ) : (
        <Box sx={{ bgcolor: 'white', borderRadius: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          {news.map((item, i) => (
            <Box
              key={item.id}
              onClick={() => handleClick(item)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2.5,
                cursor: 'pointer',
                borderTop: i === 0 ? 'none' : '1px solid',
                borderColor: 'divider',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 96 }}>
                {format(new Date(item.publishedAt), 'yyyy/MM/dd')}
              </Typography>
              <Chip
                size="small"
                label={NEWS_CATEGORY_LABELS[item.category as NewsCategory] || item.category}
                sx={{ minWidth: 72 }}
              />
              <Typography variant="body1" sx={{ flex: 1 }}>
                {item.title}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default NewsListPage;
