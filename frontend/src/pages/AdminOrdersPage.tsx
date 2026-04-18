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

import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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

// ダミーデータ
const DUMMY_ORDERS = [
  {
    id: '1',
    orderNumber: 'ORD-20260415-001',
    customerName: '山田太郎',
    customerEmail: 'yamada@example.com',
    customerPhone: '090-1234-5678',
    orderDate: new Date('2026-04-10'),
    totalAmount: 15800,
    status: 'PREPARING',
    paymentMethod: 'BANK_TRANSFER',
    paymentStatus: 'COMPLETED',
    shippingAddress: '東京都渋谷区道玄坂1-2-3',
    shippingPostalCode: '150-0043',
    shippingPhone: '090-1234-5678',
    items: [
      { name: 'トヨタ プリウス ブレーキパッド', quantity: 2, price: 7800 },
      { name: '車用オイルフィルター', quantity: 1, price: 100 },
    ],
    shippingOptions: {
      weekendDelivery: true,
      preferredDate: '2026-04-20',
      preferredTimeSlot: '午前中',
    },
    notes: 'できるだけ早く発送してください',
  },
  {
    id: '2',
    orderNumber: 'ORD-20260415-002',
    customerName: '佐藤花子',
    customerEmail: 'sato@example.com',
    customerPhone: '080-9876-5432',
    orderDate: new Date('2026-04-12'),
    totalAmount: 28000,
    status: 'SHIPPED',
    paymentMethod: 'CREDIT_CARD',
    paymentStatus: 'COMPLETED',
    shippingAddress: '大阪府大阪市北区梅田1-1-1',
    shippingPostalCode: '530-0001',
    shippingPhone: '080-9876-5432',
    carrier: 'yamato',
    trackingNumber: '1234-5678-9012',
    items: [{ name: 'ホンダ フィット エアフィルター', quantity: 1, price: 28000 }],
    shippingOptions: {
      weekendDelivery: false,
      preferredTimeSlot: '14-16時',
    },
    notes: '',
  },
  {
    id: '3',
    orderNumber: 'ORD-20260414-003',
    customerName: '田中一郎',
    customerEmail: 'tanaka@example.com',
    customerPhone: '070-1111-2222',
    orderDate: new Date('2026-04-14'),
    totalAmount: 42500,
    status: 'PENDING_PAYMENT',
    paymentMethod: 'BANK_TRANSFER',
    paymentStatus: 'PENDING',
    shippingAddress: '福岡県福岡市博多区博多駅前2-3-4',
    shippingPostalCode: '812-0011',
    shippingPhone: '070-1111-2222',
    items: [
      { name: 'マツダ デミオ スパークプラグ', quantity: 4, price: 9500 },
      { name: 'ワイパーブレード', quantity: 2, price: 3000 },
    ],
    shippingOptions: {
      weekendDelivery: false,
    },
    notes: '不在時は宅配ボックスに入れてください',
  },
];

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
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState<Date | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<Date | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [shipDialogOpen, setShipDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [carrier, setCarrier] = useState<string>('');
  const [trackingNumber, setTrackingNumber] = useState<string>('');

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
      field: 'orderDate',
      headerName: '注文日',
      width: 120,
      renderCell: (params) => (
        <Typography variant="body2">
          {format(params.value as Date, 'yyyy/MM/dd', { locale: ja })}
        </Typography>
      ),
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

  const handleOpenDetailDialog = (order: any) => {
    setSelectedOrder(order);
    setDetailDialogOpen(true);
  };

  const handleCloseDetailDialog = () => {
    setDetailDialogOpen(false);
    setSelectedOrder(null);
  };

  const handleOpenShipDialog = (order: any) => {
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

  const handleShip = () => {
    // 実際のAPI接続は後のステップで実施
    console.log('発送処理:', { carrier, trackingNumber });
    handleCloseShipDialog();
  };

  const handleDownloadDocument = (type: 'delivery' | 'receipt' | 'quote') => {
    // 実際のAPI接続は後のステップで実施
    console.log('書類ダウンロード:', type, selectedOrder?.orderNumber);
  };

  // フィルタリング処理（ダミー）
  const filteredOrders = DUMMY_ORDERS;

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
              rows={filteredOrders}
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
                        {selectedOrder.items.map((item: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>{item.name}</TableCell>
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
                      <strong>郵便番号:</strong> {selectedOrder.shippingPostalCode}
                    </Typography>
                    <Typography variant="body2">
                      <strong>住所:</strong> {selectedOrder.shippingAddress}
                    </Typography>
                    <Typography variant="body2">
                      <strong>電話番号:</strong> {selectedOrder.shippingPhone}
                    </Typography>
                  </Stack>
                </Box>

                {/* 配送オプション */}
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    配送オプション
                  </Typography>
                  <Stack spacing={1}>
                    <Typography variant="body2">
                      <strong>土日着指定:</strong>{' '}
                      {selectedOrder.shippingOptions.weekendDelivery ? 'あり' : 'なし'}
                    </Typography>
                    {selectedOrder.shippingOptions.preferredDate && (
                      <Typography variant="body2">
                        <strong>希望配達日:</strong>{' '}
                        {selectedOrder.shippingOptions.preferredDate}
                      </Typography>
                    )}
                    {selectedOrder.shippingOptions.preferredTimeSlot && (
                      <Typography variant="body2">
                        <strong>時間帯指定:</strong>{' '}
                        {selectedOrder.shippingOptions.preferredTimeSlot}
                      </Typography>
                    )}
                  </Stack>
                </Box>

                {/* 備考 */}
                {selectedOrder.notes && (
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      備考
                    </Typography>
                    <Typography variant="body2">{selectedOrder.notes}</Typography>
                  </Box>
                )}

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
                {selectedOrder.status === 'SHIPPED' && (
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      発送情報
                    </Typography>
                    <Stack spacing={1}>
                      <Typography variant="body2">
                        <strong>配送業者:</strong> {carrierMap[selectedOrder.carrier]}
                      </Typography>
                      <Typography variant="body2">
                        <strong>追跡番号:</strong> {selectedOrder.trackingNumber}
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
