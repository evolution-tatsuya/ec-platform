// ===== メインサーバーファイル =====
// 目的: Expressアプリケーションの起動とミドルウェア設定

import express from 'express';
import session from 'express-session';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { prisma } from './config/prisma';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import categoryRoutes from './routes/categoryRoutes';
import cartRoutes from './routes/cartRoutes';
import orderRoutes, { adminOrderRouter } from './routes/orderRoutes';
import settingsRoutes, { adminSettingsRouter } from './routes/settingsRoutes';
import shippingRoutes from './routes/shippingRoutes';
import usersRoutes from './routes/users';
import topPageRoutes from './routes/topPageRoutes';
import ticketsRoutes from './routes/tickets';
import adminProductRoutes from './routes/adminProductRoutes';
import adminDashboardRoutes from './routes/adminDashboardRoutes';
import adminTicketRoutes from './routes/adminTicketRoutes';
import adminCustomerRoutes from './routes/adminCustomerRoutes';
import adminInquiryRoutes from './routes/adminInquiryRoutes';
import adminSettingsExtendedRoutes from './routes/adminSettingsRoutes';
import adminNavigationAxisRoutes from './routes/adminNavigationAxisRoutes';
import favoriteRoutes from './routes/favoriteRoutes';
import adminFavoriteRoutes from './routes/adminFavoriteRoutes';

const app = express();

// ===== セキュリティヘッダー =====
app.use(helmet());

// ===== CORS設定 =====
// 複数のオリジンを許可（localhost と IPアドレスの両方）
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3247',
  'http://localhost:3248',
  'http://localhost:3249',
  'http://localhost:3250',
  'http://192.168.2.100:5173',
  'http://192.168.2.100:3249',
  'http://192.168.2.100:3250',
  'http://172.20.10.10:5173',
  'http://172.20.10.10:3249',
  'http://172.20.10.10:3250',
  config.corsOrigin,
];

app.use(
  cors({
    origin: (origin, callback) => {
      // オリジンがない場合（同一オリジンリクエスト）は許可
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// ===== Body Parser =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== セッション設定 =====
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: config.nodeEnv === 'production', // 本番環境ではHTTPSのみ
      maxAge: 12 * 60 * 60 * 1000, // 12時間
      sameSite: config.nodeEnv === 'production' ? 'strict' : 'lax',
    },
  })
);

// ===== ヘルスチェックエンドポイント =====
app.get('/api/health', async (req, res) => {
  try {
    // データベース接続確認
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
    });
  }
});

// ===== ルーター登録 =====
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/top-page', topPageRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/admin/settings', adminSettingsRouter);
app.use('/api/admin/orders', adminOrderRouter);
app.use('/api/admin/products', adminProductRoutes);
app.use('/api/admin', adminDashboardRoutes);
app.use('/api/admin', adminTicketRoutes);
app.use('/api/admin', adminCustomerRoutes);
app.use('/api/admin', adminInquiryRoutes);
app.use('/api/admin', adminSettingsExtendedRoutes);
app.use('/api/admin', adminNavigationAxisRoutes);
app.use('/api/admin', adminFavoriteRoutes);

// TODO: 他のルーターを追加
// app.use('/api/inquiries', inquiryRoutes);
// app.use('/api/admin', adminRoutes);

// ===== 404エラーハンドリング =====
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Not Found',
  });
});

// ===== エラーハンドリングミドルウェア =====
app.use(errorHandler);

// ===== サーバー起動 =====
const PORT = config.port;

// 0.0.0.0でリッスン（すべてのネットワークインターフェースで接続可能）
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
=================================
🚀 Server is running!
=================================
Environment: ${config.nodeEnv}
Port: ${PORT}
Backend URL: ${config.backendUrl}
Frontend URL: ${config.frontendUrl}
=================================
  `);
});

// ===== グレースフルシャットダウン =====
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});
