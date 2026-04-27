import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getRegisterTags } from '../../api/auth';
import { Loader2, Check, ArrowLeft, Sparkles, ArrowRight } from 'lucide-react';

// ─── Color Palette (HSL) ───
const PALETTE = [
  { h: 346, s: 77, l: 50 },  // Rose
  { h: 262, s: 83, l: 58 },  // Violet
  { h: 187, s: 96, l: 42 },  // Cyan
  { h: 160, s: 84, l: 39 },  // Emerald
  { h: 38, s: 92, l: 50 },   // Amber
  { h: 330, s: 81, l: 60 },  // Pink
  { h: 217, s: 91, l: 60 },  // Blue
  { h: 14, s: 84, l: 55 },   // Coral
  { h: 174, s: 72, l: 40 },  // Teal
  { h: 271, s: 91, l: 65 },  // Purple
  { h: 25, s: 95, l: 53 },   // Orange
  { h: 199, s: 89, l: 48 },  // Sky
];

function hsl(h, s, l, a = 1) {
  return a < 1 ? `hsla(${h}, ${s}%, ${l}%, ${a})` : `hsl(${h}, ${s}%, ${l}%)`;
}

// ─── Physics Constants ───
const DAMPING = 0.88;
const CENTER_PULL = 0.0006;
const COLLISION_FORCE = 0.55;
const JITTER = 0.06;
const BUBBLE_GAP = 8;

// ─── Compute adaptive bubble radius ───
function computeRadii(containerW, containerH, count) {
  const area = containerW * containerH;
  const fillRatio = 0.40;
  const avgArea = (area * fillRatio) / Math.max(count, 1);
  const baseRadius = Math.sqrt(avgArea / Math.PI);

  return Array.from({ length: count }, (_, i) => {
    const tier = i % 3; // cycle S / M / L
    const scale = tier === 0 ? 1.12 : tier === 1 ? 1.0 : 0.88;
    return Math.max(28, Math.min(58, baseRadius * scale));
  });
}

// ─── Create initial bubble state (spiral from center) ───
function initBubbles(tags, containerW, containerH) {
  const radii = computeRadii(containerW, containerH, tags.length);
  const cx = containerW / 2;
  const cy = containerH / 2;

  return tags.map((tag, i) => {
    const angle = i * 2.4; // golden angle ≈ 137.5°
    const dist = 15 + i * 8;
    return {
      tag,
      radius: radii[i],
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      vx: 0,
      vy: 0,
      color: PALETTE[i % PALETTE.length],
    };
  });
}

// ─── Physics step ───
function simulate(bubbles, containerW, containerH) {
  const cx = containerW / 2;
  const cy = containerH / 2;

  for (let i = 0; i < bubbles.length; i++) {
    const b = bubbles[i];

    // Center attraction
    b.vx += (cx - b.x) * CENTER_PULL;
    b.vy += (cy - b.y) * CENTER_PULL;

    // Collision with others
    for (let j = i + 1; j < bubbles.length; j++) {
      const o = bubbles[j];
      const dx = b.x - o.x;
      const dy = b.y - o.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const minDist = b.radius + o.radius + BUBBLE_GAP;

      if (dist < minDist) {
        const force = ((minDist - dist) / dist) * COLLISION_FORCE;
        const fx = dx * force;
        const fy = dy * force;
        b.vx += fx; b.vy += fy;
        o.vx -= fx; o.vy -= fy;
      }
    }

    // Random jitter
    b.vx += (Math.random() - 0.5) * JITTER;
    b.vy += (Math.random() - 0.5) * JITTER;

    // Damping
    b.vx *= DAMPING;
    b.vy *= DAMPING;

    // Update position
    b.x += b.vx;
    b.y += b.vy;

    // Boundary containment
    const margin = b.radius + 2;
    if (b.x < margin) { b.x = margin; b.vx *= -0.4; }
    if (b.x > containerW - margin) { b.x = containerW - margin; b.vx *= -0.4; }
    if (b.y < margin) { b.y = margin; b.vy *= -0.4; }
    if (b.y > containerH - margin) { b.y = containerH - margin; b.vy *= -0.4; }
  }
}

