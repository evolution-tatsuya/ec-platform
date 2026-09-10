import { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { Save, RestartAlt } from '@mui/icons-material';
import type { Template } from '@pdfme/common';
import PdfmeDesigner from './PdfmeDesigner';
import {
  getDocumentTemplate,
  saveDocumentTemplate,
  resetDocumentTemplate,
} from '../services/api/documentTemplate';

// フロントの 'estimate' はバックの 'quote'
const toApiType = (t: string) => (t === 'estimate' ? 'quote' : t);

interface Props {
  docType: 'invoice' | 'receipt' | 'estimate';
}

const DocumentTemplateEditor = ({ docType }: Props) => {
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  // 選択中の書類が変わるたびDesignerを作り直すためのkey
  const [designerKey, setDesignerKey] = useState(0);
  const currentRef = { current: template };

  useEffect(() => {
    let active = true;
    setLoading(true);
    getDocumentTemplate(toApiType(docType))
      .then(({ template }) => {
        if (!active) return;
        setTemplate(template);
        setDesignerKey((k) => k + 1);
      })
      .catch(() => setMsg('テンプレートの読み込みに失敗しました'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [docType]);

  const handleSave = async () => {
    if (!currentRef.current) return;
    setSaving(true);
    try {
      await saveDocumentTemplate(toApiType(docType), currentRef.current);
      setMsg('テンプレートを保存しました');
    } catch {
      setMsg('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('デフォルトのテンプレートに戻しますか？（保存した内容は失われます）')) return;
    try {
      const def = await resetDocumentTemplate(toApiType(docType));
      setTemplate(def);
      setDesignerKey((k) => k + 1);
      setMsg('デフォルトに戻しました');
    } catch {
      setMsg('リセットに失敗しました');
    }
  };

  if (loading || !template) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" mb={1}>
        左のツールでテキスト・画像・線などを配置し、フィールド名を注文データに合わせると差し込まれます
        （title / companyName / orderNumber / date / customerName / address / items / total）。
      </Typography>
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden', mb: 2 }}>
        <PdfmeDesigner
          key={designerKey}
          template={template}
          onChange={(t) => { currentRef.current = t; }}
        />
      </Box>
      <Box display="flex" justifyContent="space-between">
        <Button startIcon={<RestartAlt />} color="inherit" onClick={handleReset}>
          デフォルトに戻す
        </Button>
        <Button variant="contained" startIcon={<Save />} onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : 'このデザインを保存'}
        </Button>
      </Box>
      {msg && (
        <Box onClick={() => setMsg('')} sx={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', bgcolor: 'grey.900', color: 'white', px: 3, py: 1.5, borderRadius: 1, zIndex: 2000, cursor: 'pointer' }}>
          {msg}
        </Box>
      )}
    </Box>
  );
};

export default DocumentTemplateEditor;
