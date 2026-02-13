import { apiFetch } from './client';

export async function login(username, password) {
  const resp = await apiFetch('/api/auth/login', null, {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  
  const json = await resp.json();
  if (json.code !== 200) {
    throw new Error(json.message || '登录失败');
  }
  
  return json.data;
}

export async function register(username, password, nickname) {
  const payload = { username, password };
  if (nickname && nickname.trim()) payload.nickname = nickname.trim();
  
  const resp = await apiFetch('/api/auth/register', null, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  
  const json = await resp.json();
  if (json.code !== 200) {
    throw new Error(json.message || '注册失败');
  }
  
  return json.data;
}

export async function me(token) {
  const resp = await apiFetch('/api/auth/me', token);
  const json = await resp.json();
  
  if (json.code !== 200) {
    throw new Error(json.message || '获取用户信息失败');
  }
  
  return json.data;
}