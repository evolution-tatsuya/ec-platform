// ===== A-005: 顧客管理ページ =====
// 目的: 顧客一覧表示・詳細確認・情報編集

import { useState, useEffect } from 'react';
import { Box, Button, Typography, TextField, MenuItem, Chip, Alert, Paper, Card, CardContent, Grid, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Person, ShoppingCart, Edit } from '@mui/icons-material';
import { adminAPI } from '../lib/api';
import { Header } from '../components';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

const AdminCustomersPage = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', defaultAddress: '', defaultPostalCode: '', defaultPhone: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [stats, setStats] = useState({ totalCustomers: 0, newCustomersThisMonth: 0, customersWithOrders: 0, customersWithoutOrders: 0 });

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (orderFilter === 'with') params.hasOrders = true;
      if (orderFilter === 'without') params.hasOrders = false;
      const { customers: data } = await adminAPI.getCustomers(params);
      setCustomers(data);
    } catch (error: any) {
      showSnackbar(error.message || '顧客一覧の取得に失敗しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await adminAPI.getCustomerStats();
      setStats(data);
    } catch (error: any) {
      console.error('統計情報の取得エラー:', error);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchStats();
  }, [searchTerm, orderFilter]);

  const handleViewDetail = async (customerId: string) => {
    try {
      const data = await adminAPI.getCustomerById(customerId);
      setSelectedCustomer(data);
      setOpenDetail(true);
    } catch (error: any) {
      showSnackbar(error.message || '顧客詳細の取得に失敗しました', 'error');
    }
  };

  const handleEdit = (customer: any) => {
    setEditForm({ name: customer.name || '', defaultAddress: customer.defaultAddress || '', defaultPostalCode: customer.defaultPostalCode || '', defaultPhone: customer.defaultPhone || '' });
    setSelectedCustomer(customer);
    setOpenEdit(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedCustomer) return;
    try {
      const { message } = await adminAPI.updateCustomer(selectedCustomer.id, editForm);
      showSnackbar(message, 'success');
      setOpenEdit(false);
      fetchCustomers();
    } catch (error: any) {
      showSnackbar(error.message || '顧客情報の更新に失敗しました', 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const columns: GridColDef[] = [
    { field: 'email', headerName: 'メールアドレス', width: 250 },
    { field: 'name', headerName: '名前', width: 180, valueGetter: (value) => value || '未設定' },
    { field: 'orderCount', headerName: '注文数', width: 100, align: 'right', headerAlign: 'right' },
    { field: 'totalPurchase', headerName: '総購入額', width: 150, align: 'right', headerAlign: 'right', valueGetter: (value) => `¥${value.toLocaleString()}` },
    { field: 'createdAt', headerName: '登録日', width: 150, valueGetter: (value) => format(new Date(value), 'yyyy/MM/dd', { locale: ja }) },
    {
      field: 'actions',
      headerName: '操作',
      width: 200,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box display="flex" gap={1}>
          <Button size="small" variant="outlined" onClick={() => handleViewDetail(params.row.id)}>詳細</Button>
          <Button size="small" variant="outlined" color="primary" startIcon={<Edit />} onClick={() => handleEdit(params.row)}>編集</Button>
        </Box>
      ),
    },
  ];

  return (
    <>
      <Header />
      <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">顧客管理</Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}><Card><CardContent><Typography variant="body2" color="text.secondary">全顧客数</Typography><Typography variant="h4" fontWeight="bold">{stats.totalCustomers}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} sm={6} md={3}><Card><CardContent><Typography variant="body2" color="text.secondary">今月の新規顧客</Typography><Typography variant="h4" fontWeight="bold" color="success.main">{stats.newCustomersThisMonth}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} sm={6} md={3}><Card><CardContent><Typography variant="body2" color="text.secondary">購入実績あり</Typography><Typography variant="h4" fontWeight="bold" color="primary.main">{stats.customersWithOrders}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} sm={6} md={3}><Card><CardContent><Typography variant="body2" color="text.secondary">購入実績なし</Typography><Typography variant="h4" fontWeight="bold">{stats.customersWithoutOrders}</Typography></CardContent></Card></Grid>
        </Grid>

        <Paper sx={{ p: 2, mb: 2 }}>
          <Box display="flex" gap={2} flexWrap="wrap">
            <TextField label="検索（メールアドレス・名前）" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} size="small" sx={{ flexGrow: 1, minWidth: 300 }} />
            <TextField select label="購入実績" value={orderFilter} onChange={(e) => setOrderFilter(e.target.value)} size="small" sx={{ width: 150 }}>
              <MenuItem value="all">全て</MenuItem>
              <MenuItem value="with">あり</MenuItem>
              <MenuItem value="without">なし</MenuItem>
            </TextField>
          </Box>
        </Paper>

        <Paper><DataGrid rows={customers} columns={columns} loading={loading} autoHeight pageSizeOptions={[10, 25, 50, 100]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} disableRowSelectionOnClick /></Paper>

        <Dialog open={openDetail} onClose={() => setOpenDetail(false)} maxWidth="md" fullWidth>
          <DialogTitle>顧客詳細</DialogTitle>
          <DialogContent>
            {selectedCustomer && (
              <Box sx={{ pt: 1 }}>
                <Box sx={{ mb: 2 }}><Typography variant="caption" color="text.secondary">メールアドレス</Typography><Typography variant="body1">{selectedCustomer.email}</Typography></Box>
                <Box sx={{ mb: 2 }}><Typography variant="caption" color="text.secondary">名前</Typography><Typography variant="body1">{selectedCustomer.name || '未設定'}</Typography></Box>
                <Box sx={{ mb: 2 }}><Typography variant="caption" color="text.secondary">電話番号</Typography><Typography variant="body1">{selectedCustomer.defaultPhone || '未設定'}</Typography></Box>
                <Box sx={{ mb: 2 }}><Typography variant="caption" color="text.secondary">郵便番号</Typography><Typography variant="body1">{selectedCustomer.defaultPostalCode || '未設定'}</Typography></Box>
                <Box sx={{ mb: 2 }}><Typography variant="caption" color="text.secondary">住所</Typography><Typography variant="body1">{selectedCustomer.defaultAddress || '未設定'}</Typography></Box>
                <Box sx={{ mb: 2 }}><Typography variant="caption" color="text.secondary">注文数</Typography><Typography variant="body1">{selectedCustomer.orderCount}件</Typography></Box>
                <Box sx={{ mb: 2 }}><Typography variant="caption" color="text.secondary">総購入額</Typography><Typography variant="body1">¥{selectedCustomer.totalPurchase.toLocaleString()}</Typography></Box>
                <Box sx={{ mb: 2 }}><Typography variant="caption" color="text.secondary">登録日</Typography><Typography variant="body1">{format(new Date(selectedCustomer.createdAt), 'yyyy年M月d日 HH:mm', { locale: ja })}</Typography></Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions><Button onClick={() => setOpenDetail(false)}>閉じる</Button></DialogActions>
        </Dialog>

        <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="sm" fullWidth>
          <DialogTitle>顧客情報編集</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField label="名前" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} fullWidth />
              <TextField label="郵便番号" value={editForm.defaultPostalCode} onChange={(e) => setEditForm({ ...editForm, defaultPostalCode: e.target.value })} fullWidth />
              <TextField label="住所" value={editForm.defaultAddress} onChange={(e) => setEditForm({ ...editForm, defaultAddress: e.target.value })} fullWidth />
              <TextField label="電話番号" value={editForm.defaultPhone} onChange={(e) => setEditForm({ ...editForm, defaultPhone: e.target.value })} fullWidth />
            </Box>
          </DialogContent>
          <DialogActions><Button onClick={() => setOpenEdit(false)}>キャンセル</Button><Button variant="contained" onClick={handleSaveEdit}>保存</Button></DialogActions>
        </Dialog>

        <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
        </Snackbar>
      </Box>
    </>
  );
};

export default AdminCustomersPage;
