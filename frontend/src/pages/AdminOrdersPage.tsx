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
import Grid from '@mui/material/GridLegacy';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Description, Receipt, RequestQuote, Send } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import { format } from 'date-fns';
import { Header } from '../components';
import {
  useAdminOrders,
  useShipOrder,
  useGenerateInvoice,
  useGenerateReceipt,
  useGenerateQuote,
} from '../hooks/useOrders';
import type { Order, AdminOrderFilterParams, OrderStatus, PaymentMethod } from '../types';

// DUMMY_ORDERS削除 - API統合完了

// ステータス表示マップ
const orderStatusMap: Record<string, string> = {
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

  // API統合: Mutation
  const shipOrderMutation = useShipOrder();
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
          {params.row.status === 'PREPARING' && (
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
      <>
        <Header />
        <Container maxWidth="xl" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Alert severity="error">
            注文一覧の取得に失敗しました: {error.message}
          </Alert>
        </Container>
      </>
    );
  }

  return (
    <>
      <Header />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          注文管理
        </Typography>

        {/* 検索・絞り込み */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid xs={12} sm={6} md={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
                  <DatePicker
                    label="期間（開始）"
                    value={filterStartDate}
                    onChange={(newValue) => setFilterStartDate(newValue as Date | null)}
                    slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid xs={12} sm={6} md={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
                  <DatePicker
                    label="期間（終了）"
                    value={filterEndDate}
                    onChange={(newValue) => setFilterEndDate(newValue as Date | null)}
                    slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>ステータス</InputLabel>
                  <Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    label="ステータス"
                  >
                    <MenuItem value="all">すべて</MenuItem>
                    <MenuItem value="PENDING_PAYMENT">入金待ち</MenuItem>
                    <MenuItem value="PREPARING">発送準備中</MenuItem>
                    <MenuItem value="SHIPPED">発送済み</MenuItem>
                    <MenuItem value="DELIVERED">配達完了</MenuItem>
                    <MenuItem value="CANCELLED">キャンセル</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6} md={3}>
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
              </Grid>
            </Grid>
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
            />
          </CardContent>
        </Card>

        {/* 注文詳細ダイアログ */}
        <Dialog
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
                      <strong>氏名:</strong> {selectedOrder.customerName}
                    </Typography>
                    <Typography variant="body2">
                      <strong>メール:</strong> {selectedOrder.customerEmail}
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
            <Button onClick={handleCloseDetailDialog}>閉じる</Button>
          </DialogActions>
        </Dialog>

        {/* 発送処理ダイアログ */}
        <Dialog open={shipDialogOpen} onClose={handleCloseShipDialog} maxWidth="sm" fullWidth>
          <DialogTitle>発送処理</DialogTitle>
          <DialogContent>
            {selectedOrder && (
              <Stack spacing={3} sx={{ mt: 1 }}>
                <Typography variant="body2">
                  <strong>注文番号:</strong> {selectedOrder.orderNumber}
                </Typography>
                <Typography variant="body2">
                  <strong>顧客名:</strong> {selectedOrder.customerName}
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
    </>
  );
}
