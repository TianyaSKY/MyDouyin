import { apiFetch } from './client';

export async function getFeed(token, userId, size = 10) {
  const resp = await apiFetch(`/api/feed?userId=${userId}&size=${size}`, token);
  const json = await resp.json();

  if (json.code !== 200) {
    throw new Error(json.message || '获取视频流失败');
  }

  return json.data;
}

export async function createVideo(token, videoData) {
  const resp = await apiFetch('/api/videos', token, {
    method: 'POST',
    body: JSON.stringify(videoData)
  });

  const json = await resp.json();
  if (json.code !== 200) {
    throw new Error(json.message || '创建视频失败');
  }
  return json.data;
}

export async function getAuthorVideos(token, authorId, current = 1, size = 20) {
  const resp = await apiFetch(`/api/videos/author/${authorId}?current=${current}&size=${size}`, token);
  const json = await resp.json();
  if (json.code !== 200) {
    throw new Error(json.message || '获取作品列表失败');
  }
  return json.data;
}
