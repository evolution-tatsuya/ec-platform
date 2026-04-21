#!/bin/bash

# orderController.ts の全てのreq.query/req.paramsをgetStringParamで包む
sed -i '' 's/const { orderNumber } = req\.params/const orderNumber = getStringParam(req.params.orderNumber)/g' src/controllers/orderController.ts
sed -i '' 's/where: { orderNumber }/where: { orderNumber: orderNumber || '\'''\'' }/g' src/controllers/orderController.ts
sed -i '' 's/const { id } = req\.params/const id = getStringParam(req.params.id)/g' src/controllers/orderController.ts

# productController.ts のgetStringParam未使用警告を修正 (実際に使う)
sed -i '' 's/const { slug } = req\.params/const slug = getStringParam(req.params.slug)/g' src/controllers/productController.ts
sed -i '' 's/const { productId } = req\.query/const productId = getStringParam(req.query.productId)/g' src/controllers/productController.ts

# ticketController.ts にヘルパー関数追加とinclude追加
if ! grep -q "const getStringParam" src/controllers/ticketController.ts; then
  # import文の後に追加するためにawkを使用
  awk '
    /^import/ { print; imports=1; next }
    imports && /^$/ { 
      print ""; 
      print "/**";
      print " * ヘルパー関数: クエリパラメータからstring型を取得";
      print " */";
      print "const getStringParam = (value: string | string[] | undefined): string | undefined => {";
      print "  if (Array.isArray(value)) return value[0];";
      print "  return value;";
      print "};";
      print "";
      imports=0;
    }
    { print }
  ' src/controllers/ticketController.ts > /tmp/ticketController.tmp
  mv /tmp/ticketController.tmp src/controllers/ticketController.ts
  echo "✓ ticketController.ts にgetStringParam追加"
fi

echo "✓ 最終エラー修正完了"
