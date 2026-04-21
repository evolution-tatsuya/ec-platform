#!/bin/bash

# favoriteController.ts修正
if ! grep -q "const getStringParam" src/controllers/favoriteController.ts; then
  awk '/^import.*prisma/ { print; print "\n/**\n * ヘルパー関数: クエリパラメータからstring型を取得\n */\nconst getStringParam = (value: string | string[] | undefined): string | undefined => {\n  if (Array.isArray(value)) return value[0];\n  return value;\n};\n"; next }1' src/controllers/favoriteController.ts > /tmp/favorite.tmp && mv /tmp/favorite.tmp src/controllers/favoriteController.ts
fi
sed -i '' 's/const { productId } = req\.params/const productId = getStringParam(req.params.productId)/g' src/controllers/favoriteController.ts
echo "✓ favoriteController.ts修正"

# categoryController.ts修正
if ! grep -q "const getStringParam" src/controllers/categoryController.ts; then
  awk '/^import.*prisma/ { print; print "\n/**\n * ヘルパー関数: クエリパラメータからstring型を取得\n */\nconst getStringParam = (value: string | string[] | undefined): string | undefined => {\n  if (Array.isArray(value)) return value[0];\n  return value;\n};\n"; next }1' src/controllers/categoryController.ts > /tmp/category.tmp && mv /tmp/category.tmp src/controllers/categoryController.ts
fi
sed -i '' 's/const { slug } = req\.params/const slug = getStringParam(req.params.slug)/g' src/controllers/categoryController.ts
echo "✓ categoryController.ts修正"

# adminFavoriteController.ts修正
if ! grep -q "const getStringParam" src/controllers/adminFavoriteController.ts; then
  awk '/^import.*prisma/ { print; print "\n/**\n * ヘルパー関数: クエリパラメータからstring型を取得\n */\nconst getStringParam = (value: string | string[] | undefined): string | undefined => {\n  if (Array.isArray(value)) return value[0];\n  return value;\n};\n"; next }1' src/controllers/adminFavoriteController.ts > /tmp/adminfav.tmp && mv /tmp/adminfav.tmp src/controllers/adminFavoriteController.ts
fi
sed -i '' 's/userId: userId,/userId: getStringParam(userId) || userId,/g' src/controllers/adminFavoriteController.ts
echo "✓ adminFavoriteController.ts修正"

# adminSettingsController.ts req修正
sed -i '' 's/ req\.params\./ getStringParam(req.params.axisId) || req.params./g' src/controllers/adminSettingsController.ts
sed -i '' 's/req\.query/getStringParam(req.query.axisId)/g' src/controllers/adminSettingsController.ts
echo "✓ adminSettingsController.ts修正"

# orderController.ts orderId修正
sed -i '' 's/id: orderId,/id: getStringParam(orderId) || orderId,/g' src/controllers/orderController.ts
echo "✓ orderController.ts修正"

# productController.ts productId修正
sed -i '' 's/productId: productId/productId: getStringParam(productId) || productId/g' src/controllers/productController.ts
sed -i '' 's/const { slug } = req\.params/const slug = getStringParam(req.params.slug)!; if (!slug) return res.status(400).json({ error: "Invalid slug" });/g' src/controllers/productController.ts
echo "✓ productController.ts修正"

# ticketController.ts ticketCode修正
sed -i '' 's/ticketCode: ticketCode/ticketCode: getStringParam(ticketCode) || ticketCode/g' src/controllers/ticketController.ts
echo "✓ ticketController.ts修正"

echo "\n全修正完了!"
