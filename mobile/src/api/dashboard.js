import { apiFetch } from './client';

/**
 * Dashboard API — 数据大屏聚合接口
 */

/* ─── helpers ─── */
async function getJSON(path, token) {
  const res = await apiFetch(path, token);
  const json = await res.json();
  return json.data ?? json;
}

/* ─── 全局概览 ─── */
export function fetchOverview(token) {
  return getJSON('/api/dashboard/overview', token);
}

/* ─── 用户分析 ─── */
export function fetchUserGrowth(token, days = 30) {
  return getJSON(`/api/dashboard/users/growth?days=${days}`, token);
}

export function fetchDauTrend(token, days = 30) {
  return getJSON(`/api/dashboard/users/active?days=${days}`, token);
}

export function fetchEventDistribution(token, days = 7) {
  return getJSON(`/api/dashboard/users/events?days=${days}`, token);
}

export function fetchTopActiveUsers(token, days = 7, limit = 10) {
  return getJSON(`/api/dashboard/users/top?days=${days}&limit=${limit}`, token);
}

/* ─── 内容分析 ─── */
export function fetchVideoPublishTrend(token, days = 30) {
  return getJSON(`/api/dashboard/videos/trend?days=${days}`, token);
}

export function fetchTopVideos(token, limit = 10) {
  return getJSON(`/api/dashboard/videos/top?limit=${limit}`, token);
}

export function fetchTagCloud(token, limit = 30) {
  return getJSON(`/api/dashboard/tags/cloud?limit=${limit}`, token);
}

export function fetchVideoStatusDist(token) {
  return getJSON('/api/dashboard/videos/status', token);
}

/* ─── 行为漏斗 ─── */
export function fetchFunnel(token, days = 7) {
  return getJSON(`/api/dashboard/funnel?days=${days}`, token);
}

/* ─── 推荐效果 ─── */
export function fetchCtrTrend(token, days = 7) {
  return getJSON(`/api/dashboard/recommend/ctr?days=${days}`, token);
}

/* ─── 评论 & 情感 ─── */
export function fetchCommentOverview(token) {
  return getJSON('/api/dashboard/comments/overview', token);
}

export function fetchCommentTrend(token, days = 30) {
  return getJSON(`/api/dashboard/comments/trend?days=${days}`, token);
}

export function fetchSentimentDist(token, days = 30) {
  return getJSON(`/api/dashboard/comments/sentiment/distribution?days=${days}`, token);
}

export function fetchSentimentTrend(token, days = 30) {
  return getJSON(`/api/dashboard/comments/sentiment/trend?days=${days}`, token);
}

export function fetchTopCommentedVideos(token, limit = 10) {
  return getJSON(`/api/dashboard/comments/videos/top?limit=${limit}`, token);
}

export function fetchRecentComments(token, limit = 20) {
  return getJSON(`/api/dashboard/comments/recent?limit=${limit}`, token);
}

/* ─── 实时监控 ─── */
export function fetchRecentEvents(token, limit = 20) {
  return getJSON(`/api/dashboard/events/recent?limit=${limit}`, token);
}

/* ─── 热力图 ─── */
export function fetchHeatmap(token, days = 7) {
  return getJSON(`/api/dashboard/heatmap?days=${days}`, token);
}
