// ===== A-006: 問い合わせ管理ページ =====
// 目的: 問い合わせ一覧表示・返信・ステータス管理

import { useState, useEffect } from 'react';
import { Box, Button, Typography, TextField, MenuItem, Chip, Alert, Paper, Card, CardContent, Grid, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, IconButton } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Email, Reply, Delete, Close, HourglassEmpty, CheckCircle } from '@mui/icons-material';
import { adminAPI } from '../lib/api';
import { Header } from '../components';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

const AdminInquiriesPage = () => {
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInquiry, setSelectedInquiry] = useState<any | null>(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [openReply, setOpenReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [stats, setStats] = useState({ totalInquiries: 0, pendingCount: 0, repliedCount: 0, closedCount: 0, todayInquiries: 0, averageReplyTimeHours: 0 });

  const fetchInquiries = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;
      const { inquiries: data } = await adminAPI.getInquiries(params);
      setInquiries(data);
    } catch (error: any) {
      showSnackbar(error.message || '問い合わせ一覧の取得に失敗しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await adminAPI.getInquiryStats();
      setStats(data);
    } catch (error: any) {
      console.error('統計情報の取得エラー:', error);
    }
  };

  useEffect(() => {
    fetchInquiries();
    fetchStats();
  }, [searchTerm, statusFilter]);

  const handleViewDetail = async (inquiryId: string) => {
    try {
      const data = await adminAPI.getInquiryById(inquiryId);
      setSelectedInquiry(data);
      setOpenDetail(true);
    } catch (error: any) {
      showSnackbar(error.message || '問い合わせ詳細の取得に失敗しました', 'error');
    }
  };

  const handleOpenReply = (inquiry: any) => {
    setSelectedInquiry(inquiry);
    setReplyText(inquiry.reply || '');
    setOpenReply(true);
  };

  const handleSendReply = async () => {
    if (!selectedInquiry || !replyText.trim()) return;
    try {
      const { message } = await adminAPI.replyToInquiry(selectedInquiry.id, replyText);
      showSnackbar(message, 'success');
      setOpenReply(false);
      setReplyText('');
      fetchInquiries();
      fetchStats();
    } catch (error: any) {
      showSnackbar(error.message || '返信の送信に失敗しました', 'error');
    }
  };

  const handleUpdateStatus = async (inquiryId: string, newStatus: string) => {
    try {
      const { message } = await adminAPI.updateInquiryStatus(inquiryId, newStatus);
      showSnackbar(message, 'success');
      fetchInquiries();
      fetchStats();
    } catch (error: any) {
      showSnackbar(error.message || 'ステータスの更新に失敗しました', 'error');
    }
  };

  const handleDelete = async (inquiryId: string) => {
    if (!window.confirm('この問い合わせを削除してもよろしいですか？')) return;
    try {
      const { message } = await adminAPI.deleteInquiry(inquiryId);
      showSnackbar(message, 'success');
      fetchInquiries();
      fetchStats();
    } catch (error: any) {
      showSnackbar(error.message || '問い合わせの削除に失敗しました', 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'replied':
        return 'primary';
      case 'closed':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '未対応';
      case 'replied':
        return '返信済み';
      case 'closed':
        return '完了';
      default:
        return status;
    }
  };

  const columns: GridColDef[] = [
    { field: 'createdAt', headerName: '受信日時', width: 150, valueGetter: (value) => format(new Date(value), 'yyyy/MM/dd HH:mm', { locale: ja }) },
    { field: 'name', headerName: '送信者名', width: 150 },
    { field: 'email', headerName: 'メールアドレス', width: 220 },
    { field: 'subject', headerName: '件名', width: 300 },
    {
      field: 'status',
      headerName: 'ステータス',
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Chip label={getStatusLabel(params.row.status)} color={getStatusColor(params.row.status)} size="small" />
      ),
    },
    {
      field: 'actions',
      headerName: '操作',
      width: 280,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box display="flex" gap={1}>
          <Button size="small" variant="outlined" onClick={() => handleViewDetail(params.row.id)}>詳細</Button>
          <Button size="small" variant="outlined" color="primary" startIcon={<Reply />} onClick={() => handleOpenReply(params.row)}>返信</Button>
          {params.row.status === 'replied' && (
            <Button size="small" variant="outlined" color="success" onClick={() => handleUpdateStatus(params.row.id, 'closed')}>完了</Button>
          )}
          <IconButton size="small" color="error" onClick={() => handleDelete(params.row.id)}><Delete fontSize="small" /></IconButton>
        </Box>
      ),
    },
  ];

  return (
    <>
      <Header />
      <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">問い合わせ管理</Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={2.4}><Card><CardContent><Typography variant="body2" color="text.secondary">全問い合わせ</Typography><Typography variant="h4" fontWeight="bold">{stats.totalInquiries}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} sm={6} md={2.4}><Card><CardContent><Typography variant="body2" color="text.secondary">未対応</Typography><Typography variant="h4" fontWeight="bold" color="warning.main">{stats.pendingCount}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} sm={6} md={2.4}><Card><CardContent><Typography variant="body2" color="text.secondary">返信済み</Typography><Typography variant="h4" fontWeight="bold" color="primary.main">{stats.repliedCount}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} sm={6} md={2.4}><Card><CardContent><Typography variant="body2" color="text.secondary">完了</Typography><Typography variant="h4" fontWeight="bold">{stats.closedCount}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} sm={6} md={2.4}><Card><CardContent><Typography variant="body2" color="text.secondary">今日の新規</Typography><Typography variant="h4" fontWeight="bold" color="success.main">{stats.todayInquiries}</Typography></CardContent></Card></Grid>
        </Grid>

        <Paper sx={{ p: 2, mb: 2 }}>
          <Box display="flex" gap={2} flexWrap="wrap">
            <TextField label="検索（送信者・件名）" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} size="small" sx={{ flexGrow: 1, minWidth: 300 }} />
            <TextField select label="ステータス" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} size="small" sx={{ width: 150 }}>
              <MenuItem value="all">全て</MenuItem>
              <MenuItem value="pending">未対応</MenuItem>
              <MenuItem value="replied">返信済み</MenuItem>
              <MenuItem value="closed">完了</MenuItem>
            </TextField>
          </Box>
        </Paper>

        <Paper><DataGrid rows={inquiries} columns={columns} loading={loading} autoHeight pageSizeOptions={[10, 25, 50, 100]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} disableRowSelectionOnClick /></Paper>

        <Dialog open={openDetail} onClose={() => setOpenDetail(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            問い合わせ詳細
            <IconButton onClick={() => setOpenDetail(false)} sx={{ position: 'absolute', right: 8, top: 8 }}><Close /></IconButton>
          </DialogTitle>
          <DialogContent>
            {selectedInquiry && (
              <Box sx={{ pt: 1 }}>
                <Box sx={{ mb: 2 }}><Typography variant="caption" color="text.secondary">受信日時</Typography><Typography variant="body1">{format(new Date(selectedInquiry.createdAt), 'yyyy年M月d日 HH:mm', { locale: ja })}</Typography></Box>
                <Box sx={{ mb: 2 }}><Typography variant="caption" color="text.secondary">ステータス</Typography><Chip label={getStatusLabel(selectedInquiry.status)} color={getStatusColor(selectedInquiry.status)} size="small" /></Box>
                <Box sx={{ mb: 2 }}><Typography variant="caption" color="text.secondary">送信者名</Typography><Typography variant="body1">{selectedInquiry.name}</Typography></Box>
                <Box sx={{ mb: 2 }}><Typography variant="caption" color="text.secondary">メールアドレス</Typography><Typography variant="body1">{selectedInquiry.email}</Typography></Box>
                {selectedInquiry.user && (
                  <Box sx={{ mb: 2 }}><Typography variant="caption" color="text.secondary">登録会員</Typography><Typography variant="body1">{selectedInquiry.user.name || selectedInquiry.user.email}</Typography></Box>
                )}
                <Box sx={{ mb: 2 }}><Typography variant="caption" color="text.secondary">件名</Typography><Typography variant="body1">{selectedInquiry.subject}</Typography></Box>
                <Box sx={{ mb: 2 }}><Typography variant="caption" color="text.secondary">問い合わせ内容</Typography><Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{selectedInquiry.message}</Typography></Box>
                {selectedInquiry.reply && (
                  <>
                    <Box sx={{ mb: 2 }}><Typography variant="caption" color="text.secondary">返信内容</Typography><Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>{selectedInquiry.reply}</Typography></Box>
                    <Box sx={{ mb: 2 }}><Typography variant="caption" color="text.secondary">返信日時</Typography><Typography variant="body1">{format(new Date(selectedInquiry.repliedAt), 'yyyy年M月d日 HH:mm', { locale: ja })}</Typography></Box>
                    {selectedInquiry.repliedByUser && (
                      <Box sx={{ mb: 2 }}><Typography variant="caption" color="text.secondary">返信者</Typography><Typography variant="body1">{selectedInquiry.repliedByUser.name || selectedInquiry.repliedByUser.email}</Typography></Box>
                    )}
                  </>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDetail(false)}>閉じる</Button>
            <Button variant="contained" startIcon={<Reply />} onClick={() => { setOpenDetail(false); handleOpenReply(selectedInquiry); }}>返信</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={openReply} onClose={() => setOpenReply(false)} maxWidth="md" fullWidth>
          <DialogTitle>問い合わせ返信</DialogTitle>
          <DialogContent>
            {selectedInquiry && (
              <Box sx={{ pt: 1 }}>
                <Box sx={{ mb: 2 }}><Typography variant="caption" color="text.secondary">送信者</Typography><Typography variant="body1">{selectedInquiry.name} ({selectedInquiry.email})</Typography></Box>
                <Box sx={{ mb: 2 }}><Typography variant="caption" color="text.secondary">件名</Typography><Typography variant="body1">{selectedInquiry.subject}</Typography></Box>
                <Box sx={{ mb: 2 }}><Typography variant="caption" color="text.secondary">問い合わせ内容</Typography><Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>{selectedInquiry.message}</Typography></Box>
                <TextField label="返信内容" value={replyText} onChange={(e) => setReplyText(e.target.value)} multiline rows={8} fullWidth required helperText="この内容が顧客にメールで送信されます" />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenReply(false)}>キャンセル</Button>
            <Button variant="contained" onClick={handleSendReply} disabled={!replyText.trim()}>送信</Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
        </Snackbar>
      </Box>
    </>
  );
};

export default AdminInquiriesPage;
