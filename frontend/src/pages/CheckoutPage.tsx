import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Button,
  TextField,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Breadcrumbs,
  Link,
  Chip,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ja';
import { cartAPI, orderAPI, settingsAPI } from '../lib/api';
import { PaymentMethod } from '../types';

// dayjsのロケールを日本語に設定
dayjs.locale('ja');

// 決済方法の情報
const PAYMENT_INFO = {
  [PaymentMethod.BANK_TRANSFER]: {
    title: '銀行振込',
    description: '3.6% 割引適用',
    badgeText: 'お得!',
    infoMessage: 'ご注文確定後、振込先情報をメールでお送りします。入金確認後、商品を発送いたします。',
    discount: 0.036,
  },
  [PaymentMethod.PAYPAY]: {
    title: 'PayPay',
    description: 'QRコード決済 | 即時決済',
    badgeText: null,
    infoMessage: 'ご注文確定後、PayPay決済画面に遷移します。決済完了後、商品を発送いたします。',
    discount: 0,
  },
  [PaymentMethod.CREDIT_CARD]: {
    title: 'クレジットカード (Stripe)',
    description: 'VISA / Mastercard / AMEX | 即時決済',
    badgeText: null,
    infoMessage: 'ご注文確定後、Stripe決済画面で安全にカード情報を入力いただけます。決済完了後、商品を発送いたします。',
    discount: 0,
  },
};

