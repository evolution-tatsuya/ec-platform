#!/usr/bin/env python3
import re

files = [
    'CarModelPartsListPage.html',
    'PartsCategoryListPage.html',
    'EventsListPage.html',
    'DigitalProductsListPage.html'
]

for filename in files:
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix the broken CSS
    pattern = r'(/\* メインコンテンツ \*/)\s+\n\s+\n\s+(max-width: 1200px;)\s+(margin: 0 auto;)\s+(padding: 24px;)\s+\}\s+padding-top: 96px;'
    replacement = r'\1\n    .container {\n      \2\n      \3\n      \4\n      padding-top: 96px;\n    }'

    content = re.sub(pattern, replacement, content)

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f'Fixed {filename}')
