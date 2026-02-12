import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchFeedBundle } from "../api/feed";
import { DEFAULT_PAGE_SIZE, DEFAULT_USER_ID } from "../config";
import { formatCount } from "../utils/format";

export function useFeed({ token, authUserId, enabled }) {
  const [videos, setVideos] = useState([]);
  const [statsSummary, setStatsSummary] = useState({ play: 0, like: 0, share: 0, finish: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchFeed = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const userIdFromQuery = Number(new URLSearchParams(window.location.search).get("userId"));
      const userId = Number.isFinite(Number(authUserId)) && Number(authUserId) > 0 ? Number(authUserId) : Number.isFinite(userIdFromQuery) && userIdFromQuery > 0 ? userIdFromQuery : DEFAULT_USER_ID;
      const result = await fetchFeedBundle({ token, userId, pageSize: DEFAULT_PAGE_SIZE });
      setVideos(result.videos);
      setStatsSummary(result.statsSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
      setVideos([]);
      setStatsSummary({ play: 0, like: 0, share: 0, finish: 0 });
    } finally {
      setLoading(false);
    }
  }, [token, authUserId]);

  useEffect(() => {
    if (enabled && token) {
      fetchFeed();
      return;
    }
    setLoading(false);
    setVideos([]);
    setStatsSummary({ play: 0, like: 0, share: 0, finish: 0 });
  }, [enabled, token, fetchFeed]);

  const panelStats = useMemo(() => {
    const interaction = statsSummary.like + statsSummary.share + statsSummary.finish;
    const ratio = statsSummary.play > 0 ? `${((interaction / statsSummary.play) * 100).toFixed(2)}%` : "--";
    return {
      play: formatCount(statsSummary.play),
      interact: ratio,
      finish: formatCount(statsSummary.finish)
    };
  }, [statsSummary]);

  return { videos, loading, error, panelStats, fetchFeed };
}
