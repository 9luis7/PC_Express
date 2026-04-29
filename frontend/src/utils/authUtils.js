import Cookies from 'js-cookie';

// Configurações de segurança para cookies
const COOKIE_OPTIONS = {
  secure: import.meta.env.PROD, // HTTPS apenas em produção (Vite)
  sameSite: 'strict', // Proteção CSRF
  expires: 7, // 7 dias
  path: '/'
};

// Chaves dos cookies
export const AUTH_KEYS = {
  TOKEN: 'pc_express_token',
  REFRESH_TOKEN: 'pc_express_refresh_token',
  USER_DATA: 'pc_express_user_data',
  SESSION_ID: 'pc_express_session_id',
  LAST_ACTIVITY: 'pc_express_last_activity'
};

// Tempo de expiração da sessão (30 minutos de inatividade)
export const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutos em ms

/**
 * Salva o token de autenticação de forma segura
 */
export const saveAuthToken = (token, refreshToken = null) => {
  try {
    // Clean token before saving
    const cleanToken = token ? token.trim() : token;

    // Salva o token principal
    Cookies.set(AUTH_KEYS.TOKEN, cleanToken, COOKIE_OPTIONS);

    // Salva o refresh token se fornecido
    if (refreshToken) {
      Cookies.set(AUTH_KEYS.REFRESH_TOKEN, refreshToken.trim(), COOKIE_OPTIONS);
    }

    // Atualiza a última atividade
    updateLastActivity();

    // Gera um ID de sessão único
    const sessionId = generateSessionId();
    Cookies.set(AUTH_KEYS.SESSION_ID, sessionId, COOKIE_OPTIONS);

    return true;
  } catch (error) {
    console.error('Erro ao salvar token:', error);
    return false;
  }
};

/**
 * Recupera o token de autenticação
 */
export const getAuthToken = () => {
  try {
    const token = Cookies.get(AUTH_KEYS.TOKEN);

    // Clean token if it has extra whitespace or newlines
    if (token) {
      const cleanToken = token.trim();
      if (cleanToken !== token) {
        Cookies.set(AUTH_KEYS.TOKEN, cleanToken, COOKIE_OPTIONS);
        return cleanToken;
      }
    }

    return token;
  } catch (error) {
    console.error('Erro ao recuperar token:', error);
    return null;
  }
};

/**
 * Recupera o refresh token
 */
export const getRefreshToken = () => {
  try {
    return Cookies.get(AUTH_KEYS.REFRESH_TOKEN);
  } catch (error) {
    console.error('Erro ao recuperar refresh token:', error);
    return null;
  }
};

/**
 * Salva dados do usuário
 */
export const saveUserData = (userData) => {
  try {
    Cookies.set(AUTH_KEYS.USER_DATA, JSON.stringify(userData), COOKIE_OPTIONS);
    return true;
  } catch (error) {
    console.error('Erro ao salvar dados do usuário:', error);
    return false;
  }
};

/**
 * Recupera dados do usuário
 */
export const getUserData = () => {
  try {
    const userData = Cookies.get(AUTH_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Erro ao recuperar dados do usuário:', error);
    return null;
  }
};

/**
 * Atualiza a última atividade do usuário
 */
export const updateLastActivity = () => {
  try {
    Cookies.set(AUTH_KEYS.LAST_ACTIVITY, Date.now().toString(), COOKIE_OPTIONS);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar última atividade:', error);
    return false;
  }
};

/**
 * Verifica se a sessão ainda é válida
 */
export const isSessionValid = () => {
  try {
    const lastActivity = Cookies.get(AUTH_KEYS.LAST_ACTIVITY);
    const token = getAuthToken();

    if (!token || !lastActivity) {
      return false;
    }

    const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
    return timeSinceLastActivity < SESSION_TIMEOUT;
  } catch (error) {
    console.error('Erro ao verificar sessão:', error);
    return false;
  }
};

/**
 * Limpa todos os dados de autenticação
 */
export const clearAuthData = () => {
  try {
    Object.values(AUTH_KEYS).forEach(key => {
      Cookies.remove(key, { path: '/' });
    });

    // Limpa também do localStorage (caso tenha dados antigos)
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('pc-express-tour-completed');

    return true;
  } catch (error) {
    console.error('Erro ao limpar dados de autenticação:', error);
    return false;
  }
};

/**
 * Gera um ID de sessão único
 */
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Verifica se o usuário fez refresh forçado (Ctrl+F5)
 * Esta função agora é mais permissiva e só detecta refresh forçado em casos extremos
 */
export const detectHardRefresh = () => {
  try {
    const sessionId = Cookies.get(AUTH_KEYS.SESSION_ID);
    const lastActivity = Cookies.get(AUTH_KEYS.LAST_ACTIVITY);

    // Se não há sessão, não é necessariamente um refresh forçado
    // Pode ser o primeiro acesso ou uma sessão que expirou naturalmente
    if (!sessionId || !lastActivity) {
      return false; // Mudança: não considera mais como refresh forçado
    }

    const timeSinceLastActivity = Date.now() - parseInt(lastActivity);

    // Só considera refresh forçado se passou mais de 30 minutos (tempo de sessão)
    // Isso é mais realista para detectar refresh forçado real
    return timeSinceLastActivity > SESSION_TIMEOUT;
  } catch (error) {
    console.error('Erro ao detectar refresh forçado:', error);
    return false; // Mudança: em caso de erro, não assume refresh forçado
  }
};

/**
 * Monitora a atividade do usuário para manter a sessão ativa
 */
export const startActivityMonitor = (onSessionExpired) => {
  let activityTimer;

  const resetTimer = () => {
    if (activityTimer) {
      clearTimeout(activityTimer);
    }

    activityTimer = setTimeout(() => {
      if (!isSessionValid()) {
        onSessionExpired();
      }
    }, SESSION_TIMEOUT);
  };

  // Eventos que indicam atividade do usuário
  const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

  const handleActivity = () => {
    updateLastActivity();
    resetTimer();
  };

  // Adiciona listeners para os eventos
  activityEvents.forEach(event => {
    document.addEventListener(event, handleActivity, true);
  });

  // Inicia o timer
  resetTimer();

  // Retorna função para limpar os listeners
  return () => {
    if (activityTimer) {
      clearTimeout(activityTimer);
    }
    activityEvents.forEach(event => {
      document.removeEventListener(event, handleActivity, true);
    });
  };
};
