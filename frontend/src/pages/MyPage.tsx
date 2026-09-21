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
import {
  ShoppingBag,
  Settings,
  CheckCircle,
  QrCode2,
  Close,
  Autorenew,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import axios from 'axios';
import { orderAPI } from '../lib/api';
import { getMe, updateProfile, updatePassword } from '../services/api/users';
import {
  getMySubscriptions,
  cancelMySubscription,
} from '../services/api/subscriptions';
import type { Subscription } from '../types';

// 課金周期の日本語ラベル
const BILLING_LABEL: Record<string, string> = {
  monthly: '月額',
  yearly: '年額',
  onetime: '買い切り',
};

// 契約状態のバッジ
const SUBSCRIPTION_STATUS: Record<
  string,
  { label: string; color: 'success' | 'warning' | 'error' | 'default' }
> = {
  pending_payment: { label: '入金待ち', color: 'default' },
  active: { label: '利用中', color: 'success' },
  suspended: { label: '一時停止', color: 'warning' },
  cancelled: { label: '解約済み', color: 'error' },
};

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
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

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

  const queryClient = useQueryClient();

  // サブスク契約データを取得
  const {
    data: subscriptions = [],
    isLoading: isSubscriptionsLoading,
    error: subscriptionsError,
  } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: getMySubscriptions,
    retry: 1,
  });

  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // 契約の解約
  const handleCancelSubscription = async (sub: Subscription) => {
    const ok = window.confirm(
      `「${sub.product?.name ?? 'この契約'}」を解約しますか？\n\n解約後もデータは削除されず、再契約すればまたご利用いただけます。`
    );
    if (!ok) return;

    setCancellingId(sub.id);
    try {
      await cancelMySubscription(sub.id);
      await queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    } catch (e) {
      const msg = axios.isAxiosError(e)
        ? (e.response?.data?.message ?? '解約に失敗しました')
        : '解約に失敗しました';
      window.alert(msg);
    } finally {
      setCancellingId(null);
    }
  };

  // QRコード生成
  // ログイン中ユーザーの実データをフォームに読み込む
  useEffect(() => {
    let active = true;
    getMe()
      .then((me) => {
        if (!active) return;
        setName(me.name ?? '');
        setEmail(me.email ?? '');
        setPostalCode(me.defaultPostalCode ?? '');
        setPhone(me.defaultPhone ?? '');
        setAddress(me.defaultAddress ?? '');
      })
      .catch(() => {
        // 未ログイン等は無視（フォームは空のまま）
      });
    return () => {
      active = false;
    };
  }, []);

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

  const handleSaveSettings = async () => {
    setSaveMsg(null);

    // パスワード変更のバリデーション（入力がある場合のみ）
    const wantsPasswordChange = Boolean(currentPassword || newPassword || confirmPassword);
    if (wantsPasswordChange) {
      if (!currentPassword || !newPassword) {
        setSaveMsg({ type: 'error', text: '現在のパスワードと新しいパスワードを入力してください' });
        return;
      }
      if (newPassword.length < 8) {
        setSaveMsg({ type: 'error', text: '新しいパスワードは8文字以上で入力してください' });
        return;
      }
      if (newPassword !== confirmPassword) {
        setSaveMsg({ type: 'error', text: '新しいパスワード（確認）が一致しません' });
        return;
      }
    }

    setSaving(true);
    try {
      // プロフィール（氏名・メール・配送先）を更新
      await updateProfile({
        name,
        email,
        defaultAddress: address,
        defaultPostalCode: postalCode,
        defaultPhone: phone,
      });

      // パスワード変更が要求されていれば更新
      if (wantsPasswordChange) {
        await updatePassword({ currentPassword, newPassword });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }

      setSaveMsg({ type: 'success', text: 'アカウント情報を保存しました' });
    } catch (e) {
      const msg = axios.isAxiosError(e)
        ? (e.response?.data?.message ?? '保存に失敗しました')
        : '保存に失敗しました';
      setSaveMsg({ type: 'error', text: msg });
    } finally {
      setSaving(false);
    }
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
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5', pt: 12, pb: 4 }}>
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
              {(name || '?').charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={600}>
                {name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {email}
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
              <Tab
                icon={<Autorenew />}
                iconPosition="start"
                label={
                  <Badge badgeContent={subscriptions.length} color="primary">
                    契約管理
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

          {/* タブ2: 契約管理（サブスク） */}
          <TabPanel value={tabValue} index={1}>
            {isSubscriptionsLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {subscriptionsError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                契約情報の取得に失敗しました。再度お試しください。
              </Alert>
            )}

            {!isSubscriptionsLoading && !subscriptionsError && subscriptions.length === 0 && (
              <Alert severity="info">
                現在ご契約中のサブスク・サービスはありません。
              </Alert>
            )}

            {!isSubscriptionsLoading &&
              !subscriptionsError &&
              subscriptions.map((sub) => {
                const statusConf = SUBSCRIPTION_STATUS[sub.status] || {
                  label: sub.status,
                  color: 'default' as const,
                };
                const canCancel =
                  sub.status === 'active' && sub.billingType !== 'onetime';
                return (
                  <Card
                    key={sub.id}
                    variant="outlined"
                    sx={{ mb: 2, '&:hover': { borderColor: '#667eea', boxShadow: 2 } }}
                  >
                    <CardContent>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          mb: 2,
                        }}
                      >
                        <Box>
                          <Typography variant="h6" fontWeight={700}>
                            {sub.product?.name ?? '（商品情報なし）'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {BILLING_LABEL[sub.billingType] ?? sub.billingType} ・ ¥
                            {sub.amount.toLocaleString()}
                          </Typography>
                        </Box>
                        <Chip label={statusConf.label} color={statusConf.color} size="small" />
                      </Box>

                      <Divider sx={{ my: 1.5 }} />

                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          契約開始: {formatDate(sub.startedAt as unknown as string)}
                        </Typography>
                        {sub.nextBillingDate && sub.status === 'active' && (
                          <Typography variant="body2" color="text.secondary">
                            次回更新: {formatDate(sub.nextBillingDate as unknown as string)}
                          </Typography>
                        )}
                        {sub.cancelledAt && (
                          <Typography variant="body2" color="error">
                            解約日: {formatDate(sub.cancelledAt as unknown as string)}
                          </Typography>
                        )}
                      </Box>

                      {/* ライセンスキー案内 */}
                      <Alert
                        severity={sub.licenseKeyDelivered ? 'success' : 'info'}
                        sx={{ mt: 1.5 }}
                      >
                        {sub.licenseKeyDelivered
                          ? 'ライセンスキーは送付済みです。届いたキーをアプリに入力してご利用ください。'
                          : 'ご入金確認後、運営者よりライセンスキーをメールでお届けします。'}
                      </Alert>

                      {canCancel && (
                        <Box sx={{ mt: 2, textAlign: 'right' }}>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            disabled={cancellingId === sub.id}
                            onClick={() => handleCancelSubscription(sub)}
                          >
                            {cancellingId === sub.id ? '解約処理中...' : '解約する'}
                          </Button>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </TabPanel>

          {/* タブ3: アカウント設定 */}
          <TabPanel value={tabValue} index={2}>
            {/* 基本情報 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom sx={{ pb: 1, borderBottom: 2, borderColor: 'divider' }}>
                基本情報
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                  gap: 2,
                  mt: 1,
                }}
              >
                <TextField
                  fullWidth
                  label="氏名"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <TextField
                  fullWidth
                  label="メールアドレス"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Box>
            </Box>

            {/* デフォルト配送先 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom sx={{ pb: 1, borderBottom: 2, borderColor: 'divider' }}>
                デフォルト配送先
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                  gap: 2,
                  mt: 1,
                }}
              >
                <TextField
                  fullWidth
                  label="郵便番号"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                />
                <TextField
                  fullWidth
                  label="電話番号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <TextField
                  fullWidth
                  label="住所"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  sx={{ gridColumn: { md: '1 / -1' } }}
                />
                <TextField
                  fullWidth
                  label="建物名・部屋番号（任意）"
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  sx={{ gridColumn: { md: '1 / -1' } }}
                />
              </Box>
            </Box>

            {/* パスワード変更 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom sx={{ pb: 1, borderBottom: 2, borderColor: 'divider' }}>
                パスワード変更
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                  gap: 2,
                  mt: 1,
                }}
              >
                <TextField
                  fullWidth
                  label="現在のパスワード"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="現在のパスワードを入力"
                  sx={{ gridColumn: { md: '1 / -1' } }}
                />
                <TextField
                  fullWidth
                  label="新しいパスワード"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="8文字以上"
                />
                <TextField
                  fullWidth
                  label="新しいパスワード（確認）"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再入力"
                />
              </Box>
            </Box>

            {/* 保存結果メッセージ */}
            {saveMsg && (
              <Alert severity={saveMsg.type} sx={{ mb: 2 }}>
                {saveMsg.text}
              </Alert>
            )}

            {/* 保存ボタン */}
            <Button
              variant="contained"
              size="large"
              onClick={handleSaveSettings}
              disabled={saving}
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
        disablePortal={false}
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
