import React, { useEffect, useRef, useState } from 'react';
import { AuthForm } from './AuthForm';
import { useAuthContext } from '../../contexts/AuthContext';
import { Loader2, Music, Film, Heart, Star, Sparkles } from 'lucide-react';

/* ─── Animated floating particle component ─── */
const FloatingParticle = ({ delay, duration, size, left, top, color }) => (
  <div
    className="auth-particle"
    style={{
      '--particle-delay': `${delay}s`,
      '--particle-duration': `${duration}s`,
      '--particle-size': `${size}px`,
      left: `${left}%`,
      top: `${top}%`,
      background: color,
    }}
  />
);

/* ─── Animated mesh gradient canvas ─── */
const MeshGradientCanvas = () => {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const blobs = [
      { x: 0.2, y: 0.3, r: 300, color: 'rgba(225, 29, 72, 0.12)', vx: 0.0003, vy: 0.0002, phase: 0 },
      { x: 0.8, y: 0.2, r: 350, color: 'rgba(0, 242, 234, 0.10)', vx: -0.0002, vy: 0.0003, phase: 1 },
      { x: 0.5, y: 0.8, r: 280, color: 'rgba(139, 92, 246, 0.10)', vx: 0.0004, vy: -0.0002, phase: 2 },
      { x: 0.1, y: 0.7, r: 250, color: 'rgba(251, 113, 133, 0.08)', vx: 0.0003, vy: 0.0004, phase: 3 },
      { x: 0.9, y: 0.6, r: 320, color: 'rgba(6, 182, 212, 0.08)', vx: -0.0003, vy: -0.0002, phase: 4 },
    ];

    let t = 0;
    const animate = () => {
      t += 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      blobs.forEach(blob => {
        const cx = (blob.x + Math.sin(t * blob.vx + blob.phase) * 0.15) * canvas.width;
        const cy = (blob.y + Math.cos(t * blob.vy + blob.phase) * 0.12) * canvas.height;
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, blob.r);
        gradient.addColorStop(0, blob.color);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, blob.r, 0, Math.PI * 2);
        ctx.fill();
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return <canvas ref={canvasRef} className="auth-mesh-canvas" />;
};

/* ─── Brand Logo with animated glow ─── */
const BrandLogo = () => (
  <div className="auth-brand">
    <div className="auth-brand-icon">
      <div className="auth-brand-ring" />
      <Music className="auth-brand-music-icon" />
    </div>
    <div className="auth-brand-text">
      <span className="auth-brand-title">Douyin</span>
      <span className="auth-brand-subtitle">记录美好生活</span>
    </div>
  </div>
);

/* ─── Sliding Tab Control ─── */
const TabControl = ({ mode, onModeChange }) => {
  const isLogin = mode === 'login';
  return (
    <div className="auth-tabs" role="tablist">
      <div
        className="auth-tabs-indicator"
        style={{ transform: isLogin ? 'translateX(0)' : 'translateX(100%)' }}
      />
      <button
        type="button"
        role="tab"
        aria-selected={isLogin}
        className={`auth-tab ${isLogin ? 'active' : ''}`}
        onClick={() => onModeChange('login')}
      >
        登录
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={!isLogin}
        className={`auth-tab ${!isLogin ? 'active' : ''}`}
        onClick={() => onModeChange('register')}
      >
        注册
      </button>
    </div>
  );
};

/* ─── Decorative floating icons ─── */
const FloatingIcons = () => (
  <div className="auth-floating-icons">
    <Heart className="auth-float-icon auth-float-1" />
    <Star className="auth-float-icon auth-float-2" />
    <Film className="auth-float-icon auth-float-3" />
    <Sparkles className="auth-float-icon auth-float-4" />
    <Music className="auth-float-icon auth-float-5" />
  </div>
);

/* ─── Main LoginPage ─── */
export const LoginPage = ({ mode, onModeChange }) => {
  const { checkingAuth } = useAuthContext();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  if (checkingAuth) {
    return (
      <main className="auth-page">
        <MeshGradientCanvas />
        <div className="auth-loading">
          <div className="auth-loading-spinner">
            <Loader2 className="auth-loading-icon" />
          </div>
          <p className="auth-loading-text">正在验证登录状态...</p>
        </div>
      </main>
    );
  }

  // Generate random particles
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    delay: Math.random() * 8,
    duration: 6 + Math.random() * 8,
    size: 2 + Math.random() * 4,
    left: Math.random() * 100,
    top: Math.random() * 100,
    color: ['rgba(225,29,72,0.4)', 'rgba(0,242,234,0.4)', 'rgba(139,92,246,0.3)', 'rgba(251,113,133,0.3)'][i % 4],
  }));

  return (
    <main className="auth-page">
      {/* Animated Background */}
      <MeshGradientCanvas />

      {/* Floating Particles */}
      <div className="auth-particles-container">
        {particles.map(p => (
          <FloatingParticle key={p.id} {...p} />
        ))}
      </div>

      {/* Decorative Floating Icons */}
      <FloatingIcons />

      {/* Noise Texture Overlay */}
      <div className="auth-noise-overlay" />

      {/* Grid Lines Overlay */}
      <div className="auth-grid-overlay" />

      {/* Main Card */}
      <div className={`auth-card-wrapper ${mounted ? 'auth-card-enter' : ''}`}>
        <div className="auth-card-glow" />
        <div className="auth-card-new">
          {/* Brand Logo */}
          <BrandLogo />

          {/* Tab Control */}
          <TabControl mode={mode} onModeChange={onModeChange} />

          {/* Welcome Text */}
          <div className="auth-welcome">
            <h1 className="auth-welcome-title">
              {mode === 'login' ? '欢迎回来' : '创建账号'}
            </h1>
            <p className="auth-welcome-desc">
              {mode === 'login'
                ? '登录后继续探索精彩短视频世界'
                : '加入我们，开始你的创作之旅'}
            </p>
          </div>

          {/* Form */}
          <AuthForm mode={mode} onModeChange={onModeChange} />

          {/* Footer */}
          <div className="auth-footer">
            <span className="auth-footer-text">
              {mode === 'login'
                ? '安全登录 · 数据加密传输'
                : '注册即表示同意服务条款'}
            </span>
          </div>
        </div>
      </div>
    </main>
  );
};