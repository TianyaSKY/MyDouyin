import { apiFetch } from './client';

export async function getUser(token, userId) {
    const resp = await apiFetch(`/api/users/${userId}`, token);
    const json = await resp.json();

    if (json.code !== 200) {
        throw new Error(json.message || '获取用户信息失败');
    }

    return json.data;
}

export async function getUserStats(token, userId) {
    const resp = await apiFetch(`/api/users/${userId}/stats`, token);
    const json = await resp.json();

    if (json.code !== 200) {
        throw new Error(json.message || '获取用户统计失败');
    }

    return json.data;
}
