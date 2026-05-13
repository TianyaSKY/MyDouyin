import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { shortNum, PALETTE, EVENT_LABELS, EVENT_COLORS } from './helpers';
import { SectionCard, KpiItem, BarChartView, HBarChart, RankRow } from './ChartComponents';
import { useAuthContext } from '../../contexts/AuthContext';
import {
  fetchOverview, fetchUserGrowth, fetchDauTrend,
  fetchEventDistribution, fetchTopActiveUsers, fetchHeatmap,
} from '../../api/dashboard';

const C = { bg: '#0B0F19', textMut: '#6B7280' };

export default function UserInsightsTab() {
  const { token } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [s, setS] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, growth, dau, events, users, heatmap] = await Promise.allSettled([
        fetchOverview(token), fetchUserGrowth(token, 30), fetchDauTrend(token, 30),
        fetchEventDistribution(token, 30), fetchTopActiveUsers(token, 30, 10), fetchHeatmap(token, 7),
      ]);
      setS({
        overview: ov.status === 'fulfilled' ? ov.value : {},
        growth: growth.status === 'fulfilled' ? growth.value : [],
        dau: dau.status === 'fulfilled' ? dau.value : [],
        events: events.status === 'fulfilled' ? events.value : [],
        users: users.status === 'fulfilled' ? users.value : [],
        heatmap: heatmap.status === 'fulfilled' ? heatmap.value : [],
      });
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color="#3B82F6" />;

  const ov = s.overview || {};
  const avgDau = s.dau?.length > 0 ? Math.round(s.dau.reduce((a, d) => a + (d.value || 0), 0) / s.dau.length) : 0;
  const totalEvents = s.events?.reduce((a, d) => a + (d.count || 0), 0) || 0;

  const heatmapByHour = {};
  (s.heatmap || []).forEach(h => { heatmapByHour[h.hour] = (heatmapByHour[h.hour] || 0) + (h.count || 0); });
  const maxHeat = Math.max(...Object.values(heatmapByHour), 1);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
      <View style={st.kpiGrid}>
        <KpiItem label="总用户数" value={shortNum(ov.totalUsers)} icon="people" color="#3B82F6" />
        <KpiItem label="今日新增" value={shortNum(ov.todayNewUsers)} icon="person-add" color="#10B981" />
        <KpiItem label="平均 DAU" value={shortNum(avgDau)} icon="pulse" color="#A855F7" />
        <KpiItem label="总互动次数" value={shortNum(totalEvents)} icon="flash" color="#F59E0B" />
      </View>
      <SectionCard title="用户增长趋势 (30天)" icon="trending-up">
        <BarChartView data={s.growth} barColor="#3B82F6" />
      </SectionCard>
      <SectionCard title="日活跃用户 DAU (30天)" icon="people">
        <BarChartView data={s.dau} barColor="#10B981" />
      </SectionCard>
      <SectionCard title="用户行为分布" icon="pie-chart">
        <HBarChart items={(s.events || []).map(d => ({
          label: EVENT_LABELS[d.eventType] || d.eventType, value: d.count || 0,
          color: EVENT_COLORS[d.eventType] || '#888',
        }))} />
      </SectionCard>
      <SectionCard title="活跃时段分布 (7天)" icon="time">
        {Object.keys(heatmapByHour).length > 0 ? (
          <View>
            <View style={st.heatGrid}>
              {Array.from({ length: 24 }, (_, h) => {
                const val = heatmapByHour[h] || 0;
                const intensity = val / maxHeat;
                const bg = intensity > 0.7 ? '#10B981' : intensity > 0.3 ? '#3B82F6' : intensity > 0 ? '#1F2937' : '#111827';
                return (
                  <View key={h} style={[st.heatCell, { backgroundColor: bg }]}>
                    <Text style={st.heatH}>{h}</Text>
                  </View>
                );
              })}
            </View>
            <View style={st.heatLegend}>
              <Text style={st.legendT}>低</Text>
              {['#111827', '#1F2937', '#3B82F6', '#10B981'].map((c, i) => (
                <View key={i} style={[st.legendBox, { backgroundColor: c }]} />
              ))}
              <Text style={st.legendT}>高</Text>
            </View>
          </View>
        ) : <Text style={st.empty}>暂无数据</Text>}
      </SectionCard>
      <SectionCard title="活跃用户排行 Top 10" icon="trophy">
        {(s.users || []).map((u, i) => (
          <RankRow key={u.userId || i} index={i} color={PALETTE[i % PALETTE.length]}
            title={u.nickname || 'Unknown'} subtitle={`互动 ${shortNum(u.eventCount)} 次`} />
        ))}
        {(!s.users || s.users.length === 0) && <Text style={st.empty}>暂无数据</Text>}
      </SectionCard>
      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  content: { paddingHorizontal: 14, paddingTop: 8 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 4 },
  empty: { color: C.textMut, textAlign: 'center', paddingVertical: 16, fontSize: 12 },
  heatGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 3 },
  heatCell: { width: 28, height: 28, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  heatH: { color: 'rgba(255,255,255,0.4)', fontSize: 8 },
  heatLegend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  legendT: { color: C.textMut, fontSize: 9, marginHorizontal: 4 },
  legendBox: { width: 14, height: 10, borderRadius: 2, marginHorizontal: 2 },
});
