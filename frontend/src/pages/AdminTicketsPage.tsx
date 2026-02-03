// ===== A-004: チケット管理ページ =====
// 目的: デジタルチケットの一覧表示・使用管理

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  MenuItem,
  Chip,
  Alert,
  Paper,
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { CheckCircle, Cancel, QrCode2, Refresh } from '@mui/icons-material';
import { adminAPI, DigitalTicket } from '../lib/api';
import { Header } from '../components';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

const AdminTicketsPage = () => {
  const [tickets, setTickets] = useState<DigitalTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<DigitalTicket | null>(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // 統計情報
  const [stats, setStats] = useState({
    totalTickets: 0,
    usedTickets: 0,
    unusedTickets: 0,
    usageRate: 0,
  });

  // チケット一覧取得
  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params: any = {};

      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.isUsed = statusFilter === 'used';

      const { tickets: data } = await adminAPI.getTickets(params);
      setTickets(data);
    } catch (error: any) {
      showSnackbar(error.message || 'チケット一覧の取得に失敗しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 統計情報取得
  const fetchStats = async () => {
    try {
      const data = await adminAPI.getTicketStats();
      setStats(data);
    } catch (error: any) {
      console.error('統計情報の取得エラー:', error);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, [searchTerm, statusFilter]);

  // チケット使用
  const handleUseTicket = async (ticketId: string) => {
    try {
      const { message } = await adminAPI.useTicket(ticketId);
      showSnackbar(message, 'success');
      fetchTickets();
      fetchStats();
      if (selectedTicket?.id === ticketId) {
        setOpenDetail(false);
      }
    } catch (error: any) {
      showSnackbar(error.message || 'チケット使用処理に失敗しました', 'error');
    }
  };

  // チケットリセット
  const handleResetTicket = async (ticketId: string) => {
    try {
      const { message } = await adminAPI.resetTicket(ticketId);
      showSnackbar(message, 'success');
      fetchTickets();
      fetchStats();
      if (selectedTicket?.id === ticketId) {
        setOpenDetail(false);
      }
    } catch (error: any) {
      showSnackbar(error.message || 'チケットリセット処理に失敗しました', 'error');
    }
  };

  // スナックバー表示
  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  // DataGrid列定義
  const columns: GridColDef[] = [
    {
      field: 'ticketCode',
      headerName: 'チケットコード',
      width: 200,
      fontFamily: 'monospace',
    },
    {
      field: 'productName',
      headerName: 'イベント名',
      width: 250,
      valueGetter: (value, row) => row.product.name,
    },
    {
      field: 'userName',
      headerName: '購入者',
      width: 180,
      valueGetter: (value, row) => row.order.user?.name || row.order.user?.email || 'ゲスト',
    },
    {
      field: 'orderNumber',
      headerName: '注文番号',
      width: 150,
      valueGetter: (value, row) => row.order.orderNumber,
      fontFamily: 'monospace',
    },
    {
      field: 'isUsed',
      headerName: 'ステータス',
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.row.isUsed ? '使用済み' : '未使用'}
          color={params.row.isUsed ? 'default' : 'success'}
          size="small"
          icon={params.row.isUsed ? <CheckCircle /> : <QrCode2 />}
        />
      ),
    },
    {
      field: 'usedAt',
      headerName: '使用日時',
      width: 180,
      valueGetter: (value, row) =>
        row.usedAt ? format(new Date(row.usedAt), 'yyyy/MM/dd HH:mm', { locale: ja }) : '-',
    },
    {
      field: 'actions',
      headerName: '操作',
      width: 200,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box display="flex" gap={1}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setSelectedTicket(params.row);
              setOpenDetail(true);
            }}
          >
            詳細
          </Button>
          {params.row.isUsed ? (
            <Button
              size="small"
              variant="outlined"
              color="warning"
              startIcon={<Refresh />}
              onClick={() => handleResetTicket(params.row.id)}
            >
              リセット
            </Button>
          ) : (
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<CheckCircle />}
              onClick={() => handleUseTicket(params.row.id)}
            >
              使用
            </Button>
          )}
        </Box>
      ),
    },
  ];

  return (
    <>
      <Header />
      <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          チケット管理
        </Typography>

        {/* 統計カード */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  全チケット数
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {stats.totalTickets}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  使用済み
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {stats.usedTickets}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  未使用
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="primary.main">
                  {stats.unusedTickets}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  使用率
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {stats.usageRate.toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* フィルター */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box display="flex" gap={2} flexWrap="wrap">
            <TextField
              label="検索（チケットコード・注文番号・イベント名）"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              sx={{ flexGrow: 1, minWidth: 300 }}
            />
            <TextField
              select
              label="ステータス"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              size="small"
              sx={{ width: 150 }}
            >
              <MenuItem value="all">全て</MenuItem>
              <MenuItem value="unused">未使用</MenuItem>
              <MenuItem value="used">使用済み</MenuItem>
            </TextField>
          </Box>
        </Paper>

        {/* チケット一覧 */}
        <Paper>
          <DataGrid
            rows={tickets}
            columns={columns}
            loading={loading}
            autoHeight
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 25 },
              },
            }}
            disableRowSelectionOnClick
            sx={{
              '& .MuiDataGrid-cell': {
                fontFamily: 'inherit',
              },
            }}
          />
        </Paper>

        {/* チケット詳細ダイアログ */}
        <Dialog open={openDetail} onClose={() => setOpenDetail(false)} maxWidth="sm" fullWidth>
          <DialogTitle>チケット詳細</DialogTitle>
          <DialogContent>
            {selectedTicket && (
              <Box sx={{ pt: 1 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    チケットコード
                  </Typography>
                  <Typography variant="body1" fontFamily="monospace" fontWeight="bold">
                    {selectedTicket.ticketCode}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    ステータス
                  </Typography>
                  <Box>
                    <Chip
                      label={selectedTicket.isUsed ? '使用済み' : '未使用'}
                      color={selectedTicket.isUsed ? 'default' : 'success'}
                      icon={selectedTicket.isUsed ? <CheckCircle /> : <QrCode2 />}
                    />
                  </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    イベント名
                  </Typography>
                  <Typography variant="body1">{selectedTicket.product.name}</Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    購入者
                  </Typography>
                  <Typography variant="body1">
                    {selectedTicket.order.user?.name || selectedTicket.order.user?.email || 'ゲスト'}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    注文番号
                  </Typography>
                  <Typography variant="body1" fontFamily="monospace">
                    {selectedTicket.order.orderNumber}
                  </Typography>
                </Box>

                {selectedTicket.usedAt && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      使用日時
                    </Typography>
                    <Typography variant="body1">
                      {format(new Date(selectedTicket.usedAt), 'yyyy年M月d日 HH:mm', {
                        locale: ja,
                      })}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    発行日時
                  </Typography>
                  <Typography variant="body1">
                    {format(new Date(selectedTicket.createdAt), 'yyyy年M月d日 HH:mm', {
                      locale: ja,
                    })}
                  </Typography>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            {selectedTicket && (
              <>
                {selectedTicket.isUsed ? (
                  <Button
                    variant="outlined"
                    color="warning"
                    startIcon={<Refresh />}
                    onClick={() => handleResetTicket(selectedTicket.id)}
                  >
                    未使用に戻す
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    startIcon={<CheckCircle />}
                    onClick={() => handleUseTicket(selectedTicket.id)}
                  >
                    使用済みにする
                  </Button>
                )}
              </>
            )}
            <Button onClick={() => setOpenDetail(false)}>閉じる</Button>
          </DialogActions>
        </Dialog>

        {/* スナックバー */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </>
  );
};

export default AdminTicketsPage;
