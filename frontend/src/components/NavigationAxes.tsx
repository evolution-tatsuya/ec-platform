import React from 'react';
import { Box, Typography, Chip, Paper } from '@mui/material';
import type { CategoryNavigationAxis, NavigationFilterState } from '../types';

interface NavigationAxesProps {
  axes: CategoryNavigationAxis[];
  filters: NavigationFilterState;
  onFilterChange: (axisKey: string, value: string) => void;
}

/**
 * 動的ナビゲーション軸コンポーネント
 *
 * 2〜5軸の動的ナビゲーション表示
 * - 車パーツ: メーカー → 車種 → 型式 → パーツ種類（4軸）
 * - イベント: イベント種類 → 開催月 → 開催地（3軸）
 * - デジタル: 商品種類 → ジャンル（2軸）
 */
export const NavigationAxes: React.FC<NavigationAxesProps> = ({
  axes,
  filters,
  onFilterChange,
}) => {
  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        mb: 3,
        borderRadius: 2,
      }}
    >
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        絞り込み条件
      </Typography>

      {axes.map((axis) => (
        <Box key={axis.id} sx={{ mb: 2.5 }}>
          <Typography
            variant="subtitle2"
            sx={{ mb: 1.5, fontWeight: 600, color: 'text.secondary' }}
          >
            {axis.axisName}
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {axis.options.map((option) => {
              const isActive = filters[axis.axisKey] === option;

              return (
                <Chip
                  key={option}
                  label={option}
                  onClick={() => onFilterChange(axis.axisKey, option)}
                  variant={isActive ? 'filled' : 'outlined'}
                  color={isActive ? 'primary' : 'default'}
                  sx={{
                    borderWidth: 2,
                    fontWeight: isActive ? 600 : 400,
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 2,
                    },
                  }}
                />
              );
            })}
          </Box>
        </Box>
      ))}
    </Paper>
  );
};
