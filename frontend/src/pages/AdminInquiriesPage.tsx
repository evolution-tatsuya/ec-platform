// ===== A-006: 問い合わせ管理ページ =====
// 目的: 問い合わせ一覧表示・返信・AI使用状況管理

import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  MenuItem,
  Chip,
  Paper,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Reply,
  CheckCircle,
  HourglassEmpty,
  SmartToy,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Header } from '../components';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAdminInquiries, useReplyToInquiry, useInquiryStats, useInquiryTrends } from '../hooks/useInquiries';
import { InquiryStatus } from '../types';

// カラーパレット
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

// 問い合わせステータスマップ
const statusMap: Record<InquiryStatus, string> = {
  [InquiryStatus.AI_RESOLVED]: 'AI対応済み',
  [InquiryStatus.PENDING]: '要対応',
  [InquiryStatus.REPLIED]: '返信済み',
  [InquiryStatus.CLOSED]: '対応完了',
};

// ステータスカラー
const statusColorMap: Record<InquiryStatus, 'default' | 'warning' | 'success' | 'info'> = {
  [InquiryStatus.AI_RESOLVED]: 'default',
  [InquiryStatus.PENDING]: 'warning',
  [InquiryStatus.REPLIED]: 'info',
  [InquiryStatus.CLOSED]: 'success',
};

// 定型文リスト
const templateTexts = [
  { value: '', label: '選択してください' },
  {
    value: 'お問い合わせありがとうございます。ご注文の配送状況につきましては、マイページの注文履歴からご確認いただけます。',
    label: '配送状況確認',
  },
  {
    value: 'お問い合わせありがとうございます。返品をご希望の場合は、商品到着後7日以内にご連絡ください。',
    label: '返品について',
  },
  {
    value: 'お問い合わせありがとうございます。在庫状況につきましては、商品ページにてリアルタイムで更新しております。',
    label: '在庫確認',
  },
];

