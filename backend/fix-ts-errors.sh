#!/bin/bash

# adminCustomerController.ts: _sum undefined チェック
sed -i '' 's/orderStats\._sum\.totalAmount || 0/orderStats._sum?.totalAmount || 0/g' src/controllers/adminCustomerController.ts

echo "adminCustomerController.ts修正完了"