// ─── Animated Background (reuse from auth) ───
const BgCanvas = () => {
  const ref = useRef(null);
  const anim = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const blobs = [
      { x: 0.25, y: 0.35, r: 320, color: 'rgba(225, 29, 72, 0.10)', vx: 0.0003, vy: 0.0002, phase: 0 },
      { x: 0.75, y: 0.25, r: 360, color: 'rgba(0, 242, 234, 0.08)', vx: -0.0002, vy: 0.0003, phase: 1 },
      { x: 0.5, y: 0.75, r: 300, color: 'rgba(139, 92, 246, 0.09)', vx: 0.0004, vy: -0.0002, phase: 2 },
      { x: 0.15, y: 0.65, r: 260, color: 'rgba(251, 113, 133, 0.07)', vx: 0.0003, vy: 0.0004, phase: 3 },
    ];

    let t = 0;
    const animate = () => {
      t += 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      blobs.forEach(blob => {
        const bx = (blob.x + Math.sin(t * blob.vx + blob.phase) * 0.15) * canvas.width;
        const by = (blob.y + Math.cos(t * blob.vy + blob.phase) * 0.12) * canvas.height;
        const gradient = ctx.createRadialGradient(bx, by, 0, bx, by, blob.r);
        gradient.addColorStop(0, blob.color);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(bx, by, blob.r, 0, Math.PI * 2);
        ctx.fill();
      });
      anim.current = requestAnimationFrame(animate);
    };
    animate();

    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(anim.current); };
  }, []);

  return <canvas ref={ref} className="interest-bg-canvas" />;
};

