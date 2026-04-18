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
  Rating,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Reply,
  CheckCircle,
  HourglassEmpty,
  SmartToy,
  TrendingUp,
  TrendingDown,
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

// カラーパレット
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

// 問い合わせステータスマップ
const statusMap: Record<string, string> = {
  aiResponded: 'AI対応済み',
  pending: '要対応',
  completed: '対応完了',
};

// ステータスカラー
const statusColorMap: Record<string, 'default' | 'warning' | 'success'> = {
  aiResponded: 'default',
  pending: 'warning',
  completed: 'success',
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

// ダミーデータ: 問い合わせ一覧
const dummyInquiries = [
  {
    id: '1',
    createdAt: '2026-04-14T10:30:00Z',
    customerName: '山田太郎',
    email: 'yamada@example.com',
    subject: '商品の配送について',
    message: '注文番号ORD-20260414-001の配送状況を教えてください。',
    status: 'aiResponded',
    aiResponse:
      'ご注文ありがとうございます。配送状況はマイページの注文履歴からご確認いただけます。現在、発送準備中です。',
    satisfactionRating: 4,
  },
  {
    id: '2',
    createdAt: '2026-04-14T14:15:00Z',
    customerName: '佐藤花子',
    email: 'sato@example.com',
    subject: '返品について',
    message: '商品が不良品だったので返品したいです。',
    status: 'pending',
    aiResponse: null,
    satisfactionRating: null,
  },
  {
    id: '3',
    createdAt: '2026-04-13T16:45:00Z',
    customerName: '鈴木一郎',
    email: 'suzuki@example.com',
    subject: '在庫確認',
    message: '商品「トヨタ GR86 エアロパーツ」の在庫はありますか？',
    status: 'completed',
    aiResponse: '在庫状況は商品ページにてリアルタイムで更新しております。現在在庫あり（5点）です。',
    satisfactionRating: 5,
  },
  {
    id: '4',
    createdAt: '2026-04-13T11:20:00Z',
    customerName: '田中美咲',
    email: 'tanaka@example.com',
    subject: '決済エラー',
    message: 'クレジットカード決済がエラーになりました。',
    status: 'pending',
    aiResponse: null,
    satisfactionRating: null,
  },
  {
    id: '5',
    createdAt: '2026-04-12T09:00:00Z',
    customerName: '高橋次郎',
    email: 'takahashi@example.com',
    subject: '商品の仕様について',
    message: 'この商品は86/BRZにも対応していますか？',
    status: 'aiResponded',
    aiResponse: '商品詳細ページの適合車種一覧をご確認ください。86/BRZにも対応しております。',
    satisfactionRating: 3,
  },
];

// ダミーデータ: 問い合わせ推移
const dummyInquiryTrend = [
  { date: '2026-04-08', total: 12, aiResponded: 9, manualResponded: 3 },
  { date: '2026-04-09', total: 15, aiResponded: 11, manualResponded: 4 },
  { date: '2026-04-10', total: 18, aiResponded: 14, manualResponded: 4 },
  { date: '2026-04-11', total: 14, aiResponded: 10, manualResponded: 4 },
  { date: '2026-04-12', total: 16, aiResponded: 13, manualResponded: 3 },
  { date: '2026-04-13', total: 20, aiResponded: 16, manualResponded: 4 },
  { date: '2026-04-14', total: 22, aiResponded: 18, manualResponded: 4 },
];

// ダミーデータ: AI対応内訳
const dummyAIResponseDistribution = [
  { name: 'FAQ自動', value: 45 },
  { name: 'Gemini', value: 35 },
  { name: 'GPT-4o mini', value: 15 },
  { name: '人間対応', value: 5 },
];

const AdminInquiriesPage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // フィルタリング処理
  const filteredInquiries =
    statusFilter === 'all'
      ? dummyInquiries
      : dummyInquiries.filter((inq) => inq.status === statusFilter);

  // 統計計算
  const totalInquiries = dummyInquiries.length;
  const aiRespondedCount = dummyInquiries.filter((i) => i.status === 'aiResponded').length;
  const aiResponseRate = ((aiRespondedCount / totalInquiries) * 100).toFixed(1);
  const monthlyCost = 450; // ダミーコスト（円）
  const geminiUsageCount = 28; // ダミーGemini使用回数

  // DataGrid列定義
  const columns: GridColDef[] = [
    {
      field: 'createdAt',
      headerName: '問い合わせ日時',
      width: 180,
      valueGetter: (value) => format(new Date(value), 'yyyy/MM/dd HH:mm', { locale: ja }),
    },
    {
      field: 'customerName',
      headerName: '顧客名',
      width: 150,
    },
    {
      field: 'email',
      headerName: 'メールアドレス',
      width: 220,
    },
    {
      field: 'subject',
      headerName: '件名',
      width: 200,
    },
    {
      field: 'status',
      headerName: '対応状況',
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={statusMap[params.row.status]}
          color={statusColorMap[params.row.status] || 'default'}
          size="small"
          icon={
            params.row.status === 'aiResponded' ? (
              <SmartToy />
            ) : params.row.status === 'pending' ? (
              <HourglassEmpty />
            ) : (
              <CheckCircle />
            )
          }
        />
      ),
    },
    {
      field: 'satisfactionRating',
      headerName: '満足度',
      width: 140,
      renderCell: (params: GridRenderCellParams) =>
        params.row.satisfactionRating ? (
          <Rating value={params.row.satisfactionRating} readOnly size="small" />
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
            setReplyText('');
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
  const handleSendReply = () => {
    console.log('返信送信:', { inquiryId: selectedInquiry.id, replyText });
    alert('返信を送信しました（ダミー実装）');
    setOpenDetail(false);
  };

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
                  onChange={(e) => setStatusFilter(e.target.value)}
                  size="small"
                  sx={{ width: 200 }}
                >
                  <MenuItem value="all">全て</MenuItem>
                  <MenuItem value="aiResponded">AI対応済み</MenuItem>
                  <MenuItem value="pending">要対応</MenuItem>
                  <MenuItem value="completed">対応完了</MenuItem>
                </TextField>
              </Box>
            </Paper>

            {/* 問い合わせ一覧 */}
            <Paper>
              <DataGrid
                rows={filteredInquiries}
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
                        <Box display="flex" alignItems="center" mt={1}>
                          <TrendingUp color="success" fontSize="small" />
                          <Typography variant="body2" color="success.main" ml={0.5}>
                            +12.5% 前月比
                          </Typography>
                        </Box>
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
                        {aiResponseRate}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary" mt={1}>
                        目標: 80%
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
                        ¥{monthlyCost}
                      </Typography>
                      <Box display="flex" alignItems="center" mt={1}>
                        <TrendingDown color="success" fontSize="small" />
                        <Typography variant="body2" color="success.main" ml={0.5}>
                          -8.0% 前月比
                        </Typography>
                      </Box>
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
                      <Typography variant="body2" color="text.secondary" mt={1}>
                        上限: 60回/日
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
                      <LineChart data={dummyInquiryTrend}>
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
                          data={dummyAIResponseDistribution}
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
                          {dummyAIResponseDistribution.map((_, index) => (
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
                      {selectedInquiry.customerName}
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
                    件名
                  </Typography>
                  <Typography variant="body1" fontWeight="bold" gutterBottom>
                    {selectedInquiry.subject}
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                    質問内容
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="body1">{selectedInquiry.message}</Typography>
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
                {selectedInquiry.satisfactionRating && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      満足度フィードバック
                    </Typography>
                    <Rating value={selectedInquiry.satisfactionRating} readOnly />
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
              disabled={!replyText.trim()}
            >
              返信を送信
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
};

export default AdminInquiriesPage;
