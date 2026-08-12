import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Clapperboard,
  Eye,
  Heart,
  LogOut,
  RefreshCw,
  Share2,
  Users,
} from 'lucide-react';
import { getAdminDashboard } from '../../api/admin';
import { useAuthContext } from '../../contexts/AuthContext';
import Skeleton from '../Common/Skeleton';
import { getCoverUrl } from '../../utils/media';

const TREND_METRICS = {
  viewCount: { label: '播放', color: '#25F4EE' },
  likeCount: { label: '点赞', color: '#FE2C55' },
  shareCount: { label: '分享', color: '#FFB86C' },
};

const OVERVIEW_CARDS = [
  { key: 'userCount', label: '注册用户', icon: Users, color: '#25F4EE' },
  { key: 'videoCount', label: '视频总量', icon: Clapperboard, color: '#7DD3FC' },
  { key: 'viewCount', label: '累计播放', icon: Eye, color: '#25F4EE' },
  { key: 'likeCount', label: '累计点赞', icon: Heart, color: '#FE2C55' },
  { key: 'shareCount', label: '累计分享', icon: Share2, color: '#FFB86C' },
];

const compactNumber = new Intl.NumberFormat('zh-CN', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const fullNumber = new Intl.NumberFormat('zh-CN');

function safeNumber(value) {
  return Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
}

function formatCompact(value) {
  return compactNumber.format(safeNumber(value));
}

function formatFull(value) {
  return fullNumber.format(safeNumber(value));
}

function formatDateLabel(date) {
  if (!date) return '--/--';
  const [, month, day] = String(date).match(/^(?:\d{4})-(\d{2})-(\d{2})$/) || [];
  return month && day ? `${month}/${day}` : '--/--';
}

function AdminLoadingState() {
  return (
    <div className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <div className="admin-dashboard-loading-header">
          <Skeleton className="h-8 w-44 bg-white/10" />
          <Skeleton className="h-10 w-28 bg-white/10" />
        </div>
        <Skeleton className="h-12 w-64 bg-white/10" />
        <div className="admin-dashboard-overview-grid">
          {OVERVIEW_CARDS.map(({ key }) => (
            <Skeleton key={key} className="h-36 bg-white/10" />
          ))}
        </div>
        <div className="admin-dashboard-analysis-grid">
          <Skeleton className="h-[360px] bg-white/10" />
          <Skeleton className="h-[360px] bg-white/10" />
        </div>
      </div>
    </div>
  );
}

function TrendChart({ trend, metricKey }) {
  const metric = TREND_METRICS[metricKey];
  const points = Array.isArray(trend) ? trend : [];
  const values = points.map((point) => safeNumber(point?.[metricKey]));
  const maxValue = Math.max(1, ...values);
  const hasActivity = values.some((value) => value > 0);
  const left = 34;
  const right = 704;
  const top = 20;
  const bottom = 204;
  const step = points.length > 1 ? (right - left) / (points.length - 1) : 0;
  const coordinates = points.map((point, index) => {
    const x = left + index * step;
    const y = bottom - (values[index] / maxValue) * (bottom - top);
    return { x, y, point, value: values[index] };
  });
  const linePath = coordinates.map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  const areaPath = coordinates.length > 0
    ? `${linePath} L ${coordinates.at(-1).x} ${bottom} L ${coordinates[0].x} ${bottom} Z`
    : '';

  return (
    <div className="admin-dashboard-chart-wrap">
      <svg
        className="admin-dashboard-chart"
        viewBox="0 0 720 260"
        role="img"
        aria-label={`近 7 日${metric.label}趋势`}
      >
        <defs>
          <linearGradient id="admin-dashboard-chart-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={metric.color} stopOpacity="0.24" />
            <stop offset="100%" stopColor={metric.color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((line) => {
          const y = top + (bottom - top) * (line / 3);
          return <line key={line} x1={left} x2={right} y1={y} y2={y} className="admin-dashboard-chart-gridline" />;
        })}
        {areaPath && <path d={areaPath} fill="url(#admin-dashboard-chart-fill)" className="admin-dashboard-chart-area" />}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={metric.color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="admin-dashboard-chart-line"
          />
        )}
        {coordinates.map(({ x, y, point, value }, index) => (
          <g key={`${point?.date || 'point'}-${index}`}>
            <circle cx={x} cy={y} r="4.5" fill="#071018" stroke={metric.color} strokeWidth="2" />
            <title>{`${point?.date || '未知日期'} · ${metric.label} ${formatFull(value)}`}</title>
            <text x={x} y="236" textAnchor="middle" className="admin-dashboard-chart-label">
              {formatDateLabel(point?.date)}
            </text>
          </g>
        ))}
      </svg>
      {!hasActivity && <p className="admin-dashboard-chart-empty">近 7 日暂无行为数据</p>}
    </div>
  );
}