// 配達時間帯の選択肢
const DELIVERY_TIME_SLOTS = [
  { value: '', label: '指定なし' },
  { value: '0812', label: '08:00 - 12:00' },
  { value: '1214', label: '12:00 - 14:00' },
  { value: '1416', label: '14:00 - 16:00' },
  { value: '1618', label: '16:00 - 18:00' },
  { value: '1820', label: '18:00 - 20:00' },
  { value: '1921', label: '19:00 - 21:00' },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // カートデータを取得
  const { data, isLoading: isCartLoading, error: cartError } = useQuery({
    queryKey: ['cart'],
    queryFn: cartAPI.getCart,
    retry: 1,
  });

  // サイト設定を取得
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsAPI.getSettings,
    retry: 1,
  });

  const enableDeliveryDateTime = settingsData?.settings.enableDeliveryDateTime ?? true;

  // フォーム状態
  const [useDefaultAddress, setUseDefaultAddress] = useState(true);
  const [name, setName] = useState('山田 太郎');
  const [postalCode, setPostalCode] = useState('150-0001');
  const [address, setAddress] = useState('東京都渋谷区神宮前1-2-3');
  const [building, setBuilding] = useState('サンプルマンション101');
  const [phone, setPhone] = useState('090-1234-5678');

  const [weekendDelivery, setWeekendDelivery] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState<Dayjs | null>(null);
  const [deliveryTime, setDeliveryTime] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.BANK_TRANSFER);
  const [notes, setNotes] = useState('');

  // 注文作成Mutation
  const createOrderMutation = useMutation({
    mutationFn: orderAPI.createOrder,
    onSuccess: (response) => {
      // カートをクリア
      queryClient.invalidateQueries({ queryKey: ['cart'] });

      // 注文完了メッセージ
      alert(
        `注文を受け付けました！\n\n注文番号: ${response.order.orderNumber}\n\n${
          paymentMethod === PaymentMethod.BANK_TRANSFER
            ? '振込先情報をメールでお送りします。'
            : '決済画面に遷移します。'
        }`
      );

      // TODO: 本番環境では決済画面に遷移
      // navigate('/order-complete');
      navigate('/');
    },
    onError: (error: any) => {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      if (errorMessage.includes('ログイン')) {
        alert('注文するにはログインが必要です');
        navigate('/auth/login');
      } else {
        alert(errorMessage || '注文の作成に失敗しました');
      }
    },
  });

  const cart = data?.cart;
  const items = cart?.items || [];
  const subtotal = cart?.totalAmount || 0;
  const itemCount = cart?.totalItems || 0;

  const selectedPaymentInfo = PAYMENT_INFO[paymentMethod];
  const discount = Math.floor(subtotal * selectedPaymentInfo.discount);
  const total = subtotal - discount;

  const handleSubmit = async () => {
    // バリデーション
    if (!name || !postalCode || !address || !phone) {
      alert('必須項目を入力してください');
      return;
    }

    // 配送先住所を組み立て
    const shippingAddress = `
【お名前】${name}
【郵便番号】${postalCode}
【住所】${address}
${building ? `【建物名】${building}` : ''}
【電話番号】${phone}
${deliveryDate ? `【配達希望日】${deliveryDate.format('YYYY年MM月DD日')}` : ''}
${deliveryTime ? `【配達時間帯】${DELIVERY_TIME_SLOTS.find((slot) => slot.value === deliveryTime)?.label}` : ''}
${notes ? `【備考】${notes}` : ''}
    `.trim();

    try {
      await createOrderMutation.mutateAsync({
        paymentMethod: paymentMethod as any,
        shippingAddress,
      });
    } catch (error) {
      // エラーはonErrorで処理済み
    }
  };

  // ローディング状態
  if (isCartLoading) {
    return (
      <Box
        sx={{
          padding: '88px 16px 80px',
          backgroundColor: '#f5f5f5',
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  // エラー状態
  if (cartError) {
    const errorMessage = cartError instanceof Error ? cartError.message : '不明なエラー';
    const isAuthError = errorMessage.includes('ログイン');

    return (
      <Box
        sx={{
          padding: '88px 16px 80px',
          backgroundColor: '#f5f5f5',
          minHeight: '100vh',
        }}
      >
        <Box
          sx={{
            maxWidth: 1200,
            margin: '0 auto',
          }}
        >
          <Alert severity="error" sx={{ mb: 3 }}>
            {errorMessage}
          </Alert>
          {isAuthError && (
            <Button variant="contained" onClick={() => navigate('/auth/login')}>
              ログインページへ
            </Button>
          )}
        </Box>
      </Box>
    );
  }

  // カートが空の場合
  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <Box
      sx={{
        padding: '88px 16px 80px',
        backgroundColor: '#f5f5f5',
        minHeight: '100vh',
      }}
    >
      {/* パンくずリスト */}
      <Box sx={{ maxWidth: 1200, margin: '0 auto 24px' }}>
        <Breadcrumbs>
          <Link href="/" underline="hover" color="inherit">
            トップ
          </Link>
          <Link href="/cart" underline="hover" color="inherit">
            カート
          </Link>
          <Typography color="text.primary">購入手続き</Typography>
        </Breadcrumbs>
      </Box>

      <Box sx={{ maxWidth: 1200, margin: '0 auto 24px' }}>
        <Typography variant="h4" fontWeight={700} color="#333">
          購入手続き
        </Typography>
      </Box>

      {/* メインレイアウト */}
      <Box
        sx={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 400px' },
          gap: 3,
        }}
      >
        {/* 左側: フォーム */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* 1. 配送先情報 */}
          <Box
            sx={{
              backgroundColor: 'white',
              borderRadius: 1,
              padding: 3,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: '#7c4dff',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                1
              </Box>
              <Typography variant="h6" fontWeight={600}>
                配送先情報
              </Typography>
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  checked={useDefaultAddress}
                  onChange={(e) => setUseDefaultAddress(e.target.checked)}
                />
              }
              label="登録済みの住所を使用する"
              sx={{ mb: 2 }}
            />

            <TextField
              label="お名前"
              required
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={useDefaultAddress}
              sx={{ mb: 2 }}
            />

            <TextField
              label="郵便番号"
              required
              fullWidth
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              disabled={useDefaultAddress}
              helperText="ハイフンなしでも入力可能です"
              sx={{ mb: 2 }}
            />

            <TextField
              label="住所"
              required
              fullWidth
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={useDefaultAddress}
              sx={{ mb: 2 }}
            />

            <TextField
              label="建物名・部屋番号"
              fullWidth
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              disabled={useDefaultAddress}
              sx={{ mb: 2 }}
            />

            <TextField
              label="電話番号"
              required
              fullWidth
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={useDefaultAddress}
            />
          </Box>

          {/* 2. 配送オプション */}
          {enableDeliveryDateTime && (
            <Box
              sx={{
                backgroundColor: 'white',
                borderRadius: 1,
                padding: 3,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: '#7c4dff',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  2
                </Box>
                <Typography variant="h6" fontWeight={600}>
                  配送オプション
                </Typography>
              </Box>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={weekendDelivery}
                    onChange={(e) => setWeekendDelivery(e.target.checked)}
                  />
                }
                label="土日配達を希望する"
                sx={{ mb: 2 }}
              />

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ja">
                  <DatePicker
                    label="配達希望日"
                    value={deliveryDate}
                    onChange={(newValue) => setDeliveryDate(newValue as any)}
                    minDate={dayjs().add(2, 'day')}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        helperText: '最短: 2日後から選択可能',
                      },
                    }}
                  />
                </LocalizationProvider>

                <FormControl fullWidth>
                  <InputLabel>配達時間帯</InputLabel>
                  <Select
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    label="配達時間帯"
                  >
                    {DELIVERY_TIME_SLOTS.map((slot) => (
                      <MenuItem key={slot.value} value={slot.value}>
                        {slot.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box
                sx={{
                  backgroundColor: '#f5f0ff',
                  borderLeft: '4px solid #7c4dff',
                  padding: 2,
                  borderRadius: 0.5,
                  fontSize: 14,
                }}
              >
                <strong style={{ color: '#7c4dff' }}>配送について:</strong> 準備期間は2営業日です。土日祝日を除く2日後から配達日を指定できます。
              </Box>
            </Box>
          )}

          {/* 3. 決済方法 */}
          <Box
            sx={{
              backgroundColor: 'white',
              borderRadius: 1,
              padding: 3,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: '#7c4dff',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                3
              </Box>
              <Typography variant="h6" fontWeight={600}>
                決済方法
              </Typography>
            </Box>

            <RadioGroup value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
              {Object.entries(PAYMENT_INFO).map(([method, info]) => (
                <Box
                  key={method}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    padding: 2,
                    border: '2px solid',
                    borderColor: paymentMethod === method ? '#7c4dff' : '#ddd',
                    borderRadius: 1,
                    backgroundColor: paymentMethod === method ? '#f5f0ff' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    mb: 1.5,
                    '&:hover': {
                      borderColor: '#7c4dff',
                      backgroundColor: '#f5f0ff',
                    },
                  }}
                  onClick={() => setPaymentMethod(method as PaymentMethod)}
                >
                  <Radio value={method} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" fontWeight={600}>
                      {info.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {info.description}
                    </Typography>
                  </Box>
                  {info.badgeText && (
                    <Chip
                      label={info.badgeText}
                      size="small"
                      sx={{
                        backgroundColor: '#fff3e0',
                        color: '#e65100',
                        fontWeight: 600,
                      }}
                    />
                  )}
                </Box>
              ))}
            </RadioGroup>

            <Box
              sx={{
                backgroundColor: '#f5f0ff',
                borderLeft: '4px solid #7c4dff',
                padding: 2,
                borderRadius: 0.5,
                fontSize: 14,
                mt: 2,
              }}
            >
              <strong>{selectedPaymentInfo.title}をご選択の場合:</strong> {selectedPaymentInfo.infoMessage}
            </Box>
          </Box>

          {/* 4. 備考 */}
          <Box
            sx={{
              backgroundColor: 'white',
              borderRadius: 1,
              padding: 3,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: '#7c4dff',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                4
              </Box>
              <Typography variant="h6" fontWeight={600}>
                その他・備考
              </Typography>
            </Box>

            <TextField
              label="配送業者への連絡事項"
              multiline
              rows={4}
              fullWidth
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例: 不在時は宅配ボックスに入れてください"
            />
          </Box>

          {/* ボタン */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/cart')}
              sx={{ flex: 1, fontSize: 16, fontWeight: 600 }}
            >
              カートに戻る
            </Button>
            <Button
              variant="contained"
              size="large"
              onClick={handleSubmit}
              disabled={createOrderMutation.isPending}
              startIcon={
                createOrderMutation.isPending ? (
                  <CircularProgress size={20} color="inherit" />
                ) : null
              }
              sx={{
                flex: 1,
                fontSize: 18,
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(124, 77, 255, 0.3)',
                '&:hover': {
                  boxShadow: '0 6px 16px rgba(124, 77, 255, 0.4)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              {createOrderMutation.isPending ? '注文処理中...' : '注文を確定する'}
            </Button>
          </Box>
        </Box>

        {/* 右側: 注文サマリー */}
        <Box
          sx={{
            backgroundColor: 'white',
            borderRadius: 1,
            padding: 3,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            height: 'fit-content',
            position: { xs: 'static', md: 'sticky' },
            top: { xs: 'auto', md: 96 },
            order: { xs: -1, md: 0 },
          }}
        >
          <Typography variant="h6" fontWeight={700} gutterBottom>
            注文内容
          </Typography>

          <Box sx={{ maxHeight: 300, overflowY: 'auto', mb: 2 }}>
            {items.map((item) => (
              <Box
                key={`${item.productId}-${item.product.name}`}
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  py: 1.5,
                  borderBottom: '1px solid #eee',
                  '&:last-child': { borderBottom: 'none' },
                }}
              >
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 10,
                    fontWeight: 500,
                    flexShrink: 0,
                  }}
                >
                  商品画像
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {item.product.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    数量: {item.quantity}
                  </Typography>
                </Box>
                <Typography variant="body2" fontWeight={600} color="primary">
                  ¥{(item.product.price * item.quantity).toLocaleString()}
                </Typography>
              </Box>
            ))}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, fontSize: 14 }}>
            <Typography color="text.secondary">小計（{itemCount}商品）</Typography>
            <Typography fontWeight={600}>¥{subtotal.toLocaleString()}</Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, fontSize: 14 }}>
            <Typography color="text.secondary">送料</Typography>
            <Typography fontWeight={600}>無料</Typography>
          </Box>

          {discount > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, fontSize: 14 }}>
              <Typography color="text.secondary">銀行振込割引 (3.6%)</Typography>
              <Typography fontWeight={600} sx={{ color: '#e65100' }}>
                -¥{discount.toLocaleString()}
              </Typography>
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2 }}>
            <Typography variant="h6" fontWeight={700}>
              合計
            </Typography>
            <Typography variant="h5" fontWeight={700} color="primary">
              ¥{total.toLocaleString()}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
