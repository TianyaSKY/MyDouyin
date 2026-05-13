import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login, register, me } from '../api/auth';

const AuthContext = createContext();

// Strip sensitive fields before persisting to storage
const safeUserForStorage = (user) => {
  if (!user) return null;
  const { is_admin, ...safe } = user;
  return safe;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Load token/user from storage on mount
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('douyin_token');
        const storedUser = await AsyncStorage.getItem('douyin_user');

        if (storedToken) {
          setToken(storedToken);
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
        }
      } catch (err) {
        console.error('Failed to load stored auth:', err);
      }
    };

    loadStoredAuth();
  }, []);

  // Verify token when it changes
  useEffect(() => {
    const verifyAuth = async () => {
      if (!token) {
        setCheckingAuth(false);
        return;
      }

      try {
        const userData = await me(token);
        setUser(userData);
        await AsyncStorage.setItem(
          'douyin_user',
          JSON.stringify(safeUserForStorage(userData))
        );
      } catch (err) {
        await AsyncStorage.removeItem('douyin_token');
        await AsyncStorage.removeItem('douyin_user');
        setToken('');
        setUser(null);
      } finally {
        setCheckingAuth(false);
      }
    };

    verifyAuth();
  }, [token]);

  // Register the unauthorized callback for the API client
  useEffect(() => {
    global._authUnauthorizedCallback = () => {
      handleLogout();
    };
    return () => {
      global._authUnauthorizedCallback = null;
    };
  }, []);

  const handleLogin = useCallback(async (username, password) => {
    setLoading(true);
    setError('');

    try {
      const data = await login(username, password);
      await AsyncStorage.setItem('douyin_token', data.token);
      if (data.user) {
        await AsyncStorage.setItem(
          'douyin_user',
          JSON.stringify(safeUserForStorage(data.user))
        );
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

  const handleRegister = useCallback(async (username, password, nickname, tags) => {
    setLoading(true);
    setError('');

    try {
      const data = await register(username, password, nickname, tags);
      await AsyncStorage.setItem('douyin_token', data.token);
      if (data.user) {
        await AsyncStorage.setItem(
          'douyin_user',
          JSON.stringify(safeUserForStorage(data.user))
        );
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

  const handleLogout = useCallback(async () => {
    await AsyncStorage.removeItem('douyin_token');
    await AsyncStorage.removeItem('douyin_user');
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
