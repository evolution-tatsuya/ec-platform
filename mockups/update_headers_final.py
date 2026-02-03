#!/usr/bin/env python3
import re

# 正しいヘッダーCSS (P-002から)
HEADER_CSS = '''    /* ヘッダー */
    .header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #7c4dff;
      color: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      z-index: 1100;
    }

    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      padding: 8px 24px;
      min-height: 64px;
    }

    .logo {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 1px;
      cursor: pointer;
      white-space: nowrap;
      margin-right: 0;
    }

    .search-bar {
      position: relative;
      border-radius: 4px;
      background-color: rgba(255, 255, 255, 0.15);

      margin-right: 0;
      width: 100%;
      max-width: 600px;
      transition: background-color 0.3s;
    }

    .search-bar:hover {
      background-color: rgba(255, 255, 255, 0.25);
    }

    .search-icon {
      position: absolute;
      padding: 0 16px;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      font-size: 24px;
    }

    .search-input {
      color: white;
      width: 100%;
      border: none;
      background: transparent;
      padding: 8px 8px 8px calc(1em + 32px);
      font-size: 16px;
      outline: none;
    }

    .search-input::placeholder {
      color: rgba(255, 255, 255, 0.7);
    }

    .spacer {
      flex-grow: 1;
    }

    .icon-button {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 12px;
      margin: 0 4px;
      border-radius: 50%;
      position: relative;
      transition: background-color 0.3s;
    }

    .icon-button:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }

    .icon-button .material-icons {
      font-size: 28px;
      display: block;
    }

    .badge {
      position: absolute;
      top: 8px;
      right: 8px;
      background: #f44336;
      color: white;
      border-radius: 10px;
      padding: 2px 6px;
      font-size: 12px;
      font-weight: 600;
      min-width: 20px;
      text-align: center;
    }'''

HEADER_HTML = '''  <!-- ヘッダー -->
  <header class="header">
    <div class="header-content">
      <!-- ロゴ -->
      <div class="logo" onclick="window.location.href='/'">EC Platform</div>

      <!-- 検索バー -->
      <form class="search-bar" onsubmit="event.preventDefault();">
        <span class="material-icons search-icon">search</span>
        <input type="text" placeholder="商品を検索…" class="search-input" />
      </form>

      <div class="spacer"></div>

      <!-- カートアイコン -->
      <button class="icon-button" onclick="window.location.href='/cart'" aria-label="カート">
        <span class="material-icons">shopping_cart</span>
        <span class="badge">0</span>
      </button>

      <!-- ユーザーアイコン -->
      <button class="icon-button" onclick="window.location.href='/auth/login'" aria-label="アカウント">
        <span class="material-icons">account_circle</span>
      </button>
    </div>
  </header>'''

files = [
    'CarModelPartsListPage.html',
    'PartsCategoryListPage.html',
    'EventsListPage.html',
    'DigitalProductsListPage.html'
]

for filename in files:
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Google Fontsのlinkタグを追加（まだない場合）
    if 'fonts.googleapis.com/css2?family=Roboto' not in content:
        content = content.replace(
            '<title>',
            '<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">\n  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">\n  <title>'
        )

    # font-familyを修正
    content = re.sub(
        r"font-family: 'Roboto', 'Noto Sans JP', sans-serif;",
        "font-family: 'Roboto', sans-serif;",
        content
    )

    # 古いヘッダーCSSを新しいものに置換
    old_header_css_pattern = r'\.header \{[^}]+\}\s+\.header-content \{[^}]+\}\s+\.logo \{[^}]+\}\s+\.cart-icon \{[^}]+\}'
    content = re.sub(old_header_css_pattern, HEADER_CSS, content, flags=re.DOTALL)

    # 古いヘッダーHTMLを新しいものに置換
    old_header_html_pattern = r'<div class="header">.*?</div>\s+</div>'
    content = re.sub(old_header_html_pattern, HEADER_HTML, content, flags=re.DOTALL)

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f'Updated {filename}')
