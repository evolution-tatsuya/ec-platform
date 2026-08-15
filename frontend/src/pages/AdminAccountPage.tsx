import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Divider,
} from '@mui/material';
import { Save } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { updateProfile, updatePassword } from '../services/api/users';
import axios from 'axios';

/**
 * 管理者アカウント設定ページ
 * - プロフィール（名前・メール）更新
 * - パスワード変更
 */
export default function AdminAccountPage() {
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? '');
      setEmail(user.email ?? '');
    }
  }, [user]);

  const errMessage = (e: unknown, fallback: string) =>
    axios.isAxiosError(e) ? (e.response?.data?.message ?? fallback) : fallback;

  const handleSaveProfile = async () => {
    setProfileMsg(null);
    setSavingProfile(true);
    try {
      await updateProfile({ name, email });
      setProfileMsg({ type: 'success', text: 'プロフィールを更新しました（反映には再ログインが必要な場合があります）' });
    } catch (e) {
      setProfileMsg({ type: 'error', text: errMessage(e, 'プロフィールの更新に失敗しました') });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setPwMsg(null);
    if (!currentPassword || !newPassword) {
      setPwMsg({ type: 'error', text: '現在のパスワードと新しいパスワードを入力してください' });
      return;
    }
    if (newPassword.length < 8) {
      setPwMsg({ type: 'error', text: '新しいパスワードは8文字以上で入力してください' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: 'error', text: '新しいパスワード（確認）が一致しません' });
      return;
    }
    setSavingPw(true);
    try {
      await updatePassword({ currentPassword, newPassword });
      setPwMsg({ type: 'success', text: 'パスワードを変更しました' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      setPwMsg({ type: 'error', text: errMessage(e, 'パスワードの変更に失敗しました') });
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        アカウント設定
      </Typography>

      {/* プロフィール */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
            基本情報
          </Typography>
          {profileMsg && (
            <Alert severity={profileMsg.type} sx={{ mb: 2 }}>
              {profileMsg.text}
            </Alert>
          )}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              gap: 2,
            }}
          >
            <TextField
              fullWidth
              size="small"
              label="氏名"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextField
              fullWidth
              size="small"
              label="メールアドレス"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Box>
          <Box sx={{ mt: 3 }}>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSaveProfile}
              disabled={savingProfile}
            >
              変更を保存
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* パスワード変更 */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
            パスワード変更
          </Typography>
          {pwMsg && (
            <Alert severity={pwMsg.type} sx={{ mb: 2 }}>
              {pwMsg.text}
            </Alert>
          )}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              gap: 2,
            }}
          >
            <TextField
              fullWidth
              size="small"
              type="password"
              label="現在のパスワード"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              sx={{ gridColumn: { sm: '1 / -1' } }}
            />
            <TextField
              fullWidth
              size="small"
              type="password"
              label="新しいパスワード"
              placeholder="8文字以上"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <TextField
              fullWidth
              size="small"
              type="password"
              label="新しいパスワード（確認）"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Box>
          <Divider sx={{ my: 3 }} />
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleChangePassword}
            disabled={savingPw}
          >
            パスワードを変更
          </Button>
        </CardContent>
      </Card>
    </Container>
  );
}
