import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Tab,
  Tabs,
  TextField,
  Button,
  Typography,
  Checkbox,
  FormControlLabel,
  Link,
  Divider,
  Alert,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Google as GoogleIcon,
  Facebook as FacebookIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

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
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const AuthPage = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [tabValue, setTabValue] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);

  // ログインフォーム
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // 新規登録フォーム
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  // パスワードリセットフォーム
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setLoginError('');
    setRegisterError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      await login(loginEmail, loginPassword);
      navigate('/');
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'ログインに失敗しました');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');

    // バリデーション
    if (registerPassword !== registerConfirmPassword) {
      setRegisterError('パスワードが一致しません');
      return;
    }

    if (registerPassword.length < 8) {
      setRegisterError('パスワードは8文字以上で入力してください');
      return;
    }

    if (!agreeTerms) {
      setRegisterError('利用規約とプライバシーポリシーに同意してください');
      return;
    }

    setRegisterLoading(true);

    try {
      await register(registerEmail, registerPassword, registerName);
      navigate('/');
    } catch (error) {
      setRegisterError(error instanceof Error ? error.message : '登録に失敗しました');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetLoading(true);

    try {
      // 実装時はAPIでパスワードリセットメール送信
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setResetSuccess(true);
      setResetEmail('');
    } catch (error) {
      setResetError(error instanceof Error ? error.message : 'リセットメール送信に失敗しました');
    } finally {
      setResetLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    // 実装時はOAuth認証フローを開始
    alert(`${provider}でログインします\n\n実装時はOAuth認証フローを開始します。`);
  };

  // パスワードリセットフォーム表示
  if (showResetForm) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Container maxWidth="sm">
          <Paper
            elevation={10}
            sx={{
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            {/* ヘッダー */}
            <Box
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                p: 4,
                textAlign: 'center',
              }}
            >
              <Typography variant="h4" fontWeight={700} gutterBottom>
                パスワードリセット
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                登録済みのメールアドレスにリセットリンクを送信します
              </Typography>
            </Box>

            {/* ボディ */}
            <Box sx={{ p: 4 }}>
              <Link
                component="button"
                onClick={() => {
                  setShowResetForm(false);
                  setResetSuccess(false);
                  setResetError('');
                }}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  mb: 3,
                  fontWeight: 600,
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                ← ログインに戻る
              </Link>

              {resetSuccess && (
                <Alert severity="success" sx={{ mb: 3 }}>
                  リセットリンクを送信しました！
                  <br />
                  メールをご確認ください。
                </Alert>
              )}

              {resetError && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {resetError}
                </Alert>
              )}

              <form onSubmit={handleResetPassword}>
                <TextField
                  fullWidth
                  label="メールアドレス"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  helperText="登録済みのメールアドレスを入力してください"
                  sx={{ mb: 3 }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={resetLoading}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    py: 1.5,
                    fontWeight: 700,
                    fontSize: 16,
                  }}
                >
                  {resetLoading ? '送信中...' : 'リセットリンクを送信'}
                </Button>
              </form>
            </Box>

            {/* フッター */}
            <Box
              sx={{
                p: 3,
                backgroundColor: '#f7fafc',
                borderTop: 1,
                borderColor: 'divider',
                textAlign: 'center',
              }}
            >
              <Link href="/" underline="hover">
                トップページに戻る
              </Link>
            </Box>
          </Paper>
        </Container>
      </Box>
    );
  }

  // メイン認証フォーム
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pt: 12,
        pb: 4,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={10}
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          {/* ヘッダー */}
          <Box
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              p: 4,
              textAlign: 'center',
            }}
          >
            <Typography variant="h4" fontWeight={700} gutterBottom>
              {tabValue === 0 ? 'ようこそ' : '新規登録'}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {tabValue === 0
                ? 'アカウントにログインしてください'
                : 'アカウントを作成してお買い物を始めましょう'}
            </Typography>
          </Box>

          {/* ボディ */}
          <Box sx={{ p: 4 }}>
            {/* タブ */}
            <Paper
              elevation={0}
              sx={{
                backgroundColor: '#f7fafc',
                borderRadius: 3,
                p: 0.75,
                mb: 3,
              }}
            >
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                variant="fullWidth"
                sx={{
                  '& .MuiTab-root': {
                    borderRadius: 2,
                    fontWeight: 600,
                    textTransform: 'none',
                    fontSize: 15,
                    color: '#667eea',
                  },
                  '& .Mui-selected': {
                    backgroundColor: 'white',
                    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.2)',
                    color: '#667eea',
                  },
                }}
              >
                <Tab label="ログイン" />
                <Tab label="新規登録" />
              </Tabs>
            </Paper>

            {/* ログインタブ */}
            <TabPanel value={tabValue} index={0}>
              <form onSubmit={handleLogin}>
                <TextField
                  fullWidth
                  label="メールアドレス"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  label="パスワード"
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />

                <Box sx={{ textAlign: 'right', mb: 3 }}>
                  <Link
                    component="button"
                    type="button"
                    onClick={() => setShowResetForm(true)}
                    sx={{ fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                  >
                    パスワードをお忘れの方
                  </Link>
                </Box>

                {loginError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {loginError}
                  </Alert>
                )}

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loginLoading}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    py: 1.5,
                    fontWeight: 700,
                    fontSize: 16,
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                  }}
                >
                  {loginLoading ? 'ログイン中...' : 'ログイン'}
                </Button>
              </form>

              <Divider sx={{ my: 3 }}>または</Divider>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <Button
                  variant="outlined"
                  startIcon={<GoogleIcon />}
                  onClick={() => handleSocialLogin('Google')}
                  sx={{ fontWeight: 600 }}
                >
                  Google
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<FacebookIcon />}
                  onClick={() => handleSocialLogin('Facebook')}
                  sx={{ fontWeight: 600 }}
                >
                  Facebook
                </Button>
              </Box>
            </TabPanel>

            {/* 新規登録タブ */}
            <TabPanel value={tabValue} index={1}>
              <form onSubmit={handleRegister}>
                <TextField
                  fullWidth
                  label="氏名"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  required
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  label="メールアドレス"
                  type="email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  required
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  label="パスワード"
                  type={showPassword ? 'text' : 'password'}
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  required
                  helperText="英数字を含む8文字以上で設定してください"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  label="パスワード（確認）"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={registerConfirmPassword}
                  onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />

                <FormControlLabel
                  control={<Checkbox checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />}
                  label={
                    <Typography variant="body2">
                      <Link href="#" underline="hover">
                        利用規約
                      </Link>
                      と
                      <Link href="#" underline="hover">
                        プライバシーポリシー
                      </Link>
                      に同意します
                    </Typography>
                  }
                  sx={{ mb: 2 }}
                />

                {registerError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {registerError}
                  </Alert>
                )}

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={registerLoading}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    py: 1.5,
                    fontWeight: 700,
                    fontSize: 16,
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                  }}
                >
                  {registerLoading ? '登録中...' : 'アカウント作成'}
                </Button>
              </form>

              <Divider sx={{ my: 3 }}>または</Divider>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <Button
                  variant="outlined"
                  startIcon={<GoogleIcon />}
                  onClick={() => handleSocialLogin('Google')}
                  sx={{ fontWeight: 600 }}
                >
                  Google
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<FacebookIcon />}
                  onClick={() => handleSocialLogin('Facebook')}
                  sx={{ fontWeight: 600 }}
                >
                  Facebook
                </Button>
              </Box>
            </TabPanel>
          </Box>

          {/* フッター */}
          <Box
            sx={{
              p: 3,
              backgroundColor: '#f7fafc',
              borderTop: 1,
              borderColor: 'divider',
              textAlign: 'center',
            }}
          >
            <Link href="/" underline="hover">
              トップページに戻る
            </Link>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default AuthPage;
