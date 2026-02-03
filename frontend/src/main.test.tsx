import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

function TestApp() {
  return (
    <div style={{ padding: '50px', fontSize: '24px', fontFamily: 'Arial' }}>
      <h1>テスト成功！</h1>
      <p>Reactは正常に動作しています。</p>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TestApp />
  </StrictMode>
);
