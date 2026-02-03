#!/usr/bin/env python3
import re

# ロゴ部分のCSS追加
LOGO_CSS = '''
    .logo {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 1px;
      cursor: pointer;
      white-space: nowrap;
      margin-right: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .logo-image {
      height: 40px;
      width: auto;
      object-fit: contain;
    }

    .logo-text {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 1px;
    }'''

# ロゴ部分のHTML
LOGO_HTML = '''      <!-- ロゴ -->
      <div class="logo" onclick="window.location.href='/'">
        <!-- ロゴ画像を使用する場合は以下のコメントを外して、src属性にロゴ画像のパスを設定 -->
        <!-- <img src="/path/to/logo.png" alt="EC Platform" class="logo-image"> -->
        <span class="logo-text">EC Platform</span>
      </div>'''

files = [
    'TopPage.html',
    'CarsTopPage.html',
    'CarModelPartsListPage.html',
    'PartsCategoryListPage.html',
    'EventsListPage.html',
    'DigitalProductsListPage.html'
]

for filename in files:
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()

        # 既存の.logoのCSSを新しいものに置換
        content = re.sub(
            r'\.logo \{[^}]+\}',
            LOGO_CSS,
            content,
            flags=re.DOTALL
        )

        # 既存のロゴHTMLを新しいものに置換
        # パターン1: <div class="logo" onclick="...">EC Platform</div>
        content = re.sub(
            r'<div class="logo" onclick="[^"]*">EC Platform</div>',
            LOGO_HTML,
            content
        )

        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)

        print(f'Updated {filename}')
    except FileNotFoundError:
        print(f'File not found: {filename}')
    except Exception as e:
        print(f'Error processing {filename}: {e}')

print('\n✅ All files updated!')
print('\n📝 使い方:')
print('1. ロゴ画像を準備（推奨サイズ: 高さ40px程度）')
print('2. 各HTMLファイルの<!-- <img src="/path/to/logo.png" ... > -->のコメントを外す')
print('3. src属性にロゴ画像のパスを設定')
print('4. 必要に応じて.logo-textを非表示にする（CSSでdisplay: none;を追加）')
