import {
    AppBar,
    Avatar,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Drawer,
    FormControl,
    FormControlLabel,
    IconButton,
    InputLabel,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Select,
    Switch,
    Toolbar,
    Typography
} from '@mui/material';
import {
    Activity,
    AlertTriangle,
    BarChart3,
    LogOut,
    Menu as MenuIcon,
    Moon,
    Package,
    PlayCircle,
    Settings,
    ShoppingCart,
    Sparkles,
    Sun,
    User,
    Users
} from 'lucide-react';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useDarkMode } from '../contexts/ThemeContext';
import { useTour } from '../contexts/TourContext';

import AppTour from './Tour/Tour';

const drawerWidth = 0; // No left sidebar

export default function Layout({ children }) {
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useLanguage();
  const { startTour } = useTour();

  const menuItems = [
    { text: t('common.dashboard'), icon: <Activity size={20} />, path: '/' },
    { text: t('common.products'), icon: <Package size={20} />, path: '/products' },
    { text: t('common.suppliers'), icon: <Users size={20} />, path: '/suppliers' },
    {
      text: t('common.purchaseOrders'),
      icon: <ShoppingCart size={20} />,
      path: '/purchase-orders'
    },
    { text: t('common.insights'), icon: <BarChart3 size={20} />, path: '/insights' },
    { text: t('common.alerts'), icon: <AlertTriangle size={20} />, path: '/alerts' },
    { text: t('common.autoRestock'), icon: <Sparkles size={20} />, path: '/auto-restock' }
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = path => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleUserMenuOpen = event => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleSettingsOpen = () => {
    setSettingsOpen(true);
    handleUserMenuClose();
  };

  const handleLogoutOpen = () => {
    setLogoutOpen(true);
    handleUserMenuClose();
  };

  const handleSettingsClose = () => {
    setSettingsOpen(false);
  };

  const handleLogoutClose = () => {
    setLogoutOpen(false);
  };

  const handleLogout = () => {
    logout();
    handleLogoutClose();
    navigate('/login');
  };

  const drawer = (
    <Box>
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography
          variant="h6"
          fontWeight="bold"
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          PC Express
        </Typography>
      </Box>
      <Divider />
      <List>
        {menuItems.map(item => (
          <ListItem
            key={item.text}
            onClick={() => handleNavigation(item.path)}
            sx={{
              backgroundColor:
                location.pathname === item.path ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
              '&:hover': {
                backgroundColor: 'rgba(102, 126, 234, 0.05)'
              },
              cursor: 'pointer'
            }}
          >
            <ListItemIcon sx={{ color: location.pathname === item.path ? '#667eea' : 'inherit' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.text}
              sx={{
                color: location.pathname === item.path ? '#667eea' : 'inherit',
                fontWeight: location.pathname === item.path ? 'bold' : 'normal'
              }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Animated mesh gradient background */}
      <Box
        aria-hidden
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          background:
            darkMode
              ? 'radial-gradient(1200px 600px at 0% 0%, rgba(0,255,255,0.06), transparent 60%), radial-gradient(1000px 500px at 100% 100%, rgba(138,43,226,0.06), transparent 60%), radial-gradient(800px 400px at 100% 0%, rgba(16,172,132,0.06), transparent 60%)'
              : 'radial-gradient(1200px 600px at 0% 0%, rgba(0,120,255,0.08), transparent 60%), radial-gradient(1000px 500px at 100% 100%, rgba(255,0,120,0.08), transparent 60%), radial-gradient(800px 400px at 100% 0%, rgba(16,172,132,0.08), transparent 60%)',
          animation: 'mesh-move 30s ease-in-out infinite',
          '@keyframes mesh-move': {
            '0%, 100%': { filter: 'hue-rotate(0deg)' },
            '50%': { filter: 'hue-rotate(30deg)' }
          }
        }}
      />
      {/* Cursor customizado removido */}
      {/* Top Navigation Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          background: darkMode
            ? 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)'
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backdropFilter: 'blur(10px)',
          borderBottom: darkMode
            ? '1px solid rgba(255,255,255,0.1)'
            : '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          {/* Left side - Menu and Title */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>

            <Typography
              variant="h6"
              fontWeight="bold"
              sx={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: { xs: 'none', sm: 'block' }
              }}
            >
              PC Express
            </Typography>
          </Box>

          {/* Center - Navigation Menu */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }} data-tour="navigation">
            {menuItems.map(item => (
              <Button
                key={item.text}
                variant={location.pathname === item.path ? 'contained' : 'text'}
                size="small"
                startIcon={item.icon}
                onClick={() => handleNavigation(item.path)}
                sx={{
                  background:
                    location.pathname === item.path ? 'rgba(255,255,255,0.2)' : 'transparent',
                  color: 'white',
                  '&:hover': {
                    background:
                      location.pathname === item.path
                        ? 'rgba(255,255,255,0.3)'
                        : 'rgba(255,255,255,0.1)'
                  },
                  textTransform: 'none',
                  fontWeight: location.pathname === item.path ? 'bold' : 'normal',
                  minWidth: 'auto',
                  px: 2
                }}
              >
                {item.text}
              </Button>
            ))}
          </Box>

          {/* Right side - User controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Tour Button */}
            <IconButton
              onClick={startTour}
              sx={{
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(0, 255, 255, 0.1)',
                  color: '#00ffff'
                }
              }}
              title="Iniciar Tour"
            >
              <PlayCircle size={20} />
            </IconButton>

            {/* User Email Display */}
            {user && (
              <Chip
                label={user.email}
                size="small"
                sx={{
                  color: 'white',
                  background: 'rgba(255,255,255,0.2)',
                  '& .MuiChip-label': {
                    color: 'white'
                  }
                }}
              />
            )}

            {/* Dark Mode Toggle */}
            <IconButton
              onClick={toggleDarkMode}
              sx={{
                color: 'white',
                '&:hover': {
                  background: 'rgba(255,255,255,0.1)',
                  transform: 'scale(1.1)'
                },
                transition: 'all 0.3s ease'
              }}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </IconButton>

            {/* Language Selector */}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={currentLanguage}
                onChange={e => changeLanguage(e.target.value)}
                sx={{
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.3)'
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.5)'
                  },
                  '& .MuiSelect-icon': {
                    color: 'white'
                  },
                  '& .MuiSelect-select': {
                    color: 'white',
                    fontSize: '0.875rem'
                  }
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      background: darkMode ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
                      backdropFilter: 'blur(20px)',
                      border: darkMode
                        ? '1px solid rgba(255,255,255,0.1)'
                        : '1px solid rgba(0,0,0,0.1)'
                    }
                  }
                }}
              >
                <MenuItem value="en">{t('common.english')}</MenuItem>
                <MenuItem value="pt">{t('common.portuguese')}</MenuItem>
              </Select>
            </FormControl>


            {/* User Menu */}
            <IconButton
              id="user-profile-menu"
              onClick={handleUserMenuOpen}
              sx={{
                color: 'white',
                '&:hover': {
                  background: 'rgba(255,255,255,0.1)',
                  transform: 'scale(1.1)'
                },
                transition: 'all 0.3s ease'
              }}
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <User size={16} />
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Navigation Drawer */}
      <Box component="nav" id="main-sidebar-nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: 240,
              background: darkMode ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(20px)',
              border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'
            }
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: '100%',
          mt: 8 // Account for top navigation
        }}
      >
        {children}
      </Box>

      {/* User Menu */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
        PaperProps={{
          sx: {
            background: darkMode ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(20px)',
            border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
            borderRadius: 2,
            mt: 1
          }
        }}
      >
        <MenuItem onClick={handleSettingsOpen}>
          <ListItemIcon>
            <Settings size={16} />
          </ListItemIcon>
          {t('common.settings')}
        </MenuItem>
        <MenuItem onClick={handleLogoutOpen}>
          <ListItemIcon>
            <LogOut size={16} />
          </ListItemIcon>
          {t('common.logout')}
        </MenuItem>
      </Menu>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={handleSettingsClose} maxWidth="sm" fullWidth>
        <DialogTitle>{t('common.settings')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={<Switch checked={darkMode} onChange={toggleDarkMode} color="primary" />}
              label={t('common.darkMode')}
            />
            <FormControl fullWidth>
              <InputLabel>{t('common.language')}</InputLabel>
              <Select
                value={currentLanguage}
                onChange={e => changeLanguage(e.target.value)}
                label={t('common.language')}
              >
                <MenuItem value="en">{t('common.english')}</MenuItem>
                <MenuItem value="pt">{t('common.portuguese')}</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSettingsClose}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>

      {/* Logout Dialog */}
      <Dialog open={logoutOpen} onClose={handleLogoutClose}>
        <DialogTitle>{t('common.confirmLogout')}</DialogTitle>
        <DialogContent>
          <Typography>{t('common.logoutMessage')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleLogoutClose}>{t('common.cancel')}</Button>
          <Button onClick={handleLogout} color="primary" variant="contained">
            {t('common.logout')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tour Component */}
      <AppTour />
    </Box>
  );
}

Layout.propTypes = {
  children: PropTypes.node.isRequired
};
