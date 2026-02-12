import { useState } from "react";
import { CreatorPage } from "./components/CreatorPage";
import { FeedPage } from "./components/FeedPage";
import { LoginPage } from "./components/LoginPage";
import { useAuth } from "./hooks/useAuth";
import { useFeed } from "./hooks/useFeed";

export default function App() {
  const { token, authUser, authChecking, authLoading, authError, handleLogin, handleRegister, handleLogout } = useAuth();
  const { videos, loading, error, panelStats, fetchFeed } = useFeed({
    token,
    authUserId: authUser?.userId,
    enabled: !authChecking && Boolean(token)
  });

  const [mode, setMode] = useState("login");
  const [page, setPage] = useState("home");
  const [nickname, setNickname] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const onSubmitAuth = async (event) => {
    event.preventDefault();
    const ok = mode === "login" ? await handleLogin(username, password) : await handleRegister(username, password, nickname);
    if (ok) {
      setPassword("");
      setNickname("");
      setPage("home");
    }
  };

  if (authChecking) {
    return (
      <main className="page">
        <div className="status-card centered">正在校验登录状态...</div>
      </main>
    );
  }

  if (!token) {
    return (
      <LoginPage
        mode={mode}
        nickname={nickname}
        username={username}
        password={password}
        authLoading={authLoading}
        authError={authError}
        onModeChange={setMode}
        onNicknameChange={setNickname}
        onUsernameChange={setUsername}
        onPasswordChange={setPassword}
        onSubmit={onSubmitAuth}
      />
    );
  }

  if (page === "me") {
    return (
      <CreatorPage
        token={token}
        authUser={authUser}
        panelStats={panelStats}
        onOpenHome={() => setPage("home")}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <FeedPage
      authUser={authUser}
      videos={videos}
      loading={loading}
      error={error}
      onRetry={fetchFeed}
      onLogout={handleLogout}
      onOpenMe={() => setPage("me")}
    />
  );
}
