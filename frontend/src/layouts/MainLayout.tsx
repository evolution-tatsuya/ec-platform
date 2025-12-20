import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Toolbar, useMediaQuery, useTheme } from '@mui/material';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';

/**
 * 会員・管理者用レイアウト
 *
 * 機能:
 * - Header表示
 * - レスポンシブDrawer（240px）
 * - モバイル: temporary Drawer
 * - デスクトップ: permanent Drawer
 * - Sidebarを使用
 *
 * 使用ページ:
 * - 顧客向けページ（トップ、商品一覧、カート、マイページ等）
 * - 管理者向けページ（ダッシュボード、商品管理、注文管理等）
 */
export const MainLayout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Header onMenuClick={isMobile ? handleDrawerToggle : undefined} />

      {/* サイドバー */}
      {isMobile ? (
        // モバイル: temporary Drawer
        <Sidebar
          open={mobileOpen}
          onClose={handleDrawerToggle}
          variant="temporary"
        />
      ) : (
        // デスクトップ: permanent Drawer
        <Sidebar open={true} variant="permanent" />
      )}

      {/* メインコンテンツ */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - 240px)` },
          backgroundColor: 'background.default',
          minHeight: '100vh',
        }}
      >
        {/* Headerの高さ分スペーサー */}
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};
