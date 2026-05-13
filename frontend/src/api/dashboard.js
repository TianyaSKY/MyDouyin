import { apiFetch } from './client';

// Helper to unwrap the standard {code, message, data} response envelope
const unwrap = (res) => res.json().then(json => json.data);

export const getOverview = () => apiFetch('/api/dashboard/overview').then(unwrap);
export const getUserGrowthTrend = (days = 30) => apiFetch(`/api/dashboard/users/growth?days=${days}`).then(unwrap);
export const getDauTrend = (days = 30) => apiFetch(`/api/dashboard/users/active?days=${days}`).then(unwrap);
export const getEventDistribution = (days = 7) => apiFetch(`/api/dashboard/users/events?days=${days}`).then(unwrap);
export const getTopActiveUsers = (days = 7, limit = 10) => apiFetch(`/api/dashboard/users/top?days=${days}&limit=${limit}`).then(unwrap);
export const getVideoPublishTrend = (days = 30) => apiFetch(`/api/dashboard/videos/trend?days=${days}`).then(unwrap);
export const getTopVideos = (limit = 10) => apiFetch(`/api/dashboard/videos/top?limit=${limit}`).then(unwrap);
export const getTagCloud = (limit = 50) => apiFetch(`/api/dashboard/tags/cloud?limit=${limit}`).then(unwrap);
export const getVideoStatusDistribution = () => apiFetch('/api/dashboard/videos/status').then(unwrap);
export const getFunnel = (days = 7) => apiFetch(`/api/dashboard/funnel?days=${days}`).then(unwrap);
export const getEventHeatmap = (days = 7) => apiFetch(`/api/dashboard/heatmap?days=${days}`).then(unwrap);
export const getCtrTrend = (days = 7) => apiFetch(`/api/dashboard/recommend/ctr?days=${days}`).then(unwrap);
export const getRecentEvents = (limit = 20) => apiFetch(`/api/dashboard/events/recent?limit=${limit}`).then(unwrap);
