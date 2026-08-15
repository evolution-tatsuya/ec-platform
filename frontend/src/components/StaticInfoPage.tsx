import React from 'react';
import { Box, Container, Paper, Typography, Divider } from '@mui/material';

export interface InfoSection {
  /** 見出し（省略可） */
  heading?: string;
  /** 本文（文字列 or 表形式の行データ） */
  body?: React.ReactNode;
  /** 定義リスト形式（項目名 → 内容）。特定商取引法・会社概要向け */
  rows?: { label: string; value: React.ReactNode }[];
}

interface StaticInfoPageProps {
  title: string;
  description?: string;
  sections: InfoSection[];
  /** 最終更新日など、末尾の注記 */
  note?: string;
}

/**
 * 静的な情報ページ（会社概要・特定商取引法・プライバシーポリシー等）の共通レイアウト。
 * 他ページと同じ薄グレー背景 + 白カード + 紫アクセントで統一。
 */
export const StaticInfoPage: React.FC<StaticInfoPageProps> = ({
  title,
  description,
  sections,
  note,
}) => {
  return (
    <Box sx={{ bgcolor: '#f5f5f5', flex: 1, pt: 12, pb: 6 }}>
      <Container maxWidth="md">
        <Typography variant="h4" fontWeight={700} gutterBottom>
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {description}
          </Typography>
        )}

        <Paper elevation={1} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 2 }}>
          {sections.map((section, i) => (
            <Box key={i} sx={{ mb: i < sections.length - 1 ? 4 : 0 }}>
              {section.heading && (
                <Typography
                  variant="h6"
                  fontWeight={700}
                  sx={{
                    mb: 2,
                    pl: 2,
                    borderLeft: '4px solid',
                    borderColor: 'primary.main',
                  }}
                >
                  {section.heading}
                </Typography>
              )}

              {section.body && (
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.9, whiteSpace: 'pre-line' }}>
                  {section.body}
                </Typography>
              )}

              {section.rows && (
                <Box>
                  {section.rows.map((row, j) => (
                    <Box key={j}>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', sm: '200px 1fr' },
                          gap: { xs: 0.5, sm: 2 },
                          py: 2,
                        }}
                      >
                        <Typography variant="body2" fontWeight={700} color="text.primary">
                          {row.label}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                          {row.value}
                        </Typography>
                      </Box>
                      {j < section.rows!.length - 1 && <Divider />}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          ))}

          {note && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="caption" color="text.secondary">
                {note}
              </Typography>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default StaticInfoPage;
