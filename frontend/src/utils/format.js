export function formatCount(value) {
  if (value == null || Number.isNaN(Number(value))) return "--";
  const n = Number(value);
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`;
  return n.toLocaleString("zh-CN");
}

export function sumStats(statsRows) {
  return (statsRows || []).reduce(
    (acc, row) => {
      acc.imprCnt += Number(row?.imprCnt || 0);
      acc.likeCnt += Number(row?.likeCnt || 0);
      acc.finishCnt += Number(row?.finishCnt || 0);
      acc.shareCnt += Number(row?.shareCnt || 0);
      return acc;
    },
    { imprCnt: 0, likeCnt: 0, finishCnt: 0, shareCnt: 0 }
  );
}

export function normalizeVideo(video, authorMap, statsMap) {
  const authorName = authorMap.get(String(video.authorId));
  const author = authorName ? `@${authorName}` : `@user_${video.authorId ?? "unknown"}`;
  const stats = statsMap.get(String(video.id)) || { imprCnt: 0, likeCnt: 0, finishCnt: 0, shareCnt: 0 };
  return {
    id: video.id ?? `${video.authorId}-${video.title}`,
    author,
    title: video.title || "未命名视频",
    music: video.createdAt ? `发布于 ${new Date(video.createdAt).toLocaleString("zh-CN")}` : "发布时间未知",
    likes: formatCount(stats.likeCnt),
    finishes: formatCount(stats.finishCnt),
    shares: formatCount(stats.shareCnt),
    tags: Array.isArray(video.tags) && video.tags.length > 0 ? video.tags : ["推荐"],
    coverUrl: video.coverUrl || ""
  };
}