const AdminInquiriesPage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | 'all'>('all');
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // API統合: 問い合わせ一覧取得
  // statusFilterをAPI用の小文字形式に変換
  const apiStatusFilter = statusFilter === 'all' ? 'all' : (statusFilter.toLowerCase() as 'pending' | 'replied' | 'closed');
  const { data: inquiryData, isLoading: isInquiriesLoading, error: inquiriesError } = useAdminInquiries({
    status: apiStatusFilter,
    page: 1,
    limit: 100,
  });

  // API統合: 統計情報取得
  const { data: stats, isLoading: isStatsLoading } = useInquiryStats();

  // API統合: 推移データ取得
  const { data: trendData = [], isLoading: isTrendLoading } = useInquiryTrends('week');

  // API統合: 返信送信
  const replyMutation = useReplyToInquiry();

  const inquiries = inquiryData?.inquiries || [];
  const totalInquiries = stats?.totalInquiries || 0;
  const aiResponseRate = stats?.aiResponseRate || 0;
  const monthlyCost = stats?.monthlyCost || 0;
  const geminiUsageCount = stats?.geminiUsageCount || 0;

  // DataGrid列定義
  const columns: GridColDef[] = [
    {
      field: 'createdAt',
      headerName: '問い合わせ日時',
      width: 180,
      valueGetter: (value) => format(new Date(value), 'yyyy/MM/dd HH:mm', { locale: ja }),
    },
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
      field: 'question',
      headerName: '質問内容',
      width: 300,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" noWrap>
          {params.row.question}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: '対応状況',
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={statusMap[params.row.status as InquiryStatus]}
          color={statusColorMap[params.row.status as InquiryStatus] || 'default'}
          size="small"
          icon={
            params.row.status === InquiryStatus.AI_RESOLVED ? (
              <SmartToy />
            ) : params.row.status === InquiryStatus.PENDING ? (
              <HourglassEmpty />
            ) : (
              <CheckCircle />
            )
          }
        />
      ),
    },
    {
      field: 'isSatisfied',
      headerName: '満足度',
      width: 140,
      renderCell: (params: GridRenderCellParams) =>
        params.row.isSatisfied !== null && params.row.isSatisfied !== undefined ? (
          <Chip
            label={params.row.isSatisfied ? '満足' : '不満'}
            color={params.row.isSatisfied ? 'success' : 'error'}
            size="small"
          />
        ) : (
          <Typography variant="caption" color="text.secondary">
            未評価
          </Typography>
        ),
    },
    {
      field: 'actions',
      headerName: '操作',
      width: 100,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Button
          size="small"
          variant="outlined"
          onClick={() => {
            setSelectedInquiry(params.row);
            setOpenDetail(true);
            setReplyText(params.row.reply || '');
            setSelectedTemplate('');
          }}
        >
          詳細
        </Button>
      ),
    },
  ];

  // 定型文選択時
  const handleTemplateChange = (value: string) => {
    setSelectedTemplate(value);
    setReplyText(value);
  };

  // 返信送信
  const handleSendReply = async () => {
    if (!selectedInquiry || !replyText.trim()) return;

    try {
      await replyMutation.mutateAsync({
        id: selectedInquiry.id,
        data: { replyText },
      });
      alert('返信を送信しました');
      setOpenDetail(false);
    } catch (error) {
      console.error('返信送信エラー:', error);
      alert('返信の送信に失敗しました');
    }
  };

  // ローディング状態
  if (isInquiriesLoading || isStatsLoading || isTrendLoading) {
    return (
      <>
        <Header />
        <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3, textAlign: 'center' }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>読み込み中...</Typography>
        </Box>
      </>
    );
  }

  // エラー状態
  if (inquiriesError) {
    return (
      <>
        <Header />
        <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
          <Alert severity="error">問い合わせ一覧の取得に失敗しました</Alert>
        </Box>
      </>
    );
  }

  return (
    <>
      <Header />
      <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          問い合わせ管理
        </Typography>

        {/* タブ */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="問い合わせ一覧" />
            <Tab label="AI使用状況" />
          </Tabs>
        </Box>

        {/* タブ1: 問い合わせ一覧 */}
        {tabValue === 0 && (
          <>
            {/* フィルター */}
            <Paper sx={{ p: 2, mb: 2 }}>
              <Box display="flex" gap={2} alignItems="center">
                <Typography variant="body2" fontWeight="bold">
                  フィルター:
                </Typography>
                <TextField
                  select
                  label="対応状況"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | InquiryStatus)}
                  size="small"
                  sx={{ width: 200 }}
                >
                  <MenuItem value="all">全て</MenuItem>
                  <MenuItem value={InquiryStatus.AI_RESOLVED}>AI対応済み</MenuItem>
                  <MenuItem value={InquiryStatus.PENDING}>要対応</MenuItem>
                  <MenuItem value={InquiryStatus.REPLIED}>返信済み</MenuItem>
                  <MenuItem value={InquiryStatus.CLOSED}>対応完了</MenuItem>
                </TextField>
              </Box>
            </Paper>

            {/* 問い合わせ一覧 */}
            <Paper>
              <DataGrid
                rows={inquiries}
                columns={columns}
                autoHeight
                pageSizeOptions={[10, 25, 50]}
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: 10 },
                  },
                }}
                disableRowSelectionOnClick
              />
            </Paper>
          </>
        )}

        {/* タブ2: AI使用状況 */}
        {tabValue === 1 && (
          <>
            {/* 統計カード */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {/* 月間問い合わせ数 */}
              <Grid xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          月間問い合わせ数
                        </Typography>
                        <Typography variant="h4" fontWeight="bold">
                          {totalInquiries}件
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* AI対応率 */}
              <Grid xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        AI対応率
                      </Typography>
                      <Typography variant="h4" fontWeight="bold" color="primary.main">
                        {aiResponseRate.toFixed(1)}%
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* 月間コスト */}
              <Grid xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        月間コスト
                      </Typography>
                      <Typography variant="h4" fontWeight="bold">
                        ¥{monthlyCost.toFixed(0)}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Gemini使用回数 */}
              <Grid xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Gemini使用回数
                      </Typography>
                      <Typography variant="h4" fontWeight="bold">
                        {geminiUsageCount}回
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Grid container spacing={3}>
              {/* 問い合わせ推移グラフ */}
              <Grid xs={12} lg={8}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom fontWeight="bold">
                      問い合わせ推移（過去7日）
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(value) => format(new Date(value), 'M/d', { locale: ja })}
                        />
                        <YAxis />
                        <Tooltip
                          labelFormatter={(value) =>
                            format(new Date(value), 'yyyy年M月d日', { locale: ja })
                          }
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="total"
                          stroke="#8884d8"
                          strokeWidth={2}
                          name="総問い合わせ"
                        />
                        <Line
                          type="monotone"
                          dataKey="aiResponded"
                          stroke="#00C49F"
                          strokeWidth={2}
                          name="AI対応"
                        />
                        <Line
                          type="monotone"
                          dataKey="manualResponded"
                          stroke="#FF8042"
                          strokeWidth={2}
                          name="人間対応"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* AI対応内訳グラフ */}
              <Grid xs={12} lg={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom fontWeight="bold">
                      AI対応内訳
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={stats?.distribution || []}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }: any) =>
                            `${name} (${(percent * 100).toFixed(0)}%)`
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {(stats?.distribution || []).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </>
        )}

        {/* 問い合わせ詳細ダイアログ */}
        <Dialog open={openDetail} onClose={() => setOpenDetail(false)} maxWidth="md" fullWidth>
          <DialogTitle>問い合わせ詳細</DialogTitle>
          <DialogContent>
            {selectedInquiry && (
              <Box sx={{ pt: 1 }}>
                {/* 顧客情報 */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    顧客情報
                  </Typography>
                  <Box display="flex" gap={2} alignItems="center">
                    <Typography variant="body1" fontWeight="bold">
                      {selectedInquiry.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedInquiry.email}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {format(new Date(selectedInquiry.createdAt), 'yyyy年M月d日 HH:mm', {
                      locale: ja,
                    })}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* 問い合わせ内容 */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    質問内容
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="body1">{selectedInquiry.question}</Typography>
                  </Paper>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* AI回答 */}
                {selectedInquiry.aiResponse && (
                  <Box sx={{ mb: 3 }}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <SmartToy color="primary" />
                      <Typography variant="subtitle2" color="text.secondary">
                        AI自動回答
                      </Typography>
                    </Box>
                    <Paper sx={{ p: 2, bgcolor: 'primary.50', border: 1, borderColor: 'primary.200' }}>
                      <Typography variant="body1">{selectedInquiry.aiResponse}</Typography>
                    </Paper>
                  </Box>
                )}

                {/* 満足度 */}
                {selectedInquiry.isSatisfied !== null && selectedInquiry.isSatisfied !== undefined && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      満足度フィードバック
                    </Typography>
                    <Chip
                      label={selectedInquiry.isSatisfied ? '満足' : '不満'}
                      color={selectedInquiry.isSatisfied ? 'success' : 'error'}
                    />
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />

                {/* 返信フォーム */}
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    返信
                  </Typography>
                  <TextField
                    select
                    label="定型文を選択"
                    value={selectedTemplate}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    fullWidth
                    size="small"
                    sx={{ mb: 2 }}
                  >
                    {templateTexts.map((template) => (
                      <MenuItem key={template.value} value={template.value}>
                        {template.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="返信内容"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    multiline
                    rows={6}
                    fullWidth
                    placeholder="返信内容を入力してください..."
                  />
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDetail(false)}>キャンセル</Button>
            <Button
              variant="contained"
              startIcon={<Reply />}
              onClick={handleSendReply}
              disabled={!replyText.trim() || replyMutation.isPending}
            >
              {replyMutation.isPending ? '送信中...' : '返信を送信'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
};

export default AdminInquiriesPage;
