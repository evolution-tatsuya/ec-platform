#!/usr/bin/env python3
"""
TopPage.htmlのヘッダーHTMLとCSSを完全にP-002～P-006にコピーするスクリプト
"""

import re
from pathlib import Path

# TopPage.htmlを読み込む
toppage_path = Path(__file__).parent / 'TopPage.html'
with open(toppage_path, 'r', encoding='utf-8') as f:
    toppage_content = f.read()

# TopPage.htmlからヘッダーHTMLを抽出
header_html_match = re.search(r'<header class="header">.*?</header>', toppage_content, re.DOTALL)
if not header_html_match:
    print("Error: Could not find header HTML in TopPage.html")
    exit(1)
header_html = header_html_match.group(0)

# TopPage.htmlからヘッダーCSSを抽出（/* ヘッダー */ から .badge まで）
header_css_match = re.search(
    r'/\* ヘッダー \*/.*?text-align: center;\s*}',
    toppage_content,
    re.DOTALL
)
if not header_css_match:
    print("Error: Could not find header CSS in TopPage.html")
    exit(1)
header_css = header_css_match.group(0)

def update_mockup(file_path):
    """モックアップファイルのヘッダーを更新"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # ヘッダーHTMLを置換
    content = re.sub(
        r'<header class="header">.*?</header>',
        header_html,
        content,
        flags=re.DOTALL
    )

    # ヘッダーCSSを置換（/* ヘッダー */ から次のセクションまで）
    # まず、既存のヘッダーCSSを削除
    content = re.sub(
        r'\s*/\* ヘッダー \*/.*?text-align: center;\s*}',
        '',
        content,
        flags=re.DOTALL
    )

    # bodyスタイルの後にヘッダーCSSを挿入
    content = re.sub(
        r'(body \{[^}]+\})',
        r'\1\n\n    ' + header_css,
        content
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

print("\n全てのモックアップページのヘッダーを完全にTopPage.htmlと同期しました。")
