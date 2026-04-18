/**
 * バックエンドAPI接続モジュール
 *
 * すべてのAPI呼び出しはこのファイルを経由します
 */

// バックエンドURL（環境変数から取得、デフォルトはlocalhost:8432）
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8432';

/**
 * API呼び出しのベース関数
 */
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // クッキー（セッション）を含める
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      // エラーレスポンスの場合
      throw new Error(data.message || `HTTP Error ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

// ========================================
// 認証API
// ========================================

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    name: string;
    isAdmin: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

export const authAPI = {
  /**
   * 会員登録
   */
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    return fetchAPI<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * ログイン
   */
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    return fetchAPI<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * ログアウト
   */
  logout: async (): Promise<{ success: boolean; message: string }> => {
    return fetchAPI('/api/auth/logout', {
      method: 'POST',
    });
  },

  /**
   * セッション確認（現在ログインしているユーザー情報を取得）
   */
  getSession: async (): Promise<AuthResponse> => {
    return fetchAPI<AuthResponse>('/api/auth/session');
  },
};

// ========================================
// 商品API
// ========================================

export interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  productType: string;
  categoryId: string;
  images: string[];
  externalUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    name: string;
    categoryType: string;
  };
}

export interface ProductsResponse {
  success: boolean;
  products: Product[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface ProductDetailResponse {
  success: boolean;
  product: Product;
}

export const productAPI = {
  /**
   * 商品一覧取得
   */
  getProducts: async (params?: {
    categoryId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<ProductsResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.categoryId) queryParams.append('categoryId', params.categoryId);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const query = queryParams.toString();
    const endpoint = `/api/products${query ? `?${query}` : ''}`;

    return fetchAPI<ProductsResponse>(endpoint);
  },

  /**
   * 商品詳細取得
   */
  getProductById: async (id: string): Promise<ProductDetailResponse> => {
    return fetchAPI<ProductDetailResponse>(`/api/products/${id}`);
  },
};

// ========================================
// カテゴリーAPI
// ========================================

export interface Category {
  id: string;
  name: string;
  categoryType: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoriesResponse {
  success: boolean;
  categories: Category[];
}

export const categoryAPI = {
  /**
   * カテゴリー一覧取得
   */
  getCategories: async (params?: {
    categoryType?: string;
  }): Promise<CategoriesResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.categoryType)
      queryParams.append('categoryType', params.categoryType);

    const query = queryParams.toString();
    const endpoint = `/api/categories${query ? `?${query}` : ''}`;

    return fetchAPI<CategoriesResponse>(endpoint);
  },
};

// ========================================
// カートAPI
// ========================================

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  product: Product;
  currentStock: number;
  subtotal: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  totalAmount: number;
  totalItems: number;
}

export interface CartResponse {
  success: boolean;
  cart: Cart;
}

export interface AddToCartRequest {
  productId: string;
  quantity: number;
}

export interface AddToCartResponse {
  success: boolean;
  message: string;
  cartItem: CartItem;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export interface UpdateCartItemResponse {
  success: boolean;
  message: string;
  cartItem: CartItem;
}

export interface RemoveFromCartResponse {
  success: boolean;
  message: string;
}

export const cartAPI = {
  /**
   * カート内容取得
   */
  getCart: async (): Promise<CartResponse> => {
    return fetchAPI<CartResponse>('/api/cart');
  },

  /**
   * カートに商品を追加
   */
  addToCart: async (data: AddToCartRequest): Promise<AddToCartResponse> => {
    return fetchAPI<AddToCartResponse>('/api/cart', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * カートアイテムの数量を更新
   */
  updateCartItem: async (
    itemId: string,
    data: UpdateCartItemRequest
  ): Promise<UpdateCartItemResponse> => {
    return fetchAPI<UpdateCartItemResponse>(`/api/cart/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * カートアイテムを削除
   */
  removeFromCart: async (itemId: string): Promise<RemoveFromCartResponse> => {
    return fetchAPI<RemoveFromCartResponse>(`/api/cart/${itemId}`, {
      method: 'DELETE',
    });
  },

  /**
   * カートを全てクリア
   */
  clearCart: async (): Promise<RemoveFromCartResponse> => {
    return fetchAPI<RemoveFromCartResponse>('/api/cart/clear/all', {
      method: 'DELETE',
    });
  },
};

