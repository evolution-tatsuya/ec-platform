// ===== A-004: イベント・チケット管理ページ =====
// 目的: イベントフォーム作成、参加者リスト管理、QR受付

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
  IconButton,
  List,
  ListItem,
  ListItemText,
  Tabs,
  Tab,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Divider,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import {
  Add,
  Edit,
  Delete,
  DragIndicator,
  QrCodeScanner,
  Download,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import { Header } from '../components';

// ダミーデータ: イベント一覧
const dummyEvents = [
  { id: '1', name: '車フェス2025春' },
  { id: '2', name: 'カスタムカーミーティング' },
  { id: '3', name: '音楽フェスティバル2025' },
];

// ダミーデータ: フォーム項目タイプ
const fieldTypes = [
  { value: 'TEXT', label: 'テキスト' },
  { value: 'RADIO', label: 'ラジオボタン' },
  { value: 'CHECKBOX', label: 'チェックボックス' },
  { value: 'DROPDOWN', label: 'ドロップダウン' },
  { value: 'DATE', label: '日付' },
  { value: 'TEXTAREA', label: 'テキストエリア' },
];

// ダミーデータ: フォーム項目
const dummyFormFields = [
  {
    id: '1',
    label: '氏名',
    fieldType: 'TEXT',
    isRequired: true,
    order: 1,
  },
  {
    id: '2',
    label: '参加人数',
    fieldType: 'RADIO',
    isRequired: true,
    order: 2,
    options: ['1名', '2名', '3名以上'],
  },
  {
    id: '3',
    label: '希望日時',
    fieldType: 'DATE',
    isRequired: true,
    order: 3,
  },
  {
    id: '4',
    label: '備考',
    fieldType: 'TEXTAREA',
    isRequired: false,
    order: 4,
  },
];

// ダミーデータ: 参加者リスト
const dummyParticipants = [
  {
    id: '1',
    name: '山田太郎',
    email: 'yamada@example.com',
    ticketCode: 'TICKET-001-ABC',
    qrCode: 'QR-001',
    isUsed: false,
    formData: { participantCount: '2名', preferredDate: '2025-05-15' },
  },
  {
    id: '2',
    name: '佐藤花子',
    email: 'sato@example.com',
    ticketCode: 'TICKET-002-DEF',
    qrCode: 'QR-002',
    isUsed: true,
    formData: { participantCount: '1名', preferredDate: '2025-05-15' },
  },
  {
    id: '3',
    name: '鈴木一郎',
    email: 'suzuki@example.com',
    ticketCode: 'TICKET-003-GHI',
    qrCode: 'QR-003',
    isUsed: false,
    formData: { participantCount: '3名以上', preferredDate: '2025-05-16' },
  },
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const AdminEventsPage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState('1');
  const [formFields, setFormFields] = useState(dummyFormFields);
  const [participants, setParticipants] = useState(dummyParticipants);
  const [openFieldDialog, setOpenFieldDialog] = useState(false);
  const [openScanDialog, setOpenScanDialog] = useState(false);
  const [scannedTicket, setScannedTicket] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // 新規フォーム項目用の状態
  const [newField, setNewField] = useState({
    label: '',
    fieldType: 'TEXT',
    isRequired: false,
    options: '',
  });

  // DataGrid列定義
  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: '氏名',
      width: 150,
    },
    {
      field: 'email',
      headerName: 'メールアドレス',
      width: 200,
    },
    {
      field: 'ticketCode',
      headerName: 'チケットコード',
      width: 180,
      renderCell: (params) => (
        <Typography variant="body2" fontFamily="monospace">
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'isUsed',
      headerName: 'ステータス',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value ? '使用済み' : '未使用'}
          color={params.value ? 'default' : 'success'}
          size="small"
          icon={params.value ? <CheckCircle /> : <Cancel />}
        />
      ),
    },
    {
      field: 'actions',
      headerName: '操作',
      width: 150,
      sortable: false,
      renderCell: () => (
        <Box display="flex" gap={1}>
          <Button size="small" variant="outlined">
            詳細
          </Button>
          <Button size="small" variant="outlined" startIcon={<QrCodeScanner />}>
            QR
          </Button>
        </Box>
      ),
    },
  ];

  // フィルター処理
  const filteredParticipants = participants.filter((p) => {
    const matchesSearch =
      p.name.includes(searchTerm) ||
      p.email.includes(searchTerm) ||
      p.ticketCode.includes(searchTerm);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'used' && p.isUsed) ||
      (statusFilter === 'unused' && !p.isUsed);
    return matchesSearch && matchesStatus;
  });

  // フォーム項目追加
  const handleAddField = () => {
    const newFieldData = {
      id: String(formFields.length + 1),
      label: newField.label,
      fieldType: newField.fieldType,
      isRequired: newField.isRequired,
      order: formFields.length + 1,
      options: newField.options ? newField.options.split(',').map((o) => o.trim()) : undefined,
    };
    setFormFields([...formFields, newFieldData]);
    setNewField({ label: '', fieldType: 'TEXT', isRequired: false, options: '' });
    setOpenFieldDialog(false);
  };

  // フォーム項目削除
  const handleDeleteField = (id: string) => {
    setFormFields(formFields.filter((f) => f.id !== id));
  };

  // QRスキャン処理
  const handleScan = () => {
    // ダミー処理: チケットコードでチェックイン
    const participant = participants.find((p) => p.ticketCode === scannedTicket);
    if (participant) {
      setParticipants(
        participants.map((p) => (p.ticketCode === scannedTicket ? { ...p, isUsed: true } : p))
      );
      alert(`チェックイン完了: ${participant.name}`);
      setScannedTicket('');
      setOpenScanDialog(false);
    } else {
      alert('チケットが見つかりません');
    }
  };

  return (
    <>
      <Header />
      <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          イベント・チケット管理
        </Typography>

        {/* タブ */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="フォーム作成" />
            <Tab label="参加者リスト" />
            <Tab label="QR受付" />
          </Tabs>
        </Paper>

        {/* タブ1: フォーム作成 */}
        <TabPanel value={tabValue} index={0}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <FormControl sx={{ minWidth: 300 }}>
                <InputLabel>イベント選択</InputLabel>
                <Select
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  label="イベント選択"
                >
                  {dummyEvents.map((event) => (
                    <MenuItem key={event.id} value={event.id}>
                      {event.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button variant="contained" startIcon={<Add />} onClick={() => setOpenFieldDialog(true)}>
                項目追加
              </Button>
            </Box>

            <Divider sx={{ mb: 3 }} />

            <Typography variant="h6" gutterBottom>
              フォーム項目一覧
            </Typography>

            {formFields.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                フォーム項目がありません
              </Typography>
            ) : (
              <List>
                {formFields.map((field) => (
                  <ListItem
                    key={field.id}
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1,
                    }}
                    secondaryAction={
                      <Box>
                        <IconButton edge="end" sx={{ mr: 1 }}>
                          <Edit />
                        </IconButton>
                        <IconButton edge="end" onClick={() => handleDeleteField(field.id)}>
                          <Delete />
                        </IconButton>
                      </Box>
                    }
                  >
                    <IconButton edge="start" sx={{ mr: 2 }}>
                      <DragIndicator />
                    </IconButton>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body1" fontWeight="bold">
                            {field.label}
                          </Typography>
                          {field.isRequired && (
                            <Chip label="必須" size="small" color="error" />
                          )}
                          <Chip
                            label={fieldTypes.find((t) => t.value === field.fieldType)?.label}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        field.options ? `選択肢: ${field.options.join(', ')}` : undefined
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </TabPanel>

        {/* タブ2: 参加者リスト */}
        <TabPanel value={tabValue} index={1}>
          {/* フィルター */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
              <TextField
                label="検索（氏名・メール・チケットコード）"
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
              <Button variant="outlined" startIcon={<Download />}>
                CSV出力
              </Button>
              <Button variant="outlined" startIcon={<Download />}>
                Excel出力
              </Button>
            </Box>
          </Paper>

          {/* 参加者リスト */}
          <Paper>
            <DataGrid
              rows={filteredParticipants}
              columns={columns}
              autoHeight
              pageSizeOptions={[10, 25, 50, 100]}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 25 },
                },
              }}
              disableRowSelectionOnClick
            />
          </Paper>
        </TabPanel>

        {/* タブ3: QR受付 */}
        <TabPanel value={tabValue} index={2}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              QRコード受付
            </Typography>

            <Box display="flex" flexDirection="column" alignItems="center" gap={3} py={4}>
              {/* QRスキャンエリア（後で実装） */}
              <Card sx={{ width: '100%', maxWidth: 400, bgcolor: 'grey.100' }}>
                <CardContent
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 300,
                  }}
                >
                  <QrCodeScanner sx={{ fontSize: 80, color: 'grey.400', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    QRコードスキャン機能（後で実装）
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<QrCodeScanner />}
                    onClick={() => setOpenScanDialog(true)}
                    sx={{ mt: 2 }}
                  >
                    手動入力
                  </Button>
                </CardContent>
              </Card>

              <Divider sx={{ width: '100%' }} />

              {/* 統計情報 */}
              <Box display="flex" gap={3} width="100%" justifyContent="center">
                <Card sx={{ minWidth: 150 }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      全チケット数
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {participants.length}
                    </Typography>
                  </CardContent>
                </Card>
                <Card sx={{ minWidth: 150 }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      使用済み
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="success.main">
                      {participants.filter((p) => p.isUsed).length}
                    </Typography>
                  </CardContent>
                </Card>
                <Card sx={{ minWidth: 150 }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      未使用
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="primary.main">
                      {participants.filter((p) => !p.isUsed).length}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          </Paper>
        </TabPanel>

        {/* フォーム項目追加ダイアログ */}
        <Dialog open={openFieldDialog} onClose={() => setOpenFieldDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>フォーム項目追加</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="項目名"
                value={newField.label}
                onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                fullWidth
                required
              />
              <FormControl fullWidth>
                <InputLabel>項目タイプ</InputLabel>
                <Select
                  value={newField.fieldType}
                  onChange={(e) => setNewField({ ...newField, fieldType: e.target.value })}
                  label="項目タイプ"
                >
                  {fieldTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {(newField.fieldType === 'RADIO' ||
                newField.fieldType === 'CHECKBOX' ||
                newField.fieldType === 'DROPDOWN') && (
                <TextField
                  label="選択肢（カンマ区切り）"
                  value={newField.options}
                  onChange={(e) => setNewField({ ...newField, options: e.target.value })}
                  fullWidth
                  placeholder="例: 選択肢1, 選択肢2, 選択肢3"
                  helperText="カンマ区切りで選択肢を入力してください"
                />
              )}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newField.isRequired}
                    onChange={(e) => setNewField({ ...newField, isRequired: e.target.checked })}
                  />
                }
                label="必須項目にする"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenFieldDialog(false)}>キャンセル</Button>
            <Button
              onClick={handleAddField}
              variant="contained"
              disabled={!newField.label}
            >
              追加
            </Button>
          </DialogActions>
        </Dialog>

        {/* QRスキャン手動入力ダイアログ */}
        <Dialog open={openScanDialog} onClose={() => setOpenScanDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>チケットコード手動入力</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <TextField
                label="チケットコード"
                value={scannedTicket}
                onChange={(e) => setScannedTicket(e.target.value)}
                fullWidth
                placeholder="TICKET-001-ABC"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenScanDialog(false)}>キャンセル</Button>
            <Button
              onClick={handleScan}
              variant="contained"
              disabled={!scannedTicket}
            >
              チェックイン
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
};

export default AdminEventsPage;
