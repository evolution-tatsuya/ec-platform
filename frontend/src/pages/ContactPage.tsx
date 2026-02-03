// ========================================
// P-011: お問い合わせページ
// ========================================
// 機能:
// - 問い合わせフォーム（名前、メール、注文番号、質問内容）
// - AI自動回答表示（Gemini 2.0 Flash / GPT-4o mini）
// - 満足度フィードバック（解決した/解決しなかった）
// - エスカレーション（オペレーターに問い合わせる）
// - 過去の問い合わせ履歴（ログイン時のみ）
//
// 権限: ゲスト可（ログイン推奨）
// ========================================

import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type {
  InquiryRequest,
  InquiryResponse,
  InquiryHistory,
  InquiryStatus,
} from '../types';
import {
  submitInquiry,
  submitFeedback,
  escalateInquiry,
  getInquiryHistory,
} from '../services/mock/InquiryService';

const ContactPage = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // フォーム状態
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [question, setQuestion] = useState('');

  // アカウントなしで問い合わせ
  const [allowGuestInquiry, setAllowGuestInquiry] = useState(false);

  // AI回答状態
  const [inquiryResponse, setInquiryResponse] = useState<InquiryResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // エスカレーション状態
  const [isEscalated, setIsEscalated] = useState(false);

  // 過去の問い合わせ履歴
  const [history, setHistory] = useState<InquiryHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // FAQ検索
  const [faqSearch, setFaqSearch] = useState('');

  // FAQデータ
  const faqData = [
    {
      category: '📦 注文・配送について',
      items: [
        {
          question: '注文後、どのくらいで届きますか？',
          answer:
            '通常、ご注文から2〜3営業日で発送いたします。お届けまでは発送後1〜2日程度です。お急ぎの場合は、注文時に「お急ぎ便」をご選択ください（追加料金500円）。',
        },
        {
          question: '配送先住所を変更したい',
          answer:
            '発送前であれば変更可能です。マイページの「注文履歴」から該当注文を選択し、「配送先変更」ボタンをクリックしてください。発送済みの場合は変更できません。',
        },
        {
          question: '配送業者はどこですか？',
          answer:
            '配送業者は佐川急便、ヤマト運輸、日本郵便のいずれかです。商品発送時にお送りする「発送完了メール」に配送業者と追跡番号が記載されます。',
        },
      ],
    },
    {
      category: '🔄 返品・交換について',
      items: [
        {
          question: '返品・交換はできますか？',
          answer:
            '商品到着後7日以内であれば、未開封・未使用に限り返品・交換が可能です。マイページの「注文履歴」から返品申請を行ってください。',
        },
        {
          question: '返品送料は誰が負担しますか？',
          answer:
            '初期不良や誤配送の場合は当社が負担します。お客様都合の返品の場合は、お客様のご負担となります。',
        },
      ],
    },
    {
      category: '💳 お支払いについて',
      items: [
        {
          question: '利用可能な支払い方法は？',
          answer:
            'クレジットカード（Visa, MasterCard, JCB, Amex）、銀行振込、コンビニ払いがご利用いただけます。銀行振込の場合、3.6%の割引が適用されます。',
        },
        {
          question: '領収書は発行できますか？',
          answer:
            'はい、可能です。マイページの「注文履歴」から該当注文を選択し、「領収書発行」ボタンをクリックしてください。PDFでダウンロードできます。',
        },
      ],
    },
    {
      category: '👤 会員登録について',
      items: [
        {
          question: '会員登録は必須ですか？',
          answer:
            '会員登録なしでもゲスト購入が可能です。ただし、会員登録すると注文履歴の確認、ポイント利用、お気に入り機能などがご利用いただけます。',
        },
        {
          question: 'パスワードを忘れました',
          answer:
            'ログインページの「パスワードを忘れた方」リンクから、登録メールアドレスを入力してください。パスワード再設定用のメールをお送りします。',
        },
      ],
    },
    {
      category: '❓ その他',
      items: [
        {
          question: 'ポイントの使い方は？',
          answer:
            '購入金額の1%がポイントとして付与されます。次回以降のお買い物時、1ポイント=1円として使用できます。有効期限は最終購入日から1年間です。',
        },
        {
          question: 'メールが届きません',
          answer:
            '迷惑メールフォルダに振り分けられている可能性があります。また、携帯キャリアメールの場合、ドメイン指定受信の設定で「@ec-platform.com」を許可してください。',
        },
      ],
    },
  ];

  // FAQ検索フィルタ
  const filteredFaqData = faqData
    .map((category) => ({
      ...category,
      items: category.items.filter(
        (item) =>
          faqSearch === '' ||
          item.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
          item.answer.toLowerCase().includes(faqSearch.toLowerCase())
      ),
    }))
    .filter((category) => category.items.length > 0);

  // ログイン時に自動入力
  useEffect(() => {
    if (isAuthenticated && user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [isAuthenticated, user]);

  // 過去の問い合わせ履歴取得（ログイン時のみ）
  useEffect(() => {
    if (isAuthenticated && user) {
      loadHistory();
    }
  }, [isAuthenticated, user]);

  const loadHistory = async () => {
    if (!user) return;

    setIsLoadingHistory(true);
    try {
      const data = await getInquiryHistory(user.id);
      setHistory(data);
    } catch (error) {
      console.error('履歴取得エラー:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // フォーム送信（AI回答取得 or ゲスト送信）
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setIsSubmitting(true);

    try {
      const data: InquiryRequest = {
        name,
        email,
        question,
      };

      const response = await submitInquiry(data, isAuthenticated);

      // ゲスト問い合わせの場合はAI回答なし
      if (!isAuthenticated) {
        alert('お問い合わせを受け付けました。ご入力いただいたメールアドレス宛に確認メールを送信しました。オペレーターが確認次第、ご返信いたします。');
        // フォームリセット
        setName('');
        setEmail('');
        setOrderNumber('');
        setQuestion('');
        return;
      }

      // ログイン時のみAI回答を表示
      setInquiryResponse(response);

      // 自動エスカレーションの場合
      if (response.inquiry.isEscalated) {
        setIsEscalated(true);
      }

      // スムーズスクロール
      setTimeout(() => {
        const aiResponseElement = document.getElementById('aiResponse');
        if (aiResponseElement) {
          aiResponseElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 満足度フィードバック
  const handleFeedback = async (isSatisfied: boolean) => {
    if (!inquiryResponse) return;

    try {
      await submitFeedback(inquiryResponse.inquiry.id, isSatisfied);

      if (isSatisfied) {
        alert('フィードバックありがとうございます！問い合わせを解決済みとして保存しました。');
        // フォームリセット
        setName(isAuthenticated && user ? user.name : '');
        setEmail(isAuthenticated && user ? user.email : '');
        setOrderNumber('');
        setQuestion('');
        setInquiryResponse(null);
        setIsEscalated(false);
        // 履歴再読み込み
        if (isAuthenticated && user) {
          loadHistory();
        }
      } else {
        // エスカレーション表示
        setIsEscalated(true);
      }
    } catch (error) {
      console.error('フィードバック送信エラー:', error);
    }
  };

  // オペレーターエスカレーション
  const handleEscalate = async () => {
    if (!inquiryResponse) return;

    try {
      await escalateInquiry(inquiryResponse.inquiry.id);
      alert(
        'オペレーターにエスカレーションしました。\n\n担当者から24時間以内にご連絡いたします。\nメールをご確認ください。'
      );
      // フォームリセット
      setName(isAuthenticated && user ? user.name : '');
      setEmail(isAuthenticated && user ? user.email : '');
      setOrderNumber('');
      setQuestion('');
      setInquiryResponse(null);
      setIsEscalated(false);
      // 履歴再読み込み
      if (isAuthenticated && user) {
        loadHistory();
      }
    } catch (error) {
      console.error('エスカレーションエラー:', error);
    }
  };

  // ステータス表示用関数
  const getStatusLabel = (status: InquiryStatus) => {
    switch (status) {
      case 'AI_RESOLVED':
        return { label: '解決済み', color: 'success' as const };
      case 'PENDING':
        return { label: 'オペレーター対応中', color: 'warning' as const };
      case 'RESOLVED':
        return { label: '解決済み', color: 'success' as const };
      default:
        return { label: '不明', color: 'default' as const };
    }
  };

  return (
    <Box sx={{ bgcolor: '#f5f5f5', minHeight: 'calc(100vh - 64px)', pt: 12, pb: 4 }}>
      <Container maxWidth="md">
        {/* ページタイトル */}
        <Typography variant="h4" fontWeight={500} gutterBottom>
          お問い合わせ
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          まずはよくある質問をご確認ください。解決しない場合はAIまたはオペレーターにおつなぎします。
        </Typography>

        {/* よくある質問（FAQ） */}
        <Paper
          elevation={1}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" fontWeight={500} gutterBottom>
            よくある質問（FAQ）
          </Typography>

          {/* FAQ検索 */}
          <TextField
            fullWidth
            placeholder="キーワードで検索..."
            value={faqSearch}
            onChange={(e) => setFaqSearch(e.target.value)}
            sx={{ mb: 3 }}
            size="small"
          />

          {/* FAQカテゴリー */}
          <Box>
            {filteredFaqData.length === 0 && faqSearch !== '' ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                検索結果が見つかりませんでした
              </Typography>
            ) : (
              filteredFaqData.map((category, categoryIndex) => (
                <Box key={categoryIndex} sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                    {category.category}
                  </Typography>
                  {category.items.map((item, itemIndex) => (
                    <Accordion
                      key={itemIndex}
                      sx={{
                        mb: 1,
                        '&:before': { display: 'none' },
                        boxShadow: 'none',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                      defaultExpanded={categoryIndex === 0 && itemIndex === 0}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                          '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.02)' },
                        }}
                      >
                        <Typography variant="body2" fontWeight={500}>
                          {item.question}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails sx={{ pt: 0 }}>
                        <Typography variant="body2" color="text.secondary">
                          {item.answer}
                        </Typography>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Box>
              ))
            )}
          </Box>

          {/* お問い合わせフォームへのリンク */}
          <Box
            sx={{
              mt: 3,
              p: 2,
              bgcolor: '#f0f0f0',
              borderRadius: 1,
              textAlign: 'center',
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              FAQで解決しませんでしたか？
            </Typography>
            <Button
              variant="contained"
              onClick={() => {
                const formElement = document.getElementById('contactForm');
                if (formElement) {
                  formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              sx={{ fontWeight: 700 }}
            >
              お問い合わせフォームへ
            </Button>
          </Box>
        </Paper>

        {/* 問い合わせフォーム */}
        <Paper
          id="contactForm"
          elevation={1}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" fontWeight={500} gutterBottom>
            質問内容を入力
          </Typography>

          {/* 未ログイン時のメッセージとチェックボックス */}
          {!isAuthenticated && (
            <Box sx={{ mt: 2, mb: 3 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                問い合わせを送信するにはログインが必要です
              </Alert>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  onClick={() => navigate('/auth/login')}
                  sx={{ fontWeight: 700 }}
                >
                  ログイン
                </Button>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={allowGuestInquiry}
                      onChange={(e) => setAllowGuestInquiry(e.target.checked)}
                    />
                  }
                  label="アカウントなしで問い合わせ（履歴は保存されません）"
                />
              </Box>
            </Box>
          )}

          {/* アカウントなしで問い合わせ時の注意 */}
          {!isAuthenticated && allowGuestInquiry && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              履歴は保存されず、回答はメールで送信されます
            </Alert>
          )}

          {/* フォーム表示条件: ログイン済み or アカウントなしチェックON */}
          {(isAuthenticated || allowGuestInquiry) && (
            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="お名前"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="山田太郎"
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="メールアドレス"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="example@email.com"
                helperText={isAuthenticated ? 'ログイン時は自動入力されます' : ''}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="注文番号（任意）"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="ORD-20251223-XXXX"
                helperText="注文に関するお問い合わせの場合はご入力ください"
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="質問内容"
                multiline
                rows={5}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
                placeholder="例: 注文した商品の配送状況を教えてください"
                sx={{ mb: 3 }}
              />

              {submitError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {submitError}
                </Alert>
              )}

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={isSubmitting}
                sx={{ fontWeight: 700 }}
              >
                {isSubmitting ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                    {isAuthenticated ? 'AI回答を取得中...' : '送信中...'}
                  </>
                ) : (
                  isAuthenticated ? 'AI回答を受け取る' : 'オペレーターに問い合わせる'
                )}
              </Button>

              {/* AI回答エリア */}
              {inquiryResponse && (
                <Box
                  id="aiResponse"
                  sx={{
                    mt: 3,
                    p: 2,
                    bgcolor: '#f9f9f9',
                    borderLeft: 4,
                    borderColor: 'primary.main',
                    borderRadius: 1,
                  }}
                >
                  <Chip
                    label={`AI回答（${inquiryResponse.aiModel || '不明'}）`}
                    color="primary"
                    size="small"
                    sx={{ mb: 1, fontWeight: 600 }}
                  />
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {inquiryResponse.aiResponse}
                  </Typography>

                  {/* 満足度フィードバック */}
                  {!isEscalated && (
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      <Button
                        variant="contained"
                        onClick={() => handleFeedback(true)}
                        sx={{ fontWeight: 700 }}
                      >
                        解決した
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => handleFeedback(false)}
                        sx={{ fontWeight: 700 }}
                      >
                        解決しなかった
                      </Button>
                    </Box>
                  )}

                  {/* エスカレーション */}
                  {isEscalated && (
                    <Box
                      sx={{
                        mt: 2,
                        pt: 2,
                        borderTop: 1,
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        申し訳ございません。オペレーターにおつなぎします。
                      </Typography>
                      <Button
                        variant="contained"
                        onClick={handleEscalate}
                        sx={{ mt: 1, fontWeight: 700 }}
                      >
                        オペレーターに問い合わせる
                      </Button>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}
        </Paper>

        {/* 過去の問い合わせ履歴 */}
        <Paper
          elevation={1}
          sx={{
            p: 3,
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" fontWeight={500} gutterBottom>
            過去の問い合わせ
          </Typography>

          {!isAuthenticated && (
            <Alert severity="info" sx={{ mt: 2 }}>
              ログインすると過去の問い合わせ履歴を確認できます
            </Alert>
          )}

          {isAuthenticated && isLoadingHistory && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {isAuthenticated && !isLoadingHistory && history.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              問い合わせ履歴はありません
            </Typography>
          )}

          {isAuthenticated && !isLoadingHistory && history.length > 0 && (
            <List sx={{ mt: 2 }}>
              {history.map((item) => (
                <ListItem
                  key={item.id}
                  sx={{
                    mb: 1.5,
                    bgcolor: '#f9f9f9',
                    borderRadius: 1,
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    '&:hover': {
                      bgcolor: '#eeeeee',
                    },
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                    {new Date(item.createdAt).toLocaleString('ja-JP')}
                  </Typography>
                  <ListItemText
                    primary={item.question}
                    primaryTypographyProps={{
                      variant: 'body2',
                      fontWeight: 500,
                      sx: { mb: 0.5 },
                    }}
                  />
                  <Chip
                    label={getStatusLabel(item.status).label}
                    color={getStatusLabel(item.status).color}
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default ContactPage;
