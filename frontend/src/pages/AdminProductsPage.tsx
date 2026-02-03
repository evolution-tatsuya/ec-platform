// A-002: 商品管理ページ（簡易版）
import React from 'react';
import { Box, Typography } from '@mui/material';

const AdminProductsPage: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4">商品管理ページ</Typography>
      <Typography sx={{ mt: 2 }}>
        読み込み成功！このページは正常に表示されています。
      </Typography>
    </Box>
  );
};

export default AdminProductsPage;