function TrendPanel({ trend }) {
  const [metricKey, setMetricKey] = useState('viewCount');
  const metric = TREND_METRICS[metricKey];

  return (
    <section className="admin-dashboard-panel admin-dashboard-trend-panel" aria-labelledby="admin-dashboard-trend-title">
      <div className="admin-dashboard-panel-heading">
        <div>
          <span className="admin-dashboard-eyebrow">ACTIVITY / 07 DAYS</span>
          <h2 id="admin-dashboard-trend-title">运营脉冲</h2>
        </div>
        <div className="admin-dashboard-trend-switcher" role="group" aria-label="趋势指标">
          {Object.entries(TREND_METRICS).map(([key, item]) => (
            <button
              key={key}
              type="button"
              className={`admin-dashboard-trend-button ${metricKey === key ? 'is-active' : ''}`}
              style={{ '--trend-color': item.color }}
              aria-pressed={metricKey === key}
              onClick={() => setMetricKey(key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="admin-dashboard-trend-summary">
        <strong>{formatCompact(trend?.reduce((sum, point) => sum + safeNumber(point?.[metricKey]), 0))}</strong>
        <span>近 7 日{metric.label}总量</span>
      </div>
      <TrendChart trend={trend} metricKey={metricKey} />
    </section>
  );
}

function TopVideosPanel({ videos }) {
  return (
    <section className="admin-dashboard-panel admin-dashboard-top-panel" aria-labelledby="admin-dashboard-top-title">
      <div className="admin-dashboard-panel-heading">
        <div>
          <span className="admin-dashboard-eyebrow">CONTENT / RANKING</span>
          <h2 id="admin-dashboard-top-title">热门视频</h2>
        </div>
        <span className="admin-dashboard-panel-count">TOP {Math.min(videos.length, 5).toString().padStart(2, '0')}</span>
      </div>
      {videos.length === 0 ? (
        <div className="admin-dashboard-empty-state">
          <Clapperboard size={24} aria-hidden="true" />
          <p>暂无已发布视频</p>
        </div>
      ) : (
        <ol className="admin-dashboard-video-list">
          {videos.slice(0, 5).map((video, index) => {
            const videoId = video?.videoId ?? index;
            const title = video?.title || '未命名视频';
            return (
              <li key={`${videoId}-${index}`} className="admin-dashboard-video-item">
                <span className="admin-dashboard-rank">{String(index + 1).padStart(2, '0')}</span>
                {video?.coverUrl ? (
                  <img className="admin-dashboard-video-cover" src={getCoverUrl(video.coverUrl)} alt="" />
                ) : (
                  <div className="admin-dashboard-video-cover admin-dashboard-video-cover--empty" aria-hidden="true">
                    <Clapperboard size={18} />
                  </div>
                )}
                <div className="admin-dashboard-video-info">
                  <strong title={title}>{title}</strong>
                  <span>{video?.authorName || '未知用户'}</span>
                  <div className="admin-dashboard-video-stats">
                    <span title={formatFull(video?.viewCount)}><Eye size={12} /> {formatCompact(video?.viewCount)}</span>
                    <span title={formatFull(video?.likeCount)}><Heart size={12} /> {formatCompact(video?.likeCount)}</span>
                    <span title={formatFull(video?.shareCount)}><Share2 size={12} /> {formatCompact(video?.shareCount)}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export default function AdminDashboardPage() {
  const { token, user, handleLogout } = useAuthContext();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const controllerRef = useRef(null);

  const loadDashboard = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError('');

    try {
      const data = await getAdminDashboard(token, controller.signal);
      if (!controller.signal.aborted) {
        setDashboard({
          overview: data?.overview || {},
          trend: Array.isArray(data?.trend) ? data.trend : [],
          topVideos: Array.isArray(data?.topVideos) ? data.topVideos : [],
        });
      }
    } catch (err) {
      if (err?.name !== 'AbortError' && !controller.signal.aborted) {
        setError(err?.message || '暂时无法加载数据');
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadDashboard();
    return () => controllerRef.current?.abort();
  }, [loadDashboard]);

  const displayName = user?.nickname || user?.username || '管理员';
  const overview = dashboard?.overview || {};
  const topVideos = dashboard?.topVideos || [];
  const trend = dashboard?.trend || [];

  const headingMeta = useMemo(() => {
    if (loading) return '正在同步实时运营数据';
    if (error) return '数据同步中断';
    return '数据已更新 · 统计口径与全站内容同步';
  }, [error, loading]);

  if (loading && !dashboard) return <AdminLoadingState />;

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-orb admin-dashboard-orb--cyan" aria-hidden="true" />
      <div className="admin-dashboard-orb admin-dashboard-orb--rose" aria-hidden="true" />
      <div className="admin-dashboard-shell">
        <header className="admin-dashboard-header">
          <div className="admin-dashboard-brand-lockup">
            <div className="admin-dashboard-brand-mark" aria-hidden="true"><span /><span /></div>
            <div>
              <strong>SKYDOUYIN</strong>
              <span>运营控制台</span>
            </div>
          </div>
          <div className="admin-dashboard-header-actions">
            <div className="admin-dashboard-user-chip">
              <span className="admin-dashboard-user-avatar">{displayName.slice(0, 1).toUpperCase()}</span>
              <span>
                <strong>{displayName}</strong>
                <small>管理员</small>
              </span>
            </div>
            <button type="button" className="admin-dashboard-logout" onClick={handleLogout}>
              <LogOut size={16} aria-hidden="true" />
              退出后台
            </button>
          </div>
        </header>

        <section className="admin-dashboard-intro">
          <div>
            <span className="admin-dashboard-kicker">ADMIN / OVERVIEW</span>
            <h1>全站数据总览</h1>
            <p>{headingMeta}</p>
          </div>
          <div className="admin-dashboard-live-indicator"><span /> LIVE OVERVIEW</div>
        </section>

        {error && (
          <div className="admin-dashboard-error" role="alert">
            <div>
              <strong>数据加载失败</strong>
              <span>{error}</span>
            </div>
            <button type="button" onClick={loadDashboard} disabled={loading}>
              <RefreshCw size={15} className={loading ? 'is-spinning' : ''} aria-hidden="true" />
              重新加载
            </button>
          </div>
        )}

        <section className="admin-dashboard-overview-grid" aria-label="全站核心指标">
          {OVERVIEW_CARDS.map(({ key, label, icon: Icon, color }) => (
            <article key={key} className="admin-dashboard-metric-card">
              <div className="admin-dashboard-metric-topline">
                <span>{label}</span>
                <Icon size={18} color={color} aria-hidden="true" />
              </div>
              <strong title={formatFull(overview[key])}>{formatCompact(overview[key])}</strong>
              <span className="admin-dashboard-metric-caption">ALL TIME / TOTAL</span>
            </article>
          ))}
        </section>

        <div className="admin-dashboard-analysis-grid">
          <TrendPanel trend={trend} />
          <TopVideosPanel videos={topVideos} />
        </div>

        <footer className="admin-dashboard-footer">
          <span>SKYDOUYIN OPERATIONS SYSTEM</span>
          <span>数据仅供运营分析使用</span>
        </footer>
      </div>
    </main>
  );
}
