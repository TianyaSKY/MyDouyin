import React, { useEffect, useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  getUserGrowthTrend,
  getDauTrend,
  getEventDistribution,
  getTopActiveUsers,
  getEventHeatmap,
  getOverview
} from '../../../api/dashboard';
import { Trophy, TrendingUp, TrendingDown, Users, UserCheck, Activity } from 'lucide-react';

export default function UserInsightsTab() {
  const [overview, setOverview] = useState(null);
  const [growthData, setGrowthData] = useState([]);
  const [dauData, setDauData] = useState([]);
  const [eventData, setEventData] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [dayRange, setDayRange] = useState(30);

  useEffect(() => {
    Promise.all([
      getOverview(),
      getUserGrowthTrend(dayRange),
      getDauTrend(dayRange),
      getEventDistribution(dayRange),
      getTopActiveUsers(dayRange, 10),
      getEventHeatmap(dayRange)
    ]).then(([ov, growth, dau, events, users, heatmap]) => {
      setOverview(ov || {});
      setGrowthData(Array.isArray(growth) ? growth : []);
      setDauData(Array.isArray(dau) ? dau : []);
      setEventData(Array.isArray(events) ? events : []);
      setTopUsers(Array.isArray(users) ? users : []);
      setHeatmapData(Array.isArray(heatmap) ? heatmap : []);
    }).catch(err => console.error("Error fetching user insights:", err));
  }, [dayRange]);

  // KPI summary cards
  const totalUsers = overview?.totalUsers || 0;
  const todayNew = overview?.todayNewUsers || 0;
  const avgDau = dauData.length > 0 ? Math.round(dauData.reduce((s, d) => s + d.value, 0) / dauData.length) : 0;
  const totalEvents = eventData.reduce((s, d) => s + d.count, 0);

  // User Growth - area chart
  const growthOption = useMemo(() => ({
    tooltip: { trigger: 'axis', backgroundColor: '#1F2937', textStyle: { color: '#F3F4F6' }, borderColor: '#374151' },
    grid: { left: '3%', right: '4%', bottom: '10%', top: '8%', containLabel: true },
    xAxis: {
      type: 'category', boundaryGap: false, data: growthData.map(d => d.date),
      axisLine: { lineStyle: { color: '#4B5563' } }, axisLabel: { fontSize: 11, color: '#9CA3AF' }
    },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1F2937', type: 'dashed' } }, axisLabel: { color: '#9CA3AF' } },
    dataZoom: [{ type: 'inside' }, { type: 'slider', height: 20, bottom: 0, textStyle: { color: '#9CA3AF' } }],
    series: [{
      name: '新增用户', type: 'line', smooth: true,
      lineStyle: { width: 2, color: '#3B82F6' }, showSymbol: true, symbolSize: 6,
      areaStyle: {
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: 'rgba(59, 130, 246, 0.4)' }, { offset: 1, color: 'rgba(59, 130, 246, 0)' }]
        }
      },
      data: growthData.map(d => d.value)
    }]
  }), [growthData]);

  // DAU trend - bar chart
  const dauOption = useMemo(() => ({
    tooltip: { trigger: 'axis', backgroundColor: '#1F2937', textStyle: { color: '#F3F4F6' }, borderColor: '#374151' },
    grid: { left: '3%', right: '4%', bottom: '10%', top: '8%', containLabel: true },
    xAxis: {
      type: 'category', data: dauData.map(d => d.date),
      axisLine: { lineStyle: { color: '#4B5563' } }, axisLabel: { fontSize: 11, color: '#9CA3AF' }
    },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1F2937', type: 'dashed' } }, axisLabel: { color: '#9CA3AF' } },
    dataZoom: [{ type: 'inside' }, { type: 'slider', height: 20, bottom: 0, textStyle: { color: '#9CA3AF' } }],
    series: [{
      name: '活跃用户', type: 'bar',
      itemStyle: {
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: '#10B981' }, { offset: 1, color: '#065F46' }]
        },
        borderRadius: [4, 4, 0, 0]
      },
      data: dauData.map(d => d.value)
    }]
  }), [dauData]);

  // Event distribution - rose chart
  const eventOption = useMemo(() => {
    const nameMap = { impr: '曝光', click: '点击', like: '点赞', finish: '完播', share: '分享', leave: '离开', comment: '评论' };
    const colorMap = { impr: '#3B82F6', click: '#F59E0B', like: '#EF4444', finish: '#10B981', share: '#A855F7', leave: '#6B7280', comment: '#06B6D4' };
    const pieData = eventData.map(d => ({
      name: nameMap[d.eventType] || d.eventType,
      value: d.count,
      itemStyle: { color: colorMap[d.eventType] || '#6B7280' }
    }));
    return {
      tooltip: { trigger: 'item', backgroundColor: '#1F2937', textStyle: { color: '#F3F4F6' }, borderColor: '#374151',
        formatter: (p) => `${p.name}<br/>数量: ${p.value.toLocaleString()}<br/>占比: ${p.percent}%`
      },
      legend: { bottom: 0, textStyle: { color: '#9CA3AF', fontSize: 11 }, itemWidth: 12, itemHeight: 12 },
      series: [{
        name: '行为类型', type: 'pie', roseType: 'area',
        radius: ['20%', '65%'], center: ['50%', '45%'],
        itemStyle: { borderRadius: 6, borderColor: '#0B0F19', borderWidth: 2 },
        label: { show: true, color: '#D1D5DB', fontSize: 11, formatter: '{b}\n{c}' },
        data: pieData
      }]
    };
  }, [eventData]);

  // Heatmap
  const heatmapOption = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => `${i}时`);
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const data = heatmapData.map(d => [d.hour, d.dayOfWeek - 1, d.count || 0]);
    return {
      tooltip: { position: 'top', backgroundColor: '#1F2937', textStyle: { color: '#F3F4F6' }, borderColor: '#374151',
        formatter: (p) => `${days[p.data[1]]} ${p.data[0]}:00<br/>活跃: ${p.data[2]}`
      },
      grid: { height: '65%', top: '8%', left: '10%', right: '5%' },
      xAxis: { type: 'category', data: hours, splitArea: { show: true }, axisLine: { lineStyle: { color: '#4B5563' } }, axisLabel: { fontSize: 10 } },
      yAxis: { type: 'category', data: days, splitArea: { show: true }, axisLine: { lineStyle: { color: '#4B5563' } }, axisLabel: { fontSize: 11 } },
      visualMap: {
        min: 0, max: data.length > 0 ? Math.max(...data.map(d => d[2]), 10) : 10,
        calculable: true, orient: 'horizontal', left: 'center', bottom: '3%',
        itemWidth: 14, itemHeight: 100,
        inRange: { color: ['#111827', '#064E3B', '#10B981', '#34D399', '#A7F3D0'] },
        textStyle: { color: '#9CA3AF' }
      },
      series: [{ name: '活跃度', type: 'heatmap', data: data, label: { show: false },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
      }]
    };
  }, [heatmapData]);

  return (
    <div className="space-y-4">
      {/* Day Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-200 flex items-center space-x-2">
          <Users className="w-5 h-5 text-blue-400" />
          <span>用户洞察</span>
        </h2>
        <div className="flex items-center space-x-1 bg-gray-800/60 rounded-lg p-1">
          {[7, 14, 30, 90].map(d => (
            <button key={d} onClick={() => setDayRange(d)}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${dayRange === d ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
            >{d}天</button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '总用户数', value: totalUsers, icon: Users, color: 'blue' },
          { label: '今日新增', value: todayNew, icon: TrendingUp, color: 'emerald' },
          { label: '平均 DAU', value: avgDau, icon: UserCheck, color: 'purple' },
          { label: '总互动次数', value: totalEvents, icon: Activity, color: 'orange' },
        ].map((kpi, i) => (
          <div key={i} className={`p-4 rounded-xl border border-${kpi.color}-500/20 bg-gradient-to-br from-${kpi.color}-500/10 to-transparent`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-xs font-medium">{kpi.label}</span>
              <kpi.icon className={`w-4 h-4 text-${kpi.color}-400`} />
            </div>
            <div className="text-2xl font-bold text-white">{kpi.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1: Growth + DAU */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-gray-800 rounded-xl bg-gray-900/40 p-4">
          <h3 className="text-gray-300 text-sm font-medium mb-2 flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span>用户增长趋势</span>
          </h3>
          <div style={{ height: 300 }}>
            <ReactECharts option={growthOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="border border-gray-800 rounded-xl bg-gray-900/40 p-4">
          <h3 className="text-gray-300 text-sm font-medium mb-2 flex items-center space-x-2">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>日活跃用户 (DAU)</span>
          </h3>
          <div style={{ height: 300 }}>
            <ReactECharts option={dauOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>

      {/* Charts Row 2: Event Distribution + Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-gray-800 rounded-xl bg-gray-900/40 p-4">
          <h3 className="text-gray-300 text-sm font-medium mb-2 flex items-center space-x-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>用户行为分布</span>
          </h3>
          <div style={{ height: 340 }}>
            <ReactECharts option={eventOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="border border-gray-800 rounded-xl bg-gray-900/40 p-4">
          <h3 className="text-gray-300 text-sm font-medium mb-2 flex items-center space-x-2">
            <Activity className="w-4 h-4 text-green-400" />
            <span>活跃时段热力图</span>
          </h3>
          <div style={{ height: 340 }}>
            <ReactECharts option={heatmapOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>

      {/* Top Users Table */}
      <div className="border border-gray-800 rounded-xl bg-gray-900/40 p-4">
        <h3 className="text-gray-300 text-sm font-medium mb-4 flex items-center space-x-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span>活跃用户排行榜 Top 10</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500">
                <th className="text-left py-2 px-3 font-medium">排名</th>
                <th className="text-left py-2 px-3 font-medium">用户</th>
                <th className="text-right py-2 px-3 font-medium">互动次数</th>
                <th className="text-right py-2 px-3 font-medium">活跃度</th>
              </tr>
            </thead>
            <tbody>
              {topUsers.map((user, idx) => {
                const maxEvents = topUsers[0]?.eventCount || 1;
                const percent = Math.round((user.eventCount / maxEvents) * 100);
                return (
                  <tr key={user.userId} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className={`font-mono font-bold ${idx < 3 ? 'text-yellow-500' : 'text-gray-500'}`}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center space-x-2">
                        <img src={user.avatarUrl || '/default-avatar.png'} alt="" className="w-7 h-7 rounded-full border border-gray-700 bg-gray-800" />
                        <span className="text-gray-200 font-medium">{user.nickname || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right text-blue-400 font-mono">{user.eventCount.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full transition-all" style={{ width: `${percent}%` }} />
                        </div>
                        <span className="text-gray-400 text-xs w-8 text-right">{percent}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
