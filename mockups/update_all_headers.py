#!/usr/bin/env python3
"""
全モックアップページのヘッダーを完成版と完全に一致させるスクリプト
"""

import re
from pathlib import Path

# 完成版のヘッダーHTML/CSS
HEADER_HTML = '''  <header class="header">
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
      margin-right: 32px;
    }

    .search-bar {
      position: relative;
      border-radius: 4px;
      background-color: rgba(255, 255, 255, 0.15);
      margin-left: 32px;
      margin-right: 32px;
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

def update_mockup(file_path):
    """モックアップファイルのヘッダーを更新"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # ヘッダーHTMLを置換
    content = re.sub(
        r'<header class="header">.*?</header>',
        HEADER_HTML,
        content,
        flags=re.DOTALL
    )

    # ヘッダーCSSを置換（/* ヘッダー */ から次のセクションまで）
    content = re.sub(
        r'/\* ヘッダー \*/.*?(?=/\* [^*]+\*/)',
        HEADER_CSS + '\n\n    ',
        content,
        flags=re.DOTALL
    )

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"✓ Updated: {file_path.name}")

# 更新対象のファイル
mockups_dir = Path(__file__).parent
files = [
    'CarsTopPage.html',
    'CarModelPartsListPage.html',
    'PartsCategoryListPage.html',
    'EventsListPage.html',
    'DigitalProductsListPage.html',
]

for filename in files:
    file_path = mockups_dir / filename
    if file_path.exists():
        update_mockup(file_path)
    else:
        print(f"✗ Not found: {filename}")

print("\n全てのモックアップページのヘッダーを更新しました。")
