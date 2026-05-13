import React, { useEffect, useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  getFunnel,
  getCtrTrend,
  getEventDistribution,
  getOverview,
  getRecentEvents
} from '../../../api/dashboard';
import { Sparkles, Target, MousePointerClick, Zap, ArrowDownRight, Play, Heart, MessageSquare, Share2, Activity, Eye } from 'lucide-react';

export default function RecommendTab() {
  const [funnelData, setFunnelData] = useState(null);
  const [ctrData, setCtrData] = useState(null);
  const [eventData, setEventData] = useState([]);
  const [overview, setOverview] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [dayRange, setDayRange] = useState(7);

  useEffect(() => {
    Promise.all([
      getFunnel(dayRange),
      getCtrTrend(dayRange),
      getEventDistribution(dayRange),
      getOverview(),
      getRecentEvents(30)
    ]).then(([funnel, ctr, events, ov, recent]) => {
      setFunnelData(funnel || null);
      setCtrData(ctr || null);
      setEventData(Array.isArray(events) ? events : []);
      setOverview(ov || {});
      setRecentEvents(Array.isArray(recent) ? recent : []);
    }).catch(err => console.error("Error fetching recommend data:", err));
  }, [dayRange]);

  // Compute metrics
  const impressions = funnelData?.impressions || 0;
  const clicks = funnelData?.clicks || 0;
  const finishes = funnelData?.finishes || 0;
  const likes = funnelData?.likes || 0;
  const comments = funnelData?.comments || 0;
  const shares = funnelData?.shares || 0;
  const interactions = likes + comments + shares;
  const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';
  const finishRate = impressions > 0 ? ((finishes / impressions) * 100).toFixed(2) : '0.00';
  const interactionRate = impressions > 0 ? ((interactions / impressions) * 100).toFixed(2) : '0.00';

  // Funnel chart - more detailed
  const funnelOption = useMemo(() => {
    const steps = [];
    if (funnelData) {
      steps.push({ name: '曝光推荐', value: impressions, itemStyle: { color: '#3B82F6' } });
      steps.push({ name: '用户点击', value: clicks, itemStyle: { color: '#F59E0B' } });
      steps.push({ name: '完整播放', value: finishes, itemStyle: { color: '#10B981' } });
      steps.push({ name: '互动行为', value: interactions, itemStyle: { color: '#A855F7' } });
    }
    return {
      tooltip: {
        trigger: 'item', backgroundColor: '#1F2937', textStyle: { color: '#F3F4F6' }, borderColor: '#374151',
        formatter: (p) => {
          const rate = impressions > 0 ? ((p.data.value / impressions) * 100).toFixed(2) : '0';
          return `${p.name}<br/>数量: ${p.data.value.toLocaleString()}<br/>占曝光: ${rate}%`;
        }
      },
      series: [{
        type: 'funnel', left: '15%', top: 20, bottom: 20, width: '70%',
        min: 0, minSize: '5%', maxSize: '100%',
        sort: 'descending', gap: 4,
        label: { show: true, position: 'inside', formatter: '{b}\n{c}', fontSize: 13, fontWeight: 'bold' },
        itemStyle: { borderColor: '#0B0F19', borderWidth: 2, shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.3)' },
        emphasis: { label: { fontSize: 16 } },
        data: steps
      }]
    };
  }, [funnelData, impressions, clicks, finishes, interactions]);

  // CTR over time
  const ctrOption = useMemo(() => {
    const dates = [];
    const ctrValues = [];
    const clickValues = [];
    const imprValues = [];

    if (ctrData && ctrData.impressions && ctrData.clicks) {
      const clickMap = {};
      (ctrData.clicks || []).forEach(d => { clickMap[d.date] = d.value; });
      (ctrData.impressions || []).forEach(d => {
        dates.push(d.date);
        const c = clickMap[d.date] || 0;
        const imp = d.value || 0;
        clickValues.push(c);
        imprValues.push(imp);
        ctrValues.push(imp > 0 ? c / imp : 0);
      });
    }

    return {
      tooltip: {
        trigger: 'axis', backgroundColor: '#1F2937', textStyle: { color: '#F3F4F6' }, borderColor: '#374151',
        formatter: (params) => {
          let html = params[0]?.axisValue + '<br/>';
          params.forEach(p => {
            const val = p.seriesName === 'CTR' ? (p.value * 100).toFixed(2) + '%' : p.value.toLocaleString();
            html += `${p.marker} ${p.seriesName}: ${val}<br/>`;
          });
          return html;
        }
      },
      legend: { top: 5, textStyle: { color: '#9CA3AF', fontSize: 11 } },
      grid: { left: '3%', right: '5%', bottom: '10%', top: '15%', containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: dates,
        axisLine: { lineStyle: { color: '#4B5563' } }, axisLabel: { fontSize: 11, color: '#9CA3AF' }
      },
      yAxis: [
        { type: 'value', name: '数量', splitLine: { lineStyle: { color: '#1F2937', type: 'dashed' } }, axisLabel: { color: '#9CA3AF' }, nameTextStyle: { color: '#9CA3AF' } },
        { type: 'value', name: 'CTR', splitLine: { show: false }, axisLabel: { color: '#9CA3AF', formatter: (v) => (v * 100).toFixed(1) + '%' }, nameTextStyle: { color: '#9CA3AF' } }
      ],
      dataZoom: [{ type: 'inside' }],
      series: [
        { name: '曝光', type: 'bar', yAxisIndex: 0, itemStyle: { color: 'rgba(59,130,246,0.4)', borderRadius: [3, 3, 0, 0] }, data: imprValues },
        { name: '点击', type: 'bar', yAxisIndex: 0, itemStyle: { color: 'rgba(245,158,11,0.6)', borderRadius: [3, 3, 0, 0] }, data: clickValues },
        { name: 'CTR', type: 'line', yAxisIndex: 1, smooth: true, lineStyle: { width: 3, color: '#EF4444' }, showSymbol: true, symbolSize: 8,
          itemStyle: { color: '#EF4444' }, data: ctrValues }
      ]
    };
  }, [ctrData]);

  // Event breakdown - stacked bar
  const breakdownOption = useMemo(() => {
    const nameMap = { impr: '曝光', click: '点击', like: '点赞', finish: '完播', share: '分享', leave: '离开', comment: '评论' };
    const colorMap = { impr: '#3B82F6', click: '#F59E0B', like: '#EF4444', finish: '#10B981', share: '#A855F7', leave: '#6B7280', comment: '#06B6D4' };
    const data = eventData
      .filter(d => d.eventType !== 'impr' && d.eventType !== 'leave')
      .map(d => ({
        name: nameMap[d.eventType] || d.eventType,
        value: d.count,
        itemStyle: { color: colorMap[d.eventType] || '#6B7280' }
      }))
      .sort((a, b) => b.value - a.value);

    return {
      tooltip: { trigger: 'axis', backgroundColor: '#1F2937', textStyle: { color: '#F3F4F6' }, borderColor: '#374151', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '8%', bottom: '3%', top: '3%', containLabel: true },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: '#1F2937', type: 'dashed' } }, axisLabel: { color: '#9CA3AF' } },
      yAxis: { type: 'category', data: data.map(d => d.name), axisLine: { lineStyle: { color: '#4B5563' } }, axisLabel: { color: '#D1D5DB', fontSize: 12 } },
      series: [{
        type: 'bar', barWidth: 20,
        itemStyle: { borderRadius: [0, 6, 6, 0] },
        data: data,
        label: { show: true, position: 'right', color: '#9CA3AF', fontSize: 11, formatter: (p) => p.value.toLocaleString() }
      }]
    };
  }, [eventData]);

  const getEventIcon = (type) => {
    switch (type) {
      case 'click': case 'finish': return <Play className="w-3.5 h-3.5 text-blue-400" />;
      case 'like': return <Heart className="w-3.5 h-3.5 text-rose-400" />;
      case 'comment': return <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />;
      case 'share': return <Share2 className="w-3.5 h-3.5 text-purple-400" />;
      default: return <Activity className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  const getEventLabel = (type) => {
    switch (type) {
      case 'click': return '观看了';
      case 'finish': return '完整播放了';
      case 'like': return '点赞了';
      case 'comment': return '评论了';
      case 'share': return '分享了';
      case 'impr': return '收到推荐';
      default: return '浏览了';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-200 flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span>推荐效果</span>
        </h2>
        <div className="flex items-center space-x-1 bg-gray-800/60 rounded-lg p-1">
          {[3, 7, 14, 30].map(d => (
            <button key={d} onClick={() => setDayRange(d)}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${dayRange === d ? 'bg-amber-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
            >{d}天</button>
          ))}
        </div>
      </div>

      {/* Core Metrics - 6 cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: '总曝光', value: impressions.toLocaleString(), icon: Eye, color: 'blue', sub: '' },
          { label: '总点击', value: clicks.toLocaleString(), icon: MousePointerClick, color: 'yellow', sub: '' },
          { label: 'CTR', value: ctr + '%', icon: Target, color: 'red', sub: '点击/曝光' },
          { label: '完播数', value: finishes.toLocaleString(), icon: Play, color: 'emerald', sub: '' },
          { label: '完播率', value: finishRate + '%', icon: ArrowDownRight, color: 'green', sub: '完播/曝光' },
          { label: '互动率', value: interactionRate + '%', icon: Zap, color: 'purple', sub: '互动/曝光' },
        ].map((kpi, i) => (
          <div key={i} className="p-4 rounded-xl border border-gray-700/50 bg-gray-900/60 hover:bg-gray-800/60 transition-colors">
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-500 text-xs font-medium">{kpi.label}</span>
              <kpi.icon className={`w-4 h-4 text-${kpi.color}-400 opacity-60`} />
            </div>
            <div className="text-xl font-bold text-white">{kpi.value}</div>
            {kpi.sub && <div className="text-[10px] text-gray-600 mt-0.5">{kpi.sub}</div>}
          </div>
        ))}
      </div>

      {/* Funnel + CTR Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-gray-800 rounded-xl bg-gray-900/40 p-4">
          <h3 className="text-gray-300 text-sm font-medium mb-2 flex items-center space-x-2">
            <ArrowDownRight className="w-4 h-4 text-blue-400" />
            <span>推荐转化漏斗</span>
          </h3>
          <div style={{ height: 360 }}>
            <ReactECharts option={funnelOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="border border-gray-800 rounded-xl bg-gray-900/40 p-4">
          <h3 className="text-gray-300 text-sm font-medium mb-2 flex items-center space-x-2">
            <Target className="w-4 h-4 text-red-400" />
            <span>曝光 / 点击 / CTR 趋势</span>
          </h3>
          <div style={{ height: 360 }}>
            <ReactECharts option={ctrOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>

      {/* Event Breakdown + Recent Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-gray-800 rounded-xl bg-gray-900/40 p-4">
          <h3 className="text-gray-300 text-sm font-medium mb-2 flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>互动行为细分</span>
          </h3>
          <div style={{ height: 280 }}>
            <ReactECharts option={breakdownOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>

        {/* Recent Events Feed */}
        <div className="border border-gray-800 rounded-xl bg-gray-900/40 p-4 flex flex-col">
          <h3 className="text-gray-300 text-sm font-medium mb-3 flex items-center space-x-2">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>最新互动动态</span>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[260px] pr-1 custom-scrollbar">
            {recentEvents.map((ev, idx) => (
              <div key={ev.eventId || idx} className="flex items-center text-sm px-3 py-2 rounded-lg bg-gray-800/40 hover:bg-gray-800/70 transition-colors">
                <span className="text-gray-600 font-mono text-xs mr-3 shrink-0">
                  {ev.ts ? new Date(ev.ts).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '--'}
                </span>
                {getEventIcon(ev.eventType)}
                <span className="text-blue-400 font-medium ml-2 mr-1 shrink-0">@{ev.nickname || '匿名'}</span>
                <span className="text-gray-500 mx-1 shrink-0">{getEventLabel(ev.eventType)}</span>
                <span className="text-gray-300 truncate" title={ev.videoTitle}>《{ev.videoTitle || '未知'}》</span>
              </div>
            ))}
            {recentEvents.length === 0 && (
              <div className="text-gray-600 text-sm text-center py-8">暂无互动记录</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
