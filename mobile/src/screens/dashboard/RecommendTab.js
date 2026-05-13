import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { shortNum, pct, EVENT_LABELS, EVENT_COLORS } from './helpers';
import { SectionCard, KpiItem, BarChartView, HBarChart, FunnelBar, RateBadge } from './ChartComponents';
import { useAuthContext } from '../../contexts/AuthContext';
import { fetchFunnel, fetchCtrTrend, fetchEventDistribution, fetchOverview, fetchRecentEvents } from '../../api/dashboard';

const EVENT_ICONS = { click: 'play-circle', finish: 'checkmark-circle', like: 'heart', comment: 'chatbubble', share: 'share-social', impr: 'eye' };
const EVENT_ICON_COLORS = { click: '#3B82F6', finish: '#10B981', like: '#FF6B81', comment: '#25D366', share: '#A855F7', impr: '#888' };
const EVENT_DESCS = { click: '观看了', finish: '完整播放了', like: '点赞了', comment: '评论了', share: '分享了', impr: '收到推荐' };

export default function RecommendTab() {
  const { token } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [s, setS] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [funnel, ctr, events, ov, recent] = await Promise.allSettled([
        fetchFunnel(token, 7), fetchCtrTrend(token, 7), fetchEventDistribution(token, 7),
        fetchOverview(token), fetchRecentEvents(token, 20),
      ]);
      setS({
        funnel: funnel.status === 'fulfilled' ? funnel.value : null,
        ctr: ctr.status === 'fulfilled' ? ctr.value : null,
        events: events.status === 'fulfilled' ? events.value : [],
        overview: ov.status === 'fulfilled' ? ov.value : {},
        recent: recent.status === 'fulfilled' ? recent.value : [],
      });
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color="#F59E0B" />;

  const f = s.funnel || {};
  const impr = f.impressions || 0, clicks = f.clicks || 0, finishes = f.finishes || 0;
  const interactions = (f.likes || 0) + (f.comments || 0) + (f.shares || 0);
  const ctrVal = impr > 0 ? ((clicks / impr) * 100).toFixed(2) + '%' : '0%';
  const finishR = impr > 0 ? ((finishes / impr) * 100).toFixed(2) + '%' : '0%';
  const interR = impr > 0 ? ((interactions / impr) * 100).toFixed(2) + '%' : '0%';

  const ctrTrend = [];
  if (s.ctr?.impressions && s.ctr?.clicks) {
    const clickMap = {};
    (s.ctr.clicks || []).forEach(d => { clickMap[d.date] = d.value; });
    (s.ctr.impressions || []).forEach(d => {
      const c = clickMap[d.date] || 0;
      ctrTrend.push({ date: d.date, value: d.value > 0 ? Math.round((c / d.value) * 10000) : 0 });
    });
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
      <View style={st.kpiGrid}>
        <KpiItem label="总曝光" value={shortNum(impr)} icon="eye" color="#3B82F6" />
        <KpiItem label="总点击" value={shortNum(clicks)} icon="finger-print" color="#F59E0B" />
        <KpiItem label="CTR" value={ctrVal} icon="analytics" color="#EF4444" />
        <KpiItem label="完播数" value={shortNum(finishes)} icon="checkmark-circle" color="#10B981" />
        <KpiItem label="完播率" value={finishR} icon="trending-down" color="#059669" />
        <KpiItem label="互动率" value={interR} icon="flash" color="#A855F7" />
      </View>
      <SectionCard title="推荐转化漏斗" icon="funnel">
        <FunnelBar label="曝光" value={impr} maxVal={impr} color="#3B82F6" />
        <FunnelBar label="点击" value={clicks} maxVal={impr} color="#F59E0B" />
        <FunnelBar label="完播" value={finishes} maxVal={impr} color="#10B981" />
        <FunnelBar label="互动" value={interactions} maxVal={impr} color="#A855F7" />
        <View style={st.rateRow}>
          <RateBadge label="点击率" value={ctrVal} color="#F59E0B" />
          <RateBadge label="完播率" value={finishR} color="#10B981" />
          <RateBadge label="互动率" value={interR} color="#A855F7" />
        </View>
      </SectionCard>
      <SectionCard title="CTR 趋势 (7天, ‱)" icon="analytics">
        <BarChartView data={ctrTrend} barColor="#EF4444" />
      </SectionCard>
      <SectionCard title="互动行为细分" icon="flash">
        <HBarChart items={(s.events || [])
          .filter(d => d.eventType !== 'impr' && d.eventType !== 'leave')
          .sort((a, b) => (b.count || 0) - (a.count || 0))
          .map(d => ({
            label: EVENT_LABELS[d.eventType] || d.eventType, value: d.count || 0,
            color: EVENT_COLORS[d.eventType] || '#888',
          }))} />
      </SectionCard>
      <SectionCard title="最新互动动态" icon="pulse">
        {(s.recent || []).slice(0, 15).map((ev, i) => (
          <View key={ev.eventId || i} style={st.evRow}>
            <Text style={st.evTime}>
              {ev.ts ? new Date(ev.ts).toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '--:--'}
            </Text>
            <Ionicons name={EVENT_ICONS[ev.eventType] || 'ellipse'} size={13} color={EVENT_ICON_COLORS[ev.eventType] || '#888'} />
            <Text style={st.evUser} numberOfLines={1}>@{ev.nickname || '匿名'}</Text>
            <Text style={st.evDesc}>{EVENT_DESCS[ev.eventType] || '浏览了'}</Text>
            <Text style={st.evVideo} numberOfLines={1}>《{ev.videoTitle || '未知'}》</Text>
          </View>
        ))}
        {(!s.recent || s.recent.length === 0) && <Text style={st.empty}>暂无互动记录</Text>}
      </SectionCard>
      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  content: { paddingHorizontal: 14, paddingTop: 8 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 4 },
  rateRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  empty: { color: '#6B7280', textAlign: 'center', paddingVertical: 16, fontSize: 12 },
  evRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1E2433' },
  evTime: { color: '#6B7280', fontSize: 10, fontFamily: 'monospace', marginRight: 6, width: 36 },
  evUser: { color: '#3B82F6', fontSize: 11, fontWeight: '600', marginLeft: 4, maxWidth: 70 },
  evDesc: { color: '#6B7280', fontSize: 10, marginHorizontal: 3 },
  evVideo: { color: '#9CA3AF', fontSize: 10, flex: 1 },
});
