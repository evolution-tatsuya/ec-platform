// ========================================
// 型定義ファイル（バックエンド）
// ========================================
// 注意: frontend/src/types/index.tsと完全同期すること

// ========================================
// Enums
// ========================================

export enum ProductType {
  PHYSICAL = 'PHYSICAL',
  DIGITAL = 'DIGITAL',
  DIGITAL_TICKET = 'DIGITAL_TICKET',
  EXTERNAL_LINK = 'EXTERNAL_LINK',
  SUBSCRIPTION = 'SUBSCRIPTION',
}

// サブスク商品の課金周期。DB/APIでは小文字文字列 'monthly' | 'yearly' | 'onetime' で扱う。
export type BillingType = 'monthly' | 'yearly' | 'onetime';

// サブスク契約の状態。DB/APIでは文字列。
// pending_payment=入金待ち（銀行振込で注文がpendingの間）、active=利用中、suspended=一時停止、cancelled=解約済み。
export type SubscriptionStatus = 'pending_payment' | 'active' | 'suspended' | 'cancelled';

export enum CategoryType {
  CARS = 'cars',
  EVENTS = 'events',
  DIGITAL = 'digital',
}

export enum AxisType {
  SELECT = 'select',
  MULTI_SELECT = 'multi_select',
  SEARCH = 'search',
  RANGE = 'range',
}

export enum DisplayType {
  DROPDOWN = 'dropdown',
  BUTTON = 'button',
  RADIO = 'radio',
}

