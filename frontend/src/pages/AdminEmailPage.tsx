import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getEmailTemplates,
  updateEmailTemplate,
  EMAIL_TYPE_LABELS,
  type EmailTemplate,
} from '../services/api/email';

const AdminEmailPage = () => {
  const queryClient = useQueryClient();
  const [snackbar, setSnackbar] = useState('');
  const [drafts, setDrafts] = useState<Record<string, EmailTemplate>>({});

  const { data: templates = [] } = useQuery<EmailTemplate[]>({
    queryKey: ['adminEmailTemplates'],
    queryFn: getEmailTemplates,
    staleTime: 0,
  });

  useEffect(() => {
    const map: Record<string, EmailTemplate> = {};
    templates.forEach((t) => { map[t.id] = { ...t }; });
    setDrafts(map);
  }, [templates]);

  const saveMutation = useMutation({
    mutationFn: (t: EmailTemplate) =>
      updateEmailTemplate(t.id, { name: t.name, subject: t.subject, body: t.body, isActive: t.isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminEmailTemplates'] });
      setSnackbar('保存しました');
    },
    onError: () => setSnackbar('保存に失敗しました'),
  });

  const update = (id: string, patch: Partial<EmailTemplate>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" mb={1}>
        メール設定
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        注文管理の各注文から送信できるメールの文面です。件名・本文で使える差し込み変数：
        <code> {'{{customerName}}'} </code>（お客様名）、
        <code> {'{{orderNumber}}'} </code>（注文番号）、
        <code> {'{{totalAmount}}'} </code>（金額）、
        <code> {'{{bankInfo}}'} </code>（振込先・システム設定から自動）
      </Typography>

      {templates.map((t) => {
        const d = drafts[t.id] || t;
        return (
          <Card key={t.id} variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <Chip label={EMAIL_TYPE_LABELS[t.type] || t.type} color="primary" />
                <Typography variant="h6" fontWeight="bold">{d.name}</Typography>
              </Box>
              <TextField
                label="件名"
                fullWidth
                value={d.subject}
                onChange={(e) => update(t.id, { subject: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                label="本文"
                fullWidth
                multiline
                rows={10}
                value={d.body}
                onChange={(e) => update(t.id, { body: e.target.value })}
                sx={{ mb: 2 }}
              />
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <FormControlLabel
                  control={<Switch checked={d.isActive} onChange={(e) => update(t.id, { isActive: e.target.checked })} />}
                  label="有効"
                />
                <Button variant="contained" onClick={() => saveMutation.mutate(d)} disabled={saveMutation.isPending}>
                  保存
                </Button>
              </Box>
            </CardContent>
          </Card>
        );
      })}

      {snackbar && (
        <Box
          onClick={() => setSnackbar('')}
          sx={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', bgcolor: 'grey.900', color: 'white', px: 3, py: 1.5, borderRadius: 1, zIndex: 2000, cursor: 'pointer' }}
        >
          {snackbar}
        </Box>
      )}
    </Box>
  );
};

export default AdminEmailPage;
