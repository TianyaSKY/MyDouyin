import React from 'react';
import { AuthForm } from './AuthForm';
import { useAuthContext } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export const LoginPage = ({ mode, onModeChange }) => {
  const { checkingAuth } = useAuthContext();

  if (checkingAuth) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-dark">
        <div className="text-center">
          <Loader2 className="loading-spinner mx-auto mb-4" />
          <p className="text-gray-400">正在验证登录状态...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-dark relative overflow-hidden">
      {/* Ambient Effects */}
      <div className="ambient-effect bg-cyan-400/30 -top-20 -left-20" />
      <div className="ambient-effect bg-rose-400/30 -bottom-20 -right-20" />

      {/* Auth Card */}
      <div className="auth-card w-full max-w-md mx-4 relative z-10">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="flex gap-1">
            <span className="w-3 h-3 rounded-full bg-cyan-400" />
            <span className="w-3 h-3 rounded-full bg-rose-500" />
          </div>
          <span className="text-2xl font-bold text-white font-heading">Douyin</span>
        </div>

        {/* Mode Switch */}
        <div className="auth-switch">
          <button
            type="button"
            className={`auth-switch-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => onModeChange('login')}
          >
            登录
          </button>
          <button
            type="button"
            className={`auth-switch-btn ${mode === 'register' ? 'active' : ''}`}
            onClick={() => onModeChange('register')}
          >
            注册
          </button>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white text-center mb-6 font-heading">
          {mode === 'login' ? '登录' : '注册'}
        </h1>

        {/* Form */}
        <AuthForm mode={mode} onModeChange={onModeChange} />
      </div>
    </main>
  );
};