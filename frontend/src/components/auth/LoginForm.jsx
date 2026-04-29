import { Visibility, VisibilityOff } from '@mui/icons-material';
import {
    Alert,
    CircularProgress,
    IconButton,
    InputAdornment,
    TextField,
    Tooltip
} from '@mui/material';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';

import {
    GradientButton,
    StyledLink,
    StyledTextField
} from './LoginStyles';

const LoginForm = ({ isDark, onSubmit, loading, error }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!isValidEmail || !isValidPassword) return;
    await onSubmit(email, password);
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/;
  const isValidEmail = emailRegex.test(email);
  const isValidPassword = password.length >= 6;

  const fillDemo = () => {
    setEmail('admin@pc-express.com');
    setPassword('admin123');
    setTouched({ email: true, password: true });
  };

  return (
    <>
      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 3,
            background: isDark ? 'rgba(244, 67, 54, 0.1)' : 'rgba(244, 67, 54, 0.1)',
            border: isDark
              ? '1px solid rgba(244, 67, 54, 0.3)'
              : '1px solid rgba(244, 67, 54, 0.3)',
            animation: 'shake 450ms cubic-bezier(.36,.07,.19,.97) both'
          }}
        >
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} style={{ marginTop: '8px' }}>
        <StyledTextField $isDark={isDark}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label={t('auth.email')}
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={e => setEmail(e.target.value)}
            onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
            error={touched.email && !isValidEmail}
            helperText={touched.email && !isValidEmail ? t('common.invalidEmail') : ' '}
          />
        </StyledTextField>

        <StyledTextField $isDark={isDark}>
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label={t('auth.password')}
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
            error={touched.password && !isValidPassword}
            helperText={touched.password && !isValidPassword ? t('common.passwordMinChars', { count: 6 }) : ' '}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}>
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleTogglePasswordVisibility}
                      edge="end"
                      sx={{
                        color: isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.6)',
                        transition: 'transform 0.2s ease',
                        '&:hover': {
                          color: isDark ? 'rgba(0, 255, 255, 0.9)' : 'rgba(0, 255, 255, 0.8)',
                          backgroundColor: isDark
                            ? 'rgba(0, 255, 255, 0.15)'
                            : 'rgba(0, 255, 255, 0.1)',
                          transform: 'scale(1.08)'
                        }
                      }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              )
            }}
          />
        </StyledTextField>

        <Tooltip
          title={!isValidEmail || !isValidPassword ? t('common.fillValidCredentials') : t('auth.login')}
          placement="top"
        >
          <div>
            <GradientButton
              type="submit"
              disabled={loading || !isValidEmail || !isValidPassword}
              $isDark={isDark}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : t('auth.loginButton')}
            </GradientButton>
          </div>
        </Tooltip>

        <GradientButton
          type="button"
          onClick={fillDemo}
          $isDark={isDark}
          aria-label="use-demo-credentials"
        >
          {t('auth.useDemo')}
        </GradientButton>

        <div style={{ textAlign: 'center' }}>
          <StyledLink as={RouterLink} to="/register" $isDark={isDark}>
            {t('auth.dontHaveAccount')}
          </StyledLink>
        </div>
      </form>
    </>
  );
};

LoginForm.propTypes = {
  isDark: PropTypes.bool.isRequired,
  onSubmit: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string
};

export default LoginForm;
