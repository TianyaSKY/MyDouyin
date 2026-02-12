import { apiFetch } from "./client";

export async function login(username, password) {
  const resp = await apiFetch("/api/auth/login", null, {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
  if (!resp.ok) throw new Error(`登录失败: ${resp.status}`);
  const json = await resp.json();
  const token = json?.data?.token;
  if (!token) throw new Error(json?.message || "登录失败");
  return json.data;
}

export async function me(token) {
  const resp = await apiFetch("/api/auth/me", token);
  if (!resp.ok) throw new Error("unauthorized");
  const json = await resp.json();
  if (!json?.data) throw new Error("invalid token");
  return json.data;
}

export async function register(username, password, nickname) {
  const payload = { username, password };
  if (nickname && nickname.trim()) payload.nickname = nickname.trim();
  const resp = await apiFetch("/api/auth/register", null, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (!resp.ok) throw new Error(`注册失败: ${resp.status}`);
  const json = await resp.json();
  const token = json?.data?.token;
  if (!token) throw new Error(json?.message || "注册失败");
  return json.data;
}
