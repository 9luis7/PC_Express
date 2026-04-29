import PropTypes from 'prop-types';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { api } from '../services/api';
import {
  clearAuthData,
  detectHardRefresh,
  getAuthToken,
  getUserData,
  isSessionValid,
  saveAuthToken,
  saveUserData,
  startActivityMonitor,
  updateLastActivity
} from '../utils/authUtils';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // Inicia como true para verificar sessão
  const [sessionExpired, setSessionExpired] = useState(false);
  const logoutRef = useRef();

  // Verificar sessão existente ao inicializar
  useEffect(() => {
    const initializeAuth = async() => {
      try {
        setLoading(true);

        // Verifica se é um refresh forçado (agora mais permissivo)
        if (detectHardRefresh()) {
          clearAuthData();
          setLoading(false);
          return;
        }

        // Verifica se há token e se a sessão é válida
        const existingToken = getAuthToken();
        const existingUser = getUserData();

        if (existingToken && isSessionValid() && existingUser) {
          setToken(existingToken);
          setUser(existingUser);
          updateLastActivity();
        } else {
          // Sessão inválida ou expirada, limpa dados
          clearAuthData();
        }
      } catch {
        clearAuthData();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const logout = useCallback(async() => {
    try {
      // Limpa todos os dados de autenticação
      clearAuthData();

      // Limpa o estado
      setToken(null);
      setUser(null);
      setSessionExpired(false);
    } catch {
      // Erro durante logout - silencioso
    }
  }, []);

  // Atualiza a ref sempre que logout mudar
  logoutRef.current = logout;

  // Configurar interceptors do axios (apenas uma vez)
  useEffect(() => {
    // Limpar interceptors existentes para evitar duplicação
    api.interceptors.request.clear();
    api.interceptors.response.clear();

    const requestInterceptor = api.interceptors.request.use(
      config => {
        const currentToken = getAuthToken();
        if (currentToken) {
          config.headers.Authorization = `Bearer ${currentToken}`;
        }
        return config;
      },
      error => Promise.reject(error)
    );

    const responseInterceptor = api.interceptors.response.use(
      response => {
        // Atualiza atividade em cada requisição bem-sucedida
        updateLastActivity();
        return response;
      },
      async error => {
        if (error.response?.status === 401) {
          // Token expirado ou inválido
          await logoutRef.current();
        }
        return Promise.reject(error);
      }
    );

    // Interceptor de retry: SÓ erros transitórios — rede sem resposta ou 5xx.
    // Erros 4xx (validação, not found, conflict, unauthorized) NÃO devem
    // disparar retry — eles não vão "se resolver" repetindo a request.
    const MAX_RETRIES = 3;
    const isRetryable = error => {
      // Erro de rede (sem response) é retryable
      if (!error.response) {
        return true;
      }
      const status = error.response.status;
      return status >= 500 && status < 600;
    };

    const retryInterceptor = api.interceptors.response.use(
      response => response,
      async error => {
        const config = error.config;
        if (!config || !isRetryable(error)) {
          return Promise.reject(error);
        }
        config.__retryCount = config.__retryCount || 0;
        if (config.__retryCount >= MAX_RETRIES) {
          return Promise.reject(error);
        }
        config.__retryCount += 1;

        // Backoff exponencial: 2s, 4s, 8s
        const delay = Math.pow(2, config.__retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return api(config);
      }
    );

    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
      api.interceptors.response.eject(retryInterceptor);
    };
  }, []); // Sem dependências para evitar recriação

  // Monitor de atividade para manter sessão ativa
  useEffect(() => {
    if (token && user) {
      const cleanup = startActivityMonitor(() => {
        setSessionExpired(true);
        logout();
      });

      return cleanup;
    }
  }, [token, user, logout]);

  const login = useCallback(async(email, password) => {
    try {
      setLoading(true);
      setSessionExpired(false);

      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);

      const response = await api.post('/auth/token', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const { access_token, refresh_token } = response.data;

      // Salva token usando o novo sistema de cookies
      const tokenSaved = saveAuthToken(access_token, refresh_token);
      if (!tokenSaved) {
        throw new Error('Falha ao salvar token');
      }

      setToken(access_token);

      // Salva dados do usuário
      const userData = {
        email,
        loginTime: Date.now()
      };
      saveUserData(userData);
      setUser(userData);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed'
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const register = async(email, password) => {
    try {
      setLoading(true);
      const response = await api.post('/auth/register', {
        email,
        password
      });

      setUser(response.data);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Registration failed'
      };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    token,
    login,
    register,
    logout,
    loading,
    sessionExpired,
    isAuthenticated: !!token && !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};
