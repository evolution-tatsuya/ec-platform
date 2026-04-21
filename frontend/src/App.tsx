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
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import AuthPage from './pages/AuthPage';
import { UserRole } from './types';
import { Box } from '@mui/material';
import { Header } from './components';
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
              <Route path="navigation" element={<AdminNavigationAxesPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="tickets" element={<AdminTicketsPage />} />
              <Route path="customers" element={<AdminCustomersPage />} />
              <Route path="inquiries" element={<AdminInquiriesPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="events" element={<AdminEventsPage />} />
            </Route>

            {/* トップページ（独自レイアウト） */}
            <Route
              path="/"
              element={
                <Box sx={{ minHeight: '100vh', width: '100%' }}>
                  <Header />
                  <TopPage />
                </Box>
              }
            />

            {/* 商品詳細ページ（独自レイアウト） */}
            <Route
              path="/products/:id"
              element={
                <Box sx={{ minHeight: '100vh', width: '100%' }}>
                  <Header />
                  <ProductDetailPage />
                </Box>
              }
            />

            {/* カートページ（独自レイアウト） */}
            <Route
              path="/cart"
              element={
                <Box sx={{ minHeight: '100vh', width: '100%' }}>
                  <Header />
                  <CartPage />
                </Box>
              }
            />

            {/* 購入手続きページ（独自レイアウト） */}
            <Route
              path="/checkout"
              element={
                <Box sx={{ minHeight: '100vh', width: '100%' }}>
                  <Header />
                  <CheckoutPage />
                </Box>
              }
            />

            {/* マイページ（独自レイアウト） */}
            <Route
              path="/mypage"
              element={
                <Box sx={{ minHeight: '100vh', width: '100%' }}>
                  <Header />
                  <MyPage />
                </Box>
              }
            />

            {/* お問い合わせページ（独自レイアウト） */}
            <Route
              path="/contact"
              element={
                <Box sx={{ minHeight: '100vh', width: '100%' }}>
                  <Header />
                  <ContactPage />
                </Box>
              }
            />

            {/* 車パーツトップページ（独自レイアウト） */}
            <Route
              path="/cars"
              element={
                <Box sx={{ minHeight: '100vh', width: '100%' }}>
                  <Header />
                  <CarsTopPage />
                </Box>
              }
            />

            {/* 車種別パーツ一覧ページ（独自レイアウト） */}
            <Route
              path="/cars/:maker/:model/:type"
              element={
                <Box sx={{ minHeight: '100vh', width: '100%' }}>
                  <Header />
                  <CarModelPartsListPage />
                </Box>
              }
            />

            {/* パーツカテゴリー一覧ページ（独自レイアウト） */}
            <Route
              path="/cars/parts/:category"
              element={
                <Box sx={{ minHeight: '100vh', width: '100%' }}>
                  <Header />
                  <PartsCategoryListPage />
                </Box>
              }
            />

            {/* イベント一覧ページ（独自レイアウト） */}
            <Route
              path="/events"
              element={
                <Box sx={{ minHeight: '100vh', width: '100%' }}>
                  <Header />
                  <EventsListPage />
                </Box>
              }
            />

            {/* デジタル商品一覧ページ（独自レイアウト） */}
            <Route
              path="/digital-products"
              element={
                <Box sx={{ minHeight: '100vh', width: '100%' }}>
                  <Header />
                  <DigitalProductsListPage />
                </Box>
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
