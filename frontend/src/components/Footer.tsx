import { Box, Container, Typography, Link, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';

/**
 * 共通フッター
 *
 * 全ての顧客向けページの最下部に表示される。
 * コンテンツが短いページでも、レイアウト側の flex column + minHeight:100vh により
 * 画面下端に固定表示される。
 */
export const Footer = () => {
  const navigate = useNavigate();

  const footerLinks = [
    { label: '会社概要', path: '/about' },
    { label: '特定商取引法', path: '/legal' },
    { label: 'プライバシーポリシー', path: '/privacy' },
    { label: 'お問い合わせ', path: '/contact' },
  ];

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: '#333',
        color: 'white',
        mt: 'auto', // flex column内で下端に押し出す
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="center"
          alignItems="center"
          sx={{ mb: 2 }}
        >
          {footerLinks.map((link) => (
            <Link
              key={link.path}
              component="button"
              onClick={() => navigate(link.path)}
              underline="hover"
              sx={{
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: 14,
                cursor: 'pointer',
                '&:hover': { color: 'white' },
              }}
            >
              {link.label}
            </Link>
          ))}
        </Stack>

        <Typography
          variant="body2"
          sx={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)', fontSize: 13 }}
        >
          &copy; 2026 多機能ECプラットフォーム. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer;
