/**
 * A-009: サブスク契約管理ページ
 *
 * 主要機能:
 * - サブスク契約一覧表示（契約者・商品・周期・状態・次回更新・解約日）
 * - 状態フィルタ（利用中/一時停止/解約済み）・検索
 * - 契約情報の更新（状態変更・ライセンスキー受け渡し済みマーク・メモ）
 *
 * 【案A: 手動運用】解約された契約も cancelled として残るため、運営者が目視で
 * 在庫アプリ側を手動suspendできる（要件a）。
 */

import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Checkbox,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Paper,
  Snackbar,
} from '@mui/material';
import { Edit } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  adminGetSubscriptions,
  adminUpdateSubscription,
} from '../services/api/subscriptions';
import type { Subscription, SubscriptionStatus } from '../types';

const BILLING_LABEL: Record<string, string> = {
  monthly: '月額',
  yearly: '年額',
  onetime: '買い切り',
};

const STATUS_LABEL: Record<
  string,
  { label: string; color: 'success' | 'warning' | 'error' | 'default' }
> = {
  pending_payment: { label: '入金待ち', color: 'default' },
  active: { label: '利用中', color: 'success' },
  suspended: { label: '一時停止', color: 'warning' },
  cancelled: { label: '解約済み', color: 'error' },
};

const safeFormat = (value: unknown, fmt: string): string => {
  if (!value) return '-';
  const d = new Date(value as string);
  if (isNaN(d.getTime())) return '-';
  return format(d, fmt, { locale: ja });
};

const AdminSubscriptionsPage = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  // 編集ダイアログ
  const [editTarget, setEditTarget] = useState<Subscription | null>(null);
  const [editStatus, setEditStatus] = useState<SubscriptionStatus>('active');
  const [editKeyDelivered, setEditKeyDelivered] = useState(false);
  const [editNote, setEditNote] = useState('');
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const {
    data: subscriptions = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-subscriptions', statusFilter, search],
    queryFn: () =>
      adminGetSubscriptions({
        status: statusFilter,
        search: search || undefined,
      }),
    retry: 1,
  });

  const updateMutation = useMutation({
    mutationFn: (vars: {
      id: string;
      data: {
        status?: SubscriptionStatus;
        licenseKeyDelivered?: boolean;
        note?: string;
      };
    }) => adminUpdateSubscription(vars.id, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      setSnackbar('契約情報を更新しました');
      setEditTarget(null);
    },
    onError: () => {
      setSnackbar('更新に失敗しました');
    },
  });

  const openEdit = (sub: Subscription) => {
    setEditTarget(sub);
    setEditStatus(sub.status);
    setEditKeyDelivered(sub.licenseKeyDelivered);
    setEditNote(sub.note ?? '');
  };

  const handleSave = () => {
    if (!editTarget) return;
    updateMutation.mutate({
      id: editTarget.id,
      data: {
        status: editStatus,
        licenseKeyDelivered: editKeyDelivered,
        note: editNote,
      },
    });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        サブスク契約管理
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        在庫管理アプリ等のサブスク契約を管理します。解約された契約も一覧に残ります。
      </Typography>

      {/* フィルタ */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>状態</InputLabel>
          <Select
            value={statusFilter}
            label="状態"
            onChange={(e) => setStatusFilter(e.target.value as SubscriptionStatus | 'all')}
          >
            <MenuItem value="all">すべて</MenuItem>
            <MenuItem value="pending_payment">入金待ち</MenuItem>
            <MenuItem value="active">利用中</MenuItem>
            <MenuItem value="suspended">一時停止</MenuItem>
            <MenuItem value="cancelled">解約済み</MenuItem>
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="検索（契約者・メール・商品名）"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 280 }}
        />
      </Stack>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          契約一覧の取得に失敗しました。
        </Alert>
      )}

      {!isLoading && !error && subscriptions.length === 0 && (
        <Alert severity="info">該当する契約がありません。</Alert>
      )}

      {!isLoading && !error && subscriptions.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>契約者</TableCell>
                <TableCell>商品</TableCell>
                <TableCell>周期</TableCell>
                <TableCell align="right">金額</TableCell>
                <TableCell>状態</TableCell>
                <TableCell>次回更新</TableCell>
                <TableCell>解約日</TableCell>
                <TableCell>キー</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {subscriptions.map((sub) => {
                const st = STATUS_LABEL[sub.status] || {
                  label: sub.status,
                  color: 'default' as const,
                };
                return (
                  <TableRow key={sub.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {sub.user?.name || '(名前未設定)'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {sub.user?.email}
                      </Typography>
                    </TableCell>
                    <TableCell>{sub.product?.name ?? '-'}</TableCell>
                    <TableCell>{BILLING_LABEL[sub.billingType] ?? sub.billingType}</TableCell>
                    <TableCell align="right">¥{sub.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip label={st.label} color={st.color} size="small" />
                    </TableCell>
                    <TableCell>{safeFormat(sub.nextBillingDate, 'yyyy/MM/dd')}</TableCell>
                    <TableCell>{safeFormat(sub.cancelledAt, 'yyyy/MM/dd')}</TableCell>
                    <TableCell>
                      {sub.licenseKeyDelivered ? (
                        <Chip label="送付済" color="success" size="small" />
                      ) : (
                        <Chip label="未送付" color="default" size="small" />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        startIcon={<Edit />}
                        onClick={() => openEdit(sub)}
                      >
                        編集
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 編集ダイアログ */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>契約情報の編集</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {editTarget?.product?.name} ／ {editTarget?.user?.email}
            </Typography>
            <FormControl fullWidth>
              <InputLabel>状態</InputLabel>
              <Select
                value={editStatus}
                label="状態"
                onChange={(e) => setEditStatus(e.target.value as SubscriptionStatus)}
              >
                <MenuItem value="pending_payment">入金待ち</MenuItem>
                <MenuItem value="active">利用中</MenuItem>
                <MenuItem value="suspended">一時停止</MenuItem>
                <MenuItem value="cancelled">解約済み</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Checkbox
                  checked={editKeyDelivered}
                  onChange={(e) => setEditKeyDelivered(e.target.checked)}
                />
              }
              label="ライセンスキーを送付済みにする"
            />
            <TextField
              label="運営者メモ（在庫アプリ側のアカウント情報など）"
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTarget(null)}>キャンセル</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        message={snackbar}
      />
    </Container>
  );
};

export default AdminSubscriptionsPage;
