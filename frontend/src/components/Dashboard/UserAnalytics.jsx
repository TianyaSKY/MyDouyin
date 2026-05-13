import React, { useEffect, useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { 
  getUserGrowthTrend, 
  getDauTrend, 
  getEventDistribution, 
  getTopActiveUsers 
} from '../../api/dashboard';
import { Trophy } from 'lucide-react';

export default function UserAnalytics() {
  const [growthData, setGrowthData] = useState([]);
  const [dauData, setDauData] = useState([]);
  const [eventData, setEventData] = useState([]);
  const [topUsers, setTopUsers] = useState([]);

  useEffect(() => {
    Promise.all([
      getUserGrowthTrend(30),
      getDauTrend(30),
      getEventDistribution(7),
      getTopActiveUsers(7, 5)
    ]).then(([growth, dau, events, users]) => {
      setGrowthData(Array.isArray(growth) ? growth : []);
      setDauData(Array.isArray(dau) ? dau : []);
      setEventData(Array.isArray(events) ? events : []);
      setTopUsers(Array.isArray(users) ? users : []);
    }).catch(err => console.error("Error fetching user analytics:", err));
  }, []);

  const chartBase = { grid: { left: '2%', right: '3%', bottom: '2%', top: '20%', containLabel: true } };

  const growthOption = useMemo(() => ({
    title: { text: '用户增长 (30天)', textStyle: { color: '#9CA3AF', fontSize: 12, fontWeight: 'normal' }, left: 4, top: 2 },
    tooltip: { trigger: 'axis', backgroundColor: '#1F2937', textStyle: { color: '#F3F4F6', fontSize: 11 }, borderColor: '#374151' },
    ...chartBase,
    xAxis: { type: 'category', boundaryGap: false, data: growthData.map(d => d.date), axisLine: { lineStyle: { color: '#4B5563' } }, axisLabel: { fontSize: 9, color: '#6B7280' }, show: false },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1F2937', type: 'dashed' } }, axisLabel: { color: '#6B7280', fontSize: 9 } },
    series: [{
      name: '新增', type: 'line', smooth: true, lineStyle: { width: 2, color: '#3B82F6' }, showSymbol: false,
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(59,130,246,0.4)' }, { offset: 1, color: 'rgba(59,130,246,0)' }] } },
      data: growthData.map(d => d.value)
    }]
  }), [growthData]);

  const dauOption = useMemo(() => ({
    title: { text: 'DAU (30天)', textStyle: { color: '#9CA3AF', fontSize: 12, fontWeight: 'normal' }, left: 4, top: 2 },
    tooltip: { trigger: 'axis', backgroundColor: '#1F2937', textStyle: { color: '#F3F4F6', fontSize: 11 }, borderColor: '#374151' },
    ...chartBase,
    xAxis: { type: 'category', data: dauData.map(d => d.date), axisLine: { lineStyle: { color: '#4B5563' } }, axisLabel: { fontSize: 9, color: '#6B7280' }, show: false },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1F2937', type: 'dashed' } }, axisLabel: { color: '#6B7280', fontSize: 9 } },
    series: [{ name: '活跃', type: 'bar', itemStyle: { color: '#10B981', borderRadius: [3, 3, 0, 0] }, barMaxWidth: 20, data: dauData.map(d => d.value) }]
  }), [dauData]);

  const eventOption = useMemo(() => {
    const nameMap = { impr: '曝光', click: '点击', like: '点赞', finish: '完播', share: '分享', leave: '离开', comment: '评论' };
    const pieData = eventData.map(d => ({ name: nameMap[d.eventType] || d.eventType, value: d.count }));
    return {
      title: { text: '行为分布 (7天)', textStyle: { color: '#9CA3AF', fontSize: 12, fontWeight: 'normal' }, left: 4, top: 2 },
      tooltip: { trigger: 'item', backgroundColor: '#1F2937', textStyle: { color: '#F3F4F6', fontSize: 11 }, borderColor: '#374151' },
      legend: { bottom: 0, textStyle: { color: '#6B7280', fontSize: 9 }, itemWidth: 8, itemHeight: 8, itemGap: 6 },
      series: [{
        type: 'pie', radius: ['30%', '60%'], center: ['50%', '45%'],
        itemStyle: { borderRadius: 6, borderColor: '#0B0F19', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 11, fontWeight: 'bold', color: '#FFF' } },
        data: pieData
      }]
    };
  }, [eventData]);

  return (
    <>
      <div className="border border-gray-800 rounded-xl bg-gray-900/40 p-2">
        <div style={{ height: 120 }}><ReactECharts option={growthOption} style={{ height: '100%', width: '100%' }} /></div>
        <div style={{ height: 120 }}><ReactECharts option={dauOption} style={{ height: '100%', width: '100%' }} /></div>
        <div style={{ height: 160 }}><ReactECharts option={eventOption} style={{ height: '100%', width: '100%' }} /></div>
      </div>
      <div className="border border-gray-800 rounded-xl bg-gray-900/40 p-2">
        <h3 className="text-gray-400 text-xs mb-2 flex items-center space-x-1 px-1">
          <Trophy className="w-3 h-3 text-yellow-500" /><span>活跃用户 Top 5</span>
        </h3>
        <div className="space-y-1">
          {topUsers.map((user, idx) => (
            <div key={user.userId} className="flex items-center justify-between px-2 py-1 rounded bg-gray-800/50 hover:bg-gray-800 transition-colors">
              <div className="flex items-center space-x-2">
                <span className={`font-mono text-xs font-bold w-3 ${idx < 3 ? 'text-yellow-500' : 'text-gray-500'}`}>{idx + 1}</span>
                <img src={user.avatarUrl || '/default-avatar.png'} alt="" className="w-5 h-5 rounded-full border border-gray-700 bg-gray-800" />
                <span className="text-xs text-gray-200 truncate max-w-[80px]">{user.nickname || 'Unknown'}</span>
              </div>
              <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-full">{user.eventCount}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
