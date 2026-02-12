import { useRef, useState } from "react";
import { NavIcon } from "./FeedActions";
import { useUpload } from "../hooks/useUpload";

export function CreatorPage({ token, authUser, panelStats, onOpenHome, onLogout }) {
  const fileInputRef = useRef(null);
  const [title, setTitle] = useState("");
  const { handleUpload, uploading, progress, error: uploadError } = useUpload({
    token,
    authUser
  });

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleUpload(file, title || file.name);
      setTitle("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <main className="page page-fullscreen">
      <section className="creator-container">
        <header className="profile-header">
          <div className="avatar-placeholder">
            {authUser?.nickname?.[0] || authUser?.username?.[0] || "?"}
          </div>
          <div className="profile-info">
            <h1>{authUser?.nickname || authUser?.username || "未知用户"}</h1>
            <p className="username">@{authUser?.username || "user"}</p>
          </div>
        </header>

        <div className="stats-dashboard">
          <div className="stat-card">
            <span className="stat-label">今日播放</span>
            <strong className="stat-value">{panelStats.play}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">互动率</span>
            <strong className="stat-value">{panelStats.interact}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">完播总数</span>
            <strong className="stat-value">{panelStats.finish}</strong>
          </div>
        </div>

        <div className="upload-section">
          <h2>发布新视频</h2>
          <div className="upload-box">
            <input
              type="text"
              placeholder="输入视频标题..."
              className="title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={uploading}
            />
            <input
              type="file"
              accept="video/*"
              className="hidden-input"
              ref={fileInputRef}
              onChange={onFileChange}
            />
            <button
              type="button"
              className="primary-btn upload-trigger cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? `上传中 ${progress}%` : "选择视频并上传"}
            </button>
            {uploadError && <p className="upload-error-msg">{uploadError}</p>}
          </div>
        </div>

        <div className="creator-actions">
          <button type="button" className="secondary-btn logout-btn cursor-pointer" onClick={onLogout}>
            退出登录
          </button>
        </div>
      </section>

      <nav className="floating-nav" aria-label="Main navigation">
        <NavIcon path="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-6v-6H10v6H4a1 1 0 0 1-1-1z" label="首页" onClick={onOpenHome} />
        <NavIcon path="M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" label="我" active />
      </nav>
    </main>
  );
}
