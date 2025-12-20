// ========================================
// 型定義ファイル（フロントエンド）
// ========================================
// 注意: backend/src/types/index.tsと完全同期すること

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
// Product
// ========================================

export interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  productType: ProductType;
  categoryType: CategoryType;
  images: string[];
  externalUrl?: string;
  shippingSettings?: ShippingSettings;
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
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  shippingAddress?: string;
  shippingPostalCode?: string;
  shippingPhone?: string;
  shippingOptions?: ShippingOptions;
  notes?: string;
  isDefaultAddress: boolean;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItem[];
  shipmentHistory: ShipmentHistory[];
  digitalTickets: DigitalTicket[];
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
