// ========================================
// 型定義ファイル（フロントエンド）
// ========================================
// 注意: backend/src/types/index.tsと完全同期すること
// 更新日時: 2026-02-03

// ========================================
// Product Type (先頭に配置 - 優先度高)
// ========================================

// Tag interface
export interface Tag {
  id: string;
  name: string;
}

// ProductAttribute interface
export interface ProductAttribute {
  id: string;
  productId: string;
  axisKey: string;
  value: string;
}

// ShippingSettings interface
export interface ShippingSettings {
  allowWeekendDelivery: boolean;
  allowDateSelection: boolean;
  allowTimeSelection: boolean;
  preparationDays: number;
}

// ========================================
// Enums
// ========================================

export enum ProductType {
  PHYSICAL = 'PHYSICAL',
  DIGITAL = 'DIGITAL',
  DIGITAL_TICKET = 'DIGITAL_TICKET',
  EXTERNAL_LINK = 'EXTERNAL_LINK',
}

export enum CategoryType {
  CARS = 'cars',
  EVENTS = 'events',
  DIGITAL = 'digital',
}

// ========================================
// Product Interface (Enumの直後に配置)
// ========================================

export interface Product {
  id: string;
  name: string;
  slug?: string;
  price: number;
  description?: string;
  productType: ProductType;
  categoryType: CategoryType;
  images: string[];
  externalUrl?: string;
  shippingSettings?: ShippingSettings;
  preparationDays?: number;
  allowWeekendDelivery?: boolean;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
  attributes: ProductAttribute[];
  tags: Tag[];
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
  AI_RESOLVED = 'AI_RESOLVED',
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
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
// Digital Download（フロントエンド用）
// ========================================
// 注意: バックエンドのDigitalProduct（R2ストレージ用）はフロントエンドでは使用しません

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

export interface EventFormTemplate {
  id: string;
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
  fieldType: string;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface InquiryRequest {
  name: string;
  email: string;
  question: string;
}

export interface InquiryResponse {
  success: boolean;
  message: string;
  inquiry: Inquiry;
  aiModel?: string;
  aiResponse?: string;
}

export interface InquiryHistory extends Inquiry {
  // InquiryHistoryはInquiryと同じ構造
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
  reason?: string;
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

export interface NewsItem {
  id: string;
  title: string;
  content?: string;
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
// P-007: 商品詳細ページ（フロントエンド専用）
// ========================================

export interface ProductDetail extends Product {
  stockQuantity: number;
  salePrice?: number;
  relatedProducts: RelatedProduct[];
  variants?: ProductVariant[];
  variantOptions?: VariantOption[];
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  salePrice?: number;
  stockQuantity: number;
  sku?: string;
  selectedOptions: Record<string, string>;
}

export interface VariantOption {
  name: string;
  key: string;
  values: VariantOptionValue[];
  required: boolean;
}

export interface VariantOptionValue {
  value: string;
  label: string;
}

export interface RelatedProduct {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  categoryType: CategoryType;
}

export interface ProductDetailPageData {
  product: ProductDetail;
  breadcrumb: BreadcrumbItem[];
}

export interface BreadcrumbItem {
  label: string;
  url?: string;
}

// ========================================
// Event (イベント) - フロントエンド専用型
// ========================================

export interface Event {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  startDate: Date;
  endDate: Date;
  location: string;
  capacity: number;
  remainingCapacity: number;
  eventType: string;
  tags: Tag[];
  createdAt: Date;
  updatedAt: Date;
}

// ========================================
// Digital Product Display - フロントエンド専用型
// ========================================
// 注意: バックエンドにも同名のDigitalProduct型が存在しますが、
// バックエンドはR2ストレージ用、フロントエンドはUI表示用です

export interface DigitalProductDisplay {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  digitalType: string;
  genre: string;
  fileSize?: string;
  format?: string;
  tags: Tag[];
  createdAt: Date;
  updatedAt: Date;
}

// 互換性のため、DigitalProductとしてもエクスポート
export type DigitalProduct = DigitalProductDisplay;

// ========================================
// Navigation Filter State（フロントエンド専用）
// ========================================

export interface NavigationFilterState {
  [axisKey: string]: string | string[];
}

// すべての型は個別にエクスポート済み
