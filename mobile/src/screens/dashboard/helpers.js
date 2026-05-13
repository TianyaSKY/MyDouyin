import { colors, borderRadius } from '../../constants/theme';

/** Short number display */
export function shortNum(n) {
  if (!n && n !== 0) return '--';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

export function pct(v) {
  if (v == null) return '--';
  return (v * 100).toFixed(1) + '%';
}

/** Convert '#RRGGBB' + alpha(0-1) to 'rgba(r,g,b,a)' */
export function hexAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export const EVENT_LABELS = {
  impr: '曝光', click: '点击', like: '点赞',
  finish: '完播', share: '分享', comment: '评论', leave: '离开',
};
export const EVENT_COLORS = {
  impr: '#00F2EA', click: '#FE2C55', like: '#FF6B81',
  finish: '#25D366', share: '#FFB800', comment: '#A855F7', leave: '#666',
};
export const SENTIMENT_COLORS = { positive: '#25D366', neutral: '#FFB800', negative: '#FF4444' };
export const SENTIMENT_LABELS = { positive: '正面', neutral: '中性', negative: '负面' };
export const PALETTE = ['#FE2C55', '#00F2EA', '#FFB800', '#25D366', '#A855F7', '#FF6B81', '#00B4D8', '#E91E4D'];
