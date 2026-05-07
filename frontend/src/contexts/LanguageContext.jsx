import PropTypes from 'prop-types';
import React, { createContext, useCallback, useContext } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Fachada simples sobre o i18next. Toda persistência e detecção de idioma
 * já é feita pelo i18next-browser-languagedetector (chave i18nextLng em
 * localStorage). Este context só expõe o idioma atual e um setter.
 */
const LanguageContext = createContext(null);

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage deve ser usado dentro de <LanguageProvider>');
  }
  return ctx;
};

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation();

  const changeLanguage = useCallback(
    language => {
      i18n.changeLanguage(language);
    },
    [i18n]
  );

  const value = {
    currentLanguage: i18n.resolvedLanguage || i18n.language || 'pt',
    changeLanguage
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

LanguageProvider.propTypes = {
  children: PropTypes.node.isRequired
};
