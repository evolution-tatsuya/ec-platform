#!/bin/bash

# getStringParam関数をdownloadController.tsとorderController.tsに追加
for file in src/controllers/downloadController.ts src/controllers/orderController.ts src/controllers/productController.ts; do
  if ! grep -q "const getStringParam" "$file"; then
    sed -i '' '1,/^import/a\
\
/**\
 * ヘルパー関数: クエリパラメータからstring型を取得\
 */\
const getStringParam = (value: string | string[] | undefined): string | undefined => {\
  if (Array.isArray(value)) return value[0];\
  return value;\
};\
' "$file"
    echo "✓ $file にgetStringParam追加"
  fi
done

# 型エラー修正: req.params や req.query の string | string[] 問題
find src/controllers -name "*.ts" -exec sed -i '' 's/where: { id: orderId }/where: { id: getStringParam(orderId) || orderId }/g' {} \;
find src/controllers -name "*.ts" -exec sed -i '' 's/id: orderNumber/id: getStringParam(orderNumber) || orderNumber/g' {} \;

echo "✓ TypeScriptエラー修正完了"
