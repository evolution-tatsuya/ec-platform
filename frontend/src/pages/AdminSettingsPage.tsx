// ===== A-007-008: システム設定・ナビゲーション軸管理ページ =====
// 目的: サイト全体の設定、ナビゲーション軸管理

import { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, Paper, TextField, Button, Switch, FormControlLabel, Snackbar, Alert, MenuItem, Card, CardContent, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Chip } from '@mui/material';
import { Save, Add, Edit, Delete, ArrowUpward, ArrowDownward } from '@mui/icons-material';
import { adminAPI } from '../lib/api';
import { Header } from '../components';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const AdminSettingsPage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // システム設定
  const [settings, setSettings] = useState<any>({});
  const [settingsLoading, setSettingsLoading] = useState(false);

  // ナビゲーション軸
  const [axes, setAxes] = useState<any[]>([]);
  const [selectedCategoryType, setSelectedCategoryType] = useState('cars');
  const [openAxisDialog, setOpenAxisDialog] = useState(false);
  const [editingAxis, setEditingAxis] = useState<any | null>(null);
  const [axisForm, setAxisForm] = useState({
    axisName: '',
    axisKey: '',
    axisType: 'select',
    displayType: 'dropdown',
    icon: '',
    options: [] as { label: string; value: string }[],
  });

  useEffect(() => {
    fetchSettings();
    fetchAxes();
  }, [selectedCategoryType]);

  const fetchSettings = async () => {
    try {
      setSettingsLoading(true);
      const { settings: data } = await adminAPI.getFullSettings();
      setSettings(data);
    } catch (error: any) {
      showSnackbar(error.message || '設定の取得に失敗しました', 'error');
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchAxes = async () => {
    try {
      const { axes: data } = await adminAPI.getNavigationAxes({ categoryType: selectedCategoryType });
      setAxes(data);
    } catch (error: any) {
      showSnackbar(error.message || 'ナビゲーション軸の取得に失敗しました', 'error');
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSettingsLoading(true);
      const { message } = await adminAPI.updateFullSettings(settings);
      showSnackbar(message, 'success');
    } catch (error: any) {
      showSnackbar(error.message || '設定の保存に失敗しました', 'error');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleOpenAxisDialog = (axis?: any) => {
    if (axis) {
      setEditingAxis(axis);
      setAxisForm({
        axisName: axis.axisName,
        axisKey: axis.axisKey,
        axisType: axis.axisType,
        displayType: axis.displayType,
        icon: axis.icon || '',
        options: axis.options || [],
      });
    } else {
      setEditingAxis(null);
      setAxisForm({
        axisName: '',
        axisKey: '',
        axisType: 'select',
        displayType: 'dropdown',
        icon: '',
        options: [],
      });
    }
    setOpenAxisDialog(true);
  };

  const handleSaveAxis = async () => {
    try {
      if (editingAxis) {
        await adminAPI.updateNavigationAxis(editingAxis.id, axisForm);
        showSnackbar('ナビゲーション軸を更新しました', 'success');
      } else {
        await adminAPI.createNavigationAxis({
          categoryType: selectedCategoryType,
          ...axisForm,
        });
        showSnackbar('ナビゲーション軸を追加しました', 'success');
      }
      setOpenAxisDialog(false);
      fetchAxes();
    } catch (error: any) {
      showSnackbar(error.message || 'ナビゲーション軸の保存に失敗しました', 'error');
    }
  };

  const handleDeleteAxis = async (axisId: string) => {
    if (!window.confirm('このナビゲーション軸を削除してもよろしいですか？')) return;
    try {
      await adminAPI.deleteNavigationAxis(axisId);
      showSnackbar('ナビゲーション軸を削除しました', 'success');
      fetchAxes();
    } catch (error: any) {
      showSnackbar(error.message || 'ナビゲーション軸の削除に失敗しました', 'error');
    }
  };

  const handleMoveAxis = async (axisId: string, direction: 'up' | 'down') => {
    const currentIndex = axes.findIndex((a) => a.id === axisId);
    if (currentIndex === -1) return;

    const newOrder = direction === 'up' ? axes[currentIndex].order - 1 : axes[currentIndex].order + 1;
    if (newOrder < 0 || newOrder >= axes.length) return;

    try {
      await adminAPI.updateNavigationAxisOrder(axisId, newOrder);
      fetchAxes();
    } catch (error: any) {
      showSnackbar(error.message || '表示順序の変更に失敗しました', 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const addOption = () => {
    setAxisForm({
      ...axisForm,
      options: [...axisForm.options, { label: '', value: '' }],
    });
  };

  const updateOption = (index: number, field: 'label' | 'value', value: string) => {
    const newOptions = [...axisForm.options];
    newOptions[index][field] = value;
    setAxisForm({ ...axisForm, options: newOptions });
  };

  const removeOption = (index: number) => {
    setAxisForm({
      ...axisForm,
      options: axisForm.options.filter((_, i) => i !== index),
    });
  };

  return (
    <>
      <Header />
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">システム設定</Typography>

        <Paper sx={{ mb: 2 }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="基本設定" />
            <Tab label="会社情報" />
            <Tab label="決済設定" />
            <Tab label="メール設定" />
            <Tab label="画像最適化" />
            <Tab label="ナビゲーション軸" />
          </Tabs>
        </Paper>

        {/* 基本設定 */}
        <TabPanel value={tabValue} index={0}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>配送設定</Typography>
              <FormControlLabel control={<Switch checked={settings.enableDeliveryDateTime || false} onChange={(e) => setSettings({ ...settings, enableDeliveryDateTime: e.target.checked })} />} label="配達日時指定機能を有効にする" />
              <Box sx={{ mt: 3 }}>
                <Button variant="contained" startIcon={<Save />} onClick={handleSaveSettings} disabled={settingsLoading}>保存</Button>
              </Box>
            </CardContent>
          </Card>
        </TabPanel>

        {/* 会社情報 */}
        <TabPanel value={tabValue} index={1}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>会社情報</Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <TextField label="会社名" value={settings.companyName || ''} onChange={(e) => setSettings({ ...settings, companyName: e.target.value })} fullWidth />
                <TextField label="郵便番号" value={settings.companyPostalCode || ''} onChange={(e) => setSettings({ ...settings, companyPostalCode: e.target.value })} fullWidth />
                <TextField label="住所" value={settings.companyAddress || ''} onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })} fullWidth />
                <TextField label="電話番号" value={settings.companyPhone || ''} onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })} fullWidth />
              </Box>
              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>銀行振込先情報</Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <TextField label="銀行名" value={settings.bankName || ''} onChange={(e) => setSettings({ ...settings, bankName: e.target.value })} fullWidth />
                <TextField label="支店名" value={settings.bankBranch || ''} onChange={(e) => setSettings({ ...settings, bankBranch: e.target.value })} fullWidth />
                <TextField select label="口座種別" value={settings.bankAccountType || '普通'} onChange={(e) => setSettings({ ...settings, bankAccountType: e.target.value })} fullWidth>
                  <MenuItem value="普通">普通</MenuItem>
                  <MenuItem value="当座">当座</MenuItem>
                </TextField>
                <TextField label="口座番号" value={settings.bankAccountNumber || ''} onChange={(e) => setSettings({ ...settings, bankAccountNumber: e.target.value })} fullWidth />
                <TextField label="口座名義" value={settings.bankAccountHolder || ''} onChange={(e) => setSettings({ ...settings, bankAccountHolder: e.target.value })} fullWidth />
              </Box>
              <Box sx={{ mt: 3 }}>
                <Button variant="contained" startIcon={<Save />} onClick={handleSaveSettings} disabled={settingsLoading}>保存</Button>
              </Box>
            </CardContent>
          </Card>
        </TabPanel>

        {/* 決済設定 */}
        <TabPanel value={tabValue} index={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>決済方法</Typography>
              <FormControlLabel control={<Switch checked={settings.enableBankTransfer !== false} onChange={(e) => setSettings({ ...settings, enableBankTransfer: e.target.checked })} />} label="銀行振込を有効にする" />
              <TextField label="銀行振込割引率（%）" type="number" value={(settings.bankTransferDiscount || 0.036) * 100} onChange={(e) => setSettings({ ...settings, bankTransferDiscount: Number(e.target.value) / 100 })} fullWidth sx={{ mt: 2 }} helperText="例: 3.6%の場合は3.6と入力" />
              <FormControlLabel control={<Switch checked={settings.enableCreditCard !== false} onChange={(e) => setSettings({ ...settings, enableCreditCard: e.target.checked })} />} label="クレジットカード決済を有効にする" sx={{ mt: 2 }} />
              <Box sx={{ mt: 3 }}>
                <Button variant="contained" startIcon={<Save />} onClick={handleSaveSettings} disabled={settingsLoading}>保存</Button>
              </Box>
            </CardContent>
          </Card>
        </TabPanel>

        {/* メール設定 */}
        <TabPanel value={tabValue} index={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>メール設定</Typography>
              <TextField label="送信元メールアドレス" value={settings.emailFrom || ''} onChange={(e) => setSettings({ ...settings, emailFrom: e.target.value })} fullWidth type="email" />
              <Box sx={{ mt: 3 }}>
                <Button variant="contained" startIcon={<Save />} onClick={handleSaveSettings} disabled={settingsLoading}>保存</Button>
              </Box>
            </CardContent>
          </Card>
        </TabPanel>

        {/* 画像最適化 */}
        <TabPanel value={tabValue} index={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>画像最適化設定</Typography>
              <FormControlLabel control={<Switch checked={settings.enableWebpConversion !== false} onChange={(e) => setSettings({ ...settings, enableWebpConversion: e.target.checked })} />} label="WebP変換を有効にする" />
              <TextField label="圧縮品質（60-100%）" type="number" value={settings.imageQuality || 80} onChange={(e) => setSettings({ ...settings, imageQuality: Number(e.target.value) })} fullWidth inputProps={{ min: 60, max: 100 }} sx={{ mt: 2 }} />
              <TextField label="サムネイルサイズ（ピクセル）" type="number" value={settings.thumbnailSize || 200} onChange={(e) => setSettings({ ...settings, thumbnailSize: Number(e.target.value) })} fullWidth sx={{ mt: 2 }} />
              <Box sx={{ mt: 3 }}>
                <Button variant="contained" startIcon={<Save />} onClick={handleSaveSettings} disabled={settingsLoading}>保存</Button>
              </Box>
            </CardContent>
          </Card>
        </TabPanel>

        {/* ナビゲーション軸 */}
        <TabPanel value={tabValue} index={5}>
          <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField select label="カテゴリー" value={selectedCategoryType} onChange={(e) => setSelectedCategoryType(e.target.value)} sx={{ width: 200 }}>
              <MenuItem value="cars">車パーツ</MenuItem>
              <MenuItem value="events">イベント</MenuItem>
              <MenuItem value="digital">デジタル</MenuItem>
            </TextField>
            <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenAxisDialog()}>新規追加</Button>
          </Box>

          <Box display="flex" flexDirection="column" gap={2}>
            {axes.map((axis, index) => (
              <Card key={axis.id}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="h6">{axis.icon} {axis.axisName}</Typography>
                      <Typography variant="body2" color="text.secondary">キー: {axis.axisKey} | 種類: {axis.axisType} | 表示: {axis.displayType}</Typography>
                      <Box sx={{ mt: 1 }}>
                        {axis.options?.map((opt: any) => (
                          <Chip key={opt.id} label={opt.label} size="small" sx={{ mr: 0.5 }} />
                        ))}
                      </Box>
                    </Box>
                    <Box display="flex" gap={1}>
                      <IconButton size="small" onClick={() => handleMoveAxis(axis.id, 'up')} disabled={index === 0}><ArrowUpward /></IconButton>
                      <IconButton size="small" onClick={() => handleMoveAxis(axis.id, 'down')} disabled={index === axes.length - 1}><ArrowDownward /></IconButton>
                      <IconButton size="small" color="primary" onClick={() => handleOpenAxisDialog(axis)}><Edit /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteAxis(axis.id)}><Delete /></IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </TabPanel>

        {/* ナビゲーション軸編集ダイアログ */}
        <Dialog open={openAxisDialog} onClose={() => setOpenAxisDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>{editingAxis ? 'ナビゲーション軸編集' : 'ナビゲーション軸追加'}</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField label="軸名" value={axisForm.axisName} onChange={(e) => setAxisForm({ ...axisForm, axisName: e.target.value })} fullWidth required />
              <TextField label="軸キー（英数字）" value={axisForm.axisKey} onChange={(e) => setAxisForm({ ...axisForm, axisKey: e.target.value })} fullWidth required helperText="例: maker, model, displacement" />
              <TextField select label="軸種類" value={axisForm.axisType} onChange={(e) => setAxisForm({ ...axisForm, axisType: e.target.value })} fullWidth>
                <MenuItem value="select">選択式</MenuItem>
                <MenuItem value="multi_select">複数選択</MenuItem>
                <MenuItem value="search">検索</MenuItem>
                <MenuItem value="range">範囲</MenuItem>
              </TextField>
              <TextField select label="表示形式" value={axisForm.displayType} onChange={(e) => setAxisForm({ ...axisForm, displayType: e.target.value })} fullWidth>
                <MenuItem value="dropdown">ドロップダウン</MenuItem>
                <MenuItem value="button">ボタン</MenuItem>
                <MenuItem value="radio">ラジオボタン</MenuItem>
              </TextField>
              <TextField label="アイコン（絵文字）" value={axisForm.icon} onChange={(e) => setAxisForm({ ...axisForm, icon: e.target.value })} fullWidth />

              <Typography variant="h6" sx={{ mt: 2 }}>選択肢</Typography>
              {axisForm.options.map((option, index) => (
                <Box key={index} display="flex" gap={1}>
                  <TextField label="ラベル" value={option.label} onChange={(e) => updateOption(index, 'label', e.target.value)} fullWidth />
                  <TextField label="値" value={option.value} onChange={(e) => updateOption(index, 'value', e.target.value)} fullWidth />
                  <IconButton color="error" onClick={() => removeOption(index)}><Delete /></IconButton>
                </Box>
              ))}
              <Button variant="outlined" startIcon={<Add />} onClick={addOption}>選択肢を追加</Button>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAxisDialog(false)}>キャンセル</Button>
            <Button variant="contained" onClick={handleSaveAxis}>保存</Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
        </Snackbar>
      </Box>
    </>
  );
};

export default AdminSettingsPage;
