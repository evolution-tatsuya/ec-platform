// ========================================
// 料金プランページ（サブスク・デジタル販売向け）
// 3プラン横並び・月額/年額トグル・上限比較表・購入導線
// ECサイトのカラー（パープル#7c4dff / グラデーション#667eea→#764ba2）に統一
// ========================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Box,
  Container,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { getSubscriptionPlans } from '../services/api/plans';
import type { SubscriptionPlan } from '../services/api/plans';
import { startSubscriptionCheckout } from '../services/api/subscriptions';
import { cartAPI } from '../lib/api';

// 上限値を表示用に整形（null=無制限）
const fmtLimit = (v: number | null, unit: string): string =>
  v === null || v === undefined ? '無制限' : `${v.toLocaleString()}${unit}`;
const fmtImage = (mb: number | null): string =>
  mb === null || mb === undefined ? '無制限' : mb >= 1024 ? `${(mb / 1024).toLocaleString()}GB` : `${mb}MB`;

export default function PricingPage() {
  const navigate = useNavigate();
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');

  const { data: plans = [], isLoading, error } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: getSubscriptionPlans,
    retry: 1,
  });

  const addToCartMutation = useMutation({
    mutationFn: (productId: string) => cartAPI.addToCart({ productId, quantity: 1 }),
    onSuccess: () => {
      const go = window.confirm('カートに追加しました。購入手続きに進みますか？');
      navigate(go ? '/cart' : '/pricing');
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message || 'カートへの追加に失敗しました';
      if (String(msg).includes('ログイン')) {
        alert('購入するにはログインが必要です');
        navigate(`/auth/login?redirect=${encodeURIComponent('/pricing')}`);
      } else {
        alert(msg);
      }
    },
  });

  // カード（自動継続課金・案B）: Stripe Checkoutへリダイレクト
  const cardCheckoutMutation = useMutation({
    mutationFn: (productId: string) => startSubscriptionCheckout(productId),
    onSuccess: (data) => {
      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl; // Stripe決済画面へ
      } else {
        alert(data.message || 'カード決済を開始できませんでした');
      }
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message || 'カード決済の開始に失敗しました';
      if (String(msg).includes('ログイン')) {
        alert('購入するにはログインが必要です');
        navigate(`/auth/login?redirect=${encodeURIComponent('/pricing')}`);
      } else {
        alert(msg);
      }
    },
  });

  // 選択中の課金周期のプランだけを、価格昇順で表示（買い切りは常に表示しない=別導線）
  const shown = plans
    .filter((p) => p.billingType === cycle)
    .sort((a, b) => a.price - b.price);

  // 比較表は「基準プラン（月額）」を使う（周期に関わらず上限・機能は同じ想定）
  const monthlyPlans = plans.filter((p) => p.billingType === 'monthly').sort((a, b) => a.price - b.price);

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', pt: 12, pb: 10 }}>
      <Container maxWidth="lg">
        {/* ヒーロー */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Chip
            label="在庫管理システム"
            sx={{ bgcolor: '#f5f0ff', color: '#7c4dff', fontWeight: 700, mb: 2 }}
          />
          <Typography variant="h3" fontWeight={800} sx={{ letterSpacing: '-0.02em', mb: 1.5 }}>
            使う分だけの、わかりやすいプラン
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560, mx: 'auto' }}>
            登録できる数・画像容量・閲覧できる人数で選べます。いつでも上位・下位プランに変更できます。
          </Typography>

          {/* 月額/年額トグル */}
          <Box sx={{ mt: 3 }}>
            <ToggleButtonGroup
              value={cycle}
              exclusive
              onChange={(_, v) => v && setCycle(v)}
              sx={{
                bgcolor: '#f5f0ff',
                borderRadius: 999,
                p: 0.5,
                '& .MuiToggleButton-root': {
                  border: 0,
                  borderRadius: '999px !important',
                  px: 3,
                  fontWeight: 700,
                  color: 'text.secondary',
                  '&.Mui-selected': {
                    bgcolor: '#ffffff',
                    color: '#7c4dff',
                    boxShadow: '0 2px 8px rgba(124,77,255,.2)',
                  },
                },
              }}
            >
              <ToggleButton value="monthly">月額</ToggleButton>
              <ToggleButton value="yearly">
                年額
                <Box component="span" sx={{ ml: 0.5, color: '#48bb78', fontSize: 11, fontWeight: 800 }}>
                  お得
                </Box>
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            プラン情報の取得に失敗しました。
          </Alert>
        )}
        {!error && shown.length === 0 && (
          <Alert severity="info" sx={{ mb: 3 }}>
            現在ご案内できるプランがありません。
          </Alert>
        )}

        {/* プランカード */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: `repeat(${Math.min(shown.length || 1, 3)}, 1fr)` },
            gap: 2.5,
            alignItems: 'start',
            maxWidth: shown.length <= 1 ? 420 : 'none',
            mx: 'auto',
          }}
        >
          {shown.map((p: SubscriptionPlan) => (
            <Paper
              key={p.id}
              elevation={p.isPopular ? 8 : 1}
              sx={{
                p: 3,
                borderRadius: 3,
                position: 'relative',
                border: p.isPopular ? '2px solid #7c4dff' : '1px solid',
                borderColor: p.isPopular ? '#7c4dff' : 'divider',
                transform: { md: p.isPopular ? 'translateY(-6px)' : 'none' },
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {p.isPopular && (
                <Chip
                  label="いちばん人気"
                  sx={{
                    position: 'absolute',
                    top: -14,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg,#667eea,#764ba2)',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 12,
                  }}
                />
              )}
              <Typography sx={{ color: '#7c4dff', fontWeight: 800 }}>{p.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ minHeight: 34, mt: 0.5, mb: 2 }}>
                {p.planTagline}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                <Typography component="span" fontWeight={800} sx={{ fontSize: 18 }}>
                  ¥
                </Typography>
                <Typography component="span" fontWeight={800} sx={{ fontSize: 40, letterSpacing: '-0.03em' }}>
                  {p.price.toLocaleString()}
                </Typography>
                <Typography component="span" color="text.secondary" fontWeight={600}>
                  /{cycle === 'monthly' ? '月' : '年'}
                </Typography>
              </Box>

              <Box
                component="ul"
                sx={{ listStyle: 'none', p: 0, mt: 2, mb: 3, borderTop: '1px solid', borderColor: 'divider', pt: 2, display: 'flex', flexDirection: 'column', gap: 1.2 }}
              >
                <FeatureLine main>{`${p.unitLabel} ${fmtLimit(p.maxParts, '点')} まで`}</FeatureLine>
                <FeatureLine>{`画像 ${fmtImage(p.maxImageMB)} まで`}</FeatureLine>
                <FeatureLine>{p.maxUsers === null ? '閲覧 人数無制限' : `閲覧 ${p.maxUsers}人 まで`}</FeatureLine>
                {p.planFeatures.map((f, i) => (
                  <FeatureLine key={i}>{f}</FeatureLine>
                ))}
              </Box>

              <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {/* カード（自動継続課金・案B）— メイン導線 */}
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => cardCheckoutMutation.mutate(p.id)}
                  disabled={cardCheckoutMutation.isPending || addToCartMutation.isPending}
                  sx={{
                    fontWeight: 800,
                    py: 1.4,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg,#667eea,#764ba2)',
                    '&:hover': { filter: 'brightness(1.06)' },
                  }}
                >
                  {cardCheckoutMutation.isPending
                    ? '処理中...'
                    : 'カードで申し込む（自動更新）'}
                </Button>
                {/* 銀行振込（手動・案A）— サブ導線 */}
                <Button
                  fullWidth
                  variant="text"
                  onClick={() => addToCartMutation.mutate(p.id)}
                  disabled={cardCheckoutMutation.isPending || addToCartMutation.isPending}
                  sx={{ fontWeight: 700, color: '#7c4dff', fontSize: 13 }}
                >
                  銀行振込で申し込む
                </Button>
              </Box>
            </Paper>
          ))}
        </Box>

        {/* 比較表 */}
        {monthlyPlans.length > 0 && (
          <Box sx={{ mt: 6 }}>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>
              プランの比較
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>項目</TableCell>
                    {monthlyPlans.map((p) => (
                      <TableCell key={p.id} align="right" sx={{ color: '#7c4dff', fontWeight: 800 }}>
                        {p.name}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  <CmpRow label="月額" plans={monthlyPlans} render={(p) => `¥${p.price.toLocaleString()}`} />
                  <CmpRow
                    label={`${monthlyPlans[0].unitLabel}数`}
                    plans={monthlyPlans}
                    render={(p) => fmtLimit(p.maxParts, '')}
                  />
                  <CmpRow label="画像容量" plans={monthlyPlans} render={(p) => fmtImage(p.maxImageMB)} />
                  <CmpRow
                    label="閲覧できる人数"
                    plans={monthlyPlans}
                    render={(p) => (p.maxUsers === null ? '無制限' : `${p.maxUsers}人`)}
                  />
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        <Box
          sx={{
            mt: 4,
            bgcolor: '#f5f0ff',
            borderLeft: '4px solid #7c4dff',
            borderRadius: '0 8px 8px 0',
            p: 2,
            color: 'text.secondary',
            fontSize: 14,
          }}
        >
          上限に近づいたら画面でお知らせします。超えそうなときは、いつでも上位プランに変更できます（下位プランへの変更も可能）。ご購入後、運営者よりライセンスキーをメールでお届けします。
        </Box>
      </Container>
    </Box>
  );
}

// 機能行
function FeatureLine({ children, main }: { children: React.ReactNode; main?: boolean }) {
  return (
    <Box component="li" sx={{ display: 'grid', gridTemplateColumns: '20px 1fr', gap: 1, alignItems: 'start' }}>
      <CheckIcon sx={{ fontSize: 18, color: '#48bb78' }} />
      <Typography variant="body2" sx={{ fontWeight: main ? 700 : 400 }}>
        {children}
      </Typography>
    </Box>
  );
}

// 比較表の行
function CmpRow({
  label,
  plans,
  render,
}: {
  label: string;
  plans: SubscriptionPlan[];
  render: (p: SubscriptionPlan) => string;
}) {
  return (
    <TableRow>
      <TableCell>{label}</TableCell>
      {plans.map((p) => (
        <TableCell key={p.id} align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
          {render(p)}
        </TableCell>
      ))}
    </TableRow>
  );
}
