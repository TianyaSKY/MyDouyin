import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { shortNum, PALETTE } from './helpers';
import { SectionCard, KpiItem, BarChartView, HBarChart, RankRow } from './ChartComponents';
import { useAuthContext } from '../../contexts/AuthContext';
import { fetchOverview, fetchVideoPublishTrend, fetchTopVideos, fetchTagCloud, fetchVideoStatusDist } from '../../api/dashboard';

const STATUS_COLORS = { '已发布': '#10B981', '审核中': '#F59E0B', '已下架': '#EF4444', '草稿': '#6B7280' };

export default function ContentOpsTab() {
  const { token } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [s, setS] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, pub, top, tags, status] = await Promise.allSettled([
        fetchOverview(token), fetchVideoPublishTrend(token, 30), fetchTopVideos(token, 10),
        fetchTagCloud(token, 30), fetchVideoStatusDist(token),
      ]);
      setS({
        overview: ov.status === 'fulfilled' ? ov.value : {},
        publish: pub.status === 'fulfilled' ? pub.value : [],
        topVideos: top.status === 'fulfilled' ? top.value : [],
        tags: tags.status === 'fulfilled' ? tags.value : [],
        status: status.status === 'fulfilled' ? status.value : [],
      });
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color="#A855F7" />;

  const ov = s.overview || {};
  const totalStatus = (s.status || []).reduce((a, d) => a + (d.count || 0), 0);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
      <View style={st.kpiGrid}>
        <KpiItem label="总视频数" value={shortNum(ov.totalVideos)} icon="videocam" color="#A855F7" />
        <KpiItem label="今日发布" value={shortNum(ov.todayNewVideos)} icon="cloud-upload" color="#EC4899" />
        <KpiItem label="标签种类" value={shortNum((s.tags || []).length)} icon="pricetag" color="#06B6D4" />
        <KpiItem label="内容总量" value={shortNum(totalStatus)} icon="bar-chart" color="#10B981" />
      </View>
      <SectionCard title="视频发布趋势 (30天)" icon="trending-up">
        <BarChartView data={s.publish} barColor="#A855F7" />
      </SectionCard>
      <SectionCard title="视频状态分布" icon="pie-chart">
        <HBarChart items={(s.status || []).map(d => ({
          label: d.statusName || `状态${d.statusCode}`, value: d.count || 0,
          color: STATUS_COLORS[d.statusName] || '#6B7280',
        }))} />
      </SectionCard>
      <SectionCard title="热门标签 Top 15" icon="pricetag">
        <HBarChart items={(s.tags || []).slice(0, 15).map((t, i) => ({
          label: t.tagName || '', value: t.videoCount || 0, color: PALETTE[i % PALETTE.length],
        }))} />
      </SectionCard>
      <SectionCard title="热门视频排行 Top 10" icon="flame">
        {(s.topVideos || []).map((v, i) => (
          <RankRow key={v.videoId || i} index={i} color={PALETTE[i % PALETTE.length]}
            title={v.title || `视频 #${v.videoId}`}
            subtitle={`${v.authorName ? '@' + v.authorName + '  ' : ''}▶${shortNum(v.playCount)} ❤${shortNum(v.likeCount)} 💬${shortNum(v.commentCount)} ↗${shortNum(v.shareCount)}`} />
        ))}
        {(!s.topVideos || s.topVideos.length === 0) && <Text style={st.empty}>暂无数据</Text>}
      </SectionCard>
      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  content: { paddingHorizontal: 14, paddingTop: 8 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 4 },
  empty: { color: '#6B7280', textAlign: 'center', paddingVertical: 16, fontSize: 12 },
});
