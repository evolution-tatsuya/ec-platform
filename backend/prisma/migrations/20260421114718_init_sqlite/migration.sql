-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "default_address" TEXT,
    "default_postal_code" TEXT,
    "default_phone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "categoryId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "productType" TEXT NOT NULL,
    "preparation_days" INTEGER NOT NULL DEFAULT 3,
    "allow_weekend_delivery" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "image_key" TEXT NOT NULL,
    "size_type" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "inventory_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_logs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "carts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "cart_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_email" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "shipping_address" TEXT,
    "shipping_postal_code" TEXT,
    "carrier" TEXT,
    "tracking_number" TEXT,
    "shipped_at" DATETIME,
    "cancel_reason" TEXT,
    "cancelled_at" DATETIME,
    "checked_in" BOOLEAN NOT NULL DEFAULT false,
    "checked_in_at" DATETIME,
    "checked_in_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "digital_tickets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "order_item_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "ticket_code" TEXT NOT NULL,
    "qr_code_data" TEXT NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "used_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "digital_tickets_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "digital_tickets_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "digital_tickets_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "digital_downloads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "r2_file_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "max_downloads" INTEGER NOT NULL DEFAULT 5,
    "last_downloaded_at" DATETIME,
    "expires_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "digital_downloads_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "digital_downloads_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enable_delivery_date_time" BOOLEAN NOT NULL DEFAULT true,
    "enable_bank_transfer" BOOLEAN NOT NULL DEFAULT true,
    "bank_transfer_discount" REAL NOT NULL DEFAULT 0.036,
    "enable_credit_card" BOOLEAN NOT NULL DEFAULT true,
    "company_name" TEXT,
    "company_logo_url" TEXT,
    "company_postal_code" TEXT,
    "company_address" TEXT,
    "company_phone" TEXT,
    "bank_name" TEXT,
    "bank_branch" TEXT,
    "bank_account_type" TEXT,
    "bank_account_number" TEXT,
    "bank_account_holder" TEXT,
    "email_from" TEXT,
    "enable_webp_conversion" BOOLEAN NOT NULL DEFAULT true,
    "image_quality" INTEGER NOT NULL DEFAULT 80,
    "thumbnail_size" INTEGER NOT NULL DEFAULT 200,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "navigation_axes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category_type" TEXT NOT NULL,
    "axis_name" TEXT NOT NULL,
    "axis_key" TEXT NOT NULL,
    "axis_type" TEXT NOT NULL,
    "display_type" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "navigation_axis_options" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "navigation_axis_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "navigation_axis_options_navigation_axis_id_fkey" FOREIGN KEY ("navigation_axis_id") REFERENCES "navigation_axes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "hero_slides" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "image_url" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "link_url" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "mega_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "background_image_url" TEXT NOT NULL,
    "link_url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "pickup_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "pickup_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "news_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "published_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "inquiries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reply" TEXT,
    "replied_at" DATETIME,
    "replied_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "inquiries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "inquiries_replied_by_fkey" FOREIGN KEY ("replied_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "favorites_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_slug_idx" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parentId_idx" ON "categories"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_slug_idx" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "products_productType_idx" ON "products"("productType");

-- CreateIndex
CREATE INDEX "product_images_product_id_idx" ON "product_images"("product_id");

-- CreateIndex
CREATE INDEX "product_images_product_id_order_idx" ON "product_images"("product_id", "order");

-- CreateIndex
CREATE INDEX "inventory_logs_productId_idx" ON "inventory_logs"("productId");

-- CreateIndex
CREATE INDEX "inventory_logs_createdAt_idx" ON "inventory_logs"("createdAt");

-- CreateIndex
CREATE INDEX "carts_userId_idx" ON "carts"("userId");

-- CreateIndex
CREATE INDEX "cart_items_cartId_idx" ON "cart_items"("cartId");

-- CreateIndex
CREATE INDEX "cart_items_productId_idx" ON "cart_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cartId_productId_key" ON "cart_items"("cartId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_userId_idx" ON "orders"("userId");

-- CreateIndex
CREATE INDEX "orders_orderNumber_idx" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at");

-- CreateIndex
CREATE INDEX "orders_checked_in_idx" ON "orders"("checked_in");

-- CreateIndex
CREATE INDEX "orders_customer_email_idx" ON "orders"("customer_email");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "digital_tickets_ticket_code_key" ON "digital_tickets"("ticket_code");

-- CreateIndex
CREATE INDEX "digital_tickets_order_id_idx" ON "digital_tickets"("order_id");

-- CreateIndex
CREATE INDEX "digital_tickets_order_item_id_idx" ON "digital_tickets"("order_item_id");

-- CreateIndex
CREATE INDEX "digital_tickets_product_id_idx" ON "digital_tickets"("product_id");

-- CreateIndex
CREATE INDEX "digital_tickets_ticket_code_idx" ON "digital_tickets"("ticket_code");

-- CreateIndex
CREATE INDEX "digital_tickets_is_used_idx" ON "digital_tickets"("is_used");

-- CreateIndex
CREATE INDEX "digital_downloads_order_id_idx" ON "digital_downloads"("order_id");

-- CreateIndex
CREATE INDEX "digital_downloads_product_id_idx" ON "digital_downloads"("product_id");

-- CreateIndex
CREATE INDEX "navigation_axes_category_type_idx" ON "navigation_axes"("category_type");

-- CreateIndex
CREATE INDEX "navigation_axes_order_idx" ON "navigation_axes"("order");

-- CreateIndex
CREATE INDEX "navigation_axis_options_navigation_axis_id_idx" ON "navigation_axis_options"("navigation_axis_id");

-- CreateIndex
CREATE INDEX "navigation_axis_options_order_idx" ON "navigation_axis_options"("order");

-- CreateIndex
CREATE INDEX "hero_slides_order_idx" ON "hero_slides"("order");

-- CreateIndex
CREATE INDEX "hero_slides_is_active_idx" ON "hero_slides"("is_active");

-- CreateIndex
CREATE INDEX "mega_categories_category_type_idx" ON "mega_categories"("category_type");

-- CreateIndex
CREATE INDEX "mega_categories_order_idx" ON "mega_categories"("order");

-- CreateIndex
CREATE INDEX "mega_categories_is_active_idx" ON "mega_categories"("is_active");

-- CreateIndex
CREATE INDEX "pickup_products_product_id_idx" ON "pickup_products"("product_id");

-- CreateIndex
CREATE INDEX "pickup_products_order_idx" ON "pickup_products"("order");

-- CreateIndex
CREATE INDEX "pickup_products_is_active_idx" ON "pickup_products"("is_active");

-- CreateIndex
CREATE INDEX "news_items_published_at_idx" ON "news_items"("published_at");

-- CreateIndex
CREATE INDEX "news_items_is_published_idx" ON "news_items"("is_published");

-- CreateIndex
CREATE INDEX "inquiries_user_id_idx" ON "inquiries"("user_id");

-- CreateIndex
CREATE INDEX "inquiries_email_idx" ON "inquiries"("email");

-- CreateIndex
CREATE INDEX "inquiries_status_idx" ON "inquiries"("status");

-- CreateIndex
CREATE INDEX "inquiries_created_at_idx" ON "inquiries"("created_at");

-- CreateIndex
CREATE INDEX "favorites_user_id_idx" ON "favorites"("user_id");

-- CreateIndex
CREATE INDEX "favorites_product_id_idx" ON "favorites"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_user_id_product_id_key" ON "favorites"("user_id", "product_id");
