import React from 'react';
import { Box } from '@mui/material';
import { Header } from './Header';
import { Footer } from './Footer';

/**
 * 顧客向けページ共通レイアウト
 *
 * 構造: Header（固定）+ メインコンテンツ + Footer
 * flex column + minHeight:100vh により、コンテンツが短いページでも
 * Footerが画面下端に固定表示される（sticky footer）。
 */
export const CustomerLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100%',
      }}
    >
      <Header />
      {/* メインコンテンツ: flexGrowで残りの高さを埋め、Footerを下端へ押し出す */}
      <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </Box>
      <Footer />
    </Box>
  );
};

export default CustomerLayout;
