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

export async function getFollowStatus(token, userId) {
    const resp = await apiFetch(`/api/users/${userId}/follow`, token);
    const json = await resp.json();

    if (json.code !== 200) {
        throw new Error(json.message || '获取关注状态失败');
    }

    return json.data;
}

export async function followUser(token, userId) {
    const resp = await apiFetch(`/api/users/${userId}/follow`, token, {
        method: 'POST'
    });
    const json = await resp.json();

    if (json.code !== 200) {
        throw new Error(json.message || '关注失败');
    }

    return json.data;
}

export async function unfollowUser(token, userId) {
    const resp = await apiFetch(`/api/users/${userId}/follow`, token, {
        method: 'DELETE'
    });
    const json = await resp.json();

    if (json.code !== 200) {
        throw new Error(json.message || '取消关注失败');
    }

    return json.data;
}

export async function getFollowing(token, userId) {
    const resp = await apiFetch(`/api/users/${userId}/following`, token);
    const json = await resp.json();

    if (json.code !== 200) {
        throw new Error(json.message || '获取关注列表失败');
    }

    return json.data;
}

export async function getFollowers(token, userId) {
    const resp = await apiFetch(`/api/users/${userId}/followers`, token);
    const json = await resp.json();

    if (json.code !== 200) {
        throw new Error(json.message || '获取粉丝列表失败');
    }

    return json.data;
}
