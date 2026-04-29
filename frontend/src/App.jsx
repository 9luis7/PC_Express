import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { AnimatePresence, motion } from 'framer-motion';
import PropTypes from 'prop-types';
import React, { useMemo } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';

import Alerts from './components/Alerts';
import AutoRestock from './components/AutoRestock';
import Dashboard from './components/Dashboard';
import Insights from './components/Insights';
import Layout from './components/Layout';
import Products from './components/Products';
import PurchaseOrders from './components/PurchaseOrders';
import Suppliers from './components/Suppliers';

import Login from './components/auth/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Register from './components/auth/Register';
import SessionExpiredModal from './components/auth/SessionExpiredModal';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeContextProvider, useDarkMode } from './contexts/ThemeContext';
import { TourProvider } from './contexts/TourContext';
import './i18n';

// Componente wrapper para o modal de sessão expirada
const SessionExpiredModalWrapper = () => {
  const { sessionExpired, logout } = useAuth();

  return (
    <SessionExpiredModal
      open={sessionExpired}
      onClose={() => {}} // Não permite fechar manualmente
      onLogout={logout}
    />
  );
};

const pageVariants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.98,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

const PageTransition = ({ children }) => (
  <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants}>
    {children}
  </motion.div>
);
PageTransition.propTypes = { children: PropTypes.node.isRequired };

const ProtectedPage = ({ children }) => (
  <ProtectedRoute>
    <Layout>
      <PageTransition>{children}</PageTransition>
    </Layout>
  </ProtectedRoute>
);
ProtectedPage.propTypes = { children: PropTypes.node.isRequired };

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/register" element={<PageTransition><Register /></PageTransition>} />

        <Route path="/" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
        <Route path="/products" element={<ProtectedPage><Products /></ProtectedPage>} />
        <Route path="/suppliers" element={<ProtectedPage><Suppliers /></ProtectedPage>} />
        <Route
          path="/purchase-orders"
          element={<ProtectedPage><PurchaseOrders /></ProtectedPage>}
        />
        <Route path="/insights" element={<ProtectedPage><Insights /></ProtectedPage>} />
        <Route path="/alerts" element={<ProtectedPage><Alerts /></ProtectedPage>} />
        <Route path="/auto-restock" element={<ProtectedPage><AutoRestock /></ProtectedPage>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

const ThemedShell = () => {
  const { darkMode } = useDarkMode();

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
          primary: { main: '#00ffff' },
          secondary: { main: '#8a2be2' },
          background: {
            default: darkMode ? '#0a0a0f' : '#f5f5f5',
            paper: darkMode ? '#0f0f1a' : '#ffffff'
          }
        },
        components: {
          MuiCard: {
            styleOverrides: {
              root: {
                background: darkMode ? 'rgba(15, 15, 25, 0.95)' : 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(20px)',
                border: darkMode
                  ? '1px solid rgba(0, 255, 255, 0.3)'
                  : '1px solid rgba(0, 255, 255, 0.2)'
              }
            }
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                background: darkMode ? 'rgba(15, 15, 25, 0.95)' : 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(20px)',
                border: darkMode
                  ? '1px solid rgba(0, 255, 255, 0.3)'
                  : '1px solid rgba(0, 255, 255, 0.2)'
              }
            }
          }
        }
      }),
    [darkMode]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <SessionExpiredModalWrapper />
        <AnimatedRoutes />
      </Router>
    </ThemeProvider>
  );
};

function App() {
  return (
    <ThemeContextProvider>
      <LanguageProvider>
        <AuthProvider>
          <TourProvider>
            <ThemedShell />
          </TourProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeContextProvider>
  );
}

export default App;
