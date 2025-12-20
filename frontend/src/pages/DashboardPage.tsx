import React from 'react';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PeopleIcon from '@mui/icons-material/People';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

// モックデータ
const statsData = [
  { label: '今月の売上', value: '¥1,234,567', icon: <AttachMoneyIcon />, color: '#1976d2' },
  { label: '注文数', value: '156', icon: <ShoppingCartIcon />, color: '#2e7d32' },
  { label: '新規会員', value: '23', icon: <PeopleIcon />, color: '#9c27b0' },
  { label: '成長率', value: '+12.5%', icon: <TrendingUpIcon />, color: '#ed6c02' },
];

const salesData = [
  { month: '1月', sales: 120000, orders: 45 },
  { month: '2月', sales: 150000, orders: 52 },
  { month: '3月', sales: 180000, orders: 61 },
  { month: '4月', sales: 220000, orders: 78 },
  { month: '5月', sales: 260000, orders: 89 },
  { month: '6月', sales: 310000, orders: 95 },
];

const categoryData = [
  { name: '車パーツ', sales: 450000 },
  { name: 'イベント', sales: 280000 },
  { name: 'デジタル', sales: 180000 },
];

const recentOrders = [
  { id: 'ORD-001', customer: '山田太郎', amount: 35000, status: 'shipped', date: '2025-12-19' },
  { id: 'ORD-002', customer: '佐藤花子', amount: 12000, status: 'preparing', date: '2025-12-19' },
  { id: 'ORD-003', customer: '鈴木一郎', amount: 8500, status: 'pending', date: '2025-12-18' },
  { id: 'ORD-004', customer: '田中美咲', amount: 25000, status: 'shipped', date: '2025-12-18' },
  { id: 'ORD-005', customer: '高橋健太', amount: 15000, status: 'delivered', date: '2025-12-17' },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'preparing':
      return 'info';
    case 'shipped':
      return 'primary';
    case 'delivered':
      return 'success';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending':
      return '未決済';
    case 'preparing':
      return '準備中';
    case 'shipped':
      return '発送済';
    case 'delivered':
      return '配達完了';
    default:
      return status;
  }
};

export const DashboardPage: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4 }}>
        管理ダッシュボード
      </Typography>

      {/* 統計カード */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsData.map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.label}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box
                    sx={{
                      bgcolor: stat.color,
                      color: 'white',
                      p: 1,
                      borderRadius: 1,
                      mr: 2,
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {stat.label}
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* グラフエリア */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* 売上推移グラフ */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              売上推移
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#1976d2"
                  name="売上（円）"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="#2e7d32"
                  name="注文数"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* カテゴリー別売上グラフ */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              カテゴリー別売上
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sales" fill="#1976d2" name="売上（円）" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* 最近の注文 */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          最近の注文
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>注文番号</TableCell>
                <TableCell>顧客名</TableCell>
                <TableCell align="right">金額</TableCell>
                <TableCell>ステータス</TableCell>
                <TableCell>注文日</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentOrders.map((order) => (
                <TableRow key={order.id} hover>
                  <TableCell>{order.id}</TableCell>
                  <TableCell>{order.customer}</TableCell>
                  <TableCell align="right">¥{order.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(order.status)}
                      color={getStatusColor(order.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{order.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
};
