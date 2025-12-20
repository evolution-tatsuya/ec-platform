import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Toolbar,
  Box,
} from '@mui/material';
import {
  Home as HomeIcon,
  DirectionsCar as CarsIcon,
  Event as EventIcon,
  CloudDownload as DigitalIcon,
  ShoppingCart as CartIcon,
  Person as PersonIcon,
  ContactMail as ContactIcon,
  Dashboard as DashboardIcon,
  Inventory as ProductsIcon,
  LocalShipping as OrdersIcon,
  ConfirmationNumber as EventsIcon,
  People as CustomersIcon,
  QuestionAnswer as InquiriesIcon,
  Settings as SettingsIcon,
  ViewQuilt as NavigationIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';

const DRAWER_WIDTH = 240;

interface SidebarProps {
  open: boolean;
  onClose?: () => void;
  variant?: 'permanent' | 'temporary';
}

interface MenuItem {
  label: string;
  path: string;
  icon: React.ReactElement;
  role?: UserRole;
}

/**
 * サイドバーコンポーネント
 *
 * 機能:
 * - 権限に応じたメニュー表示（user/admin）
 * - 現在のパスをハイライト表示
 * - アイコン付きListItem
 * - レスポンシブDrawer（permanent/temporary）
 */
export const Sidebar: React.FC<SidebarProps> = ({
  open,
  onClose,
  variant = 'permanent',
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, isAuthenticated } = useAuth();

  // 顧客向けメニュー
  const customerMenuItems: MenuItem[] = [
    { label: 'トップ', path: '/', icon: <HomeIcon /> },
    { label: '車パーツ', path: '/cars', icon: <CarsIcon /> },
    { label: 'イベント', path: '/events', icon: <EventIcon /> },
    { label: 'デジタル', path: '/digital', icon: <DigitalIcon /> },
    {
      label: 'カート',
      path: '/cart',
      icon: <CartIcon />,
      role: UserRole.USER,
    },
    {
      label: 'マイページ',
      path: '/mypage',
      icon: <PersonIcon />,
      role: UserRole.USER,
    },
    { label: '問い合わせ', path: '/contact', icon: <ContactIcon /> },
  ];

  // 管理者向けメニュー
  const adminMenuItems: MenuItem[] = [
    { label: 'ダッシュボード', path: '/admin', icon: <DashboardIcon /> },
    {
      label: '商品管理',
      path: '/admin/products',
      icon: <ProductsIcon />,
    },
    {
      label: '注文管理',
      path: '/admin/orders',
      icon: <OrdersIcon />,
    },
    {
      label: 'イベント管理',
      path: '/admin/events',
      icon: <EventsIcon />,
    },
    {
      label: '顧客管理',
      path: '/admin/customers',
      icon: <CustomersIcon />,
    },
    {
      label: '問い合わせ管理',
      path: '/admin/inquiries',
      icon: <InquiriesIcon />,
    },
    {
      label: 'システム設定',
      path: '/admin/settings',
      icon: <SettingsIcon />,
    },
    {
      label: 'ナビゲーション軸',
      path: '/admin/navigation',
      icon: <NavigationIcon />,
    },
  ];

  // 表示するメニューを決定
  const menuItems =
    role === UserRole.ADMIN ? adminMenuItems : customerMenuItems;

  // 権限フィルタリング
  const filteredMenuItems = menuItems.filter((item) => {
    // 権限指定がない場合は全員表示
    if (!item.role) {
      return true;
    }
    // 認証済みかつ権限が一致する場合のみ表示
    return isAuthenticated && role === item.role;
  });

  const handleNavigate = (path: string) => {
    navigate(path);
    if (onClose) {
      onClose();
    }
  };

  const drawerContent = (
    <Box>
      {variant === 'permanent' && <Toolbar />}
      <List>
        {filteredMenuItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          const isAdminSection = item.path.startsWith('/admin');

          // 顧客メニューと管理者メニューの間に区切り線
          const showDivider =
            index > 0 &&
            isAdminSection &&
            !filteredMenuItems[index - 1].path.startsWith('/admin');

          return (
            <React.Fragment key={item.path}>
              {showDivider && <Divider sx={{ my: 1 }} />}
              <ListItem disablePadding>
                <ListItemButton
                  selected={isActive}
                  onClick={() => handleNavigate(item.path)}
                  sx={{
                    borderLeft: isActive ? '4px solid' : '4px solid transparent',
                    borderColor: 'primary.main',
                    backgroundColor: isActive ? 'action.selected' : 'transparent',
                    '&:hover': {
                      backgroundColor: isActive
                        ? 'action.selected'
                        : 'action.hover',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isActive ? 'primary.main' : 'text.secondary',
                      minWidth: 40,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? 'primary.main' : 'text.primary',
                    }}
                  />
                </ListItemButton>
              </ListItem>
            </React.Fragment>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onClose}
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};
