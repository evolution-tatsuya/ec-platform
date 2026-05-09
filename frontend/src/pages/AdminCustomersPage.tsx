/**
 * A-005: 顧客管理ページ（UI実装）
 *
 * 主要機能:
 * - 顧客一覧表示（DataGrid）
 * - 検索・絞り込み（名前、メール、購入回数）
 * - 顧客詳細表示
 * - タグ付け機能（VIP、リピーター等）
 */

import { useState } from 'react';
import {
  Alert,
  Autocomplete,
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
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { Edit } from '@mui/icons-material';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Header } from '../components';
import { useAdminCustomers, useAdminCustomerById, useUpdateCustomerTags } from '../hooks/useCustomers';
import type { CustomerWithStats } from '../types';

// タグの選択肢
const TAG_OPTIONS = ['VIP', 'リピーター', '高額購入者', '要注意'];

// 注文ステータス表示マップ
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

export default function AdminCustomersPage() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterOrderCount, setFilterOrderCount] = useState<string>('all');
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [editTags, setEditTags] = useState<string[]>([]);

  // APIから顧客一覧取得
  const {
    data: customers = [],
    isLoading,
    error
  } = useAdminCustomers({
    search: searchQuery || undefined,
  });

  // 顧客詳細取得
  const {
    data: selectedCustomer,
    isLoading: isLoadingDetail,
  } = useAdminCustomerById(selectedCustomerId);

  // タグ更新mutation
  const updateTagsMutation = useUpdateCustomerTags();

  // DataGrid列定義
  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: '顧客名',
      width: 150,
    },
    {
      field: 'email',
      headerName: 'メールアドレス',
      width: 220,
    },
    {
      field: 'registeredAt',
      headerName: '登録日',
      width: 120,
      renderCell: (params) => (
        <Typography variant="body2">
          {format(new Date(params.value as string), 'yyyy/MM/dd', { locale: ja })}
        </Typography>
      ),
    },
    {
      field: 'totalOrders',
      headerName: '購入回数',
      width: 100,
      align: 'right',
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="bold">
          {params.value}回
        </Typography>
      ),
    },
    {
      field: 'totalSpent',
      headerName: '累計購入金額',
      width: 140,
      align: 'right',
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="bold">
          ¥{params.value.toLocaleString()}
        </Typography>
      ),
    },
    {
      field: 'tags',
      headerName: 'タグ',
      width: 200,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          {(params.value as string[]).map((tag, index) => (
            <Chip key={index} label={tag} size="small" color="primary" />
          ))}
        </Stack>
      ),
    },
    {
      field: 'actions',
      headerName: '操作',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <Button
          size="small"
          variant="outlined"
          startIcon={<Edit />}
          onClick={() => handleOpenDetailDialog(params.row as CustomerWithStats)}
        >
          詳細
        </Button>
      ),
    },
  ];

  const handleOpenDetailDialog = (customer: CustomerWithStats) => {
    setSelectedCustomerId(customer.id);
    setEditTags(customer.tags);
    setDetailDialogOpen(true);
  };

  const handleCloseDetailDialog = () => {
    setDetailDialogOpen(false);
    setSelectedCustomerId('');
    setEditTags([]);
  };

  const handleSaveTags = async () => {
    if (!selectedCustomerId) return;

    try {
      await updateTagsMutation.mutateAsync({
        id: selectedCustomerId,
        data: { tags: editTags },
      });
      handleCloseDetailDialog();
    } catch (error) {
      console.error('タグ保存エラー:', error);
    }
  };

  // クライアントサイドフィルタリング処理（購入回数のみ）
  const filteredCustomers = customers.filter((customer) => {
    // 購入回数フィルター
    if (filterOrderCount !== 'all') {
      const count = customer.totalOrders;
      if (filterOrderCount === '1' && count !== 1) return false;
      if (filterOrderCount === '2-5' && (count < 2 || count > 5)) return false;
      if (filterOrderCount === '6-10' && (count < 6 || count > 10)) return false;
      if (filterOrderCount === '11+' && count < 11) return false;
    }

    return true;
  });

  // ローディング状態
  if (isLoading) {
    return (
      <>
        <Header />
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        </Container>
      </>
    );
  }

  // エラー状態
  if (error) {
    return (
      <>
        <Header />
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Alert severity="error">
            顧客データの取得に失敗しました: {error.message}
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
          顧客管理
        </Typography>

        {/* 検索・絞り込み */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid xs={12} sm={8}>
                <TextField
                  fullWidth
                  size="small"
                  label="顧客検索"
                  placeholder="名前またはメールアドレスで検索"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </Grid>
              <Grid xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>購入回数</InputLabel>
                  <Select
                    value={filterOrderCount}
                    onChange={(e) => setFilterOrderCount(e.target.value)}
                    label="購入回数"
                  >
                    <MenuItem value="all">すべて</MenuItem>
                    <MenuItem value="1">1回</MenuItem>
                    <MenuItem value="2-5">2〜5回</MenuItem>
                    <MenuItem value="6-10">6〜10回</MenuItem>
                    <MenuItem value="11+">11回以上</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* 顧客一覧 */}
        <Card>
          <CardContent>
            <DataGrid
              rows={filteredCustomers}
              columns={columns}
              initialState={{
                pagination: {
                  paginationModel: { page: 0, pageSize: 10 },
                },
                sorting: {
                  sortModel: [{ field: 'totalSpent', sort: 'desc' }],
                },
              }}
              pageSizeOptions={[10, 25, 50]}
              disableRowSelectionOnClick
              autoHeight
            />
          </CardContent>
        </Card>

        {/* 顧客詳細ダイアログ */}
        <Dialog
          open={detailDialogOpen}
          onClose={handleCloseDetailDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>顧客詳細</DialogTitle>
          <DialogContent>
            {isLoadingDetail ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : selectedCustomer ? (
              <Stack spacing={3} sx={{ mt: 1 }}>
                {/* 基本情報 */}
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    基本情報
                  </Typography>
                  <Stack spacing={1}>
                    <Typography variant="body2">
                      <strong>氏名:</strong> {selectedCustomer.name}
                    </Typography>
                    <Typography variant="body2">
                      <strong>メール:</strong> {selectedCustomer.email}
                    </Typography>
                    {selectedCustomer.phone && (
                      <Typography variant="body2">
                        <strong>電話番号:</strong> {selectedCustomer.phone}
                      </Typography>
                    )}
                    <Typography variant="body2">
                      <strong>登録日:</strong>{' '}
                      {format(new Date(selectedCustomer.registeredAt), 'yyyy年M月d日', { locale: ja })}
                    </Typography>
                  </Stack>
                </Box>

                {/* 統計情報 */}
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    統計情報
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid xs={6} sm={3}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">
                            累計購入金額
                          </Typography>
                          <Typography variant="h6" fontWeight="bold">
                            ¥{selectedCustomer.totalSpent.toLocaleString()}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid xs={6} sm={3}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">
                            購入回数
                          </Typography>
                          <Typography variant="h6" fontWeight="bold">
                            {selectedCustomer.totalOrders}回
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid xs={6} sm={3}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">
                            最終購入日
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {selectedCustomer.lastOrderDate
                              ? format(new Date(selectedCustomer.lastOrderDate), 'yyyy/MM/dd', { locale: ja })
                              : '未購入'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid xs={6} sm={3}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">
                            リピート率
                          </Typography>
                          <Typography variant="h6" fontWeight="bold">
                            {(selectedCustomer.repeatRate * 100).toFixed(0)}%
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>

                {/* タグ編集 */}
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    タグ編集
                  </Typography>
                  <Autocomplete
                    multiple
                    options={TAG_OPTIONS}
                    value={editTags}
                    onChange={(_, newValue) => setEditTags(newValue)}
                    renderInput={(params) => (
                      <TextField {...params} placeholder="タグを選択または追加" />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => {
                        const { key, ...otherProps } = getTagProps({ index });
                        return (
                          <Chip
                            key={key}
                            label={option}
                            color="primary"
                            {...otherProps}
                          />
                        );
                      })
                    }
                    freeSolo
                  />
                </Box>

                {/* 購入履歴 */}
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    購入履歴（最近5件）
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>注文番号</TableCell>
                          <TableCell>注文日</TableCell>
                          <TableCell align="right">金額</TableCell>
                          <TableCell>ステータス</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedCustomer.orders.map((order, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Typography variant="body2" fontFamily="monospace">
                                {order.orderNumber}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {format(new Date(order.orderDate), 'yyyy/MM/dd', { locale: ja })}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              ¥{order.totalAmount.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={orderStatusMap[order.status] || order.status}
                                size="small"
                                color={statusColorMap[order.status] || 'default'}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Stack>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDetailDialog} disabled={updateTagsMutation.isPending}>
              キャンセル
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveTags}
              disabled={updateTagsMutation.isPending}
            >
              {updateTagsMutation.isPending ? '保存中...' : 'タグを保存'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
}
