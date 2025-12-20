import { ThemeProvider, CssBaseline } from '@mui/material';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import theme from './theme';
import { AuthProvider } from './contexts/AuthContext';
import { MainLayout, PublicLayout } from './layouts';
import { ProtectedRoute } from './components';
import { LoginPage, HomePage, DashboardPage, NotFoundPage } from './pages';
import { UserRole } from './types';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <Routes>
            {/* 公開ページ（PublicLayout） */}
            <Route element={<PublicLayout />}>
              <Route path="/auth/login" element={<LoginPage />} />
            </Route>

            {/* メインページ（MainLayout） */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<HomePage />} />

              {/* 管理画面（要管理者権限） */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRole={UserRole.ADMIN}>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />

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
