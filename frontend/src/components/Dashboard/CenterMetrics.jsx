import React, { useEffect, useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { getFunnel, getEventHeatmap, getCtrTrend } from '../../api/dashboard';

export default function CenterMetrics() {
  const [funnelData, setFunnelData] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [ctrData, setCtrData] = useState(null);

  useEffect(() => {
    Promise.all([getFunnel(7), getEventHeatmap(7), getCtrTrend(7)])
      .then(([funnel, heatmap, ctr]) => {
        setFunnelData(funnel || null);
        setHeatmapData(Array.isArray(heatmap) ? heatmap : []);
        setCtrData(ctr || null);
      }).catch(err => console.error("Error fetching center metrics:", err));
  }, []);

  const funnelOption = useMemo(() => {
    const steps = [];
    if (funnelData) {
      steps.push({ name: '曝光', value: funnelData.impressions || 0 });
      steps.push({ name: '点击', value: funnelData.clicks || 0 });
      steps.push({ name: '完播', value: funnelData.finishes || 0 });
      steps.push({ name: '互动', value: (funnelData.likes || 0) + (funnelData.comments || 0) + (funnelData.shares || 0) });
    }
    return {
      title: { text: '转化漏斗 (7天)', textStyle: { color: '#9CA3AF', fontSize: 12, fontWeight: 'normal' }, left: 4, top: 2 },
      tooltip: { trigger: 'item', backgroundColor: '#1F2937', textStyle: { color: '#F3F4F6', fontSize: 11 }, borderColor: '#374151',
        formatter: (p) => { const rate = (funnelData?.impressions || 1) > 0 ? ((p.data.value / funnelData.impressions) * 100).toFixed(1) + '%' : '-'; return `${p.name}<br/>数量: ${p.data.value}<br/>转化: ${rate}`; }
      },
      series: [{ type: 'funnel', left: '10%', top: 28, bottom: 8, width: '80%', min: 0, minSize: '0%', maxSize: '100%', sort: 'descending', gap: 2,
        label: { show: true, position: 'inside', formatter: '{b}: {c}', fontSize: 10 },
        itemStyle: { borderColor: '#0B0F19', borderWidth: 1 }, data: steps
      }]
    };
  }, [funnelData]);

  const ctrOption = useMemo(() => {
    const dates = [], ctrValues = [];
    if (ctrData?.impressions && ctrData?.clicks) {
      const clickMap = {}; (ctrData.clicks || []).forEach(d => { clickMap[d.date] = d.value; });
      (ctrData.impressions || []).forEach(d => { dates.push(d.date); const c = clickMap[d.date] || 0; ctrValues.push(d.value > 0 ? c / d.value : 0); });
    }
    return {
      title: { text: 'CTR 趋势 (7天)', textStyle: { color: '#9CA3AF', fontSize: 12, fontWeight: 'normal' }, left: 4, top: 2 },
      tooltip: { trigger: 'axis', backgroundColor: '#1F2937', textStyle: { color: '#F3F4F6', fontSize: 11 }, borderColor: '#374151', valueFormatter: (v) => (v * 100).toFixed(2) + '%' },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '22%', containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: dates, axisLine: { lineStyle: { color: '#4B5563' } }, axisLabel: { fontSize: 9, color: '#6B7280' } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1F2937', type: 'dashed' } }, axisLabel: { color: '#6B7280', fontSize: 9, formatter: (v) => (v * 100) + '%' } },
      series: [{ name: 'CTR', type: 'line', smooth: true, lineStyle: { width: 2, color: '#F59E0B' }, showSymbol: true, symbolSize: 5, data: ctrValues }]
    };
  }, [ctrData]);

  const heatmapOption = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => i + 'h');
    const days = ['一', '二', '三', '四', '五', '六', '日'];
    const data = heatmapData.map(d => [d.hour, d.dayOfWeek - 1, d.count || 0]);
    return {
      title: { text: '活跃热力图 (7天)', textStyle: { color: '#9CA3AF', fontSize: 12, fontWeight: 'normal' }, left: 4, top: 2 },
      tooltip: { position: 'top', backgroundColor: '#1F2937', textStyle: { color: '#F3F4F6', fontSize: 11 }, borderColor: '#374151' },
      grid: { height: '60%', top: '18%', left: '6%', right: '3%' },
      xAxis: { type: 'category', data: hours, splitArea: { show: true }, axisLine: { lineStyle: { color: '#4B5563' } }, axisLabel: { fontSize: 8, color: '#6B7280' } },
      yAxis: { type: 'category', data: days, splitArea: { show: true }, axisLine: { lineStyle: { color: '#4B5563' } }, axisLabel: { fontSize: 9, color: '#6B7280' } },
      visualMap: { min: 0, max: data.length > 0 ? Math.max(...data.map(d => d[2]), 10) : 10, calculable: true, orient: 'horizontal', left: 'center', bottom: '2%', itemWidth: 10, itemHeight: 60,
        inRange: { color: ['#0B0F19', '#10B981', '#3B82F6', '#A855F7'] }, textStyle: { color: '#6B7280', fontSize: 9 } },
      series: [{ type: 'heatmap', data: data, label: { show: false }, emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.4)' } } }]
    };
  }, [heatmapData]);

  return (
    <div className="border border-gray-800 rounded-xl bg-gray-900/40 p-2">
      <div className="flex gap-2">
        <div className="flex-1" style={{ height: 170 }}><ReactECharts option={funnelOption} style={{ height: '100%', width: '100%' }} /></div>
        <div className="flex-1" style={{ height: 170 }}><ReactECharts option={ctrOption} style={{ height: '100%', width: '100%' }} /></div>
      </div>
      <div style={{ height: 200 }} className="mt-1"><ReactECharts option={heatmapOption} style={{ height: '100%', width: '100%' }} /></div>
    </div>
  );
}
