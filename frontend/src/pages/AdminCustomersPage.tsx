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
  Autocomplete,
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
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { Edit } from '@mui/icons-material';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Header } from '../components';

// ダミーデータ
const DUMMY_CUSTOMERS = [
  {
    id: '1',
    name: '山田太郎',
    email: 'yamada@example.com',
    phone: '090-1234-5678',
    registeredAt: new Date('2025-01-15'),
    totalOrders: 12,
    totalSpent: 180000,
    lastOrderDate: new Date('2026-04-10'),
    repeatRate: 0.83,
    tags: ['VIP', 'リピーター'],
    orders: [
      {
        orderNumber: 'ORD-20260410-001',
        orderDate: new Date('2026-04-10'),
        totalAmount: 15800,
        status: 'PREPARING',
      },
      {
        orderNumber: 'ORD-20260315-002',
        orderDate: new Date('2026-03-15'),
        totalAmount: 28000,
        status: 'DELIVERED',
      },
      {
        orderNumber: 'ORD-20260210-003',
        orderDate: new Date('2026-02-10'),
        totalAmount: 42500,
        status: 'DELIVERED',
      },
    ],
  },
  {
    id: '2',
    name: '佐藤花子',
    email: 'sato@example.com',
    phone: '080-9876-5432',
    registeredAt: new Date('2025-03-20'),
    totalOrders: 5,
    totalSpent: 68000,
    lastOrderDate: new Date('2026-04-12'),
    repeatRate: 0.6,
    tags: ['リピーター'],
    orders: [
      {
        orderNumber: 'ORD-20260412-001',
        orderDate: new Date('2026-04-12'),
        totalAmount: 28000,
        status: 'SHIPPED',
      },
      {
        orderNumber: 'ORD-20260301-002',
        orderDate: new Date('2026-03-01'),
        totalAmount: 15000,
        status: 'DELIVERED',
      },
    ],
  },
  {
    id: '3',
    name: '田中一郎',
    email: 'tanaka@example.com',
    phone: '070-1111-2222',
    registeredAt: new Date('2026-04-01'),
    totalOrders: 1,
    totalSpent: 42500,
    lastOrderDate: new Date('2026-04-14'),
    repeatRate: 0,
    tags: [],
    orders: [
      {
        orderNumber: 'ORD-20260414-001',
        orderDate: new Date('2026-04-14'),
        totalAmount: 42500,
        status: 'PENDING_PAYMENT',
      },
    ],
  },
  {
    id: '4',
    name: '鈴木美咲',
    email: 'suzuki@example.com',
    phone: '090-3333-4444',
    registeredAt: new Date('2024-11-10'),
    totalOrders: 25,
    totalSpent: 520000,
    lastOrderDate: new Date('2026-04-08'),
    repeatRate: 0.92,
    tags: ['VIP', 'リピーター', '高額購入者'],
    orders: [
      {
        orderNumber: 'ORD-20260408-001',
        orderDate: new Date('2026-04-08'),
        totalAmount: 85000,
        status: 'DELIVERED',
      },
      {
        orderNumber: 'ORD-20260305-002',
        orderDate: new Date('2026-03-05'),
        totalAmount: 62000,
        status: 'DELIVERED',
      },
    ],
  },
  {
    id: '5',
    name: '高橋健太',
    email: 'takahashi@example.com',
    phone: '080-5555-6666',
    registeredAt: new Date('2025-06-18'),
    totalOrders: 8,
    totalSpent: 125000,
    lastOrderDate: new Date('2026-03-28'),
    repeatRate: 0.75,
    tags: ['リピーター'],
    orders: [
      {
        orderNumber: 'ORD-20260328-001',
        orderDate: new Date('2026-03-28'),
        totalAmount: 22000,
        status: 'DELIVERED',
      },
    ],
  },
];

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
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [editTags, setEditTags] = useState<string[]>([]);

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
          {format(params.value as Date, 'yyyy/MM/dd', { locale: ja })}
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
          onClick={() => handleOpenDetailDialog(params.row)}
        >
          詳細
        </Button>
      ),
    },
  ];

  const handleOpenDetailDialog = (customer: any) => {
    setSelectedCustomer(customer);
    setEditTags(customer.tags);
    setDetailDialogOpen(true);
  };

  const handleCloseDetailDialog = () => {
    setDetailDialogOpen(false);
    setSelectedCustomer(null);
    setEditTags([]);
  };

  const handleSaveTags = () => {
    // 実際のAPI接続は後のステップで実施
    console.log('タグ保存:', { customerId: selectedCustomer?.id, tags: editTags });
    handleCloseDetailDialog();
  };

  // フィルタリング処理（ダミー）
  const filteredCustomers = DUMMY_CUSTOMERS.filter((customer) => {
    // 検索クエリフィルター
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !customer.name.toLowerCase().includes(query) &&
        !customer.email.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

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
            {selectedCustomer && (
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
                    <Typography variant="body2">
                      <strong>電話番号:</strong> {selectedCustomer.phone}
                    </Typography>
                    <Typography variant="body2">
                      <strong>登録日:</strong>{' '}
                      {format(selectedCustomer.registeredAt, 'yyyy年M月d日', { locale: ja })}
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
                            {format(selectedCustomer.lastOrderDate, 'yyyy/MM/dd', {
                              locale: ja,
                            })}
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
                        {selectedCustomer.orders.map((order: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Typography variant="body2" fontFamily="monospace">
                                {order.orderNumber}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {format(order.orderDate, 'yyyy/MM/dd', { locale: ja })}
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
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDetailDialog}>キャンセル</Button>
            <Button variant="contained" onClick={handleSaveTags}>
              タグを保存
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
}