// ═══════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════
export const InterestBubblePage = ({ onComplete, onSkip, onBack, loading, error }) => {
  const [tags, setTags] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [tagsError, setTagsError] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [entered, setEntered] = useState(false);

  const containerRef = useRef(null);
  const bubblesRef = useRef([]);
  const domRefs = useRef([]);
  const animRef = useRef(null);
  const sizeRef = useRef({ w: 0, h: 0 });

  // Load tags
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getRegisterTags();
        if (!active) return;
        setTags(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!active) return;
        setTagsError(err.message || '标签加载失败');
      } finally {
        if (active) setTagsLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  // Initialize bubbles when tags load & container is sized
  useEffect(() => {
    if (tags.length === 0 || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    sizeRef.current = { w, h };
    bubblesRef.current = initBubbles(tags, w, h);

    // Run a few simulation steps immediately to spread bubbles out before showing
    for (let i = 0; i < 60; i++) {
      simulate(bubblesRef.current, w, h);
    }

    // Set initial positions on DOM before entrance
    bubblesRef.current.forEach((b, idx) => {
      const el = domRefs.current[idx];
      if (el) {
        el.style.transform = `translate(${b.x - b.radius}px, ${b.y - b.radius}px)`;
      }
    });

    // Staggered opacity entrance
    const timers = tags.map((_, i) =>
      setTimeout(() => {
        const el = domRefs.current[i];
        if (el) el.classList.add('entered');
      }, 80 + i * 50)
    );

    setTimeout(() => setEntered(true), 80 + tags.length * 50 + 200);

    return () => timers.forEach(clearTimeout);
  }, [tags]);

  // Physics animation loop — runs independently, only updates transform
  useEffect(() => {
    if (bubblesRef.current.length === 0 || sizeRef.current.w === 0) return;

    let lastTime = 0;
    const step = (time) => {
      if (time - lastTime > 33) {
        lastTime = time;
        const { w, h } = sizeRef.current;
        simulate(bubblesRef.current, w, h);

        bubblesRef.current.forEach((b, i) => {
          const el = domRefs.current[i];
          if (el) {
            el.style.transform = `translate(${b.x - b.radius}px, ${b.y - b.radius}px)`;
          }
        });
      }
      animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [tags]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || bubblesRef.current.length === 0) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newW = rect.width;
      const newH = rect.height;
      const scaleX = newW / (sizeRef.current.w || newW);
      const scaleY = newH / (sizeRef.current.h || newH);

      bubblesRef.current.forEach(b => {
        b.x *= scaleX;
        b.y *= scaleY;
      });
      sizeRef.current = { w: newW, h: newH };
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleTag = useCallback((tag) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) return prev.filter(t => t !== tag);
      if (prev.length >= 10) return prev;
      return [...prev, tag];
    });
  }, []);

  const handleConfirm = () => {
    onComplete(selectedTags);
  };

  // ─── Render ───
  return (
    <div className="interest-page">
      <BgCanvas />
      <div className="interest-noise" />

      {/* Back button */}
      <button className="interest-back-btn" onClick={onBack} disabled={loading}>
        <ArrowLeft size={16} />
        返回
      </button>

      {/* Header */}
      <div className="interest-header">
        <div className="interest-header-icon">
          <Sparkles size={24} />
        </div>
        <h1 className="interest-title">选择你感兴趣的内容</h1>
        <p className="interest-subtitle">帮助我们为你推荐更好的视频</p>
      </div>

      {/* Error from registration */}
      {error && <div className="interest-error">{error}</div>}

      {/* Content area */}
      {tagsLoading ? (
        <div className="interest-loading">
          <Loader2 className="interest-loading-icon" />
          <p className="interest-loading-text">正在加载兴趣标签...</p>
        </div>
      ) : tagsError ? (
        <div className="interest-empty">
          <div className="interest-error">{tagsError}</div>
        </div>
      ) : tags.length === 0 ? (
        <div className="interest-empty">
          <p className="interest-empty-text">暂无可选标签，可直接跳过</p>
        </div>
      ) : (
        <div className="bubble-container" ref={containerRef}>
          {tags.map((tag, i) => {
            const color = PALETTE[i % PALETTE.length];
            const radius = bubblesRef.current[i]?.radius || 40;
            const isSelected = selectedTags.includes(tag);
            const isDisabled = loading || (!isSelected && selectedTags.length >= 10);
            // Scale font to fit: shorter text gets larger font, long text shrinks
            const charCount = tag.length;
            const maxFitChars = Math.floor((radius * 1.4) / 7); // approx chars that fit
            const baseFontSize = radius < 32 ? 11 : radius < 42 ? 12.5 : 14;
            const fontSize = charCount > maxFitChars
              ? Math.max(9, baseFontSize * (maxFitChars / charCount))
              : baseFontSize;

            return (
              <button
                key={tag}
                ref={el => (domRefs.current[i] = el)}
                className={`bubble-item${entered ? ' entered' : ''}${isSelected ? ' selected' : ''}`}
                disabled={isDisabled}
                onClick={() => toggleTag(tag)}
                style={{
                  width: radius * 2,
                  height: radius * 2,
                  backgroundColor: isSelected
                    ? hsl(color.h, color.s, color.l, 0.45)
                    : hsl(color.h, color.s, color.l, 0.10),
                  borderColor: isSelected
                    ? hsl(color.h, color.s, color.l, 0.85)
                    : hsl(color.h, color.s, color.l, 0.18),
                  borderWidth: isSelected ? '2px' : '1.5px',
                  boxShadow: isSelected
                    ? `0 0 30px ${hsl(color.h, color.s, color.l, 0.5)}, 0 0 60px ${hsl(color.h, color.s, color.l, 0.2)}, inset 0 0 25px ${hsl(color.h, color.s, color.l, 0.15)}`
                    : 'none',
                }}
              >
                <span
                  className="bubble-text"
                  style={{
                    fontSize: `${fontSize}px`,
                    color: isSelected
                      ? hsl(color.h, color.s, Math.min(color.l + 25, 88))
                      : hsl(color.h, color.s, Math.min(color.l + 15, 72), 0.7),
                  }}
                >
                  {tag}
                </span>
                <span
                  className="bubble-check"
                  style={{ backgroundColor: hsl(color.h, color.s, color.l) }}
                >
                  <Check size={12} color="white" strokeWidth={3} />
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="interest-footer">
        <span
          className="interest-counter"
          style={{
            color: selectedTags.length >= 10
              ? '#F87171'
              : selectedTags.length > 0
                ? 'rgba(255,255,255,0.6)'
                : 'rgba(255,255,255,0.3)',
          }}
        >
          {selectedTags.length > 0 ? `已选 ${selectedTags.length}/10` : '点击气泡选择你的兴趣'}
        </span>

        <div className="interest-actions">
          <button
            className="interest-confirm-btn"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>注册中...</span>
              </>
            ) : (
              <>
                <span>完成注册</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
          <button
            className="interest-skip-btn"
            onClick={() => onSkip()}
            disabled={loading}
          >
            跳过
          </button>
        </div>
      </div>
    </div>
  );
};
