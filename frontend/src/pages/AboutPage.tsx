import StaticInfoPage from '../components/StaticInfoPage';

/**
 * 会社概要ページ（雛形）
 * ※ ○○ の部分は実際の会社情報に差し替えてください。
 */
const AboutPage = () => {
  return (
    <StaticInfoPage
      title="会社概要"
      description="運営会社の情報をご案内します。"
      sections={[
        {
          rows: [
            { label: '会社名', value: '○○株式会社' },
            { label: '設立', value: '○○○○年○月○日' },
            { label: '代表者', value: '代表取締役 ○○ ○○' },
            { label: '所在地', value: '〒000-0000\n○○県○○市○○町0-0-0' },
            { label: '資本金', value: '○○○万円' },
            { label: '事業内容', value: 'ECサイトの運営、車パーツ・デジタルコンテンツの販売、イベント運営' },
            { label: '電話番号', value: '000-0000-0000' },
            { label: 'メールアドレス', value: 'info@ec-platform.example' },
          ],
        },
      ]}
      note="※ 本ページは雛形です。実際の会社情報に差し替えてください。"
    />
  );
};

export default AboutPage;
