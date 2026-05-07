import { useTheme } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';

import LoginBackground from './LoginBackground';
import LoginCard from './LoginCard';
import LoginLeftPanel from './LoginLeftPanel';
import { LoginWrapper, RightPanel } from './LoginStyles';
import TeamMembers from './TeamMembers';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();

  const handleSubmit = async(email, password) => {
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const isDark = theme.palette.mode === 'dark';

  return (
    <LoginBackground isDark={isDark}>
      <TeamMembers isDark={isDark} />
      <LoginWrapper>
        <LoginLeftPanel isDark={isDark} />

        <RightPanel>
          <AnimatePresence mode="wait">
            <motion.div
              key="login-card"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
            >
              <LoginCard isDark={isDark} onSubmit={handleSubmit} loading={loading} error={error} />
            </motion.div>
          </AnimatePresence>
        </RightPanel>
      </LoginWrapper>
    </LoginBackground>
  );
};

export default Login;
