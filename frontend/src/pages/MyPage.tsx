import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Tab,
  Tabs,
  Paper,
  Avatar,
  Chip,
  Button,
  TextField,
  Card,
  CardContent,
  Divider,
  Badge,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  ShoppingBag,
  Settings,
  CheckCircle,
  QrCode2,
  Close,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { orderAPI } from '../lib/api';

// タブパネルコンポーネント
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
      id={`mypage-tabpanel-${index}`}
      aria-labelledby={`mypage-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 4 }}>{children}</Box>}
    </div>
  );
}

// ダミーデータ（アカウント情報用）
const MOCK_USER = {
  name: '山田 太郎',
  email: 'yamada@example.com',
  defaultAddress: '東京都渋谷区神宮前1-2-3',
  defaultPostalCode: '150-0001',
  defaultPhone: '090-1234-5678',
  building: 'サンプルマンション101',
};

const MyPage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState('');
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // アカウント設定用のstate
  const [name, setName] = useState(MOCK_USER.name);
  const [email, setEmail] = useState(MOCK_USER.email);
  const [postalCode, setPostalCode] = useState(MOCK_USER.defaultPostalCode);
  const [phone, setPhone] = useState(MOCK_USER.defaultPhone);
  const [address, setAddress] = useState(MOCK_USER.defaultAddress);
  const [building, setBuilding] = useState(MOCK_USER.building);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 注文データを取得
  const {
    data: ordersData,
    isLoading: isOrdersLoading,
    error: ordersError,
  } = useQuery({
    queryKey: ['orders'],
    queryFn: orderAPI.getOrders,
    retry: 1,
  });

  const orders = ordersData?.orders || [];

  // QRコード生成
  useEffect(() => {
    if (qrDialogOpen && selectedOrderNumber) {
      // ダイアログのアニメーション完了後にQRコードを生成
      const timer = setTimeout(() => {
        if (qrCanvasRef.current) {
          QRCode.toCanvas(
            qrCanvasRef.current,
            selectedOrderNumber,
            {
              width: 300,
              margin: 2,
              color: {
                dark: '#000000',
                light: '#FFFFFF',
              },
            },
            (error) => {
              if (error) {
                console.error('QRコード生成エラー:', error);
              } else {
                console.log('QRコード生成成功:', selectedOrderNumber);
              }
            }
          );
        } else {
          console.error('Canvas要素が見つかりません');
        }
      }, 300); // 300msの遅延

      return () => clearTimeout(timer);
    }
  }, [qrDialogOpen, selectedOrderNumber]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSaveSettings = () => {
    // 実装時はAPIで更新
    alert('アカウント情報を保存しました！');
  };

  const handleShowQR = (orderNumber: string) => {
    setSelectedOrderNumber(orderNumber);
    setQrDialogOpen(true);
  };

  const handleCloseQRDialog = () => {
    setQrDialogOpen(false);
    setSelectedOrderNumber('');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: 'warning' | 'info' | 'primary' | 'success' | 'error' | 'default' }> = {
      pending: { label: '入金待ち', color: 'warning' },
      paid: { label: '入金確認済み', color: 'info' },
      preparing: { label: '発送準備中', color: 'info' },
      shipped: { label: '発送済み', color: 'primary' },
      completed: { label: '配送完了', color: 'success' },
      cancelled: { label: 'キャンセル', color: 'error' },
    };

    const config = statusConfig[status] || {
      label: status,
      color: 'default' as const,
    };

    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', pt: 12, pb: 4 }}>
      <Container maxWidth="lg">
        {/* ページヘッダー */}
        <Paper
          elevation={3}
          sx={{
            p: 4,
            mb: 3,
            borderRadius: 3,
          }}
        >
          <Typography variant="h4" fontWeight={700} gutterBottom>
            マイページ
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            購入履歴、アカウント情報を管理できます
          </Typography>

          {/* ユーザー情報 */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              mt: 3,
              p: 2,
              backgroundColor: '#f7fafc',
              borderRadius: 2,
            }}
          >
            <Avatar
              sx={{
                width: 64,
                height: 64,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                fontSize: 24,
                fontWeight: 600,
              }}
            >
              {MOCK_USER.name.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={600}>
                {MOCK_USER.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {MOCK_USER.email}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* タブコンテナ */}
        <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: '#f7fafc' }}>
            <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
              <Tab
                icon={<ShoppingBag />}
                iconPosition="start"
                label={
                  <Badge badgeContent={orders.length} color="error">
                    購入履歴
                  </Badge>
                }
              />
              <Tab icon={<Settings />} iconPosition="start" label="アカウント設定" />
            </Tabs>
          </Box>

          {/* タブ1: 購入履歴 */}
          <TabPanel value={tabValue} index={0}>
            {isOrdersLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {ordersError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                注文履歴の取得に失敗しました。再度お試しください。
              </Alert>
            )}

            {!isOrdersLoading && !ordersError && orders.length === 0 && (
              <Alert severity="info">
                まだ注文履歴がありません。
              </Alert>
            )}

            {!isOrdersLoading && !ordersError && orders.map((order: any) => (
              <Card key={order.id} variant="outlined" sx={{ mb: 2, '&:hover': { borderColor: '#667eea', boxShadow: 2 } }}>
                <CardContent>
                  {/* 注文ヘッダー */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        注文番号: {order.orderNumber}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(order.createdAt)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      {getStatusBadge(order.status)}
                      {order.checkedIn && (
                        <Chip
                          label="受付済み"
                          color="success"
                          size="small"
                          icon={<CheckCircle />}
                        />
                      )}
                    </Box>
                  </Box>

                  {/* 注文商品 */}
                  {order.items.map((item: any) => (
                    <Box
                      key={item.id}
                      sx={{
                        display: 'flex',
                        gap: 2,
                        py: 1.5,
                        borderBottom: '1px dashed #e2e8f0',
                        '&:last-child': { borderBottom: 'none' },
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" fontWeight={600}>
                          {item.product.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          数量: {item.quantity}個 × ¥{item.price.toLocaleString()}
                        </Typography>
                      </Box>
                      <Typography variant="body1" fontWeight={600} color="primary">
                        ¥{(item.price * item.quantity).toLocaleString()}
                      </Typography>
                    </Box>
                  ))}

                  <Divider sx={{ my: 2 }} />

                  {/* 注文フッター */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" fontWeight={700}>
                      合計: ¥{order.totalAmount.toLocaleString()}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<QrCode2 />}
                        onClick={() => handleShowQR(order.orderNumber)}
                        sx={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        }}
                      >
                        QRコード表示
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </TabPanel>

          {/* タブ2: アカウント設定 */}
          <TabPanel value={tabValue} index={1}>
            {/* 基本情報 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom sx={{ pb: 1, borderBottom: 2, borderColor: 'divider' }}>
                基本情報
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="氏名"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Grid>
                <Grid xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="メールアドレス"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* デフォルト配送先 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom sx={{ pb: 1, borderBottom: 2, borderColor: 'divider' }}>
                デフォルト配送先
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="郵便番号"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                  />
                </Grid>
                <Grid xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="電話番号"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </Grid>
                <Grid xs={12}>
                  <TextField
                    fullWidth
                    label="住所"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </Grid>
                <Grid xs={12}>
                  <TextField
                    fullWidth
                    label="建物名・部屋番号（任意）"
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* パスワード変更 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom sx={{ pb: 1, borderBottom: 2, borderColor: 'divider' }}>
                パスワード変更
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid xs={12}>
                  <TextField
                    fullWidth
                    label="現在のパスワード"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="現在のパスワードを入力"
                  />
                </Grid>
                <Grid xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="新しいパスワード"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="8文字以上"
                  />
                </Grid>
                <Grid xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="新しいパスワード（確認）"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再入力"
                  />
                </Grid>
              </Grid>
            </Box>

            {/* 保存ボタン */}
            <Button
              variant="contained"
              size="large"
              onClick={handleSaveSettings}
              startIcon={<CheckCircle />}
              sx={{
                backgroundColor: '#48bb78',
                '&:hover': {
                  backgroundColor: '#38a169',
                },
                px: 4,
              }}
            >
              変更を保存
            </Button>
          </TabPanel>
        </Paper>
      </Container>

      {/* QRコード表示ダイアログ */}
      <Dialog
        open={qrDialogOpen}
        onClose={handleCloseQRDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              受付用QRコード
            </Typography>
            <Typography variant="body2" color="text.secondary">
              会場でこのQRコードをスキャンしてください
            </Typography>
          </Box>
          <IconButton onClick={handleCloseQRDialog} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              backgroundColor: '#f7fafc',
              borderRadius: 2,
              display: 'inline-block',
            }}
          >
            <canvas ref={qrCanvasRef} />
          </Paper>
          <Typography
            variant="body1"
            sx={{
              mt: 3,
              fontFamily: 'monospace',
              fontWeight: 600,
              letterSpacing: 2,
              color: '#4a5568',
            }}
          >
            {selectedOrderNumber}
          </Typography>
          <Alert severity="info" sx={{ mt: 3 }}>
            このQRコードを会場のスタッフにスキャンしてもらうと、注文内容を確認して商品を受け取ることができます。
          </Alert>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default MyPage;
