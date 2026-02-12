export function LoginPage({
  mode,
  nickname,
  username,
  password,
  authLoading,
  authError,
  onModeChange,
  onNicknameChange,
  onUsernameChange,
  onPasswordChange,
  onSubmit
}) {
  return (
    <main className="page login-page">
      <div className="ambient ambient-left" aria-hidden="true" />
      <div className="ambient ambient-right" aria-hidden="true" />
      <section className="login-card" aria-label="登录页面">
        <div className="brand login-brand">
          <span className="dot cyan" />
          <span className="dot rose" />
          <strong>Douyin</strong>
        </div>
        <div className="auth-switch">
          <button type="button" className={`auth-switch-btn ${mode === "login" ? "active" : ""}`} onClick={() => onModeChange("login")}>
            登录
          </button>
          <button type="button" className={`auth-switch-btn ${mode === "register" ? "active" : ""}`} onClick={() => onModeChange("register")}>
            注册
          </button>
        </div>
        <h1>{mode === "login" ? "登录" : "注册"}</h1>
        <form className="login-form" onSubmit={onSubmit}>
          {mode === "register" ? (
            <>
              <label htmlFor="nickname">昵称（可选）</label>
              <input id="nickname" value={nickname} onChange={(e) => onNicknameChange(e.target.value)} />
            </>
          ) : null}
          <label htmlFor="username">用户名</label>
          <input id="username" value={username} onChange={(e) => onUsernameChange(e.target.value)} required />
          <label htmlFor="password">密码</label>
          <input id="password" type="password" value={password} onChange={(e) => onPasswordChange(e.target.value)} required />
          {authError ? <div className="login-error">{authError}</div> : null}
          <button type="submit" className="upload-btn cursor-pointer" disabled={authLoading}>
            {authLoading ? (mode === "login" ? "登录中..." : "注册中...") : mode === "login" ? "登录" : "注册并登录"}
          </button>
        </form>
      </section>
    </main>
  );
}
