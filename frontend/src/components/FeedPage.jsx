import { ActionButton, NavIcon } from "./FeedActions";

export function FeedPage({ authUser, videos, loading, error, onRetry, onLogout, onOpenMe }) {
  return (
    <main className="page page-fullscreen">
      <div className="reel-panel">
        <div className="reel-feed">
          {loading && <div className="status-card">正在加载推荐视频...</div>}
          {!loading && error && (
            <div className="status-card error">
              <p>加载失败：{error}</p>
              <button type="button" className="upload-btn cursor-pointer retry-btn" onClick={onRetry}>
                重试
              </button>
            </div>
          )}
          {!loading && !error && videos.length === 0 && <div className="status-card">当前暂无推荐视频</div>}
          {!loading &&
            !error &&
            videos.map((video) => (
              <article key={video.id} className="reel-card">
                {video.coverUrl ? (
                  <img className="video-cover" src={video.coverUrl} alt={video.title} loading="lazy" />
                ) : (
                  <div className="video-glow" aria-hidden="true" />
                )}
                <div className="reel-overlay">
                  <div className="meta">
                    <strong>{video.author}</strong>
                    <p>{video.title}</p>
                    <div className="tags">
                      {video.tags.map((tag) => (
                        <span key={tag}>#{tag}</span>
                      ))}
                    </div>
                    <small>{video.music}</small>
                  </div>
                  <div className="actions">
                    <ActionButton
                      label="点赞"
                      value={video.likes}
                      path="M12 20s-6.2-4.4-8.2-8.2c-1.5-2.8-.6-6.2 2.1-7.5 2.1-1 4.6-.4 6.1 1.5 1.5-1.9 4-2.5 6.1-1.5 2.7 1.3 3.6 4.7 2.1 7.5C18.2 15.6 12 20 12 20z"
                    />
                    <ActionButton label="完播" value={video.finishes} path="M20 6 9 17l-5-5" />
                    <ActionButton label="分享" value={video.shares} path="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 16V3m0 0l-4 4m4-4 4 4" />
                  </div>
                </div>
              </article>
            ))}
        </div>

        <nav className="floating-nav" aria-label="Main navigation">
          <NavIcon path="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-6v-6H10v6H4a1 1 0 0 1-1-1z" label="首页" active />
          <NavIcon path="M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" label="我" onClick={onOpenMe} />
        </nav>
      </div>
    </main>
  );
}
