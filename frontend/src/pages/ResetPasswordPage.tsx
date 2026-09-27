import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  TextField,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff, LockReset } from '@mui/icons-material';
import { authAPI } from '../lib/api';

/**
 * パスワード再設定ページ（メールのリセットリンクから遷移）
 * URL: /auth/reset-password?token=xxxx
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('パスワードは8文字以上で入力してください');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    setLoading(true);
    try {
      await authAPI.confirmPasswordReset(token, newPassword);
      setSuccess(true);
      // 3秒後にログイン画面へ
      setTimeout(() => navigate('/auth'), 3000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'パスワードの再設定に失敗しました。リンクの有効期限が切れている可能性があります。'
      );
    } finally {
      setLoading(false);
    }
  };

  // トークンが無い場合
  if (!token) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Card>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Alert severity="error">
              無効なリンクです。パスワード再設定をもう一度お試しください。
            </Alert>
            <Button sx={{ mt: 3 }} variant="contained" onClick={() => navigate('/auth')}>
              ログイン画面へ
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Card>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <LockReset sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h5" fontWeight="bold">
              新しいパスワードの設定
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              新しいパスワードを入力してください。
            </Typography>
          </Box>

          {success ? (
            <Alert severity="success">
              パスワードを再設定しました。ログイン画面に移動します...
            </Alert>
          ) : (
            <Box component="form" onSubmit={handleSubmit}>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <TextField
                fullWidth
                label="新しいパスワード"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                margin="normal"
                helperText="8文字以上"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="新しいパスワード（確認）"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                margin="normal"
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mt: 3 }}
              >
                {loading ? '設定中...' : 'パスワードを再設定する'}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
