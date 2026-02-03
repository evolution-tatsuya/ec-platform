/**
 * A-003: 注文管理ページ
 *
 * 機能:
 * - 注文一覧表示（MUI DataGrid）
 * - フィルター機能（ステータス、支払い方法、日付、検索）
 * - 注文詳細モーダル
 * - 発送処理
 * - キャンセル処理
 * - 書類発行（納品書、領収書、送り状）
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Stack,
  IconButton,
  Divider,
  Alert,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  LocalShipping,
  Cancel,
  Visibility,
  Description,
  Receipt,
  LocalPrintshop,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { Order } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8432';

// ===== ステータスカラーマッピング =====
const statusColors: Record<string, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  pending: 'warning',
  paid: 'info',
  preparing: 'info',
  shipped: 'success',
  completed: 'success',
  cancelled: 'error',
};

// ===== ステータス日本語表示 =====
const statusLabels: Record<string, string> = {
  pending: '入金待ち',
  paid: '入金済み',
  preparing: '準備中',
  shipped: '発送済み',
  completed: '完了',
  cancelled: 'キャンセル',
};

// ===== 配送業者日本語表示 =====
const carrierLabels: Record<string, string> = {
  yamato: 'ヤマト運輸',
  sagawa: '佐川急便',
  japan_post: '日本郵便',
};

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();

  // ===== ステート =====
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [shipDialogOpen, setShipDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // 発送フォーム
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  // キャンセルフォーム
  const [cancelReason, setCancelReason] = useState('');

  // ===== データ取得 =====
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['adminOrders', statusFilter, paymentMethodFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (paymentMethodFilter) params.append('paymentMethod', paymentMethodFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await axios.get(`${API_URL}/api/admin/orders?${params.toString()}`, {
        withCredentials: true,
      });
      return response.data.orders as Order[];
    },
  });

  // ===== 発送処理ミューテーション =====
  const shipMutation = useMutation({
    mutationFn: async ({ orderId, carrier, trackingNumber }: { orderId: string; carrier: string; trackingNumber: string }) => {
      const response = await axios.put(
        `${API_URL}/api/admin/orders/${orderId}/ship`,
        { carrier, trackingNumber },
        { withCredentials: true }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      setShipDialogOpen(false);
      setCarrier('');
      setTrackingNumber('');
      alert('発送処理が完了しました');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || '発送処理に失敗しました');
    },
  });

  // ===== キャンセル処理ミューテーション =====
  const cancelMutation = useMutation({
    mutationFn: async ({ orderId, cancelReason }: { orderId: string; cancelReason: string }) => {
      const response = await axios.put(
        `${API_URL}/api/admin/orders/${orderId}/cancel`,
        { cancelReason },
        { withCredentials: true }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      setCancelDialogOpen(false);
      setCancelReason('');
      alert('注文をキャンセルしました（在庫を復元しました）');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'キャンセル処理に失敗しました');
    },
  });

  // ===== DataGrid カラム定義 =====
  const columns: GridColDef[] = [
    {
      field: 'orderNumber',
      headerName: '注文番号',
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" fontWeight="bold">
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'createdAt',
      headerName: '注文日時',
      width: 160,
      valueFormatter: (value: any) => new Date(value).toLocaleString('ja-JP'),
    },
    {
      field: 'customerName',
      headerName: '顧客名',
      width: 150,
    },
    {
      field: 'customerEmail',
      headerName: 'メール',
      width: 200,
    },
    {
      field: 'totalAmount',
      headerName: '合計金額',
      width: 120,
      valueFormatter: (value: any) => `¥${value.toLocaleString()}`,
    },
    {
      field: 'paymentMethod',
      headerName: '支払方法',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value === 'bank_transfer' ? '銀行振込' : 'クレジット'}
          size="small"
          color={params.value === 'bank_transfer' ? 'default' : 'primary'}
        />
      ),
    },
    {
      field: 'status',
      headerName: 'ステータス',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={statusLabels[params.value as string] || params.value}
          size="small"
          color={statusColors[params.value as string] || 'default'}
        />
      ),
    },
    {
      field: 'actions',
      headerName: '操作',
      width: 250,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Stack direction="row" spacing={1}>
          <IconButton
            size="small"
            color="primary"
            onClick={() => handleViewDetail(params.row)}
            title="詳細"
          >
            <Visibility fontSize="small" />
          </IconButton>

          {(params.row.status === 'paid' || params.row.status === 'preparing') && (
            <IconButton
              size="small"
              color="success"
              onClick={() => handleOpenShipDialog(params.row)}
              title="発送"
            >
              <LocalShipping fontSize="small" />
            </IconButton>
          )}

          {params.row.status !== 'cancelled' &&
            params.row.status !== 'shipped' &&
            params.row.status !== 'completed' && (
              <IconButton
                size="small"
                color="error"
                onClick={() => handleOpenCancelDialog(params.row)}
                title="キャンセル"
              >
                <Cancel fontSize="small" />
              </IconButton>
            )}

          <IconButton
            size="small"
            onClick={() => handleDownloadPDF(params.row.id, 'invoice')}
            title="納品書"
          >
            <Description fontSize="small" />
          </IconButton>
        </Stack>
      ),
    },
  ];

  // ===== ハンドラー =====
  const handleViewDetail = (order: Order) => {
    setSelectedOrder(order);
    setDetailDialogOpen(true);
  };

  const handleOpenShipDialog = (order: Order) => {
    setSelectedOrder(order);
    setShipDialogOpen(true);
  };

  const handleOpenCancelDialog = (order: Order) => {
    setSelectedOrder(order);
    setCancelDialogOpen(true);
  };

  const handleShip = () => {
    if (!selectedOrder) return;
    if (!carrier || !trackingNumber) {
      alert('配送業者と追跡番号を入力してください');
      return;
    }
    shipMutation.mutate({
      orderId: selectedOrder.id,
      carrier,
      trackingNumber,
    });
  };

  const handleCancel = () => {
    if (!selectedOrder) return;
    if (!cancelReason) {
      alert('キャンセル理由を入力してください');
      return;
    }
    cancelMutation.mutate({
      orderId: selectedOrder.id,
      cancelReason,
    });
  };

  const handleDownloadPDF = async (orderId: string, type: 'invoice' | 'receipt' | 'shipping-label') => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/orders/${orderId}/${type}`, {
        responseType: 'blob',
        withCredentials: true,
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}-${orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: any) {
      alert(error.response?.data?.message || 'PDF生成に失敗しました');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        注文管理
      </Typography>

      {/* フィルターセクション */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>ステータス</InputLabel>
            <Select
              value={statusFilter}
              label="ステータス"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="">すべて</MenuItem>
              <MenuItem value="pending">入金待ち</MenuItem>
              <MenuItem value="paid">入金済み</MenuItem>
              <MenuItem value="preparing">準備中</MenuItem>
              <MenuItem value="shipped">発送済み</MenuItem>
              <MenuItem value="completed">完了</MenuItem>
              <MenuItem value="cancelled">キャンセル</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>支払方法</InputLabel>
            <Select
              value={paymentMethodFilter}
              label="支払方法"
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
            >
              <MenuItem value="">すべて</MenuItem>
              <MenuItem value="bank_transfer">銀行振込</MenuItem>
              <MenuItem value="credit_card">クレジットカード</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="検索（注文番号・顧客名・メール）"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: 300 }}
          />
        </Stack>
      </Paper>

      {/* DataGrid */}
      <Paper sx={{ height: 600 }}>
        <DataGrid
          rows={ordersData || []}
          columns={columns}
          loading={isLoading}
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
          }}
          disableRowSelectionOnClick
        />
      </Paper>

      {/* 詳細ダイアログ */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>注文詳細</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box>
              <Typography variant="h6" gutterBottom>
                注文番号: {selectedOrder.orderNumber}
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" gutterBottom>
                顧客情報
              </Typography>
              <Typography variant="body2">名前: {selectedOrder.customerName}</Typography>
              <Typography variant="body2">メール: {selectedOrder.customerEmail}</Typography>
              <Typography variant="body2">電話: {selectedOrder.customerPhone}</Typography>
              <Typography variant="body2">
                配送先: 〒{selectedOrder.shippingPostalCode} {selectedOrder.shippingAddress}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" gutterBottom>
                商品明細
              </Typography>
              {selectedOrder.items.map((item, index) => (
                <Box key={index} sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    {item.product.name} × {item.quantity} = ¥{(item.price * item.quantity).toLocaleString()}
                  </Typography>
                </Box>
              ))}

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6">
                合計金額: ¥{selectedOrder.totalAmount.toLocaleString()}
              </Typography>

              {selectedOrder.carrier && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom>
                    配送情報
                  </Typography>
                  <Typography variant="body2">
                    配送業者: {carrierLabels[selectedOrder.carrier]}
                  </Typography>
                  <Typography variant="body2">追跡番号: {selectedOrder.trackingNumber}</Typography>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>閉じる</Button>
        </DialogActions>
      </Dialog>

      {/* 発送ダイアログ */}
      <Dialog open={shipDialogOpen} onClose={() => setShipDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>発送処理</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="body2" gutterBottom>
                注文番号: {selectedOrder.orderNumber}
              </Typography>

              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>配送業者</InputLabel>
                <Select value={carrier} label="配送業者" onChange={(e) => setCarrier(e.target.value)}>
                  <MenuItem value="yamato">ヤマト運輸</MenuItem>
                  <MenuItem value="sagawa">佐川急便</MenuItem>
                  <MenuItem value="japan_post">日本郵便</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="追跡番号"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                fullWidth
                sx={{ mt: 2 }}
              />

              <Alert severity="info" sx={{ mt: 2 }}>
                発送完了メールが顧客に送信されます
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShipDialogOpen(false)}>キャンセル</Button>
          <Button onClick={handleShip} variant="contained" color="success" disabled={shipMutation.isPending}>
            発送処理を実行
          </Button>
        </DialogActions>
      </Dialog>

      {/* キャンセルダイアログ */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>注文キャンセル</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="body2" gutterBottom>
                注文番号: {selectedOrder.orderNumber}
              </Typography>

              <TextField
                label="キャンセル理由"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                fullWidth
                multiline
                rows={3}
                sx={{ mt: 2 }}
              />

              <Alert severity="warning" sx={{ mt: 2 }}>
                在庫が自動的に復元されます。この操作は取り消せません。
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>閉じる</Button>
          <Button onClick={handleCancel} variant="contained" color="error" disabled={cancelMutation.isPending}>
            キャンセル実行
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
