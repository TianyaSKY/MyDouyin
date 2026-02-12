import { useCallback, useEffect, useState } from "react";
import { login, me, register } from "../api/auth";
import { TOKEN_KEY, USER_KEY } from "../config";

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

export function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [authUser, setAuthUser] = useState(() => readStoredUser());
  const [authChecking, setAuthChecking] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken("");
    setAuthUser(null);
  }, []);

  useEffect(() => {
    async function verifyAuth() {
      if (!token) {
        setAuthChecking(false);
        return;
      }
      try {
        const user = await me(token);
        setAuthUser(user);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } catch (_) {
        clearAuth();
      } finally {
        setAuthChecking(false);
      }
    }
    verifyAuth();
  }, [token, clearAuth]);

  const handleLogin = useCallback(async (username, password) => {
    setAuthError("");
    setAuthLoading(true);
    try {
      const data = await login(username, password);
      localStorage.setItem(TOKEN_KEY, data.token);
      if (data.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        setAuthUser(data.user);
      }
      setToken(data.token);
      return true;
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "登录失败");
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const handleRegister = useCallback(async (username, password, nickname) => {
    setAuthError("");
    setAuthLoading(true);
    try {
      const data = await register(username, password, nickname);
      localStorage.setItem(TOKEN_KEY, data.token);
      if (data.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        setAuthUser(data.user);
      }
      setToken(data.token);
      return true;
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "注册失败");
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    clearAuth();
    setAuthError("");
  }, [clearAuth]);

  return {
    token,
    authUser,
    authChecking,
    authLoading,
    authError,
    handleLogin,
    handleRegister,
    handleLogout
  };
}
