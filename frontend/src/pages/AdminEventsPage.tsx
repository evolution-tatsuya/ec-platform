// ===== A-004: イベント・チケット管理ページ =====
// 目的: イベントフォーム作成、参加者リスト管理、QR受付

import { useState, useEffect } from 'react';
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
  CircularProgress,
  Alert,
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
import {
  useAdminEvents,
  useAdminEventFormTemplate,
  useSaveAdminEventFormTemplate,
  useAdminEventParticipants,
  useScanAdminTicket,
  useExportAdminEventParticipantsCSV,
  useExportAdminEventParticipantsExcel,
} from '../hooks/useEvents';

// フォーム項目タイプ
const fieldTypes = [
  { value: 'TEXT', label: 'テキスト' },
  { value: 'RADIO', label: 'ラジオボタン' },
  { value: 'CHECKBOX', label: 'チェックボックス' },
  { value: 'DROPDOWN', label: 'ドロップダウン' },
  { value: 'DATE', label: '日付' },
  { value: 'TEXTAREA', label: 'テキストエリア' },
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
  const [selectedEvent, setSelectedEvent] = useState('');
  const [openFieldDialog, setOpenFieldDialog] = useState(false);
  const [openScanDialog, setOpenScanDialog] = useState(false);
  const [scannedTicket, setScannedTicket] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'used' | 'unused'>('all');

  // 新規フォーム項目用の状態
  const [newField, setNewField] = useState({
    label: '',
    fieldType: 'TEXT',
    isRequired: false,
    options: '',
  });

  // API hooks
  const { data: events, isLoading: eventsLoading, error: eventsError } = useAdminEvents();
  const {
    data: formTemplate,
    isLoading: formLoading,
    error: formError,
  } = useAdminEventFormTemplate(selectedEvent);
  const {
    data: participantsData,
    isLoading: participantsLoading,
    error: participantsError,
  } = useAdminEventParticipants(selectedEvent, {
    search: searchTerm || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });
  const saveFormTemplate = useSaveAdminEventFormTemplate();
  const scanTicket = useScanAdminTicket();
  const exportCSV = useExportAdminEventParticipantsCSV();
  const exportExcel = useExportAdminEventParticipantsExcel();

  // フォーム項目のローカル状態（編集用）
  const [formFields, setFormFields] = useState(formTemplate?.fields || []);

  // フォームテンプレートが取得されたら、ローカル状態を更新
  useEffect(() => {
    if (formTemplate?.fields) {
      setFormFields(formTemplate.fields);
    }
  }, [formTemplate]);

  // イベント選択時に最初のイベントを自動選択
  useEffect(() => {
    if (events && events.length > 0 && !selectedEvent) {
      setSelectedEvent(events[0].id);
    }
  }, [events, selectedEvent]);

  const participants = participantsData?.participants || [];

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
      templateId: selectedEvent,
      label: newField.label,
      fieldType: newField.fieldType,
      isRequired: newField.isRequired,
      order: formFields.length + 1,
      options: newField.options ? newField.options.split(',').map((o) => o.trim()) : undefined,
    };
    const updatedFields = [...formFields, newFieldData];
    setFormFields(updatedFields);
    setNewField({ label: '', fieldType: 'TEXT', isRequired: false, options: '' });
    setOpenFieldDialog(false);

    // API保存（エラーハンドリング付き）
    if (selectedEvent && formTemplate) {
      saveFormTemplate.mutate(
        {
          eventId: selectedEvent,
          data: {
            name: formTemplate.name || 'イベントフォーム',
            description: formTemplate.description,
            fields: updatedFields.map((f) => ({
              label: f.label,
              fieldType: f.fieldType,
              isRequired: f.isRequired,
              order: f.order,
              options: f.options,
            })),
          },
        },
        {
          onError: (error) => {
            console.error('フォーム保存エラー:', error);
            alert('フォーム項目の保存に失敗しました');
          },
        }
      );
    }
  };

  // フォーム項目削除
  const handleDeleteField = (id: string) => {
    const updatedFields = formFields.filter((f) => f.id !== id);
    setFormFields(updatedFields);

    // API保存
    if (selectedEvent && formTemplate) {
      saveFormTemplate.mutate(
        {
          eventId: selectedEvent,
          data: {
            name: formTemplate.name || 'イベントフォーム',
            description: formTemplate.description,
            fields: updatedFields.map((f) => ({
              label: f.label,
              fieldType: f.fieldType,
              isRequired: f.isRequired,
              order: f.order,
              options: f.options,
            })),
          },
        },
        {
          onError: (error) => {
            console.error('フォーム削除エラー:', error);
            alert('フォーム項目の削除に失敗しました');
          },
        }
      );
    }
  };

  // QRスキャン処理
  const handleScan = () => {
    scanTicket.mutate(
      { ticketCode: scannedTicket },
      {
        onSuccess: (response) => {
          if (response.success) {
            alert(`チェックイン完了: ${response.ticket?.customerName || ''}`);
            setScannedTicket('');
            setOpenScanDialog(false);
          } else {
            alert(response.error || 'チケットが見つかりません');
          }
        },
        onError: (error) => {
          console.error('スキャンエラー:', error);
          alert('スキャンに失敗しました');
        },
      }
    );
  };

  // CSV出力
  const handleExportCSV = () => {
    if (selectedEvent) {
      exportCSV.mutate(selectedEvent, {
        onError: (error) => {
          console.error('CSV出力エラー:', error);
          alert('CSV出力に失敗しました');
        },
      });
    }
  };

  // Excel出力
  const handleExportExcel = () => {
    if (selectedEvent) {
      exportExcel.mutate(selectedEvent, {
        onError: (error) => {
          console.error('Excel出力エラー:', error);
          alert('Excel出力に失敗しました');
        },
      });
    }
  };

  // ローディング・エラー表示
  if (eventsLoading) {
    return (
      <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (eventsError) {
    return (
      <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
        <Alert severity="error">イベントの取得に失敗しました</Alert>
      </Box>
    );
  }

  if (!events || events.length === 0) {
    return (
      <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
        <Alert severity="info">イベントが登録されていません</Alert>
      </Box>
    );
  }

  return (
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
                  {events.map((event) => (
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

            {formLoading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : formError ? (
              <Alert severity="error">フォームテンプレートの取得に失敗しました</Alert>
            ) : formFields.length === 0 ? (
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
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'used' | 'unused')}
                size="small"
                sx={{ width: 150 }}
              >
                <MenuItem value="all">全て</MenuItem>
                <MenuItem value="unused">未使用</MenuItem>
                <MenuItem value="used">使用済み</MenuItem>
              </TextField>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={handleExportCSV}
                disabled={exportCSV.isPending || !selectedEvent}
              >
                CSV出力
              </Button>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={handleExportExcel}
                disabled={exportExcel.isPending || !selectedEvent}
              >
                Excel出力
              </Button>
            </Box>
          </Paper>

          {/* 参加者リスト */}
          {participantsLoading ? (
            <Paper sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Paper>
          ) : participantsError ? (
            <Paper sx={{ p: 3 }}>
              <Alert severity="error">参加者リストの取得に失敗しました</Alert>
            </Paper>
          ) : (
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
          )}
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
        <Dialog
        disablePortal={false}
        open={openFieldDialog} onClose={() => setOpenFieldDialog(false)} maxWidth="sm" fullWidth>
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
            <Button onClick={() => setOpenFieldDialog(false)} disabled={saveFormTemplate.isPending}>
              キャンセル
            </Button>
            <Button
              onClick={handleAddField}
              variant="contained"
              disabled={!newField.label || saveFormTemplate.isPending}
            >
              {saveFormTemplate.isPending ? '追加中...' : '追加'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* QRスキャン手動入力ダイアログ */}
        <Dialog
        disablePortal={false}
        open={openScanDialog} onClose={() => setOpenScanDialog(false)} maxWidth="sm" fullWidth>
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
            <Button onClick={() => setOpenScanDialog(false)} disabled={scanTicket.isPending}>
              キャンセル
            </Button>
            <Button
              onClick={handleScan}
              variant="contained"
              disabled={!scannedTicket || scanTicket.isPending}
            >
              {scanTicket.isPending ? 'チェックイン中...' : 'チェックイン'}
            </Button>
          </DialogActions>
        </Dialog>
    </Box>
  );
};

export default AdminEventsPage;
