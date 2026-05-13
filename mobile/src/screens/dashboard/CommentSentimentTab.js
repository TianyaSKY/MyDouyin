import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { shortNum, SENTIMENT_COLORS, SENTIMENT_LABELS, PALETTE } from './helpers';
import { SectionCard, KpiItem, BarChartView, StackedBar, RankRow } from './ChartComponents';
import { useAuthContext } from '../../contexts/AuthContext';
import {
  fetchCommentOverview, fetchCommentTrend, fetchSentimentDist,
  fetchSentimentTrend, fetchTopCommentedVideos, fetchRecentComments,
} from '../../api/dashboard';

function sentimentBadge(score) {
  if (score == null) return { text: '未分析', color: '#6B7280', emoji: '—' };
  if (score >= 0.6) return { text: '正面', color: '#10B981', emoji: '😊' };
  if (score < 0.4) return { text: '负面', color: '#EF4444', emoji: '😟' };
  return { text: '中性', color: '#F59E0B', emoji: '😐' };
}

export default function CommentSentimentTab() {
  const { token } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [s, setS] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, trend, dist, sTrend, topV, recent] = await Promise.allSettled([
        fetchCommentOverview(token), fetchCommentTrend(token, 30), fetchSentimentDist(token, 30),
        fetchSentimentTrend(token, 30), fetchTopCommentedVideos(token, 10), fetchRecentComments(token, 20),
      ]);
      setS({
        overview: ov.status === 'fulfilled' ? ov.value : {},
        trend: trend.status === 'fulfilled' ? trend.value : [],
        dist: dist.status === 'fulfilled' ? dist.value : [],
        sTrend: sTrend.status === 'fulfilled' ? sTrend.value : [],
        topVideos: topV.status === 'fulfilled' ? topV.value : [],
        recent: recent.status === 'fulfilled' ? recent.value : [],
      });
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color="#06B6D4" />;

  const ov = s.overview || {};
  const trendData = (s.trend || []).map(d => ({ date: d.date, value: d.count || 0 }));
  const posTrend = (s.sTrend || []).map(d => ({ date: d.date, value: d.positive || 0 }));
  const negTrend = (s.sTrend || []).map(d => ({ date: d.date, value: d.negative || 0 }));
  const gaugeVal = Math.round((ov.avgSentimentScore || 0) * 100);
  const gaugeColor = gaugeVal >= 60 ? '#10B981' : gaugeVal >= 40 ? '#F59E0B' : '#EF4444';

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
      {/* 8 KPI Cards */}
      <View style={st.kpiGrid}>
        <KpiItem label="总评论数" value={shortNum(ov.totalComments)} icon="chatbubbles" color="#06B6D4" />
        <KpiItem label="今日新增" value={shortNum(ov.todayComments)} icon="trending-up" color="#3B82F6" />
        <KpiItem label="评论用户数" value={shortNum(ov.commentUsers)} icon="people" color="#A855F7" />
        <KpiItem label="被评论视频" value={shortNum(ov.commentedVideos)} icon="videocam" color="#EC4899" />
        <KpiItem label="已分析评论" value={shortNum(ov.analyzedComments)} icon="bulb" color="#6366F1" />
        <KpiItem label="正面评论" value={shortNum(ov.positiveComments)} icon="thumbs-up" color="#10B981" />
        <KpiItem label="负面评论" value={shortNum(ov.negativeComments)} icon="thumbs-down" color="#EF4444" />
        <KpiItem label="情感均分" value={ov.avgSentimentScore ? ov.avgSentimentScore.toFixed(3) : '0.000'} icon="pulse" color="#F59E0B" />
      </View>

      <SectionCard title="评论趋势 (30天)" icon="trending-up">
        <BarChartView data={trendData} barColor="#06B6D4" />
      </SectionCard>

      <SectionCard title="情感分布" icon="happy">
        <StackedBar segments={(s.dist || []).map(d => ({ value: d.count || 0, color: SENTIMENT_COLORS[d.label] || '#888' }))} />
        <View style={st.sentLegend}>
          {(s.dist || []).map((d, i) => (
            <View key={i} style={st.sentItem}>
              <View style={[st.dot, { backgroundColor: SENTIMENT_COLORS[d.label] || '#888' }]} />
              <Text style={st.sentText}>{SENTIMENT_LABELS[d.label] || d.label}</Text>
              <Text style={st.sentVal}>{shortNum(d.count)}</Text>
            </View>
          ))}
        </View>
      </SectionCard>

      {/* Gauge */}
      <SectionCard title="情感健康度" icon="pulse">
        <View style={st.gaugeBox}>
          <Text style={[st.gaugeVal, { color: gaugeColor }]}>{gaugeVal}</Text>
          <Text style={st.gaugeSub}>/ 100</Text>
        </View>
        <View style={st.gaugeBar}>
          <View style={[st.gaugeFill, { width: `${gaugeVal}%`, backgroundColor: gaugeColor }]} />
        </View>
        <View style={st.gaugeLabels}>
          <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '600' }}>负面</Text>
          <Text style={{ color: '#F59E0B', fontSize: 10, fontWeight: '600' }}>中性</Text>
          <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '600' }}>正面</Text>
        </View>
      </SectionCard>

      <SectionCard title="正面评论趋势" icon="trending-up">
        <BarChartView data={posTrend} barColor="#10B981" height={80} />
      </SectionCard>
      <SectionCard title="负面评论趋势" icon="trending-down">
        <BarChartView data={negTrend} barColor="#EF4444" height={80} />
      </SectionCard>

      <SectionCard title="热评视频排行 Top 10" icon="chatbubble-ellipses">
        {(s.topVideos || []).map((v, i) => {
          const badge = sentimentBadge(v.avgSentiment);
          return (
            <RankRow key={v.videoId || i} index={i} color={badge.color}
              title={v.title || '无标题'}
              subtitle={`💬${shortNum(v.commentCount)}  ${badge.emoji} ${badge.text}${v.avgSentiment != null ? ' (' + (v.avgSentiment * 100).toFixed(0) + ')' : ''}`} />
          );
        })}
        {(!s.topVideos || s.topVideos.length === 0) && <Text style={st.empty}>暂无数据</Text>}
      </SectionCard>

      <SectionCard title="最新评论动态" icon="chatbubble">
        {(s.recent || []).slice(0, 15).map((c, i) => {
          const badge = sentimentBadge(c.sentimentScore);
          return (
            <View key={c.commentId || i} style={st.commentRow}>
              <View style={st.commentTop}>
                <Text style={st.commentUser}>@{c.nickname || '匿名'}</Text>
                <View style={[st.sentBadge, { backgroundColor: badge.color + '22' }]}>
                  <Text style={[st.sentBadgeT, { color: badge.color }]}>{badge.emoji} {badge.text}</Text>
                </View>
              </View>
              <Text style={st.commentContent} numberOfLines={2}>{c.content}</Text>
              <View style={st.commentBot}>
                <Text style={st.commentVideo} numberOfLines={1}>《{c.videoTitle || '未知'}》</Text>
                <Text style={st.commentTime}>
                  {c.createdAt ? new Date(c.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) : ''}
                </Text>
              </View>
            </View>
          );
        })}
        {(!s.recent || s.recent.length === 0) && <Text style={st.empty}>暂无评论</Text>}
      </SectionCard>

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  content: { paddingHorizontal: 14, paddingTop: 8 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 4 },
  empty: { color: '#6B7280', textAlign: 'center', paddingVertical: 16, fontSize: 12 },
  sentLegend: { flexDirection: 'row', justifyContent: 'space-around' },
  sentItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  sentText: { color: '#9CA3AF', fontSize: 11, marginRight: 3 },
  sentVal: { color: '#E5E7EB', fontSize: 11, fontWeight: '600' },
  gaugeBox: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginBottom: 8 },
  gaugeVal: { fontSize: 40, fontWeight: '900' },
  gaugeSub: { color: '#6B7280', fontSize: 16, marginLeft: 4 },
  gaugeBar: { height: 12, backgroundColor: '#1F2937', borderRadius: 6, overflow: 'hidden', marginBottom: 6 },
  gaugeFill: { height: '100%', borderRadius: 6 },
  gaugeLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  commentRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E2433' },
  commentTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  commentUser: { color: '#3B82F6', fontSize: 12, fontWeight: '600' },
  sentBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  sentBadgeT: { fontSize: 10, fontWeight: '600' },
  commentContent: { color: '#E5E7EB', fontSize: 13, lineHeight: 18, marginBottom: 4 },
  commentBot: { flexDirection: 'row', justifyContent: 'space-between' },
  commentVideo: { color: '#6B7280', fontSize: 10, flex: 1 },
  commentTime: { color: '#6B7280', fontSize: 10 },
});
