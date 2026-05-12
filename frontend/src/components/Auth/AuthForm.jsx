import React, { useState } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { validateForm } from '../../utils/validation';
import { Loader2, AlertCircle, User, Lock, UserPlus, ArrowRight } from 'lucide-react';

export const AuthForm = ({ mode, onModeChange, onProceedToInterests }) => {
  const { loading, error, handleLogin, clearError } = useAuthContext();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nickname: '',
  });
  const [validationErrors, setValidationErrors] = useState({});

  const isRegister = mode === 'register';

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }
    if (error) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm(
      formData.username,
      formData.password,
      formData.nickname,
      isRegister,
      [] // tags validated separately on the bubble page
    );
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    if (isRegister) {
      // Don't register yet — proceed to interest selection
      onProceedToInterests({
        username: formData.username,
        password: formData.password,
        nickname: formData.nickname,
      });
    } else {
      const success = await handleLogin(formData.username, formData.password);
      if (success) {
        setFormData({ username: '', password: '', nickname: '' });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Username Input */}
      <div className="space-y-2">
        <label htmlFor="username" className="block text-sm font-medium text-white/50 tracking-wide">
          用户名
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
          <input
            id="username"
            type="text"
            value={formData.username}
            onChange={(e) => handleChange('username', e.target.value)}
            className="auth-input pl-10"
            placeholder="请输入用户名"
            disabled={loading}
          />
        </div>
        {validationErrors.username && (
          <p className="error-message">{validationErrors.username}</p>
        )}
      </div>

      {/* Password Input */}
      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-white/50 tracking-wide">
          密码
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
          <input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
            className="auth-input pl-10"
            placeholder="请输入密码"
            disabled={loading}
          />
        </div>
        {validationErrors.password && (
          <p className="error-message">{validationErrors.password}</p>
        )}
      </div>

      {/* Nickname Input (Register only) */}
      {isRegister && (
        <div className="space-y-2">
          <label htmlFor="nickname" className="block text-sm font-medium text-white/50 tracking-wide">
            昵称 (可选)
          </label>
          <div className="relative">
            <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
            <input
              id="nickname"
              type="text"
              value={formData.nickname}
              onChange={(e) => handleChange('nickname', e.target.value)}
              className="auth-input pl-10"
              placeholder="请输入昵称"
              disabled={loading}
            />
          </div>
          {validationErrors.nickname && (
            <p className="error-message">{validationErrors.nickname}</p>
          )}
        </div>
      )}

      {/* Global Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        className="auth-button flex items-center justify-center gap-2"
        disabled={loading}
      >
        {loading && <Loader2 className="loading-spinner" />}
        {isRegister ? (
          <>
            <span>下一步</span>
            <ArrowRight size={18} />
          </>
        ) : (
          '登录'
        )}
      </button>

      {/* Mode Switch */}
      <div className="text-center text-sm text-white/40">
        {isRegister ? (
          <>
            已有账号？{' '}
            <button
              type="button"
              onClick={() => onModeChange('login')}
              className="text-primary hover:text-primary/80 font-medium cursor-pointer"
            >
              立即登录
            </button>
          </>
        ) : (
          <>
            还没有账号？{' '}
            <button
              type="button"
              onClick={() => onModeChange('register')}
              className="text-primary hover:text-primary/80 font-medium cursor-pointer"
            >
              立即注册
            </button>
          </>
        )}
      </div>
    </form>
  );
};
