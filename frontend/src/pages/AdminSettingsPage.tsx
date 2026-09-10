// ===== A-007: システム設定ページ =====
// 目的: サイト全体の設定、書類テンプレート編集

import { useState, useEffect } from 'react';
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
  CircularProgress,
} from '@mui/material';
import {
  Save,
  Upload,
  Palette,
  Email,
  Description,
  Visibility,
  Settings,
} from '@mui/icons-material';
import {
  useAdminSettings,
  useUpdateCompanySettings,
  useUpdatePaymentSettings,
  useUpdateEmailSettings,
  useUpdateDocumentTemplates,
  useUpdateImageOptimization,
} from '../hooks/useSettings';
import { uploadLogo, deleteLogo } from '../services/api/settings';
import DocumentTemplateEditor from '../components/DocumentTemplateEditor';

// 銀行口座種別
const accountTypeOptions = [
  { value: 'checking', label: '普通' },
  { value: 'savings', label: '当座' },
];

const AdminSettingsPage = () => {
  const [tabValue, setTabValue] = useState(0);

  // API取得
  const { data: settings, isLoading, error, refetch: refetchSettings } = useAdminSettings();

  // タブ1: 基本情報
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined); // R2キー
  const [logoDisplayUrl, setLogoDisplayUrl] = useState<string>(''); // プレビュー用署名URL
  const [showShopName, setShowShopName] = useState(true);
  const [logoSize, setLogoSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [postalCode, setPostalCode] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [accountType, setAccountType] = useState<'checking' | 'savings'>('checking');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');

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
  const [stripePublicKey, setStripePublicKey] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');

  // タブ3: メール設定
  const [senderEmail, setSenderEmail] = useState('');
  const [shippingNotificationTemplate, setShippingNotificationTemplate] = useState('');

  // タブ4: 書類テンプレート
  const [selectedDocument, setSelectedDocument] = useState<
    'invoice' | 'receipt' | 'estimate'
  >('invoice');

  // Mutation
  const updateCompanyMutation = useUpdateCompanySettings();
  const updatePaymentMutation = useUpdatePaymentSettings();
  const updateEmailMutation = useUpdateEmailSettings();
  const updateDocumentMutation = useUpdateDocumentTemplates();
  const updateImageMutation = useUpdateImageOptimization();

  // APIデータを取得したらstateに反映
  useEffect(() => {
    if (settings) {
      // 会社情報
      setCompanyName(settings.company.companyName);
      setLogoUrl(settings.company.logoUrl);
      setLogoDisplayUrl(settings.company.logoDisplayUrl || '');
      setShowShopName(settings.company.showShopName !== false);
      setLogoSize(settings.company.logoSize || 'medium');
      setPostalCode(settings.company.postalCode);
      setAddress(settings.company.address);
      setPhone(settings.company.phone);
      setBankName(settings.company.bankName);
      setBranchName(settings.company.branchName);
      setAccountType(settings.company.accountType);
      setAccountNumber(settings.company.accountNumber);
      setAccountHolder(settings.company.accountHolder);

      // デザイン設定
      setPrimaryColor(settings.company.primaryColor);
      setSecondaryColor(settings.company.secondaryColor);

      // 画像最適化設定
      setWebpEnabled(settings.imageOptimization.webpEnabled);
      setCompressionQuality(settings.imageOptimization.compressionQuality);
      setThumbnailSize(settings.imageOptimization.thumbnailSize);

      // 決済設定
      setBankTransferEnabled(settings.payment.bankTransferEnabled);
      setBankTransferDiscountRate(settings.payment.bankTransferDiscountRate * 100);
      setCreditCardEnabled(settings.payment.creditCardEnabled);
      setStripePublicKey(settings.payment.stripePublicKey);
      setStripeSecretKey(settings.payment.stripeSecretKey);

      // メール設定
      setSenderEmail(settings.email.senderEmail);
      setShippingNotificationTemplate(
        settings.email.shippingNotificationTemplate ||
          `お客様

いつもご利用いただき、ありがとうございます。
ご注文商品を発送いたしました。

【注文番号】{{orderNumber}}
【追跡番号】{{trackingNumber}}

配送業者のサイトにて配送状況をご確認いただけます。

引き続きよろしくお願いいたします。`
      );
    }
  }, [settings]);

  // 保存処理
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingLogo(true);
    try {
      const key = await uploadLogo(file);
      setLogoUrl(key);
      // アップロード直後のプレビュー用にローカルURLを表示
      setLogoDisplayUrl(URL.createObjectURL(file));
      // キャッシュを更新（再訪問時にロゴが消えないように）
      await refetchSettings();
      alert('ロゴをアップロードしました。「保存」は不要ですぐに反映されます。');
    } catch {
      alert('ロゴのアップロードに失敗しました');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoDelete = async () => {
    if (!window.confirm('ロゴを削除しますか？')) return;
    try {
      await deleteLogo();
      setLogoUrl(undefined);
      setLogoDisplayUrl('');
      await refetchSettings();
      alert('ロゴを削除しました');
    } catch {
      alert('ロゴの削除に失敗しました');
    }
  };

  const handleSave = async () => {
    try {
      if (tabValue === 0) {
        // タブ1: 基本情報
        await updateCompanyMutation.mutateAsync({
          companyName,
          logoUrl,
          showShopName,
          logoSize,
          postalCode,
          address,
          phone,
          bankName,
          branchName,
          accountType: accountType as 'checking' | 'savings',
          accountNumber,
          accountHolder,
        });
        await updateImageMutation.mutateAsync({
          webpEnabled,
          compressionQuality,
          thumbnailSize,
        });
        alert('基本情報を保存しました');
      } else if (tabValue === 1) {
        // タブ2: 決済設定
        await updatePaymentMutation.mutateAsync({
          bankTransferEnabled,
          bankTransferDiscountRate: bankTransferDiscountRate / 100,
          creditCardEnabled,
          stripePublicKey,
          stripeSecretKey,
        });
        alert('決済設定を保存しました');
      } else if (tabValue === 2) {
        // タブ3: メール設定
        await updateEmailMutation.mutateAsync({
          senderEmail,
          shippingNotificationTemplate,
        });
        alert('メール設定を保存しました');
      } else if (tabValue === 3) {
        // タブ4: 書類テンプレート
        await updateDocumentMutation.mutateAsync({
          invoiceTemplate: settings?.documentTemplates.invoiceTemplate,
          receiptTemplate: settings?.documentTemplates.receiptTemplate,
          estimateTemplate: settings?.documentTemplates.estimateTemplate,
        });
        alert('書類テンプレートを保存しました');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      alert(`保存に失敗しました: ${error.message}`);
    }
  };

  // 書類プレビュー
  const handlePreview = (docType: 'invoice' | 'receipt' | 'estimate') => {
    console.log('書類プレビュー:', docType);
    alert(
      `${docType === 'invoice' ? '納品書' : docType === 'receipt' ? '領収書' : '見積書'}のプレビュー（未実装）`
    );
  };

  // ローディング表示
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // エラー表示
  if (error) {
    return (
      <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
        <Alert severity="error">
          設定の取得に失敗しました: {error.message}
        </Alert>
      </Box>
    );
  }

  // データがない場合
  if (!settings) {
    return (
      <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
        <Alert severity="warning">
          設定データが見つかりません
        </Alert>
      </Box>
    );
  }

  return (
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
                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mb: 2 }}>
                  会社情報
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(12, 1fr)' }, gap: 2 }}>
                  <TextField
                    label="会社名"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    fullWidth
                    sx={{ gridColumn: { xs: '1 / -1', md: 'span 6' } }}
                  />
                  <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 6' }, display: 'flex', alignItems: 'center', gap: 2 }}>
                    {logoDisplayUrl && (
                      <Box
                        component="img"
                        src={logoDisplayUrl}
                        alt="ロゴ"
                        sx={{ height: 56, width: 'auto', maxWidth: 120, objectFit: 'contain', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.5 }}
                      />
                    )}
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<Upload />}
                      disabled={uploadingLogo}
                      sx={{ height: 56, flex: 1 }}
                    >
                      {uploadingLogo ? 'アップロード中...' : logoDisplayUrl ? 'ロゴを変更' : 'ロゴ画像をアップロード'}
                      <input type="file" hidden accept="image/*" onChange={handleLogoUpload} />
                    </Button>
                    {logoDisplayUrl && (
                      <Button variant="text" color="error" onClick={handleLogoDelete} sx={{ height: 56 }}>
                        削除
                      </Button>
                    )}
                  </Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showShopName}
                        onChange={(e) => setShowShopName(e.target.checked)}
                      />
                    }
                    label="ヘッダーにショップ名（会社名）を表示する"
                    sx={{ gridColumn: '1 / -1' }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ gridColumn: '1 / -1', mt: -1 }}>
                    ※ ロゴ画像をアップロードするとヘッダーに表示されます。ショップ名の表示/非表示は上のスイッチで切り替えられます（ロゴのみ・文字のみ・両方表示が可能）。
                  </Typography>
                  {/* ロゴ表示サイズ */}
                  <Box sx={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Typography variant="body2" sx={{ minWidth: 100 }}>ロゴの表示サイズ</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {(['small', 'medium', 'large'] as const).map((sz) => (
                        <Button
                          key={sz}
                          variant={logoSize === sz ? 'contained' : 'outlined'}
                          size="small"
                          onClick={() => setLogoSize(sz)}
                        >
                          {sz === 'small' ? '小' : sz === 'medium' ? '中' : '大'}
                        </Button>
                      ))}
                    </Box>
                    {/* ヘッダー風プレビュー */}
                    {(logoDisplayUrl || showShopName) && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2, px: 2, py: 1, bgcolor: 'primary.main', borderRadius: 1 }}>
                        {logoDisplayUrl && (
                          <Box component="img" src={logoDisplayUrl} alt="preview"
                            sx={{ height: logoSize === 'small' ? 32 : logoSize === 'large' ? 60 : 44, width: 'auto', maxWidth: 160, objectFit: 'contain', display: 'block' }} />
                        )}
                        {(showShopName || !logoDisplayUrl) && (
                          <Typography sx={{ color: 'white', fontWeight: 700, letterSpacing: 1 }}>
                            {companyName || 'ショップ名'}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                  <TextField
                    label="郵便番号"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    fullWidth
                    placeholder="100-0001"
                    sx={{ gridColumn: { xs: '1 / -1', md: 'span 4' } }}
                  />
                  <TextField
                    label="住所"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    fullWidth
                    sx={{ gridColumn: { xs: '1 / -1', md: 'span 8' } }}
                  />
                  <TextField
                    label="電話番号"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    fullWidth
                    placeholder="03-1234-5678"
                    sx={{ gridColumn: { xs: '1 / -1', md: 'span 6' } }}
                  />
                </Box>
              </CardContent>
            </Card>

            {/* 銀行振込先情報 */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mb: 2 }}>
                  銀行振込先情報
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(12, 1fr)' }, gap: 2 }}>
                  <TextField
                    label="銀行名"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    fullWidth
                    sx={{ gridColumn: { xs: '1 / -1', md: 'span 6' } }}
                  />
                  <TextField
                    label="支店名"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    fullWidth
                    sx={{ gridColumn: { xs: '1 / -1', md: 'span 6' } }}
                  />
                  <TextField
                    select
                    label="口座種別"
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as 'checking' | 'savings')}
                    fullWidth
                    SelectProps={{ native: true }}
                    sx={{ gridColumn: { xs: '1 / -1', md: 'span 4' } }}
                  >
                    {accountTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </TextField>
                  <TextField
                    label="口座番号"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    fullWidth
                    sx={{ gridColumn: { xs: '1 / -1', md: 'span 4' } }}
                  />
                  <TextField
                    label="口座名義"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    fullWidth
                    sx={{ gridColumn: { xs: '1 / -1', md: 'span 4' } }}
                  />
                </Box>
              </CardContent>
            </Card>

            {/* デザイン設定 */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mb: 2 }}>
                  <Palette sx={{ mr: 1, verticalAlign: 'middle' }} />
                  デザイン設定
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(12, 1fr)' }, gap: 2 }}>
                  <TextField
                    label="プライマリーカラー"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    fullWidth
                    sx={{ gridColumn: { xs: '1 / -1', md: 'span 6' } }}
                  />
                  <TextField
                    label="セカンダリーカラー"
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    fullWidth
                    sx={{ gridColumn: { xs: '1 / -1', md: 'span 6' } }}
                  />
                  <Button variant="outlined" startIcon={<Upload />} fullWidth sx={{ gridColumn: '1 / -1' }}>
                    ヒーロー画像をアップロード
                  </Button>
                </Box>
              </CardContent>
            </Card>

            {/* 画像最適化設定 */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mb: 2 }}>
                  画像最適化設定
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(12, 1fr)' }, gap: 3 }}>
                  <Box sx={{ gridColumn: '1 / -1' }}>
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
                  </Box>
                  <Box sx={{ gridColumn: '1 / -1' }}>
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
                  </Box>
                  <TextField
                    label="サムネイルサイズ（幅）"
                    type="number"
                    value={thumbnailSize}
                    onChange={(e) => setThumbnailSize(Number(e.target.value))}
                    fullWidth
                    InputProps={{
                      endAdornment: <InputAdornment position="end">px</InputAdornment>,
                    }}
                    sx={{ gridColumn: { xs: '1 / -1', md: 'span 6' } }}
                  />
                </Box>
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
                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mb: 2 }}>
                  銀行振込設定
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(12, 1fr)' }, gap: 3 }}>
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={bankTransferEnabled}
                          onChange={(e) => setBankTransferEnabled(e.target.checked)}
                        />
                      }
                      label="銀行振込を有効化"
                    />
                  </Box>
                  {bankTransferEnabled && (
                    <>
                      <Box sx={{ gridColumn: '1 / -1' }}>
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
                      </Box>
                    </>
                  )}
                </Box>
              </CardContent>
            </Card>

            {/* クレジットカード設定 */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mb: 2 }}>
                  クレジットカード決済設定（Stripe）
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(12, 1fr)' }, gap: 2 }}>
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={creditCardEnabled}
                          onChange={(e) => setCreditCardEnabled(e.target.checked)}
                        />
                      }
                      label="クレジットカード決済を有効化"
                    />
                  </Box>
                  {creditCardEnabled && (
                    <>
                      <TextField
                        label="Stripe公開可能キー"
                        value={stripePublicKey}
                        onChange={(e) => setStripePublicKey(e.target.value)}
                        fullWidth
                        placeholder="pk_live_xxxxxx"
                        sx={{ gridColumn: '1 / -1' }}
                      />
                      <TextField
                        label="Stripeシークレットキー"
                        value={stripeSecretKey}
                        onChange={(e) => setStripeSecretKey(e.target.value)}
                        fullWidth
                        type="password"
                        placeholder="sk_live_xxxxxx"
                        sx={{ gridColumn: '1 / -1' }}
                      />
                      <Box sx={{ gridColumn: '1 / -1' }}>
                        <Alert severity="warning">
                          Stripeのシークレットキーは厳重に管理してください。本番環境ではpk_live_、sk_live_で始まるキーを使用してください。
                        </Alert>
                      </Box>
                    </>
                  )}
                </Box>
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
                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mb: 2 }}>
                  メール設定
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(12, 1fr)' }, gap: 2 }}>
                  <TextField
                    label="送信元メールアドレス"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    fullWidth
                    placeholder="noreply@example.com"
                    helperText="顧客に送信されるメールの送信元アドレスです"
                    sx={{ gridColumn: '1 / -1' }}
                  />
                  <Box sx={{ gridColumn: '1 / -1' }}>
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
                  </Box>
                </Box>
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
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(12, 1fr)' }, gap: 2, mb: 3 }}>
              <Card
                sx={{
                  cursor: 'pointer',
                  border: selectedDocument === 'invoice' ? 2 : 0,
                  borderColor: 'primary.main',
                  gridColumn: { xs: '1 / -1', md: 'span 4' },
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

              <Card
                sx={{
                  cursor: 'pointer',
                  border: selectedDocument === 'receipt' ? 2 : 0,
                  borderColor: 'primary.main',
                  gridColumn: { xs: '1 / -1', md: 'span 4' },
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

              <Card
                sx={{
                  cursor: 'pointer',
                  border: selectedDocument === 'estimate' ? 2 : 0,
                  borderColor: 'primary.main',
                  gridColumn: { xs: '1 / -1', md: 'span 4' },
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
            </Box>

            {/* pdfme Designer（本格デザインエディタ） */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <DocumentTemplateEditor docType={selectedDocument} />
              </CardContent>
            </Card>
          </Box>
        )}
    </Box>
  );
};

export default AdminSettingsPage;
