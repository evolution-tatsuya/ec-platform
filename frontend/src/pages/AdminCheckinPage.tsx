import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  Alert,
  Chip,
  Divider,
  CircularProgress,
  Tabs,
  Tab,
  TextField,
} from '@mui/material';
import {
  QrCodeScanner,
  CheckCircle,
  Error as ErrorIcon,
  Refresh,
  Edit as EditIcon,
} from '@mui/icons-material';
import { Html5Qrcode } from 'html5-qrcode';
import { useMutation } from '@tanstack/react-query';
import { orderAPI } from '../lib/api';

const AdminCheckinPage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string>('');
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
  const [scanError, setScanError] = useState<string>('');
  const [manualOrderNumber, setManualOrderNumber] = useState<string>('');
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isScanning = useRef(false);

  // 受付処理のmutation
  const checkinMutation = useMutation({
    mutationFn: orderAPI.checkinOrder,
    onSuccess: (data) => {
      setOrderDetails(data.order);
      setAlreadyCheckedIn(data.alreadyCheckedIn || false);
      setScanError('');
    },
    onError: (error: any) => {
      setScanError(error.message || '受付処理に失敗しました');
      setOrderDetails(null);
      setAlreadyCheckedIn(false);
    },
  });

  // QRコードスキャナーの開始
  const startScanning = async () => {
    try {
      // 先にscanning状態をtrueにして、DOM要素を描画させる
      setScanning(true);
      setScanError('');

      // DOM要素が描画されるのを待つ
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader');
      }

      const qrCodeScanner = html5QrCodeRef.current;

      // 利用可能なカメラを取得
      const cameras = await Html5Qrcode.getCameras();

      if (!cameras || cameras.length === 0) {
        throw new Error('カメラが見つかりませんでした');
      }

      // 背面カメラを探す（なければ最初のカメラ）
      const backCamera = cameras.find(
        (camera) =>
          camera.label.toLowerCase().includes('back') ||
          camera.label.toLowerCase().includes('rear') ||
          camera.label.toLowerCase().includes('environment')
      );
      const cameraId = backCamera ? backCamera.id : cameras[0].id;

      await qrCodeScanner.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // QRコードが読み取られた時の処理
          if (!isScanning.current && decodedText !== lastScanned) {
            isScanning.current = true;
            setLastScanned(decodedText);
            handleQRCodeScanned(decodedText);
          }
        },
        () => {
          // エラーは無視（スキャン中は常にエラーが出るため）
        }
      );
    } catch (err: any) {
      console.error('Camera error:', err);
      const errorMsg = err?.message || err?.toString() || 'カメラの起動に失敗しました';
      setScanError('カメラの起動に失敗しました: ' + errorMsg);
      setScanning(false); // エラー時はscanning状態を戻す
    }
  };

  // QRコードスキャナーの停止
  const stopScanning = async () => {
    try {
      if (html5QrCodeRef.current && scanning) {
        await html5QrCodeRef.current.stop();
        setScanning(false);
      }
    } catch (err) {
      console.error('Scanner stop error:', err);
    }
  };

  // QRコードがスキャンされた時の処理
  const handleQRCodeScanned = async (orderNumber: string) => {
    try {
      // 受付処理を実行
      await checkinMutation.mutateAsync(orderNumber);

      // スキャナーを一時停止（2秒後に再開）
      await stopScanning();
      setTimeout(() => {
        isScanning.current = false;
        startScanning();
      }, 2000);
    } catch (error) {
      isScanning.current = false;
    }
  };

  // 手動入力での受付処理
  const handleManualCheckin = async () => {
    if (!manualOrderNumber.trim()) {
      setScanError('注文番号を入力してください');
      return;
    }

    try {
      setScanError('');
      await checkinMutation.mutateAsync(manualOrderNumber.trim());
    } catch (error) {
      // エラーはmutationのonErrorで処理される
    }
  };

  // リセット
  const handleReset = () => {
    setOrderDetails(null);
    setAlreadyCheckedIn(false);
    setScanError('');
    setLastScanned('');
    setManualOrderNumber('');
    isScanning.current = false;
  };

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && scanning) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, [scanning]);

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
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        pt: 12,
        pb: 4,
      }}
    >
      <Container maxWidth="md">
        {/* ページヘッダー */}
        <Paper elevation={3} sx={{ p: 4, mb: 3, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <QrCodeScanner sx={{ fontSize: 40, color: '#667eea' }} />
            <Box>
              <Typography variant="h4" fontWeight={700}>
                受付QRスキャナー
              </Typography>
              <Typography variant="body2" color="text.secondary">
                注文のQRコードをスキャンして受付処理を行います
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* スキャナー */}
        <Paper elevation={3} sx={{ p: 4, mb: 3, borderRadius: 3 }}>
          {/* タブ */}
          <Tabs
            value={tabValue}
            onChange={(_e, newValue) => setTabValue(newValue)}
            centered
            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab icon={<QrCodeScanner />} label="QRスキャン" />
            <Tab icon={<EditIcon />} label="手動入力" />
          </Tabs>

          {/* QRスキャンタブ */}
          {tabValue === 0 && (
            <Box sx={{ textAlign: 'center' }}>
              {!scanning ? (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    カメラでQRコードをスキャン
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<QrCodeScanner />}
                    onClick={startScanning}
                    sx={{
                      mt: 2,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      px: 4,
                      py: 1.5,
                    }}
                  >
                    スキャン開始
                  </Button>
                </Box>
              ) : (
                <Box>
                  <div
                    id="qr-reader"
                    style={{
                      width: '100%',
                      maxWidth: '500px',
                      margin: '0 auto',
                      borderRadius: '8px',
                      overflow: 'hidden',
                    }}
                  />
                  <Button
                    variant="outlined"
                    onClick={stopScanning}
                    sx={{ mt: 2 }}
                  >
                    スキャン停止
                  </Button>
                </Box>
              )}
            </Box>
          )}

          {/* 手動入力タブ */}
          {tabValue === 1 && (
            <Box sx={{ maxWidth: 500, mx: 'auto' }}>
              <Typography variant="h6" gutterBottom textAlign="center">
                注文番号を入力して受付
              </Typography>
              <TextField
                fullWidth
                label="注文番号"
                placeholder="ORD-1769503780934-440"
                value={manualOrderNumber}
                onChange={(e) => setManualOrderNumber(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleManualCheckin();
                  }
                }}
                sx={{ mt: 2, mb: 2 }}
              />
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleManualCheckin}
                disabled={checkinMutation.isPending || !manualOrderNumber.trim()}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  py: 1.5,
                }}
              >
                受付処理
              </Button>
            </Box>
          )}
        </Paper>

        {/* エラー表示 */}
        {scanError && (
          <Alert
            severity="error"
            icon={<ErrorIcon />}
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={handleReset}>
                リセット
              </Button>
            }
          >
            {scanError}
          </Alert>
        )}

        {/* 受付処理中 */}
        {checkinMutation.isPending && (
          <Paper elevation={3} sx={{ p: 4, mb: 3, borderRadius: 3, textAlign: 'center' }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="h6">受付処理中...</Typography>
          </Paper>
        )}

        {/* 受付成功 */}
        {orderDetails && !checkinMutation.isPending && (
          <Paper
            elevation={3}
            sx={{
              p: 4,
              mb: 3,
              borderRadius: 3,
              border: alreadyCheckedIn ? '2px solid #f59e0b' : '2px solid #48bb78',
              backgroundColor: alreadyCheckedIn ? '#fffbeb' : '#f0fff4',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <CheckCircle sx={{ fontSize: 48, color: alreadyCheckedIn ? '#f59e0b' : '#48bb78' }} />
              <Box>
                <Typography variant="h5" fontWeight={700} color={alreadyCheckedIn ? '#d97706' : '#2f855a'}>
                  {alreadyCheckedIn ? '既に受付済み' : '受付完了'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  以下の注文内容を確認して商品をお渡しください
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* 注文情報 */}
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  注文番号: {orderDetails.orderNumber}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  注文日時: {formatDate(orderDetails.createdAt)}
                </Typography>
                {orderDetails.checkedInAt && (
                  <Chip
                    label={`受付日時: ${formatDate(orderDetails.checkedInAt)}`}
                    color="success"
                    size="small"
                    sx={{ mt: 1 }}
                  />
                )}
              </CardContent>
            </Card>

            {/* 注文商品 */}
            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ mt: 3 }}>
              商品一覧
            </Typography>
            {orderDetails.items.map((item: any, index: number) => (
              <Card key={index} variant="outlined" sx={{ mb: 1 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        {item.product.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        数量: {item.quantity}個
                      </Typography>
                    </Box>
                    <Typography variant="h6" fontWeight={700} color="primary">
                      ¥{(item.price * item.quantity).toLocaleString()}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight={700}>
                合計金額
              </Typography>
              <Typography variant="h5" fontWeight={700} color="primary">
                ¥{orderDetails.totalAmount.toLocaleString()}
              </Typography>
            </Box>

            <Button
              variant="contained"
              fullWidth
              size="large"
              startIcon={<Refresh />}
              onClick={handleReset}
              sx={{
                mt: 3,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              次の受付を開始
            </Button>
          </Paper>
        )}
      </Container>
    </Box>
  );
};

export default AdminCheckinPage;
