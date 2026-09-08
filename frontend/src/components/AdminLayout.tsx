import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Avatar,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Inventory,
  ShoppingCart,
  Event,
  People,
  ContactMail,
  Settings,
  Navigation as NavigationIcon,
  Campaign as NewsIcon,
  AccountCircle,
  Logout,
  ManageAccounts,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

const drawerWidth = 240;

interface NavItem {
  text: string;
  icon: React.ReactElement;
  path: string;
}

const navItems: NavItem[] = [
  { text: 'ダッシュボード', icon: <Dashboard />, path: '/admin' },
  { text: '商品管理', icon: <Inventory />, path: '/admin/products' },
  { text: '注文管理', icon: <ShoppingCart />, path: '/admin/orders' },
  { text: 'イベント・チケット', icon: <Event />, path: '/admin/events' },
  { text: '顧客管理', icon: <People />, path: '/admin/customers' },
  { text: '問い合わせ管理', icon: <ContactMail />, path: '/admin/inquiries' },
  { text: 'お知らせ管理', icon: <NewsIcon />, path: '/admin/news' },
  { text: 'システム設定', icon: <Settings />, path: '/admin/settings' },
  { text: 'ナビゲーション軸', icon: <NavigationIcon />, path: '/admin/navigation-axes' },
];

export default function AdminLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // アカウントメニュー（右上）
  const [accountAnchor, setAccountAnchor] = useState<null | HTMLElement>(null);
  const accountMenuOpen = Boolean(accountAnchor);

  const handleAccountMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAccountAnchor(e.currentTarget);
  };
  const handleAccountMenuClose = () => setAccountAnchor(null);

  const handleAccountSettings = () => {
    handleAccountMenuClose();
    navigate('/admin/account');
  };

  const handleLogout = async () => {
    handleAccountMenuClose();
    await logout();
    navigate('/admin/login');
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          管理画面
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              component={Link}
              to={item.path}
              selected={location.pathname === item.path}
              onClick={isMobile ? handleDrawerToggle : undefined}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            多機能ECプラットフォーム
          </Typography>

          {/* 右側: アカウントメニュー */}
          <Box sx={{ flexGrow: 1 }} />
          <Box
            onClick={handleAccountMenuOpen}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              px: 1,
              py: 0.5,
              borderRadius: 1,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
            }}
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(255,255,255,0.25)' }}>
              {user?.name?.charAt(0) ?? <AccountCircle />}
            </Avatar>
            <Typography
              variant="body2"
              noWrap
              sx={{ display: { xs: 'none', sm: 'block' }, maxWidth: 160 }}
            >
              {user?.name ?? '管理者'}
            </Typography>
          </Box>
          <Menu
            anchorEl={accountAnchor}
            open={accountMenuOpen}
            onClose={handleAccountMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem disabled sx={{ opacity: '1 !important' }}>
              <Box>
                <Typography variant="body2" fontWeight={700}>
                  {user?.name ?? '管理者'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.email ?? ''}
                </Typography>
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleAccountSettings}>
              <ListItemIcon>
                <ManageAccounts fontSize="small" />
              </ListItemIcon>
              アカウント設定
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              ログアウト
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {/* モバイル用ドロワー */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // パフォーマンス向上
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>

        {/* デスクトップ用ドロワー */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar /> {/* AppBarの高さ分のスペース */}
        <Outlet />
      </Box>
    </Box>
  );
}
