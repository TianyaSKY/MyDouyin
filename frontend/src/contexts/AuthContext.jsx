import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login, register, me } from '../api/auth';

const AuthContext = createContext();

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('douyin_token') || '');
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('douyin_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Verify token on mount
  useEffect(() => {
    const verifyAuth = async () => {
      if (!token) {
        setCheckingAuth(false);
        return;
      }
      
      try {
        const userData = await me(token);
        setUser(userData);
        localStorage.setItem('douyin_user', JSON.stringify(userData));
      } catch (err) {
        // Token is invalid, clear it
        localStorage.removeItem('douyin_token');
        localStorage.removeItem('douyin_user');
        setToken('');
        setUser(null);
      } finally {
        setCheckingAuth(false);
      }
    };

    verifyAuth();
  }, [token]);

  const handleLogin = useCallback(async (username, password) => {
    setLoading(true);
    setError('');
    
    try {
      const data = await login(username, password);
      localStorage.setItem('douyin_token', data.token);
      if (data.user) {
        localStorage.setItem('douyin_user', JSON.stringify(data.user));
        setUser(data.user);
      }
      setToken(data.token);
      return true;
    } catch (err) {
      setError(err.message || '登录失败');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRegister = useCallback(async (username, password, nickname) => {
    setLoading(true);
    setError('');
    
    try {
      const data = await register(username, password, nickname);
      localStorage.setItem('douyin_token', data.token);
      if (data.user) {
        localStorage.setItem('douyin_user', JSON.stringify(data.user));
        setUser(data.user);
      }
      setToken(data.token);
      return true;
    } catch (err) {
      setError(err.message || '注册失败');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('douyin_token');
    localStorage.removeItem('douyin_user');
    setToken('');
    setUser(null);
    setError('');
  }, []);

  const clearError = useCallback(() => {
    setError('');
  }, []);

  const value = {
    token,
    user,
    loading,
    error,
    checkingAuth,
    handleLogin,
    handleRegister,
    handleLogout,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};