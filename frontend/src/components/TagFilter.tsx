import React from 'react';
import { Box, Typography, Chip, Paper } from '@mui/material';
import type { Tag } from '../types';

interface TagFilterProps {
  tags: Tag[];
  selectedTags: string[];
  onTagToggle: (tagId: string) => void;
}

/**
 * タグフィルターコンポーネント
 *
 * タグによる絞り込み機能
 * - 複数選択可能
 * - クリックでアクティブ/非アクティブ切り替え
 */
export const TagFilter: React.FC<TagFilterProps> = ({
  tags,
  selectedTags,
  onTagToggle,
}) => {
  if (tags.length === 0) {
    return null;
  }

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2.5,
        mb: 3,
        borderRadius: 2,
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
        <strong>タグで絞り込み:</strong>
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {tags.map((tag) => {
          const isActive = selectedTags.includes(tag.id);

          return (
            <Chip
              key={tag.id}
              label={`#${tag.name}`}
              onClick={() => onTagToggle(tag.id)}
              variant={isActive ? 'filled' : 'outlined'}
              color={isActive ? 'primary' : 'default'}
              sx={{
                borderRadius: '20px',
                fontWeight: isActive ? 600 : 400,
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'scale(1.05)',
                },
              }}
            />
          );
        })}
      </Box>
    </Paper>
  );
};
