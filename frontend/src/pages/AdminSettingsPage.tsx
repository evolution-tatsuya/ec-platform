// ===== A-007: システム設定ページ =====
// 目的: サイト全体の設定、書類テンプレート編集

import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Slider,
  Card,
  CardContent,
  Tabs,
  Tab,
  Divider,
  InputAdornment,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  Save,
  Upload,
  Palette,
  Email,
  Description,
  Visibility,
  Settings,
} from '@mui/icons-material';
import { Header } from '../components';

// 銀行口座種別
const accountTypeOptions = [
  { value: 'checking', label: '普通' },
  { value: 'savings', label: '当座' },
];

const AdminSettingsPage = () => {
  const [tabValue, setTabValue] = useState(0);

  // タブ1: 基本情報
  const [companyName, setCompanyName] = useState('株式会社サンプル');
  const [postalCode, setPostalCode] = useState('100-0001');
  const [address, setAddress] = useState('東京都千代田区千代田1-1-1');
  const [phone, setPhone] = useState('03-1234-5678');
  const [bankName, setBankName] = useState('サンプル銀行');
  const [branchName, setBranchName] = useState('渋谷支店');
  const [accountType, setAccountType] = useState('checking');
  const [accountNumber, setAccountNumber] = useState('1234567');
  const [accountHolder, setAccountHolder] = useState('カ）サンプル');

  // デザイン設定
  const [primaryColor, setPrimaryColor] = useState('#1976d2');
  const [secondaryColor, setSecondaryColor] = useState('#dc004e');

  // 画像最適化設定
  const [webpEnabled, setWebpEnabled] = useState(true);
  const [compressionQuality, setCompressionQuality] = useState(80);
  const [thumbnailSize, setThumbnailSize] = useState(200);

  // タブ2: 決済設定
  const [bankTransferEnabled, setBankTransferEnabled] = useState(true);
  const [bankTransferDiscountRate, setBankTransferDiscountRate] = useState(3.6);
  const [creditCardEnabled, setCreditCardEnabled] = useState(true);
  const [stripePublicKey, setStripePublicKey] = useState('pk_test_xxxxxx');
  const [stripeSecretKey, setStripeSecretKey] = useState('sk_test_xxxxxx');

  // タブ3: メール設定
  const [senderEmail, setSenderEmail] = useState('noreply@example.com');
  const [shippingNotificationTemplate, setShippingNotificationTemplate] = useState(
    `お客様

いつもご利用いただき、ありがとうございます。
ご注文商品を発送いたしました。

【注文番号】{{orderNumber}}
【追跡番号】{{trackingNumber}}

配送業者のサイトにて配送状況をご確認いただけます。

引き続きよろしくお願いいたします。`
  );

  // タブ4: 書類テンプレート
  const [selectedDocument, setSelectedDocument] = useState<
    'invoice' | 'receipt' | 'estimate'
  >('invoice');

  // 保存処理
  const handleSave = () => {
    console.log('設定を保存しました（ダミー実装）');
    alert('設定を保存しました');
  };

  // 書類プレビュー
  const handlePreview = (docType: 'invoice' | 'receipt' | 'estimate') => {
    console.log('書類プレビュー:', docType);
    alert(
      `${docType === 'invoice' ? '納品書' : docType === 'receipt' ? '領収書' : '見積書'}のプレビュー（未実装）`
    );
  };

  return (
    <>
      <Header />
      <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          システム設定
        </Typography>

        {/* タブ */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="基本情報" icon={<Settings />} iconPosition="start" />
            <Tab label="決済設定" icon={<Settings />} iconPosition="start" />
            <Tab label="メール設定" icon={<Email />} iconPosition="start" />
            <Tab label="書類テンプレート" icon={<Description />} iconPosition="start" />
          </Tabs>
        </Box>

        {/* タブ1: 基本情報 */}
        {tabValue === 0 && (
          <Box>
            {/* 会社情報 */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  会社情報
                </Typography>
                <Grid container spacing={2}>
                  <Grid xs={12} md={6}>
                    <TextField
                      label="会社名"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid xs={12} md={6}>
                    <Button
                      variant="outlined"
                      startIcon={<Upload />}
                      fullWidth
                      sx={{ height: 56 }}
                    >
                      ロゴ画像をアップロード
                    </Button>
                  </Grid>
                  <Grid xs={12} md={4}>
                    <TextField
                      label="郵便番号"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      fullWidth
                      placeholder="100-0001"
                    />
                  </Grid>
                  <Grid xs={12} md={8}>
                    <TextField
                      label="住所"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid xs={12} md={6}>
                    <TextField
                      label="電話番号"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      fullWidth
                      placeholder="03-1234-5678"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* 銀行振込先情報 */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  銀行振込先情報
                </Typography>
                <Grid container spacing={2}>
                  <Grid xs={12} md={6}>
                    <TextField
                      label="銀行名"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid xs={12} md={6}>
                    <TextField
                      label="支店名"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid xs={12} md={4}>
                    <TextField
                      select
                      label="口座種別"
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value)}
                      fullWidth
                      SelectProps={{ native: true }}
                    >
                      {accountTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid xs={12} md={4}>
                    <TextField
                      label="口座番号"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid xs={12} md={4}>
                    <TextField
                      label="口座名義"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value)}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* デザイン設定 */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  <Palette sx={{ mr: 1, verticalAlign: 'middle' }} />
                  デザイン設定
                </Typography>
                <Grid container spacing={2}>
                  <Grid xs={12} md={6}>
                    <TextField
                      label="プライマリーカラー"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid xs={12} md={6}>
                    <TextField
                      label="セカンダリーカラー"
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid xs={12}>
                    <Button variant="outlined" startIcon={<Upload />} fullWidth>
                      ヒーロー画像をアップロード
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* 画像最適化設定 */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  画像最適化設定
                </Typography>
                <Grid container spacing={3}>
                  <Grid xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={webpEnabled}
                          onChange={(e) => setWebpEnabled(e.target.checked)}
                        />
                      }
                      label="WebP自動変換を有効化"
                    />
                    <Typography variant="caption" color="text.secondary" display="block" ml={4}>
                      アップロード時に自動的にWebP形式に変換し、ファイルサイズを削減します
                    </Typography>
                  </Grid>
                  <Grid xs={12}>
                    <Typography variant="body2" gutterBottom>
                      圧縮品質: {compressionQuality}%
                    </Typography>
                    <Slider
                      value={compressionQuality}
                      onChange={(_, value) => setCompressionQuality(value as number)}
                      min={60}
                      max={100}
                      step={5}
                      marks
                      valueLabelDisplay="auto"
                    />
                    <Typography variant="caption" color="text.secondary">
                      品質が低いほどファイルサイズが小さくなりますが、画質が劣化します
                    </Typography>
                  </Grid>
                  <Grid xs={12} md={6}>
                    <TextField
                      label="サムネイルサイズ（幅）"
                      type="number"
                      value={thumbnailSize}
                      onChange={(e) => setThumbnailSize(Number(e.target.value))}
                      fullWidth
                      InputProps={{
                        endAdornment: <InputAdornment position="end">px</InputAdornment>,
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* 保存ボタン */}
            <Box display="flex" justifyContent="flex-end">
              <Button variant="contained" size="large" startIcon={<Save />} onClick={handleSave}>
                設定を保存
              </Button>
            </Box>
          </Box>
        )}

        {/* タブ2: 決済設定 */}
        {tabValue === 1 && (
          <Box>
            {/* 銀行振込設定 */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  銀行振込設定
                </Typography>
                <Grid container spacing={3}>
                  <Grid xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={bankTransferEnabled}
                          onChange={(e) => setBankTransferEnabled(e.target.checked)}
                        />
                      }
                      label="銀行振込を有効化"
                    />
                  </Grid>
                  {bankTransferEnabled && (
                    <>
                      <Grid xs={12}>
                        <Typography variant="body2" gutterBottom>
                          銀行振込割引率: {bankTransferDiscountRate}%
                        </Typography>
                        <Slider
                          value={bankTransferDiscountRate}
                          onChange={(_, value) => setBankTransferDiscountRate(value as number)}
                          min={0}
                          max={10}
                          step={0.1}
                          marks={[
                            { value: 0, label: '0%' },
                            { value: 3.6, label: '3.6%（デフォルト）' },
                            { value: 10, label: '10%' },
                          ]}
                          valueLabelDisplay="auto"
                        />
                        <Alert severity="info" sx={{ mt: 2 }}>
                          銀行振込を選択した顧客に対して割引を適用します。クレジットカード決済手数料との差額を還元できます。
                        </Alert>
                      </Grid>
                    </>
                  )}
                </Grid>
              </CardContent>
            </Card>

            {/* クレジットカード設定 */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  クレジットカード決済設定（Stripe）
                </Typography>
                <Grid container spacing={2}>
                  <Grid xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={creditCardEnabled}
                          onChange={(e) => setCreditCardEnabled(e.target.checked)}
                        />
                      }
                      label="クレジットカード決済を有効化"
                    />
                  </Grid>
                  {creditCardEnabled && (
                    <>
                      <Grid xs={12}>
                        <TextField
                          label="Stripe公開可能キー"
                          value={stripePublicKey}
                          onChange={(e) => setStripePublicKey(e.target.value)}
                          fullWidth
                          placeholder="pk_live_xxxxxx"
                        />
                      </Grid>
                      <Grid xs={12}>
                        <TextField
                          label="Stripeシークレットキー"
                          value={stripeSecretKey}
                          onChange={(e) => setStripeSecretKey(e.target.value)}
                          fullWidth
                          type="password"
                          placeholder="sk_live_xxxxxx"
                        />
                      </Grid>
                      <Grid xs={12}>
                        <Alert severity="warning">
                          Stripeのシークレットキーは厳重に管理してください。本番環境ではpk_live_、sk_live_で始まるキーを使用してください。
                        </Alert>
                      </Grid>
                    </>
                  )}
                </Grid>
              </CardContent>
            </Card>

            {/* 保存ボタン */}
            <Box display="flex" justifyContent="flex-end">
              <Button variant="contained" size="large" startIcon={<Save />} onClick={handleSave}>
                設定を保存
              </Button>
            </Box>
          </Box>
        )}

        {/* タブ3: メール設定 */}
        {tabValue === 2 && (
          <Box>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  メール設定
                </Typography>
                <Grid container spacing={2}>
                  <Grid xs={12}>
                    <TextField
                      label="送信元メールアドレス"
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      fullWidth
                      placeholder="noreply@example.com"
                      helperText="顧客に送信されるメールの送信元アドレスです"
                    />
                  </Grid>
                  <Grid xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                      発送通知メールテンプレート
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                      使用可能な変数: {'{'}
                      {'{'}orderNumber{'}'}{'}'}、{'{'}
                      {'{'}trackingNumber{'}'}{'}'}
                    </Typography>
                    <TextField
                      value={shippingNotificationTemplate}
                      onChange={(e) => setShippingNotificationTemplate(e.target.value)}
                      multiline
                      rows={12}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* 保存ボタン */}
            <Box display="flex" justifyContent="flex-end">
              <Button variant="contained" size="large" startIcon={<Save />} onClick={handleSave}>
                設定を保存
              </Button>
            </Box>
          </Box>
        )}

        {/* タブ4: 書類テンプレート */}
        {tabValue === 3 && (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              書類テンプレートはpdfme Designer UIを使用して編集します。
              プレビュー機能で確認後、保存してください。
            </Alert>

            {/* 書類種別選択 */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid xs={12} md={4}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    border: selectedDocument === 'invoice' ? 2 : 0,
                    borderColor: 'primary.main',
                  }}
                  onClick={() => setSelectedDocument('invoice')}
                >
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" align="center">
                      納品書
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center" mt={1}>
                      商品発送時に送付
                    </Typography>
                    <Box mt={2} display="flex" gap={1}>
                      <Button
                        variant="outlined"
                        size="small"
                        fullWidth
                        startIcon={<Visibility />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview('invoice');
                        }}
                      >
                        プレビュー
                      </Button>
                      <Button variant="outlined" size="small" fullWidth>
                        編集
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid xs={12} md={4}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    border: selectedDocument === 'receipt' ? 2 : 0,
                    borderColor: 'primary.main',
                  }}
                  onClick={() => setSelectedDocument('receipt')}
                >
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" align="center">
                      領収書
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center" mt={1}>
                      入金確認後に発行
                    </Typography>
                    <Box mt={2} display="flex" gap={1}>
                      <Button
                        variant="outlined"
                        size="small"
                        fullWidth
                        startIcon={<Visibility />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview('receipt');
                        }}
                      >
                        プレビュー
                      </Button>
                      <Button variant="outlined" size="small" fullWidth>
                        編集
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid xs={12} md={4}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    border: selectedDocument === 'estimate' ? 2 : 0,
                    borderColor: 'primary.main',
                  }}
                  onClick={() => setSelectedDocument('estimate')}
                >
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" align="center">
                      見積書
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center" mt={1}>
                      問い合わせ時に発行
                    </Typography>
                    <Box mt={2} display="flex" gap={1}>
                      <Button
                        variant="outlined"
                        size="small"
                        fullWidth
                        startIcon={<Visibility />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview('estimate');
                        }}
                      >
                        プレビュー
                      </Button>
                      <Button variant="outlined" size="small" fullWidth>
                        編集
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* pdfme Designer プレースホルダー */}
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50' }}>
                <Description sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" align="center" color="text.secondary" gutterBottom>
                  pdfme Designer UI
                </Typography>
                <Typography variant="body2" align="center" color="text.secondary">
                  {selectedDocument === 'invoice'
                    ? '納品書テンプレート編集画面（未実装）'
                    : selectedDocument === 'receipt'
                      ? '領収書テンプレート編集画面（未実装）'
                      : '見積書テンプレート編集画面（未実装）'}
                </Typography>
                <Typography variant="caption" align="center" color="text.secondary" display="block" mt={2}>
                  実装時にpdfme/uiのDesignerコンポーネントを配置します
                </Typography>
              </CardContent>
            </Card>

            {/* 保存ボタン */}
            <Box display="flex" justifyContent="flex-end">
              <Button variant="contained" size="large" startIcon={<Save />} onClick={handleSave}>
                テンプレートを保存
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </>
  );
};

export default AdminSettingsPage;
