/**
 * A-003: 注文管理ページ（UI実装）
 *
 * 主要機能:
 * - 注文一覧表示（DataGrid）
 * - 検索・絞り込み（期間、ステータス、決済方法）
 * - 注文詳細表示
 * - 発送処理
 * - 書類自動生成（納品書、領収書、見積書）
 */

import { useState, useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
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
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Description, Receipt, RequestQuote, Send, Email as EmailIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { getEmailTemplates, sendOrderEmail, EMAIL_TYPE_LABELS, type EmailTemplate } from '../services/api/email';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import { format } from 'date-fns';
import {
  useAdminOrders,
  useShipOrder,
  useConfirmPayment,
  useGenerateInvoice,
  useGenerateReceipt,
  useGenerateQuote,
} from '../hooks/useOrders';
import type { Order, AdminOrderFilterParams, OrderStatus, PaymentMethod } from '../types';

// DUMMY_ORDERS削除 - API統合完了

// ステータス表示マップ（バックエンドの実値: pending/paid/preparing/shipped/completed/cancelled）
// 大文字の旧値も互換で残す
const orderStatusMap: Record<string, string> = {
  pending: '入金待ち',
  paid: '入金確認済み',
  preparing: '発送準備中',
  shipped: '発送済み',
  completed: '完了',
  cancelled: 'キャンセル',
  // 互換
  PENDING_PAYMENT: '入金待ち',
  PREPARING: '発送準備中',
  SHIPPED: '発送済み',
  DELIVERED: '配達完了',
  CANCELLED: 'キャンセル',
};

// ステータスカラー
const statusColorMap: Record<
  string,
  'default' | 'primary' | 'success' | 'error' | 'warning'
> = {
  pending: 'warning',
  paid: 'info' as any,
  preparing: 'primary',
  shipped: 'primary',
  completed: 'success',
  cancelled: 'error',
  // 互換
  PENDING_PAYMENT: 'warning',
  PREPARING: 'primary',
  SHIPPED: 'primary',
  DELIVERED: 'success',
  CANCELLED: 'error',
};

// 決済方法表示マップ
const paymentMethodMap: Record<string, string> = {
  BANK_TRANSFER: '銀行振込',
  CREDIT_CARD: 'クレジットカード',
  PAYPAY: 'PayPay',
};

// 配送業者表示マップ
const carrierMap: Record<string, string> = {
  yamato: 'ヤマト運輸',
  sagawa: '佐川急便',
  japan_post: '日本郵便',
};

export default function AdminOrdersPage() {
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<PaymentMethod | 'all'>('all');
  const [filterStartDate, setFilterStartDate] = useState<Date | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<Date | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [shipDialogOpen, setShipDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [carrier, setCarrier] = useState<string>('');
  const [trackingNumber, setTrackingNumber] = useState<string>('');

  // メール送信
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailType, setEmailType] = useState('order_confirm');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const { data: emailTemplates = [] } = useQuery<EmailTemplate[]>({
    queryKey: ['adminEmailTemplates'],
    queryFn: getEmailTemplates,
    staleTime: 60_000,
  });

  const handleSendEmail = async () => {
    if (!selectedOrder) return;
    setSendingEmail(true);
    try {
      await sendOrderEmail(selectedOrder.id, { type: emailType, subject: emailSubject, body: emailBody });
      setEmailDialogOpen(false);
      alert('メールを送信しました');
    } catch (e: any) {
      alert(e?.response?.data?.message || 'メール送信に失敗しました');
    } finally {
      setSendingEmail(false);
    }
  };

  // フィルターパラメータを構築
  const filterParams = useMemo<AdminOrderFilterParams | undefined>(() => {
    const params: AdminOrderFilterParams = {};
    if (filterStatus !== 'all') params.status = filterStatus;
    if (filterPaymentMethod !== 'all') params.paymentMethod = filterPaymentMethod;
    if (filterStartDate) params.startDate = format(filterStartDate, 'yyyy-MM-dd');
    if (filterEndDate) params.endDate = format(filterEndDate, 'yyyy-MM-dd');
    return Object.keys(params).length > 0 ? params : undefined;
  }, [filterStatus, filterPaymentMethod, filterStartDate, filterEndDate]);

  // API統合: 注文一覧取得
  const { data: orders = [], isLoading, error } = useAdminOrders(filterParams);

  // ステータス別件数（フォルダー表示用・全件から集計）
  const { data: allOrders = [] } = useAdminOrders(undefined);
  const statusCounts = allOrders.reduce<Record<string, number>>((acc, o) => {
    const s = (o.status || '').toString();
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const statusFolders: { value: string; label: string }[] = [
    { value: 'all', label: 'すべて' },
    { value: 'pending', label: '入金待ち' },
    { value: 'paid', label: '入金確認済み' },
    { value: 'preparing', label: '発送準備中' },
    { value: 'shipped', label: '発送済み' },
    { value: 'completed', label: '完了' },
    { value: 'cancelled', label: 'キャンセル' },
  ];

  // API統合: Mutation
  const shipOrderMutation = useShipOrder();
  const confirmPaymentMutation = useConfirmPayment();
  const generateInvoiceMutation = useGenerateInvoice();
  const generateReceiptMutation = useGenerateReceipt();
  const generateQuoteMutation = useGenerateQuote();

  // DataGrid列定義
  const columns: GridColDef[] = [
    {
      field: 'orderNumber',
      headerName: '注文番号',
      width: 180,
      renderCell: (params) => (
        <Typography variant="body2" fontFamily="monospace">
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'customerName',
      headerName: '顧客名',
      width: 150,
    },
    {
      field: 'createdAt',
      headerName: '注文日',
      width: 120,
      renderCell: (params) => {
        const date = new Date(params.value);
        return (
          <Typography variant="body2">
            {format(date, 'yyyy/MM/dd', { locale: ja })}
          </Typography>
        );
      },
    },
    {
      field: 'totalAmount',
      headerName: '合計金額',
      width: 120,
      align: 'right',
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="bold">
          ¥{params.value.toLocaleString()}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'ステータス',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={orderStatusMap[params.value] || params.value}
          size="small"
          color={statusColorMap[params.value] || 'default'}
        />
      ),
    },
    {
      field: 'paymentMethod',
      headerName: '決済方法',
      width: 130,
      renderCell: (params) => (
        <Typography variant="body2">
          {paymentMethodMap[params.value] || params.value}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: '操作',
      width: 180,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => handleOpenDetailDialog(params.row)}
          >
            詳細
          </Button>
          {params.row.status === 'pending' && (
            <Button
              size="small"
              variant="contained"
              color="success"
              disabled={confirmPaymentMutation.isPending}
              onClick={() => handleConfirmPayment(params.row)}
            >
              入金確認
            </Button>
          )}
          {['paid', 'preparing', 'PREPARING'].includes(params.row.status) && (
            <Button
              size="small"
              variant="contained"
              onClick={() => handleOpenShipDialog(params.row)}
            >
              発送
            </Button>
          )}
        </Stack>
      ),
    },
  ];

  const handleOpenDetailDialog = (order: Order) => {
    setSelectedOrder(order);
    setDetailDialogOpen(true);
  };

  const handleCloseDetailDialog = () => {
    setDetailDialogOpen(false);
    setSelectedOrder(null);
  };

  const handleOpenShipDialog = (order: Order) => {
    setSelectedOrder(order);
    setCarrier('');
    setTrackingNumber('');
    setShipDialogOpen(true);
  };

  const handleCloseShipDialog = () => {
    setShipDialogOpen(false);
    setSelectedOrder(null);
    setCarrier('');
    setTrackingNumber('');
  };

  const handleConfirmPayment = async (order: Order) => {
    const ok = window.confirm(
      `注文 ${order.orderNumber} の入金を確認済みにしますか？\n\n入金確認メールが自動送信され、サブスク契約は「利用中」になります。`
    );
    if (!ok) return;
    try {
      await confirmPaymentMutation.mutateAsync({ id: order.id });
    } catch (err) {
      console.error('入金確認エラー:', err);
      window.alert('入金確認に失敗しました');
    }
  };

  const handleShip = async () => {
    if (!selectedOrder || !carrier || !trackingNumber) return;

    try {
      await shipOrderMutation.mutateAsync({
        id: selectedOrder.id,
        data: { carrier, trackingNumber },
      });
      handleCloseShipDialog();
    } catch (err) {
      console.error('発送処理エラー:', err);
    }
  };

  const handleDownloadDocument = async (type: 'delivery' | 'receipt' | 'quote') => {
    if (!selectedOrder) return;

    try {
      if (type === 'delivery') {
        await generateInvoiceMutation.mutateAsync(selectedOrder.id);
      } else if (type === 'receipt') {
        await generateReceiptMutation.mutateAsync(selectedOrder.id);
      } else if (type === 'quote') {
        await generateQuoteMutation.mutateAsync(selectedOrder.id);
      }
    } catch (err) {
      console.error('書類生成エラー:', err);
    }
  };

  // ローディング・エラーハンドリング
  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">
          注文一覧の取得に失敗しました: {error.message}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        注文管理
      </Typography>

        {/* ステータス別フォルダー（クリックで絞り込み） */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {statusFolders.map((f) => {
            const count = f.value === 'all' ? allOrders.length : statusCounts[f.value] || 0;
            const selected = filterStatus === f.value;
            return (
              <Chip
                key={f.value}
                label={`${f.label} (${count})`}
                onClick={() => setFilterStatus(f.value as OrderStatus | 'all')}
                color={selected ? 'primary' : 'default'}
                variant={selected ? 'filled' : 'outlined'}
                sx={{ fontWeight: selected ? 700 : 400 }}
              />
            );
          })}
        </Box>

        {/* 検索・絞り込み */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                gap: 2,
                alignItems: 'center',
              }}
            >
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
                <DatePicker
                  label="期間（開始）"
                  value={filterStartDate}
                  onChange={(newValue) => setFilterStartDate(newValue as Date | null)}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />
              </LocalizationProvider>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
                <DatePicker
                  label="期間（終了）"
                  value={filterEndDate}
                  onChange={(newValue) => setFilterEndDate(newValue as Date | null)}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />
              </LocalizationProvider>
              <FormControl fullWidth size="small">
                <InputLabel>ステータス</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="ステータス"
                >
                  <MenuItem value="all">すべて</MenuItem>
                  <MenuItem value="pending">入金待ち</MenuItem>
                  <MenuItem value="paid">入金確認済み</MenuItem>
                  <MenuItem value="preparing">発送準備中</MenuItem>
                  <MenuItem value="shipped">発送済み</MenuItem>
                  <MenuItem value="completed">完了</MenuItem>
                  <MenuItem value="cancelled">キャンセル</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>決済方法</InputLabel>
                <Select
                  value={filterPaymentMethod}
                  onChange={(e) => setFilterPaymentMethod(e.target.value)}
                  label="決済方法"
                >
                  <MenuItem value="all">すべて</MenuItem>
                  <MenuItem value="BANK_TRANSFER">銀行振込</MenuItem>
                  <MenuItem value="CREDIT_CARD">クレジットカード</MenuItem>
                  <MenuItem value="PAYPAY">PayPay</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </CardContent>
        </Card>

        {/* 注文一覧 */}
        <Card>
          <CardContent>
            <DataGrid
              rows={orders}
              columns={columns}
              initialState={{
                pagination: {
                  paginationModel: { page: 0, pageSize: 10 },
                },
              }}
              pageSizeOptions={[10, 25, 50]}
              disableRowSelectionOnClick
              autoHeight
              sx={{
                // 全セルの中身を縦横センターに揃える（行ごとの上下バラつきを解消）
                '& .MuiDataGrid-cell': {
                  display: 'flex',
                  alignItems: 'center',
                },
                '& .MuiDataGrid-cell > *': {
                  width: '100%',
                },
              }}
            />
          </CardContent>
        </Card>

        {/* 注文詳細ダイアログ */}
        <Dialog
        disablePortal={false}
          open={detailDialogOpen}
          onClose={handleCloseDetailDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>注文詳細</DialogTitle>
          <DialogContent>
            {selectedOrder && (
              <Stack spacing={3} sx={{ mt: 1 }}>
                {/* 顧客情報 */}
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    顧客情報
                  </Typography>
                  <Stack spacing={1}>
                    <Typography variant="body2">
                      <strong>注文番号:</strong> {selectedOrder.orderNumber}
                    </Typography>
                    <Typography variant="body2">
                      <strong>氏名:</strong>{' '}
                      {selectedOrder.customerName || selectedOrder.user?.name || '-'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>メール:</strong>{' '}
                      {selectedOrder.customerEmail || selectedOrder.user?.email || '-'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>電話番号:</strong> {selectedOrder.customerPhone}
                    </Typography>
                  </Stack>
                </Box>

                {/* 注文商品 */}
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    注文商品
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>商品名</TableCell>
                          <TableCell align="right">数量</TableCell>
                          <TableCell align="right">単価</TableCell>
                          <TableCell align="right">小計</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedOrder.items.map((item, index: number) => (
                          <TableRow key={index}>
                            <TableCell>{item.product?.name || '商品名不明'}</TableCell>
                            <TableCell align="right">{item.quantity}</TableCell>
                            <TableCell align="right">¥{item.price.toLocaleString()}</TableCell>
                            <TableCell align="right">
                              ¥{(item.price * item.quantity).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={3} align="right">
                            <strong>合計金額</strong>
                          </TableCell>
                          <TableCell align="right">
                            <strong>¥{selectedOrder.totalAmount.toLocaleString()}</strong>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>

                {/* 発送先情報 */}
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    発送先情報
                  </Typography>
                  <Stack spacing={1}>
                    <Typography variant="body2">
                      <strong>郵便番号:</strong> {selectedOrder.shippingPostalCode || '未設定'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>住所:</strong> {selectedOrder.shippingAddress || '未設定'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>電話番号:</strong> {selectedOrder.customerPhone}
                    </Typography>
                  </Stack>
                </Box>

                {/* 備考（配送オプション削除 - 型定義に存在しない） */}
                {/* notes プロパティも型定義に存在しないため削除 */}

                {/* 支払い情報 */}
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    支払い情報
                  </Typography>
                  <Stack spacing={1}>
                    <Typography variant="body2">
                      <strong>決済方法:</strong>{' '}
                      {paymentMethodMap[selectedOrder.paymentMethod]}
                    </Typography>
                    <Typography variant="body2">
                      <strong>決済状況:</strong>{' '}
                      {selectedOrder.paymentStatus === 'COMPLETED' ? '完了' : '未完了'}
                    </Typography>
                  </Stack>
                </Box>

                {/* 発送情報（発送済みの場合） */}
                {selectedOrder.status === 'SHIPPED' && selectedOrder.carrier && (
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      発送情報
                    </Typography>
                    <Stack spacing={1}>
                      <Typography variant="body2">
                        <strong>配送業者:</strong>{' '}
                        {carrierMap[selectedOrder.carrier] || selectedOrder.carrier}
                      </Typography>
                      <Typography variant="body2">
                        <strong>追跡番号:</strong> {selectedOrder.trackingNumber || '未設定'}
                      </Typography>
                    </Stack>
                  </Box>
                )}

                {/* 書類生成ボタン */}
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    書類生成
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      startIcon={<Description />}
                      onClick={() => handleDownloadDocument('delivery')}
                    >
                      納品書
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Receipt />}
                      onClick={() => handleDownloadDocument('receipt')}
                    >
                      領収書
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<RequestQuote />}
                      onClick={() => handleDownloadDocument('quote')}
                    >
                      見積書
                    </Button>
                  </Stack>
                </Box>
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              startIcon={<EmailIcon />}
              onClick={() => {
                const tpl = emailTemplates.find((t) => t.type === emailType) || emailTemplates[0];
                if (tpl) {
                  setEmailType(tpl.type);
                  setEmailSubject(tpl.subject);
                  setEmailBody(tpl.body);
                }
                setEmailDialogOpen(true);
              }}
            >
              メール送信
            </Button>
            <Button onClick={handleCloseDetailDialog}>閉じる</Button>
          </DialogActions>
        </Dialog>

        {/* メール送信ダイアログ */}
        <Dialog open={emailDialogOpen} onClose={() => setEmailDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>メール送信</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} mt={1}>
              <Typography variant="body2" color="text.secondary">
                宛先:{' '}
                {selectedOrder?.customerEmail ||
                  selectedOrder?.user?.email ||
                  '(メールアドレスなし)'}
              </Typography>
              <FormControl fullWidth>
                <InputLabel>テンプレート</InputLabel>
                <Select
                  label="テンプレート"
                  value={emailType}
                  onChange={(e) => {
                    const type = e.target.value;
                    setEmailType(type);
                    const tpl = emailTemplates.find((t) => t.type === type);
                    if (tpl) {
                      setEmailSubject(tpl.subject);
                      setEmailBody(tpl.body);
                    }
                  }}
                >
                  {emailTemplates.map((t) => (
                    <MenuItem key={t.id} value={t.type}>
                      {EMAIL_TYPE_LABELS[t.type] || t.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="件名"
                fullWidth
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
              <TextField
                label="本文"
                fullWidth
                multiline
                rows={10}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                helperText="{{customerName}} {{orderNumber}} {{totalAmount}} {{bankInfo}} が使えます"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEmailDialogOpen(false)}>キャンセル</Button>
            <Button
              variant="contained"
              onClick={handleSendEmail}
              disabled={
                sendingEmail ||
                !(selectedOrder?.customerEmail || selectedOrder?.user?.email)
              }
            >
              {sendingEmail ? '送信中...' : '送信する'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* 発送処理ダイアログ */}
        <Dialog
        disablePortal={false}
        open={shipDialogOpen} onClose={handleCloseShipDialog} maxWidth="sm" fullWidth>
          <DialogTitle>発送処理</DialogTitle>
          <DialogContent>
            {selectedOrder && (
              <Stack spacing={3} sx={{ mt: 1 }}>
                <Typography variant="body2">
                  <strong>注文番号:</strong> {selectedOrder.orderNumber}
                </Typography>
                <Typography variant="body2">
                  <strong>顧客名:</strong>{' '}
                  {selectedOrder.customerName || selectedOrder.user?.name || '-'}
                </Typography>

                <FormControl fullWidth>
                  <InputLabel>配送業者</InputLabel>
                  <Select
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    label="配送業者"
                  >
                    <MenuItem value="yamato">ヤマト運輸</MenuItem>
                    <MenuItem value="sagawa">佐川急便</MenuItem>
                    <MenuItem value="japan_post">日本郵便</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="追跡番号"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="1234-5678-9012"
                />

                <Typography variant="caption" color="text.secondary">
                  発送通知メールが自動送信されます。
                </Typography>
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseShipDialog}>キャンセル</Button>
            <Button
              variant="contained"
              startIcon={<Send />}
              onClick={handleShip}
              disabled={!carrier || !trackingNumber}
            >
              発送済みに変更
            </Button>
          </DialogActions>
        </Dialog>
    </Container>
  );
}
