import { apiFetch } from './client';

export async function getAdminDashboard(token, signal) {
  const resp = await apiFetch('/api/admin/dashboard', token, { signal });
  const json = await resp.json();

  if (json.code !== 200) {
    throw new Error(json.message || '获取管理员数据失败');
  }

  return json.data;
}
