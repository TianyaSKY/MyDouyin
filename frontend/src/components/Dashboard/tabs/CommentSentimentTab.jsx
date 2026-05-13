import React, { useEffect, useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  getCommentOverview,
  getCommentTrend,
  getSentimentDistribution,
  getSentimentTrend,
  getTopCommentedVideos,
  getRecentComments
} from '../../../api/dashboard';
import {
  MessageSquare, TrendingUp, ThumbsUp, ThumbsDown, Smile, Frown,
  BarChart3, Users, Film, Activity, Brain, Gauge, MessageCircle
} from 'lucide-react';

// Sentiment score to emoji/label
function sentimentBadge(score) {
  if (score == null) return { text: '未分析', color: 'gray', emoji: '—' };
  if (score >= 0.6) return { text: '正面', color: 'emerald', emoji: '😊' };
  if (score < 0.4) return { text: '负面', color: 'rose', emoji: '😟' };
  return { text: '中性', color: 'amber', emoji: '😐' };
}

export default function CommentSentimentTab() {
  const [overview, setOverview] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [sentimentDist, setSentimentDist] = useState([]);
  const [sentimentTrend, setSentimentTrend] = useState([]);
  const [topVideos, setTopVideos] = useState([]);
  const [recentComments, setRecentComments] = useState([]);
  const [dayRange, setDayRange] = useState(30);

  useEffect(() => {
    Promise.all([
      getCommentOverview(),
      getCommentTrend(dayRange),
      getSentimentDistribution(dayRange),
      getSentimentTrend(dayRange),
      getTopCommentedVideos(10),
      getRecentComments(20)
    ]).then(([ov, trend, dist, sTrend, videos, comments]) => {
      setOverview(ov || {});
      setTrendData(Array.isArray(trend) ? trend : []);
      setSentimentDist(Array.isArray(dist) ? dist : []);
      setSentimentTrend(Array.isArray(sTrend) ? sTrend : []);
      setTopVideos(Array.isArray(videos) ? videos : []);
      setRecentComments(Array.isArray(comments) ? comments : []);
    }).catch(err => console.error("Error fetching comment/sentiment data:", err));
  }, [dayRange]);

  // KPI values
  const totalComments = overview?.totalComments || 0;
  const todayComments = overview?.todayComments || 0;
  const analyzedComments = overview?.analyzedComments || 0;
  const positiveComments = overview?.positiveComments || 0;
  const negativeComments = overview?.negativeComments || 0;
  const avgSentiment = overview?.avgSentimentScore || 0;
  const commentUsers = overview?.commentUsers || 0;
  const commentedVideos = overview?.commentedVideos || 0;

  // Sentiment gauge value (0-100)
  const gaugeValue = Math.round(avgSentiment * 100);

  // Comment trend chart
  const commentTrendOption = useMemo(() => ({
    tooltip: { trigger: 'axis', backgroundColor: '#1F2937', textStyle: { color: '#F3F4F6' }, borderColor: '#374151' },
    grid: { left: '3%', right: '4%', bottom: '10%', top: '8%', containLabel: true },
    xAxis: {
      type: 'category', boundaryGap: false, data: trendData.map(d => d.date),
      axisLine: { lineStyle: { color: '#4B5563' } }, axisLabel: { fontSize: 11, color: '#9CA3AF' }
    },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1F2937', type: 'dashed' } }, axisLabel: { color: '#9CA3AF' } },
    dataZoom: [{ type: 'inside' }, { type: 'slider', height: 20, bottom: 0, textStyle: { color: '#9CA3AF' } }],
    series: [{
      name: '评论数', type: 'line', smooth: true,
      lineStyle: { width: 2, color: '#06B6D4' }, showSymbol: true, symbolSize: 6,
      areaStyle: {
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: 'rgba(6, 182, 212, 0.4)' }, { offset: 1, color: 'rgba(6, 182, 212, 0)' }]
        }
      },
      data: trendData.map(d => d.count)
    }]
  }), [trendData]);

  // Sentiment distribution donut chart
  const sentimentDistOption = useMemo(() => {
    const labelMap = { positive: '正面', neutral: '中性', negative: '负面' };
    const colorMap = { positive: '#10B981', neutral: '#F59E0B', negative: '#EF4444' };
    const data = sentimentDist.map(d => ({
      name: labelMap[d.label] || d.label,
      value: d.count,
      itemStyle: { color: colorMap[d.label] || '#6B7280' }
    }));
    const total = data.reduce((s, d) => s + d.value, 0);
    return {
      tooltip: {
        trigger: 'item', backgroundColor: '#1F2937', textStyle: { color: '#F3F4F6' }, borderColor: '#374151',
        formatter: (p) => `${p.name}<br/>数量: ${p.value.toLocaleString()}<br/>占比: ${p.percent}%`
      },
      legend: { bottom: 10, textStyle: { color: '#9CA3AF', fontSize: 11 } },
      series: [{
        name: '情感分布', type: 'pie', radius: ['48%', '72%'], center: ['50%', '42%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 8, borderColor: '#0B0F19', borderWidth: 3 },
        label: {
          show: true, position: 'center', fontSize: 18, fontWeight: 'bold', color: '#FFF',
          formatter: () => total.toLocaleString() + '\n已分析'
        },
        emphasis: {
          label: { show: true, fontSize: 15, fontWeight: 'bold',
            formatter: (p) => `${p.name}\n${p.value}`
          }
        },
        data: data
      }]
    };
  }, [sentimentDist]);

  // Sentiment trend - stacked area
  const sentimentTrendOption = useMemo(() => ({
    tooltip: {
      trigger: 'axis', backgroundColor: '#1F2937', textStyle: { color: '#F3F4F6' }, borderColor: '#374151',
      formatter: (params) => {
        let html = params[0]?.axisValue + '<br/>';
        params.forEach(p => {
          const val = p.seriesName === '平均分' ? (p.value != null ? p.value.toFixed(3) : '--') : p.value;
          html += `${p.marker} ${p.seriesName}: ${val}<br/>`;
        });
        return html;
      }
    },
    legend: { top: 5, textStyle: { color: '#9CA3AF', fontSize: 11 } },
    grid: { left: '3%', right: '5%', bottom: '10%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category', boundaryGap: false, data: sentimentTrend.map(d => d.date),
      axisLine: { lineStyle: { color: '#4B5563' } }, axisLabel: { fontSize: 11, color: '#9CA3AF' }
    },
    yAxis: [
      { type: 'value', name: '数量', splitLine: { lineStyle: { color: '#1F2937', type: 'dashed' } }, axisLabel: { color: '#9CA3AF' }, nameTextStyle: { color: '#9CA3AF' } },
      { type: 'value', name: '平均分', min: 0, max: 1, splitLine: { show: false }, axisLabel: { color: '#9CA3AF' }, nameTextStyle: { color: '#9CA3AF' } }
    ],
    dataZoom: [{ type: 'inside' }],
    series: [
      {
        name: '正面', type: 'bar', stack: 'sentiment', yAxisIndex: 0,
        itemStyle: { color: 'rgba(16, 185, 129, 0.7)', borderRadius: [3, 3, 0, 0] },
        data: sentimentTrend.map(d => d.positive || 0)
      },
      {
        name: '负面', type: 'bar', stack: 'sentiment', yAxisIndex: 0,
        itemStyle: { color: 'rgba(239, 68, 68, 0.7)', borderRadius: [3, 3, 0, 0] },
        data: sentimentTrend.map(d => d.negative || 0)
      },
      {
        name: '平均分', type: 'line', yAxisIndex: 1, smooth: true,
        lineStyle: { width: 3, color: '#F59E0B' },
        showSymbol: true, symbolSize: 6,
        itemStyle: { color: '#F59E0B' },
        data: sentimentTrend.map(d => d.avgScore != null ? Number(d.avgScore.toFixed(3)) : null)
      }
    ]
  }), [sentimentTrend]);

  // Sentiment gauge chart
  const gaugeOption = useMemo(() => ({
    series: [{
      type: 'gauge',
      startAngle: 200, endAngle: -20,
      center: ['50%', '60%'],
      radius: '90%',
      min: 0, max: 100,
      splitNumber: 10,
      axisLine: {
        lineStyle: {
          width: 18,
          color: [
            [0.3, '#EF4444'],
            [0.5, '#F59E0B'],
            [0.7, '#10B981'],
            [1, '#059669']
          ]
        }
      },
      pointer: {
        icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
        length: '55%', width: 10,
        itemStyle: { color: 'auto' }
      },
      axisTick: { distance: -18, length: 6, lineStyle: { color: '#fff', width: 1 } },
      splitLine: { distance: -18, length: 14, lineStyle: { color: '#fff', width: 2 } },
      axisLabel: { color: 'inherit', distance: 24, fontSize: 10 },
      detail: {
        valueAnimation: true, fontSize: 24, fontWeight: 'bold',
        color: '#FFF',
        formatter: '{value}分',
        offsetCenter: [0, '30%']
      },
      title: {
        offsetCenter: [0, '55%'],
        fontSize: 12,
        color: '#9CA3AF'
      },
      data: [{ value: gaugeValue, name: '情感健康度' }]
    }]
  }), [gaugeValue]);

  // Top commented videos - horizontal bar
  const topVideoBarOption = useMemo(() => {
    const videos = topVideos.slice(0, 10);
    return {
      tooltip: {
        trigger: 'axis', backgroundColor: '#1F2937', textStyle: { color: '#F3F4F6' }, borderColor: '#374151',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const d = params[0];
          const video = videos[videos.length - 1 - d.dataIndex];
          const sentiment = video?.avgSentiment != null ? (video.avgSentiment * 100).toFixed(1) + '分' : '无数据';
          return `${d.name}<br/>评论数: ${d.value}<br/>情感均分: ${sentiment}`;
        }
      },
      grid: { left: '3%', right: '10%', bottom: '3%', top: '3%', containLabel: true },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: '#1F2937', type: 'dashed' } }, axisLabel: { color: '#9CA3AF' } },
      yAxis: {
        type: 'category', data: videos.map(v => v.title || '无标题').reverse(),
        axisLine: { lineStyle: { color: '#4B5563' } },
        axisLabel: { fontSize: 11, color: '#D1D5DB', width: 160, overflow: 'truncate' }
      },
      series: [{
        name: '评论数', type: 'bar', barWidth: 16,
        itemStyle: {
          borderRadius: [0, 6, 6, 0],
          color: (params) => {
            const video = videos[videos.length - 1 - params.dataIndex];
            const s = video?.avgSentiment;
            if (s == null) return '#6B7280';
            if (s >= 0.6) return '#10B981';
            if (s < 0.4) return '#EF4444';
            return '#F59E0B';
          }
        },
        data: videos.map(v => v.commentCount || 0).reverse(),
        label: { show: true, position: 'right', color: '#9CA3AF', fontSize: 11 }
      }]
    };
  }, [topVideos]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-200 flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-cyan-400" />
          <span>评论与情感分析</span>
        </h2>
        <div className="flex items-center space-x-1 bg-gray-800/60 rounded-lg p-1">
          {[7, 14, 30, 90].map(d => (
            <button key={d} onClick={() => setDayRange(d)}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${dayRange === d ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
            >{d}天</button>
          ))}
        </div>
      </div>

      {/* KPI Cards - 2 rows of 4 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '总评论数', value: totalComments, icon: MessageSquare, color: 'cyan' },
          { label: '今日新增', value: todayComments, icon: TrendingUp, color: 'blue' },
          { label: '评论用户数', value: commentUsers, icon: Users, color: 'purple' },
          { label: '被评论视频', value: commentedVideos, icon: Film, color: 'pink' },
          { label: '已分析评论', value: analyzedComments, icon: Brain, color: 'indigo' },
          { label: '正面评论', value: positiveComments, icon: ThumbsUp, color: 'emerald' },
          { label: '负面评论', value: negativeComments, icon: ThumbsDown, color: 'rose' },
          { label: '情感均分', value: avgSentiment ? avgSentiment.toFixed(3) : '0.000', icon: Gauge, color: 'amber', isString: true },
        ].map((kpi, i) => (
          <div key={i} className={`p-4 rounded-xl border border-${kpi.color}-500/20 bg-gradient-to-br from-${kpi.color}-500/10 to-transparent`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-xs font-medium">{kpi.label}</span>
              <kpi.icon className={`w-4 h-4 text-${kpi.color}-400`} />
            </div>
            <div className="text-2xl font-bold text-white">
              {kpi.isString ? kpi.value : kpi.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Row 1: Comment Trend + Sentiment Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 border border-gray-800 rounded-xl bg-gray-900/40 p-4">
          <h3 className="text-gray-300 text-sm font-medium mb-2 flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <span>评论趋势</span>
          </h3>
          <div style={{ height: 300 }}>
            <ReactECharts option={commentTrendOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="border border-gray-800 rounded-xl bg-gray-900/40 p-4">
          <h3 className="text-gray-300 text-sm font-medium mb-2 flex items-center space-x-2">
            <Smile className="w-4 h-4 text-emerald-400" />
            <span>情感分布</span>
          </h3>
          <div style={{ height: 300 }}>
            <ReactECharts option={sentimentDistOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>

      {/* Row 2: Sentiment Trend + Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 border border-gray-800 rounded-xl bg-gray-900/40 p-4">
          <h3 className="text-gray-300 text-sm font-medium mb-2 flex items-center space-x-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <span>每日情感趋势</span>
          </h3>
          <div style={{ height: 340 }}>
            <ReactECharts option={sentimentTrendOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="border border-gray-800 rounded-xl bg-gray-900/40 p-4">
          <h3 className="text-gray-300 text-sm font-medium mb-2 flex items-center space-x-2">
            <Gauge className="w-4 h-4 text-yellow-400" />
            <span>情感健康度</span>
          </h3>
          <div style={{ height: 340 }}>
            <ReactECharts option={gaugeOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>

      {/* Row 3: Top Videos Bar + Recent Comments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-gray-800 rounded-xl bg-gray-900/40 p-4">
          <h3 className="text-gray-300 text-sm font-medium mb-2 flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span>热评视频排行 Top 10</span>
          </h3>
          <p className="text-[10px] text-gray-600 mb-2">颜色表示情感倾向: <span className="text-emerald-400">正面</span> / <span className="text-amber-400">中性</span> / <span className="text-rose-400">负面</span> / <span className="text-gray-400">未分析</span></p>
          <div style={{ height: 340 }}>
            <ReactECharts option={topVideoBarOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>

        {/* Recent Comments Feed */}
        <div className="border border-gray-800 rounded-xl bg-gray-900/40 p-4 flex flex-col">
          <h3 className="text-gray-300 text-sm font-medium mb-3 flex items-center space-x-2">
            <MessageCircle className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>最新评论动态</span>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[360px] pr-1 custom-scrollbar">
            {recentComments.map((c, idx) => {
              const badge = sentimentBadge(c.sentimentScore);
              return (
                <div key={c.commentId || idx} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-gray-800/40 hover:bg-gray-800/70 transition-colors">
                  {/* Avatar */}
                  <img
                    src={c.avatarUrl || '/default-avatar.png'}
                    alt=""
                    className="w-8 h-8 rounded-full border border-gray-700 bg-gray-800 shrink-0 mt-0.5"
                  />
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-blue-400 font-medium text-sm">@{c.nickname || '匿名'}</span>
                      <span className="text-gray-600 text-xs">评论了</span>
                      <span className="text-gray-400 text-xs truncate max-w-[120px]" title={c.videoTitle}>《{c.videoTitle || '未知'}》</span>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed line-clamp-2">{c.content}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-gray-600 font-mono text-[11px]">
                        {c.createdAt ? new Date(c.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '--'}
                      </span>
                      {/* Sentiment badge */}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
                        ${badge.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' :
                          badge.color === 'rose' ? 'bg-rose-500/20 text-rose-400' :
                          badge.color === 'amber' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-gray-700/50 text-gray-500'}`}
                      >
                        <span>{badge.emoji}</span>
                        <span>{badge.text}</span>
                        {c.sentimentScore != null && (
                          <span className="opacity-70">({(c.sentimentScore * 100).toFixed(0)})</span>
                        )}
                      </span>
                      {c.preferenceScore != null && (
                        <span className="text-[10px] text-indigo-400/70">
                          偏好: {c.preferenceScore.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {recentComments.length === 0 && (
              <div className="text-gray-600 text-sm text-center py-8">暂无评论记录</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
