import PropTypes from 'prop-types';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'pc_express_theme';
const ThemeContext = createContext(null);

export const useDarkMode = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useDarkMode deve ser usado dentro de <ThemeContextProvider>');
  }
  return ctx;
};

export const ThemeContextProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
    } catch {
      // localStorage indisponível (SSR / modo privado): cai no default
    }
    return true; // default dark
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, darkMode ? 'dark' : 'light');
    } catch {
      // ignora se storage estiver bloqueado
    }
  }, [darkMode]);

  const toggleDarkMode = useCallback(() => setDarkMode(prev => !prev), []);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>{children}</ThemeContext.Provider>
  );
};

ThemeContextProvider.propTypes = {
  children: PropTypes.node.isRequired
};
