import { apiFetch } from "./client";
import { normalizeVideo, sumStats } from "../utils/format";

export async function fetchFeedBundle({ token, userId, pageSize }) {
  const feedResp = await apiFetch(`/api/feed?userId=${userId}&size=${pageSize}`, token);
  if (!feedResp.ok) throw new Error(`Feed request failed: ${feedResp.status}`);
  const feedJson = await feedResp.json();
  const feedVideos = feedJson?.data?.videos ?? [];

  const authorIds = [...new Set(feedVideos.map((item) => item.authorId).filter((id) => id != null))];
  const videoIds = [...new Set(feedVideos.map((item) => item.id).filter((id) => id != null))];

  const authorResults = await Promise.all(
    authorIds.map(async (id) => {
      const resp = await apiFetch(`/api/users/${id}`, token);
      if (!resp.ok) return [String(id), null];
      const userJson = await resp.json();
      return [String(id), userJson?.data?.nickname || userJson?.data?.username || null];
    })
  );

  const statsResults = await Promise.all(
    videoIds.map(async (videoId) => {
      const resp = await apiFetch(`/api/stats/${videoId}/today`, token);
      if (!resp.ok) return [String(videoId), { imprCnt: 0, likeCnt: 0, finishCnt: 0, shareCnt: 0 }];
      const statsJson = await resp.json();
      const rows = Array.isArray(statsJson?.data) ? statsJson.data : [];
      return [String(videoId), sumStats(rows)];
    })
  );

  const authorMap = new Map(authorResults);
  const statsMap = new Map(statsResults);
  const videos = feedVideos.map((video) => normalizeVideo(video, authorMap, statsMap));
  const statsSummary = statsResults.reduce(
    (acc, item) => {
      const stats = item[1] || { imprCnt: 0, likeCnt: 0, finishCnt: 0, shareCnt: 0 };
      acc.play += Number(stats.imprCnt || 0);
      acc.like += Number(stats.likeCnt || 0);
      acc.share += Number(stats.shareCnt || 0);
      acc.finish += Number(stats.finishCnt || 0);
      return acc;
    },
    { play: 0, like: 0, share: 0, finish: 0 }
  );

  return { videos, statsSummary };
}
