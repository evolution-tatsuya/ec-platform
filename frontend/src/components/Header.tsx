import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  InputBase,
  Badge,
  Menu,
  MenuItem,
  Box,
  useMediaQuery,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  ShoppingCart as ShoppingCartIcon,
  AccountCircle as AccountCircleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCartStore } from '../stores/useCartStore';
import { UserRole } from '../types';
import { settingsAPI } from '../lib/api';

interface HeaderProps {
  onMenuClick?: () => void;
}

/**
 * ヘッダーコンポーネント
 *
 * 機能:
 * - ロゴ（左）
 * - 検索バー（中央、モバイルでは非表示）
 * - カートアイコン（バッジ付き）
 * - ユーザーアイコン + Menu（プロフィール/ログアウト）
 * - モバイル: MenuIcon（onMenuClickプロップ）
 */
export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, role, isAuthenticated, logout } = useAuth();
  const { getItemCount } = useCartStore();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // ショップ名・ロゴを設定から読み込む
  const [shopName, setShopName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [showShopName, setShowShopName] = useState(true);

  useEffect(() => {
    let active = true;
    settingsAPI
      .getSettings()
      .then((res) => {
        if (!active) return;
        setShopName(res.settings.shopName || '');
        setLogoUrl(res.settings.logoUrl || '');
        setShowShopName(res.settings.showShopName !== false);
      })
      .catch(() => {
        // 取得失敗時はデフォルト表示
      });
    return () => {
      active = false;
    };
  }, []);

  // ヘッダーに出す名前: 設定のショップ名があればそれ、無ければEC Platform
  const displayName = shopName || 'EC Platform';

  const cartItemCount = getItemCount();

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await logout();
    handleUserMenuClose();
    navigate('/');
  };

  const handleMyPage = () => {
    handleUserMenuClose();
    navigate('/mypage');
  };

  const handleLogin = () => {
    navigate('/auth/login');
  };

  const handleCart = () => {
    navigate('/cart');
  };

  const handleContact = () => {
    handleUserMenuClose();
    navigate('/contact');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <AppBar
      position="fixed"
      color="primary"
      elevation={2}
      sx={{ borderRadius: 0 }}
    >
      <Toolbar sx={{ maxWidth: 1200, mx: 'auto', width: '100%' }}>
        {/* モバイルメニューアイコン */}
        {isMobile && onMenuClick && (
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={onMenuClick}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* ロゴ */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            cursor: 'pointer',
          }}
          onClick={() => navigate('/')}
        >
          {/* ロゴがあれば表示 */}
          {logoUrl && (
            <Box
              component="img"
              src={logoUrl}
              alt={displayName}
              sx={{
                height: 40,
                width: 'auto',
                maxWidth: 180,
                objectFit: 'contain',
                display: 'block',
              }}
            />
          )}
          {/* ショップ名テキスト: 表示ONの時。ロゴが無い場合は必ず表示（空防止） */}
          {(showShopName || !logoUrl) && (
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{
                fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              {displayName}
            </Typography>
          )}
        </Box>

        {/* 検索バー（モバイル非表示） */}
        {!isMobile && (
          <Box
            component="form"
            onSubmit={handleSearch}
            sx={{
              position: 'relative',
              borderRadius: 1,
              backgroundColor: alpha(theme.palette.common.white, 0.15),
              '&:hover': {
                backgroundColor: alpha(theme.palette.common.white, 0.25),
              },
              marginLeft: 4,
              marginRight: 4,
              width: '100%',
              maxWidth: 600,
            }}
          >
            <Box
              sx={{
                padding: theme.spacing(0, 2),
                height: '100%',
                position: 'absolute',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SearchIcon />
            </Box>
            <InputBase
              placeholder="商品を検索…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{
                color: 'inherit',
                width: '100%',
                '& .MuiInputBase-input': {
                  padding: theme.spacing(1, 1, 1, 0),
                  paddingLeft: `calc(1em + ${theme.spacing(4)})`,
                  transition: theme.transitions.create('width'),
                },
              }}
            />
          </Box>
        )}

        <Box sx={{ flexGrow: 1 }} />

        {/* カートアイコン */}
        <IconButton
          size="large"
          aria-label={`${cartItemCount}個の商品がカートにあります`}
          color="inherit"
          onClick={handleCart}
          sx={{ mr: 1 }}
        >
          <Badge badgeContent={cartItemCount} color="error">
            <ShoppingCartIcon />
          </Badge>
        </IconButton>

        {/* ユーザーアイコン */}
        <IconButton
          size="large"
          edge="end"
          aria-label="アカウント"
          aria-controls="user-menu"
          aria-haspopup="true"
          onClick={isAuthenticated ? handleUserMenuOpen : handleLogin}
          color="inherit"
        >
          <AccountCircleIcon />
        </IconButton>

        {/* ユーザーメニュー */}
        {isAuthenticated && (
          <Menu
            id="user-menu"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleUserMenuClose}
          >
            <MenuItem disabled>
              <Typography variant="body2" color="text.secondary">
                {user?.name}
              </Typography>
            </MenuItem>
            <MenuItem onClick={handleMyPage}>マイページ</MenuItem>
            {role === UserRole.ADMIN && (
              <MenuItem onClick={() => { handleUserMenuClose(); navigate('/admin'); }}>
                管理画面
              </MenuItem>
            )}
            <MenuItem onClick={handleContact}>お問い合わせ</MenuItem>
            <MenuItem onClick={handleLogout}>ログアウト</MenuItem>
          </Menu>
        )}
      </Toolbar>
    </AppBar>
  );
};