export enum OrderStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PREPARING = 'PREPARING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  CREDIT_CARD = 'CREDIT_CARD',
  PAYPAY = 'PAYPAY',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum InquiryStatus {
  PENDING = 'PENDING',
  REPLIED = 'REPLIED',
  CLOSED = 'CLOSED',
  AI_RESOLVED = 'AI_RESOLVED',
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

// ========================================
// User & Auth
// ========================================

export interface User {
  id: string;
  email: string;
  name: string;
  defaultAddress?: string;
  defaultPostalCode?: string;
  defaultPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Admin {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthContextType {
  user: User | Admin | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
}

// ========================================
// Product
// ========================================

// 商品画像（order順・各サイズの署名付きURL）
export interface ProductImage {
  id: string;
  order: number;
  thumbnailUrl: string;
  listUrl: string;
  detailUrl: string;
}

export interface Product {
  id: string;
  name: string;
  slug?: string;
  price: number;
  salePrice?: number | null;
  description?: string;
  productType: ProductType;
  categoryType: CategoryType;
  images: string[];
  productImages?: ProductImage[];
  externalUrl?: string;
  shippingSettings?: ShippingSettings;
  preparationDays?: number;
  allowWeekendDelivery?: boolean;
  isActive?: boolean;
  currentStock?: number;
  billingType?: BillingType | null; // サブスク商品の課金周期（productType=SUBSCRIPTIONの場合）
  // サブスクプランの上限（null=無制限）。EC=マスター、在庫=適用。
  maxParts?: number | null;
  maxImageMB?: number | null;
  maxUsers?: number | null;
  // 料金ページ表示（管理画面で編集可能）
  planFeatures?: string[] | null; // 機能リスト（表示用テキスト・自由に追加・削除・編集）
  planFeatureKeys?: string[] | null; // 在庫アプリに送る有効機能キー（null/空=全機能ON）
  unitLabel?: string | null; // 上限の単位ラベル（デフォルト「パーツ」）
  planTagline?: string | null; // プランの短い説明（1行）
  isPopular?: boolean; // 「いちばん人気」バッジ
  createdAt: Date;
  updatedAt: Date;
  attributes: ProductAttribute[];
  tags: Tag[];
}

export interface ProductAttribute {
  id: string;
  productId: string;
  axisKey: string;
  value: string;
}

export interface ShippingSettings {
  allowWeekendDelivery: boolean;
  allowDateSelection: boolean;
  allowTimeSelection: boolean;
  preparationDays: number;
}

export interface Tag {
  id: string;
  name: string;
}

// ========================================
// Category Navigation Axis
// ========================================

export interface CategoryNavigationAxis {
  id: string;
  categoryType: CategoryType;
  axisName: string;
  axisKey: string;
  order: number;
  axisType: AxisType;
  options: string[];
  displayType: DisplayType;
  icon?: string;
  placeholder?: string;
  parentAxisKey?: string;
}

// ========================================
// Order
// ========================================

export interface Order {
  id: string;
  userId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  totalAmount: number;
  status: OrderStatus | string; // 'pending' | 'paid' | 'preparing' | 'shipped' | 'completed' | 'cancelled'
  paymentMethod: PaymentMethod | string; // 'bank_transfer' | 'credit_card'
  paymentStatus?: PaymentStatus;
  shippingAddress?: string;
  shippingPostalCode?: string;
  carrier?: string; // 'yamato' | 'sagawa' | 'japan_post'
  trackingNumber?: string;
  shippedAt?: Date;
  cancelReason?: string;
  cancelledAt?: Date;
  checkedIn?: boolean;
  checkedInAt?: Date;
  checkedInBy?: string;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItem[];
  user?: {
    id: string;
    email: string;
    name: string;
  };
  digitalTickets?: DigitalTicket[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  product: Product;
}

export interface ShippingOptions {
  weekendDelivery: boolean;
  preferredDate?: string;
  preferredTimeSlot?: string;
}

export interface ShipmentHistory {
  id: string;
  orderId: string;
  status: OrderStatus;
  note?: string;
  trackingNumber?: string;
  carrier?: string;
  createdAt: Date;
}

export interface CheckinResponse {
  success: boolean;
  message: string;
  order: Order;
  alreadyCheckedIn?: boolean;
}

export interface OrderDetailResponse {
  order: Order;
  alreadyCheckedIn?: boolean;
}

// ========================================
// Document Generation（書類生成）
// ========================================

export interface DocumentGenerationResponse {
  success: boolean;
  documentUrl: string;
  documentType: 'invoice' | 'receipt' | 'quote';
  fileName: string;
}

// ========================================
// Order Management（注文管理）
// ========================================

export interface AdminOrderFilterParams {
  startDate?: string;
  endDate?: string;
  status?: OrderStatus | 'all';
  paymentMethod?: PaymentMethod | 'all';
  search?: string;
}

export interface ShipOrderRequest {
  carrier: string;
  trackingNumber: string;
}

// ========================================
// Subscription（サブスク契約）
// ========================================

export interface Subscription {
  id: string;
  userId: string;
  productId: string;
  orderId?: string | null;
  status: SubscriptionStatus;
  billingType: BillingType;
  amount: number;
  startedAt: Date;
  nextBillingDate?: Date | null;
  cancelledAt?: Date | null;
  licenseKeyDelivered: boolean;
  licenseKey?: string | null;
  activationUrl?: string | null;
  tenantSlug?: string | null;
  provisionedAt?: Date | null;
  inheritFromOrderId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeStatus?: string | null;
  note?: string | null;
  createdAt: Date;
  updatedAt: Date;
  product?: {
    id: string;
    name: string;
    slug?: string;
  };
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
}

// ========================================
// Digital Ticket
// ========================================

export interface DigitalTicket {
  id: string;
  orderId: string;
  productId: string;
  ticketCode: string;
  qrCodeData: string;
  isUsed: boolean;
  usedAt?: Date;
  createdAt: Date;
}

// ========================================
// Digital Product
// ========================================

export interface DigitalProduct {
  id: string;
  productId: string;
  fileName: string;
  fileSize: number;
  r2Key: string;
}

export interface DigitalDownload {
  id: string;
  orderId: string;
  digitalProductId: string;
  downloadUrl: string;
  urlExpiresAt: Date;
  downloadCount: number;
  maxDownloads: number;
  lastDownloadAt?: Date;
  createdAt: Date;
}

// ========================================
// Event Form
// ========================================

export enum EventFormFieldType {
  TEXT = 'TEXT',
  RADIO = 'RADIO',
  CHECKBOX = 'CHECKBOX',
  DROPDOWN = 'DROPDOWN',
  DATE = 'DATE',
  TEXTAREA = 'TEXTAREA',
}

export interface EventFormTemplate {
  id: string;
  productId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  fields: EventFormField[];
}

export interface EventFormField {
  id: string;
  templateId: string;
  label: string;
  description?: string;
  fieldType: EventFormFieldType | string;
  isRequired: boolean;
  order: number;
  options?: string[];
  conditionalField?: string;
  conditionalValue?: string;
}

export interface EventFormSubmission {
  id: string;
  orderId: string;
  formData: Record<string, unknown>;
  createdAt: Date;
}

export interface EventParticipant {
  id: string;
  orderId: string;
  orderNumber: string;
  name: string;
  email: string;
  ticketCode: string;
  qrCode: string;
  isUsed: boolean;
  usedAt?: Date;
  formData: Record<string, unknown>;
  createdAt: Date;
  order?: {
    id: string;
    customerName: string;
    customerEmail: string;
  };
}

export interface EventParticipantListResponse {
  participants: EventParticipant[];
  total: number;
}

// ========================================
// Inquiry
// ========================================

export interface Inquiry {
  id: string;
  userId?: string;
  name: string;
  email: string;
  question: string;
  aiResponse?: string;
  isSatisfied?: boolean;
  isEscalated: boolean;
  status: InquiryStatus;
  reply?: string;
  repliedAt?: Date;
  repliedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
  repliedByUser?: {
    id: string;
    email: string;
    name: string | null;
  };
}

// ========================================
// Inquiry Management（問い合わせ管理）
// ========================================

export interface InquiryTrendData {
  date: string;
  total: number;
  aiResponded: number;
  manualResponded: number;
}

export interface AIResponseDistribution {
  name: string;
  value: number;
}

export interface InquiryStats {
  totalInquiries: number;
  aiRespondedCount: number;
  aiResponseRate: number;
  monthlyCost: number;
  geminiUsageCount: number;
  trendData: InquiryTrendData[];
  distribution: AIResponseDistribution[];
}

export interface InquiryReplyRequest {
  replyText: string;
}

// ========================================
// Cart
// ========================================

export interface CartItem {
  productId: string;
  quantity: number;
  product: Product;
}

export interface Cart {
  items: CartItem[];
  totalAmount: number;
}

// ========================================
// Inventory
// ========================================

export interface InventoryLog {
  id: string;
  productId: string;
  quantity: number;
  type: string;
  orderId?: string;
  note?: string | null; // 理由メモ（DBカラムはnote）
  reason?: string; // 後方互換
  product?: { id: string; name: string; slug?: string } | null; // 一覧表示用
  createdAt: Date;
}

// ========================================
// Top Page (P-001)
// ========================================

export interface HeroSlide {
  id: string;
  imageUrl: string;
  title?: string;
  description?: string;
  linkUrl?: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MegaCategory {
  id: string;
  categoryType: CategoryType;
  name: string;
  description: string;
  backgroundImageUrl: string;
  linkUrl: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PickupProduct {
  id: string;
  productId: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  product: Product;
}

export type NewsCategory = 'new_product' | 'holiday' | 'shipping' | 'other';

export interface NewsItem {
  id: string;
  title: string;
  content?: string | null;
  category: NewsCategory;
  linkUrl?: string | null;
  publishedAt: Date;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TopPageData {
  heroSlides: HeroSlide[];
  megaCategories: MegaCategory[];
  pickupProducts: PickupProduct[];
  newProducts: Product[];
  saleProducts: Product[];
  popularProducts: Product[];
  news: NewsItem[];
}

// ========================================
// お気に入り
// ========================================

export interface Favorite {
  id: string;
  userId: string;
  productId: string;
  createdAt: Date;
  product?: Product;
  user?: User;
}

export interface FavoriteWithProduct extends Favorite {
  product: Product;
}

// ========================================
// 顧客管理（管理者向け）
// ========================================

export interface CustomerWithStats {
  id: string;
  name: string;
  email: string;
  phone: string;
  registeredAt: Date;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: Date | null;
  repeatRate: number;
  tags: string[];
}

export interface CustomerOrder {
  orderNumber: string;
  orderDate: Date;
  totalAmount: number;
  status: OrderStatus | string;
}

export interface CustomerDetail extends CustomerWithStats {
  orders: CustomerOrder[];
}

export interface UpdateCustomerTagsRequest {
  tags: string[];
}

// ========================================
// システム設定（A-007）
// ========================================

export interface SystemSettings {
  company: CompanySettings;
  payment: PaymentSettings;
  email: EmailSettings;
  documentTemplates: DocumentTemplates;
  imageOptimization: ImageOptimizationSettings;
}

export interface CompanySettings {
  companyName: string;
  logoUrl?: string;
  postalCode: string;
  address: string;
  phone: string;
  bankName: string;
  branchName: string;
  accountType: 'checking' | 'savings';
  accountNumber: string;
  accountHolder: string;
  primaryColor: string;
  secondaryColor: string;
  heroImageUrl?: string;
}

export interface PaymentSettings {
  bankTransferEnabled: boolean;
  bankTransferDiscountRate: number;
  creditCardEnabled: boolean;
  stripePublicKey: string;
  stripeSecretKey: string;
}

export interface EmailSettings {
  senderEmail: string;
  shippingNotificationTemplate: string;
}

export interface DocumentTemplates {
  invoiceTemplate?: string;
  receiptTemplate?: string;
  estimateTemplate?: string;
}

export interface ImageOptimizationSettings {
  webpEnabled: boolean;
  compressionQuality: number;
  thumbnailSize: number;
}

export interface UpdateCompanySettingsRequest {
  companyName?: string;
  logoUrl?: string;
  postalCode?: string;
  address?: string;
  phone?: string;
  bankName?: string;
  branchName?: string;
  accountType?: 'checking' | 'savings';
  accountNumber?: string;
  accountHolder?: string;
  primaryColor?: string;
  secondaryColor?: string;
  heroImageUrl?: string;
}

export interface UpdatePaymentSettingsRequest {
  bankTransferEnabled?: boolean;
  bankTransferDiscountRate?: number;
  creditCardEnabled?: boolean;
  stripePublicKey?: string;
  stripeSecretKey?: string;
}

export interface UpdateEmailSettingsRequest {
  senderEmail?: string;
  shippingNotificationTemplate?: string;
}

export interface UpdateDocumentTemplatesRequest {
  invoiceTemplate?: string;
  receiptTemplate?: string;
  estimateTemplate?: string;
}

export interface UpdateImageOptimizationRequest {
  webpEnabled?: boolean;
  compressionQuality?: number;
  thumbnailSize?: number;
}

// ========================================
// ダッシュボード統計（スライス13）
// ========================================

export interface DashboardStats {
  stats: {
    revenue: {
      current: number;
      growth: number;
    };
    orders: {
      current: number;
      growth: number;
    };
    averageOrderValue: number;
  };
  recentOrders: RecentOrder[];
  topProducts: TopProduct[];
  salesTrend: SalesData[];
  categoryDistribution: CategorySalesData[];
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  createdAt: Date;
  user: {
    id: string;
    email: string;
    name: string;
  } | null;
}

export interface TopProduct {
  id: string;
  name: string;
  price: number;
  totalQuantity: number;
  totalRevenue: number;
}

export interface SalesData {
  date: string;
  revenue: number;
  orderCount: number;
}

export interface CategorySalesData {
  name: string;
  value: number;
}

// ========================================
// ナビゲーション軸API（スライス8-B）
// ========================================

export interface CreateNavigationAxisRequest {
  categoryType: CategoryType;
  axisName: string;
  axisKey: string;
  axisType: AxisType;
  displayType: DisplayType;
  icon?: string;
  options?: string[];
}

export interface UpdateNavigationAxisRequest {
  axisName?: string;
  axisKey?: string;
  axisType?: AxisType;
  displayType?: DisplayType;
  icon?: string;
  isActive?: boolean;
  options?: string[];
}

export interface UpdateAxisOrderRequest {
  newOrder: number;
}

export interface NavigationAxisResponse {
  success: boolean;
  axis: CategoryNavigationAxis;
  message?: string;
}

export interface NavigationAxesListResponse {
  success: boolean;
  axes: CategoryNavigationAxis[];
}

export interface DeleteNavigationAxisResponse {
  success: boolean;
  message: string;
}

// ========================================
// API エンドポイント定義
// ========================================

export const API_PATHS = {
  // 商品管理（管理者）
  ADMIN_PRODUCTS: '/api/admin/products',
  ADMIN_PRODUCT_BY_ID: (id: string) => `/api/admin/products/${id}`,

  // 在庫管理（管理者）
  ADMIN_INVENTORY_LOGS: '/api/admin/inventory-logs',
  ADMIN_INVENTORY_LOG_BY_PRODUCT: (productId: string) => `/api/admin/inventory-logs/${productId}`,

  // 注文管理（管理者）
  ADMIN_ORDERS: '/api/admin/orders',
  ADMIN_ORDER_BY_ID: (id: string) => `/api/admin/orders/${id}`,
  ADMIN_ORDER_SHIP: (id: string) => `/api/admin/orders/${id}/ship`,
  ADMIN_ORDER_INVOICE: (id: string) => `/api/admin/orders/${id}/documents/invoice`,
  ADMIN_ORDER_RECEIPT: (id: string) => `/api/admin/orders/${id}/documents/receipt`,
  ADMIN_ORDER_QUOTE: (id: string) => `/api/admin/orders/${id}/documents/quote`,

  // 顧客管理（管理者）
  ADMIN_CUSTOMERS: '/api/admin/customers',
  ADMIN_CUSTOMER_BY_ID: (id: string) => `/api/admin/customers/${id}`,
  ADMIN_CUSTOMER_TAGS: (id: string) => `/api/admin/customers/${id}/tags`,

  // イベント・チケット管理（管理者）
  ADMIN_EVENTS: '/api/admin/events',
  ADMIN_EVENT_BY_ID: (id: string) => `/api/admin/events/${id}`,
  ADMIN_EVENT_FORM: (id: string) => `/api/admin/events/${id}/form`,
  ADMIN_EVENT_PARTICIPANTS: (id: string) => `/api/admin/events/${id}/participants`,
  ADMIN_EVENT_PARTICIPANTS_CSV: (id: string) => `/api/admin/events/${id}/participants/export/csv`,
  ADMIN_EVENT_PARTICIPANTS_EXCEL: (id: string) => `/api/admin/events/${id}/participants/export/excel`,
  ADMIN_TICKETS_SCAN: '/api/admin/tickets/scan',

  // 問い合わせ管理（管理者）
  ADMIN_INQUIRIES: '/api/admin/inquiries',
  ADMIN_INQUIRY_BY_ID: (id: string) => `/api/admin/inquiries/${id}`,
  ADMIN_INQUIRY_REPLY: (id: string) => `/api/admin/inquiries/${id}/reply`,
  ADMIN_INQUIRY_STATS: '/api/admin/inquiries/stats',
  ADMIN_INQUIRY_TRENDS: '/api/admin/inquiries/trends',

  // システム設定（管理者）
  ADMIN_SETTINGS: '/api/admin/settings',
  ADMIN_SETTINGS_COMPANY: '/api/admin/settings/company',
  ADMIN_SETTINGS_PAYMENT: '/api/admin/settings/payment',
  ADMIN_SETTINGS_EMAIL: '/api/admin/settings/email',
  ADMIN_SETTINGS_DOCUMENT_TEMPLATES: '/api/admin/settings/document-templates',
  ADMIN_SETTINGS_IMAGE_OPTIMIZATION: '/api/admin/settings/image-optimization',

  // ナビゲーション軸設定（管理者）
  ADMIN_NAVIGATION_AXES: '/api/admin/navigation-axes',
  ADMIN_NAVIGATION_AXES_BY_CATEGORY: (category: string) => `/api/admin/navigation-axes/${category}`,
  ADMIN_NAVIGATION_AXIS_BY_ID: (id: string) => `/api/admin/navigation-axes/${id}`,
  ADMIN_NAVIGATION_AXIS_ORDER: (id: string) => `/api/admin/navigation-axes/${id}/order`,

  // サブスク契約（顧客）
  SUBSCRIPTIONS: '/api/subscriptions',
  SUBSCRIPTION_CANCEL: (id: string) => `/api/subscriptions/${id}/cancel`,

  // サブスク契約（管理者）
  ADMIN_SUBSCRIPTIONS: '/api/admin/subscriptions',
  ADMIN_SUBSCRIPTION_BY_ID: (id: string) => `/api/admin/subscriptions/${id}`,
} as const;
