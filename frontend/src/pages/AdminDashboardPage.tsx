import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Container,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  AttachMoney,
  Percent,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { adminAPI } from '../lib/api';
import { Header } from '../components';

// カラーパレット
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

// 注文ステータスの日本語表示
const orderStatusMap: Record<string, string> = {
  pending: '注文確認中',
  confirmed: '確認済み',
  preparing: '準備中',
  shipped: '発送済み',
  delivered: '配達完了',
  cancelled: 'キャンセル',
};

// ステータスカラー
const statusColorMap: Record<string, 'default' | 'primary' | 'success' | 'error' | 'warning'> = {
  pending: 'warning',
  confirmed: 'primary',
  preparing: 'primary',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'error',
};

export default function AdminDashboardPage() {
  // ダッシュボードデータ取得
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: adminAPI.getDashboard,
    refetchInterval: 60000, // 1分ごとに自動更新
  });

  if (isLoading) {
    return (
      <>
        <Header />
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress />
          </Box>
        </Container>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Alert severity="error">ダッシュボードデータの取得に失敗しました</Alert>
        </Container>
      </>
    );
  }

  if (!data) {
    return null;
  }

  const { stats, recentOrders, topProducts, salesTrend, categoryDistribution } = data;

  return (
    <>
      <Header />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          ダッシュボード
        </Typography>

        {/* 統計カード */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* 今月の売上 */}
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      今月の売上
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      ¥{stats.revenue.current.toLocaleString()}
                    </Typography>
                    <Box display="flex" alignItems="center" mt={1}>
                      {stats.revenue.growth >= 0 ? (
                        <TrendingUp color="success" fontSize="small" />
                      ) : (
                        <TrendingDown color="error" fontSize="small" />
                      )}
                      <Typography
                        variant="body2"
                        color={stats.revenue.growth >= 0 ? 'success.main' : 'error.main'}
                        ml={0.5}
                      >
                        {stats.revenue.growth >= 0 ? '+' : ''}
                        {stats.revenue.growth.toFixed(1)}% 前月比
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      bgcolor: 'primary.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AttachMoney sx={{ fontSize: 40, color: 'primary.main' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 今月の注文数 */}
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      今月の注文数
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {stats.orders.current}件
                    </Typography>
                    <Box display="flex" alignItems="center" mt={1}>
                      {stats.orders.growth >= 0 ? (
                        <TrendingUp color="success" fontSize="small" />
                      ) : (
                        <TrendingDown color="error" fontSize="small" />
                      )}
                      <Typography
                        variant="body2"
                        color={stats.orders.growth >= 0 ? 'success.main' : 'error.main'}
                        ml={0.5}
                      >
                        {stats.orders.growth >= 0 ? '+' : ''}
                        {stats.orders.growth.toFixed(1)}% 前月比
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      bgcolor: 'success.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ShoppingCart sx={{ fontSize: 40, color: 'success.main' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 平均注文額 */}
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      平均注文額
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      ¥{Math.round(stats.averageOrderValue).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      今月の平均
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      bgcolor: 'warning.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Percent sx={{ fontSize: 40, color: 'warning.main' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* 売上推移グラフ */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  売上推移（過去30日）
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) =>
                        format(new Date(value), 'M/d', { locale: ja })
                      }
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip
                      formatter={(value: any, name?: string) => {
                        if (name === 'revenue') {
                          return [`¥${Number(value).toLocaleString()}`, '売上額'];
                        }
                        return [value, '注文数'];
                      }}
                      labelFormatter={(value) =>
                        format(new Date(value), 'yyyy年M月d日', { locale: ja })
                      }
                    />
                    <Legend
                      formatter={(value) => (value === 'revenue' ? '売上額' : '注文数')}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#8884d8"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="orderCount"
                      stroke="#82ca9d"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* カテゴリー別売上 */}
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  カテゴリー別売上
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryDistribution as any[]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: any) =>
                        `${name} (${((percent || 0) * 100).toFixed(0)}%)`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => `¥${Number(value).toLocaleString()}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* トップ売れ筋商品 */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  トップ売れ筋商品（今月）
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>商品名</TableCell>
                        <TableCell align="right">販売数</TableCell>
                        <TableCell align="right">売上額</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topProducts.map((product, index) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography
                                variant="caption"
                                sx={{
                                  bgcolor: 'primary.main',
                                  color: 'white',
                                  borderRadius: 1,
                                  px: 1,
                                  py: 0.5,
                                  minWidth: 24,
                                  textAlign: 'center',
                                }}
                              >
                                {index + 1}
                              </Typography>
                              <Typography variant="body2">{product.name}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">{product.totalQuantity}個</TableCell>
                          <TableCell align="right">
                            ¥{product.totalRevenue.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      {topProducts.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} align="center">
                            <Typography variant="body2" color="text.secondary">
                              データがありません
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* 最近の注文 */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  最近の注文
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>注文番号</TableCell>
                        <TableCell>顧客</TableCell>
                        <TableCell align="right">金額</TableCell>
                        <TableCell>ステータス</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>
                            <Typography variant="body2" fontFamily="monospace">
                              {order.orderNumber}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap>
                              {order.user?.displayName || order.user?.email || 'ゲスト'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            ¥{order.totalAmount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={orderStatusMap[order.status] || order.status}
                              size="small"
                              color={statusColorMap[order.status] || 'default'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                      {recentOrders.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
                            <Typography variant="body2" color="text.secondary">
                              データがありません
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}
