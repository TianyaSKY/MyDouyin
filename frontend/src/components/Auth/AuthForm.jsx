import React, { useEffect, useState } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { validateForm } from '../../utils/validation';
import { getRegisterTags } from '../../api/auth';
import { Loader2, AlertCircle, User, Lock, UserPlus, Tags } from 'lucide-react';

export const AuthForm = ({ mode, onModeChange }) => {
  const { loading, error, handleLogin, handleRegister, clearError } = useAuthContext();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nickname: '',
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsError, setTagsError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isRegister = mode === 'register';

  useEffect(() => {
    let active = true;

    const loadTags = async () => {
      if (!isRegister) {
        setTagsError('');
        return;
      }

      setTagsLoading(true);
      setTagsError('');
      try {
        const tags = await getRegisterTags();
        if (!active) return;
        setAvailableTags(tags);
      } catch (err) {
        if (!active) return;
        setAvailableTags([]);
        setTagsError(err.message || '标签加载失败');
      } finally {
        if (active) {
          setTagsLoading(false);
        }
      }
    };

    loadTags();

    return () => {
      active = false;
    };
  }, [isRegister]);

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
      selectedTags
    );
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    const success = isRegister
      ? await handleRegister(formData.username, formData.password, formData.nickname, selectedTags)
      : await handleLogin(formData.username, formData.password);

    if (success) {
      // Reset form
      setFormData({ username: '', password: '', nickname: '' });
      setSelectedTags([]);
    }
  };

  const toggleTag = (tag) => {
    setSelectedTags((prev) => {
      const exists = prev.includes(tag);
      const next = exists
        ? prev.filter((item) => item !== tag)
        : prev.length >= 10
          ? prev
          : [...prev, tag];

      if (validationErrors.tags) {
        setValidationErrors((current) => ({ ...current, tags: null }));
      }
      return next;
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Username Input */}
      <div className="space-y-1">
        <label htmlFor="username" className="block text-sm font-medium text-gray-300">
          用户名
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
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
      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium text-gray-300">
          密码
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
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
        <div className="space-y-1">
          <label htmlFor="nickname" className="block text-sm font-medium text-gray-300">
            昵称 (可选)
          </label>
          <div className="relative">
            <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
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

      {isRegister && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-300 flex items-center gap-2">
              感兴趣的标签
            </label>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${selectedTags.length === 10 ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-gray-400'}`}>
              已选 {selectedTags.length}/10
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-white/10 bg-black/20 hover:bg-black/40 hover:border-white/20 transition-all text-left"
          >
            <span className={selectedTags.length > 0 ? "text-white" : "text-gray-500"}>
              {selectedTags.length > 0 
                ? `已选择 ${selectedTags.length} 个倾向标签` 
                : "点击选择感兴趣的标签..."}
            </span>
            <div className="flex items-center gap-2">
              {selectedTags.slice(0, 3).map(tag => (
                <span key={tag} className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-md">
                  {tag}
                </span>
              ))}
              {selectedTags.length > 3 && (
                <span className="text-xs text-gray-500">+{selectedTags.length - 3}</span>
              )}
              <Tags className="w-5 h-5 text-gray-400 ml-1" />
            </div>
          </button>

          {/* Modal Overlay */}
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-backdrop-fade">
              <div 
                className="absolute inset-0" 
                onClick={() => setIsModalOpen(false)}
              />
              
              <div className="relative w-full max-w-md rounded-[24px] border border-white/10 bg-gradient-to-b from-white/10 to-[#121212] p-[1px] shadow-[0_0_50px_rgba(225,29,72,0.15)] animate-modal-pop">
                <div className="rounded-[23px] bg-[#121212]/95 p-6 backdrop-blur-2xl relative overflow-hidden">
                  {/* Decorative Glows */}
                  <div className="absolute -top-20 -left-20 w-48 h-48 bg-primary/20 rounded-full blur-[50px] pointer-events-none" />
                  <div className="absolute top-20 -right-20 w-48 h-48 bg-secondary/10 rounded-full blur-[50px] pointer-events-none" />
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-semibold text-white">选择兴趣标签</h3>
                        <p className="text-sm text-gray-400 mt-1">请选择 1-10 个你感兴趣的内容</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                      {tagsLoading ? (
                        <div className="flex justify-center items-center py-12 gap-2 text-sm text-gray-400">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          正在加载标签...
                        </div>
                      ) : tagsError ? (
                        <div className="text-sm text-red-400 py-4 text-center bg-red-500/10 rounded-lg">{tagsError}</div>
                      ) : availableTags.length === 0 ? (
                        <div className="text-sm text-gray-500 py-8 text-center bg-white/5 rounded-lg border border-white/5">暂无可选标签，请等待管理员发布内容。</div>
                      ) : (
                        <div className="flex flex-wrap gap-2.5">
                          {availableTags.map((tag) => {
                            const active = selectedTags.includes(tag);
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => toggleTag(tag)}
                                className={`group inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ease-out select-none border ${
                                  active
                                    ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-[0_4px_12px_rgba(225,29,72,0.35)] scale-105 border-transparent'
                                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white hover:border-white/20 hover:-translate-y-0.5 hover:shadow-lg'
                                }`}
                                disabled={loading || (!active && selectedTags.length >= 10)}
                              >
                                <Tags className={`h-3.5 w-3.5 transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`} />
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="mt-8 flex items-center justify-between pt-4 border-t border-white/10">
                      <span className={`text-sm font-medium transition-colors ${selectedTags.length === 10 ? 'text-red-400' : 'text-gray-400'}`}>
                        已选: {selectedTags.length}/10
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-6 py-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-medium hover:opacity-90 transition-opacity shadow-[0_4px_12px_rgba(225,29,72,0.25)] hover:shadow-[0_6px_16px_rgba(225,29,72,0.4)]"
                      >
                        确认
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {validationErrors.tags && (
            <p className="error-message">{validationErrors.tags}</p>
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
        {isRegister ? '注册并登录' : '登录'}
      </button>

      {/* Mode Switch */}
      <div className="text-center text-sm text-gray-400">
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
