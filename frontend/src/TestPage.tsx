// 簡易テストページ
export default function TestPage() {
  return (
    <div style={{ padding: '50px', fontSize: '24px', color: 'green' }}>
      <h1>✅ テストページ表示成功！</h1>
      <p>このページが見えていれば、React自体は動作しています。</p>
      <p>現在時刻: {new Date().toLocaleString('ja-JP')}</p>
    </div>
  );
}