// ========================================
// 注文API
// ========================================

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  createdAt: string;
  product: Product;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: 'pending' | 'paid' | 'preparing' | 'shipped' | 'completed' | 'cancelled';
  paymentMethod: 'bank_transfer' | 'credit_card' | 'paypay';
  totalAmount: number;
  shippingAddress: string | null;
  trackingNumber: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface CreateOrderRequest {
  paymentMethod: 'bank_transfer' | 'credit_card' | 'paypay';
  shippingAddress: string;
}

export interface CreateOrderResponse {
  success: boolean;
  message: string;
  order: Order;
}

export interface OrdersResponse {
  success: boolean;
  orders: Order[];
}

export interface OrderDetailResponse {
  success: boolean;
  order: Order;
  alreadyCheckedIn?: boolean;
}

export const orderAPI = {
  /**
   * 注文作成（カートから注文を作成）
   */
  createOrder: async (data: CreateOrderRequest): Promise<CreateOrderResponse> => {
    return fetchAPI<CreateOrderResponse>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * 注文一覧取得
   */
  getOrders: async (): Promise<OrdersResponse> => {
    return fetchAPI<OrdersResponse>('/api/orders');
  },

  /**
   * 注文詳細取得（注文番号で取得）
   */
  getOrderByOrderNumber: async (orderNumber: string): Promise<OrderDetailResponse> => {
    return fetchAPI<OrderDetailResponse>(`/api/orders/${orderNumber}`);
  },

  /**
   * 受付処理（管理者専用）
   */
  checkinOrder: async (orderNumber: string): Promise<OrderDetailResponse> => {
    return fetchAPI<OrderDetailResponse>(`/api/admin/orders/${orderNumber}/checkin`, {
      method: 'POST',
    });
  },
};

// ========================================
// サイト設定API
// ========================================

export interface SiteSettings {
  enableDeliveryDateTime: boolean;
  bankTransferDiscount: number;
}

export interface SettingsResponse {
  success: boolean;
  settings: SiteSettings;
}

export interface UpdateSettingsRequest {
  enableDeliveryDateTime?: boolean;
  bankTransferDiscount?: number;
}

export interface UpdateSettingsResponse {
  success: boolean;
  message: string;
  settings: SiteSettings;
}

export const settingsAPI = {
  /**
   * サイト設定取得
   */
  getSettings: async (): Promise<SettingsResponse> => {
    return fetchAPI<SettingsResponse>('/api/settings');
  },

  /**
   * サイト設定更新（管理者のみ）
   */
  updateSettings: async (data: UpdateSettingsRequest): Promise<UpdateSettingsResponse> => {
    return fetchAPI<UpdateSettingsResponse>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// ========================================
// トップページAPI
// ========================================

export interface HeroSlide {
  id: string;
  imageUrl: string;
  title: string;
  description: string | null;
  linkUrl: string | null;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MegaCategory {
  id: string;
  categoryType: string;
  name: string;
  description: string | null;
  backgroundImageUrl: string | null;
  linkUrl: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  publishedAt: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TopPageData {
  heroSlides: HeroSlide[];
  megaCategories: MegaCategory[];
  pickupProducts: any[];
  newProducts: Product[];
  saleProducts: Product[];
  popularProducts: Product[];
  news: NewsItem[];
}

export interface TopPageResponse {
  success: boolean;
  data: TopPageData;
}

export const topPageAPI = {
  /**
   * トップページデータ取得
   */
  getTopPageData: async (): Promise<TopPageResponse> => {
    return fetchAPI<TopPageResponse>('/api/top-page');
  },
};

// ========================================
// 管理画面API
// ========================================

export interface DashboardStats {
  revenue: {
    current: number;
    growth: number;
  };
  orders: {
    current: number;
    growth: number;
  };
  averageOrderValue: number;
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
  } | null;
}

export interface TopProduct {
  id: string;
  name: string;
  price: number;
  mainImageUrl: string | null;
  totalQuantity: number;
  totalRevenue: number;
}

export interface SalesTrendData {
  date: string;
  revenue: number;
  orderCount: number;
}

export interface CategoryDistributionData {
  name: string;
  value: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recentOrders: RecentOrder[];
  topProducts: TopProduct[];
  salesTrend: SalesTrendData[];
  categoryDistribution: CategoryDistributionData[];
}

export interface DigitalTicket {
  id: string;
  orderId: string;
  orderItemId: string;
  productId: string;
  ticketCode: string;
  qrCodeData: string;
  isUsed: boolean;
  usedAt: string | null;
  createdAt: string;
  order: {
    orderNumber: string;
    createdAt: string;
    status: string;
    user: {
      id: string;
      email: string;
      name: string | null;
    } | null;
  };
  product: {
    id: string;
    name: string;
    price: number;
    productType: string;
  };
  orderItem: {
    quantity: number;
    price: number;
  };
}

export interface TicketStats {
  totalTickets: number;
  usedTickets: number;
  unusedTickets: number;
  usageRate: number;
  ticketsByEvent: {
    productId: string;
    productName: string;
    ticketCount: number;
  }[];
}

export const adminAPI = {
  /**
   * ダッシュボード統計データ取得
   */
  getDashboard: async (): Promise<DashboardData> => {
    return fetchAPI<DashboardData>('/api/admin/dashboard');
  },

  /**
   * チケット一覧取得
   */
  getTickets: async (params?: {
    search?: string;
    isUsed?: boolean;
    productId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ tickets: DigitalTicket[]; pagination: any }> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.isUsed !== undefined) query.append('isUsed', String(params.isUsed));
    if (params?.productId) query.append('productId', params.productId);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    return fetchAPI(`/api/admin/tickets?${query.toString()}`);
  },

  /**
   * チケット統計取得
   */
  getTicketStats: async (): Promise<TicketStats> => {
    return fetchAPI<TicketStats>('/api/admin/tickets/stats');
  },

  /**
   * チケット使用
   */
  useTicket: async (ticketId: string): Promise<{ message: string; ticket: DigitalTicket }> => {
    return fetchAPI(`/api/admin/tickets/${ticketId}/use`, {
      method: 'PUT',
    });
  },

  /**
   * チケットリセット
   */
  resetTicket: async (ticketId: string): Promise<{ message: string; ticket: DigitalTicket }> => {
    return fetchAPI(`/api/admin/tickets/${ticketId}/reset`, {
      method: 'PUT',
    });
  },

  /**
   * 顧客一覧取得
   */
  getCustomers: async (params?: {
    search?: string;
    hasOrders?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ customers: any[]; pagination: any }> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.hasOrders !== undefined) query.append('hasOrders', String(params.hasOrders));
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    return fetchAPI(`/api/admin/customers?${query.toString()}`);
  },

  /**
   * 顧客詳細取得
   */
  getCustomerById: async (customerId: string): Promise<any> => {
    return fetchAPI(`/api/admin/customers/${customerId}`);
  },

  /**
   * 顧客統計取得
   */
  getCustomerStats: async (): Promise<any> => {
    return fetchAPI('/api/admin/customers/stats');
  },

  /**
   * 顧客情報更新
   */
  updateCustomer: async (customerId: string, data: any): Promise<{ message: string; customer: any }> => {
    return fetchAPI(`/api/admin/customers/${customerId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * 問い合わせ一覧取得
   */
  getInquiries: async (params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ inquiries: any[]; pagination: any }> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    return fetchAPI(`/api/admin/inquiries?${query.toString()}`);
  },

  /**
   * 問い合わせ詳細取得
   */
  getInquiryById: async (inquiryId: string): Promise<any> => {
    return fetchAPI(`/api/admin/inquiries/${inquiryId}`);
  },

  /**
   * 問い合わせ統計取得
   */
  getInquiryStats: async (): Promise<any> => {
    return fetchAPI('/api/admin/inquiries/stats');
  },

  /**
   * 問い合わせに返信
   */
  replyToInquiry: async (inquiryId: string, reply: string): Promise<{ message: string; inquiry: any }> => {
    return fetchAPI(`/api/admin/inquiries/${inquiryId}/reply`, {
      method: 'PUT',
      body: JSON.stringify({ reply }),
    });
  },

  /**
   * 問い合わせステータス更新
   */
  updateInquiryStatus: async (inquiryId: string, status: string): Promise<{ message: string; inquiry: any }> => {
    return fetchAPI(`/api/admin/inquiries/${inquiryId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  /**
   * 問い合わせ削除
   */
  deleteInquiry: async (inquiryId: string): Promise<{ message: string }> => {
    return fetchAPI(`/api/admin/inquiries/${inquiryId}`, {
      method: 'DELETE',
    });
  },

  /**
   * システム設定取得（管理者向け全設定）
   */
  getFullSettings: async (): Promise<{ success: boolean; settings: any }> => {
    return fetchAPI('/api/admin/settings/full');
  },

  /**
   * システム設定更新（管理者向け全設定）
   */
  updateFullSettings: async (data: any): Promise<{ success: boolean; message: string; settings: any }> => {
    return fetchAPI('/api/admin/settings/full', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * ナビゲーション軸一覧取得
   */
  getNavigationAxes: async (params?: {
    categoryType?: string;
  }): Promise<{ success: boolean; axes: any[] }> => {
    const query = new URLSearchParams();
    if (params?.categoryType) query.append('categoryType', params.categoryType);

    return fetchAPI(`/api/admin/navigation-axes?${query.toString()}`);
  },

  /**
   * ナビゲーション軸追加
   */
  createNavigationAxis: async (data: any): Promise<{ success: boolean; message: string; axis: any }> => {
    return fetchAPI('/api/admin/navigation-axes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * ナビゲーション軸更新
   */
  updateNavigationAxis: async (axisId: string, data: any): Promise<{ success: boolean; message: string; axis: any }> => {
    return fetchAPI(`/api/admin/navigation-axes/${axisId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * ナビゲーション軸削除
   */
  deleteNavigationAxis: async (axisId: string): Promise<{ success: boolean; message: string }> => {
    return fetchAPI(`/api/admin/navigation-axes/${axisId}`, {
      method: 'DELETE',
    });
  },

  /**
   * ナビゲーション軸の表示順序変更
   */
  updateNavigationAxisOrder: async (axisId: string, newOrder: number): Promise<{ success: boolean; message: string; axis: any }> => {
    return fetchAPI(`/api/admin/navigation-axes/${axisId}/order`, {
      method: 'PUT',
      body: JSON.stringify({ newOrder }),
    });
  },

  // ========================================
  // お気に入り API（顧客向け）
  // ========================================

  /**
   * ログインユーザーのお気に入り一覧取得
   */
  getFavorites: async (): Promise<any[]> => {
    return fetchAPI('/api/favorites');
  },

  /**
   * お気に入り追加
   */
  addFavorite: async (productId: string): Promise<any> => {
    return fetchAPI('/api/favorites', {
      method: 'POST',
      body: JSON.stringify({ productId }),
    });
  },

  /**
   * お気に入り削除
   */
  removeFavorite: async (productId: string): Promise<{ message: string }> => {
    return fetchAPI(`/api/favorites/${productId}`, {
      method: 'DELETE',
    });
  },

  /**
   * 特定商品がお気に入りに入っているかチェック
   */
  checkFavorite: async (productId: string): Promise<{ isFavorite: boolean }> => {
    return fetchAPI(`/api/favorites/check/${productId}`);
  },

  // ========================================
  // お気に入り API（管理者向け）
  // ========================================

  /**
   * 全ユーザーのお気に入り一覧取得（管理者用）
   */
  getAllFavorites: async (): Promise<any[]> => {
    return fetchAPI('/api/admin/favorites');
  },

  /**
   * 特定ユーザーのお気に入り一覧取得（管理者用）
   */
  getUserFavorites: async (userId: string): Promise<any[]> => {
    return fetchAPI(`/api/admin/favorites/user/${userId}`);
  },

  /**
   * お気に入り統計情報取得（管理者用）
   */
  getFavoriteStats: async (): Promise<{
    totalFavorites: number;
    uniqueUserCount: number;
    popularProducts: any[];
  }> => {
    return fetchAPI('/api/admin/favorites/stats');
  },

  // ========================================
  // 商品管理 API（管理者向け）
  // ========================================

  /**
   * 管理者用商品一覧取得
   */
  getAdminProducts: async (params?: {
    search?: string;
    categoryType?: string;
    productType?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ products: any[]; pagination: any; totalStock: any }> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.categoryType) query.append('categoryType', params.categoryType);
    if (params?.productType) query.append('productType', params.productType);
    if (params?.isActive !== undefined) query.append('isActive', String(params.isActive));
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    return fetchAPI(`/api/admin/products?${query.toString()}`);
  },

  /**
   * 商品追加（管理者用）
   */
  createAdminProduct: async (data: any): Promise<{ success: boolean; message: string; product: any }> => {
    return fetchAPI('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * 商品更新（管理者用）
   */
  updateAdminProduct: async (productId: string, data: any): Promise<{ success: boolean; message: string; product: any }> => {
    return fetchAPI(`/api/admin/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * 商品削除（管理者用）
   */
  deleteAdminProduct: async (productId: string): Promise<{ success: boolean; message: string }> => {
    return fetchAPI(`/api/admin/products/${productId}`, {
      method: 'DELETE',
    });
  },

  /**
   * 在庫調整（管理者用）
   */
  adjustInventory: async (productId: string, data: {
    quantity: number;
    type: 'stock_in' | 'stock_out' | 'manual_adjustment' | 'correction';
    reason?: string;
  }): Promise<{ success: boolean; message: string; log: any }> => {
    return fetchAPI(`/api/admin/products/${productId}/inventory`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * 在庫ログ取得（管理者用）
   */
  getInventoryLogs: async (productId: string): Promise<{ success: boolean; logs: any[]; currentStock: number }> => {
    return fetchAPI(`/api/admin/products/${productId}/inventory-logs`);
  },

  // ========================================
  // 注文管理 API（管理者向け）
  // ========================================

  /**
   * 管理者用注文一覧取得
   */
  getAdminOrders: async (params?: {
    search?: string;
    status?: string;
    paymentMethod?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ orders: any[]; pagination: any; stats: any }> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.paymentMethod) query.append('paymentMethod', params.paymentMethod);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    return fetchAPI(`/api/admin/orders?${query.toString()}`);
  },

  /**
   * 注文詳細取得（管理者用）
   */
  getAdminOrderById: async (orderId: string): Promise<{ success: boolean; order: any }> => {
    return fetchAPI(`/api/admin/orders/${orderId}`);
  },

  /**
   * 注文ステータス更新（管理者用）
   */
  updateOrderStatus: async (orderId: string, data: {
    status: string;
    note?: string;
  }): Promise<{ success: boolean; message: string; order: any }> => {
    return fetchAPI(`/api/admin/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * 注文発送処理（管理者用）
   */
  shipOrder: async (orderId: string, data: {
    carrier: string;
    trackingNumber: string;
  }): Promise<{ success: boolean; message: string; order: any }> => {
    return fetchAPI(`/api/admin/orders/${orderId}/ship`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * 注文キャンセル（管理者用）
   */
  cancelOrder: async (orderId: string, data: {
    reason: string;
  }): Promise<{ success: boolean; message: string; order: any }> => {
    return fetchAPI(`/api/admin/orders/${orderId}/cancel`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// ========================================
// ナビゲーション軸管理API（管理者）
// ========================================

export const navigationAPI = {
  /**
   * 全カテゴリーの軸取得（管理者）
   * @API_INTEGRATION
   */
  getAdminNavigationAxes: async (): Promise<any> => {
    throw new Error('API not implemented');
  },

  /**
   * カテゴリー別軸取得（管理者）
   * @API_INTEGRATION
   */
  getAdminNavigationAxesByCategory: async (_category: string): Promise<any> => {
    throw new Error('API not implemented');
  },

  /**
   * 軸追加（管理者）
   * @API_INTEGRATION
   */
  createAdminNavigationAxis: async (_data: {
    categoryType: string;
    axisName: string;
    axisKey: string;
    order: number;
    axisType: string;
    options: string[];
    displayType: string;
    icon?: string;
    placeholder?: string;
    parentAxisKey?: string;
  }): Promise<any> => {
    throw new Error('API not implemented');
  },

  /**
   * 軸更新（管理者）
   * @API_INTEGRATION
   */
  updateAdminNavigationAxis: async (_id: string, _data: {
    axisName?: string;
    axisKey?: string;
    order?: number;
    axisType?: string;
    options?: string[];
    displayType?: string;
    icon?: string;
    placeholder?: string;
    parentAxisKey?: string;
  }): Promise<any> => {
    throw new Error('API not implemented');
  },

  /**
   * 軸削除（管理者）
   * @API_INTEGRATION
   */
  deleteAdminNavigationAxis: async (_id: string): Promise<any> => {
    throw new Error('API not implemented');
  },

  /**
   * 軸順序変更（管理者）
   * @API_INTEGRATION
   */
  updateAdminNavigationAxisOrder: async (_id: string, _data: {
    newOrder: number;
  }): Promise<any> => {
    throw new Error('API not implemented');
  },
};
