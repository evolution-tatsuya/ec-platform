import { ThemeProvider, CssBaseline } from '@mui/material';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import theme from './theme';
import { AuthProvider } from './contexts/AuthContext';
import { MainLayout } from './layouts';
import { ProtectedRoute, AdminLayout } from './components';
import {
  HomePage,
  NotFoundPage,
  TopPage,
  MyPage,
  ContactPage,
  CarsTopPage,
  CarModelPartsListPage,
  PartsCategoryListPage,
  EventsListPage,
  DigitalProductsListPage,
  AdminCheckinPage,
  AdminProductsPage,
  AdminOrdersPage,
  AdminDashboardPage,
  AdminTicketsPage,
  AdminCustomersPage,
  AdminInquiriesPage,
  AdminSettingsPage,
  AdminNavigationAxesPage,
  AdminLoginPage,
  AdminEventsPage,
} from './pages';
import ProductDetailPage from './pages/ProductDetailPage';
import PricingPage from './pages/PricingPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import AuthPage from './pages/AuthPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AboutPage from './pages/AboutPage';
import LegalPage from './pages/LegalPage';
import PrivacyPage from './pages/PrivacyPage';
import AdminAccountPage from './pages/AdminAccountPage';
import AdminNewsPage from './pages/AdminNewsPage';
import AdminTopPagePage from './pages/AdminTopPagePage';
import AdminEmailPage from './pages/AdminEmailPage';
import AdminSubscriptionsPage from './pages/AdminSubscriptionsPage';
import NewsDetailPage from './pages/NewsDetailPage';
import NewsListPage from './pages/NewsListPage';
import { UserRole } from './types';
import { Header, CustomerLayout } from './components';
import TestPage from './TestPage';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <Routes>
            {/* テストページ（デバッグ用） */}
            <Route path="/test" element={<TestPage />} />

            {/* 受付QRスキャナー（認証不要） */}
            <Route path="/checkin" element={<AdminCheckinPage />} />
            <Route path="/admin/checkin" element={<AdminCheckinPage />} />

            {/* 管理者ログインページ（認証不要、独自レイアウト） */}
            <Route path="/admin/login" element={<AdminLoginPage />} />

            {/* 管理画面（AdminLayoutで統一） */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole={UserRole.ADMIN}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboardPage />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="navigation-axes" element={<AdminNavigationAxesPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
              <Route path="tickets" element={<AdminTicketsPage />} />
              <Route path="customers" element={<AdminCustomersPage />} />
              <Route path="inquiries" element={<AdminInquiriesPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="events" element={<AdminEventsPage />} />
              <Route path="news" element={<AdminNewsPage />} />
              <Route path="top-page" element={<AdminTopPagePage />} />
              <Route path="email" element={<AdminEmailPage />} />
              <Route path="account" element={<AdminAccountPage />} />
            </Route>

            {/* トップページ（独自レイアウト） */}
            <Route
              path="/"
              element={
                <CustomerLayout><TopPage /></CustomerLayout>
              }
            />

            {/* 商品詳細ページ（独自レイアウト） */}
            <Route
              path="/products/:id"
              element={
                <CustomerLayout><ProductDetailPage /></CustomerLayout>
              }
            />

            {/* お知らせ一覧・詳細（独自レイアウト） */}
            <Route
              path="/news"
              element={
                <CustomerLayout><NewsListPage /></CustomerLayout>
              }
            />
            <Route
              path="/news/:id"
              element={
                <CustomerLayout><NewsDetailPage /></CustomerLayout>
              }
            />

            {/* 料金プランページ（サブスク・デジタル販売） */}
            <Route
              path="/pricing"
              element={
                <CustomerLayout><PricingPage /></CustomerLayout>
              }
            />

            {/* カートページ（独自レイアウト） */}
            <Route
              path="/cart"
              element={
                <CustomerLayout><CartPage /></CustomerLayout>
              }
            />

            {/* 購入手続きページ（独自レイアウト） */}
            <Route
              path="/checkout"
              element={
                <CustomerLayout><CheckoutPage /></CustomerLayout>
              }
            />

            {/* マイページ（独自レイアウト） */}
            <Route
              path="/mypage"
              element={
                <CustomerLayout><MyPage /></CustomerLayout>
              }
            />

            {/* お問い合わせページ（独自レイアウト） */}
            <Route
              path="/contact"
              element={
                <CustomerLayout><ContactPage /></CustomerLayout>
              }
            />

            {/* 車パーツトップページ（独自レイアウト） */}
            <Route
              path="/cars"
              element={
                <CustomerLayout><CarsTopPage /></CustomerLayout>
              }
            />

            {/* 車種別パーツ一覧ページ（独自レイアウト） */}
            <Route
              path="/cars/:maker/:model/:type"
              element={
                <CustomerLayout><CarModelPartsListPage /></CustomerLayout>
              }
            />

            {/* パーツカテゴリー一覧ページ（独自レイアウト） */}
            <Route
              path="/cars/parts/:category"
              element={
                <CustomerLayout><PartsCategoryListPage /></CustomerLayout>
              }
            />

            {/* イベント一覧ページ（独自レイアウト） */}
            <Route
              path="/events"
              element={
                <CustomerLayout><EventsListPage /></CustomerLayout>
              }
            />

            {/* デジタル商品一覧ページ（独自レイアウト） */}
            <Route
              path="/digital-products"
              element={
                <CustomerLayout><DigitalProductsListPage /></CustomerLayout>
              }
            />

            {/* 静的情報ページ（フッターリンク） */}
            <Route
              path="/about"
              element={<CustomerLayout><AboutPage /></CustomerLayout>}
            />
            <Route
              path="/legal"
              element={<CustomerLayout><LegalPage /></CustomerLayout>}
            />
            <Route
              path="/privacy"
              element={<CustomerLayout><PrivacyPage /></CustomerLayout>}
            />

            {/* パスワード再設定ページ（メールのリンクから遷移。/auth/* より先に評価） */}
            <Route
              path="/auth/reset-password"
              element={
                <>
                  <Header />
                  <ResetPasswordPage />
                </>
              }
            />

            {/* 認証ページ（独自レイアウト、Headerあり） */}
            <Route
              path="/auth/*"
              element={
                <>
                  <Header />
                  <AuthPage />
                </>
              }
            />

            {/* メインページ（MainLayout） */}
            <Route element={<MainLayout />}>
              <Route path="/home" element={<HomePage />} />

              {/* 404 Not Found */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
