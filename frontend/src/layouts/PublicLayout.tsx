import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Container } from '@mui/material';
import { Header } from '../components/Header';

/**
 * 公開ページ用レイアウト
 *
 * 機能:
 * - Header表示
 * - 背景グラデーション
 * - 中央配置
 * - maxWidth='lg'
 *
 * 使用ページ:
 * - ログイン (/auth/login)
 * - 会員登録 (/auth/register)
 * - パスワード再設定 (/auth/reset-password)
 */
export const PublicLayout: React.FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: (theme) =>
          `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
      }}
    >
      <Header />

      {/* Headerの高さ分スペーサー */}
      <Box sx={{ height: (theme) => theme.mixins.toolbar.minHeight }} />

      <Container
        component="main"
        maxWidth="lg"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          py: 4,
        }}
      >
        <Outlet />
      </Container>
    </Box>
  );
};
