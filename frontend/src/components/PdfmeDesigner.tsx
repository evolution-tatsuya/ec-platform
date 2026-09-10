import { useEffect, useRef } from 'react';
import { Designer } from '@pdfme/ui';
import { text, image, rectangle, line } from '@pdfme/schemas';
import type { Template } from '@pdfme/common';

// 日本語フォント（Noto Sans JP）
const font = {
  'NotoSansJP-Regular': {
    data: 'https://fonts.gstatic.com/s/notosansjp/v52/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEi75vY0rw-oME.ttf',
    fallback: true,
  },
};

interface PdfmeDesignerProps {
  template: Template;
  onChange: (template: Template) => void;
}

/**
 * pdfme Designer をReactでラップ。テンプレート変更を親へ通知。
 */
const PdfmeDesigner = ({ template, onChange }: PdfmeDesignerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const designerRef = useRef<Designer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const designer = new Designer({
      domContainer: containerRef.current,
      template,
      options: { font, lang: 'ja' },
      plugins: { text, image, rectangle, line },
    });
    designer.onChangeTemplate((t) => onChange(t));
    designerRef.current = designer;

    return () => {
      designer.destroy();
      designerRef.current = null;
    };
    // マウント時に一度だけ生成（templateはref経由で保持）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '70vh' }} />;
};

export default PdfmeDesigner;
