import React, { useEffect, useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import 'echarts-wordcloud';
import {
  getVideoPublishTrend,
  getTopVideos,
  getTagCloud,
  getVideoStatusDistribution,
  getOverview
} from '../../../api/dashboard';
import { Film, Hash, TrendingUp, BarChart3, Flame, Eye, Heart, MessageSquare, Share2 } from 'lucide-react';

export default function ContentOpsTab() {
  const [overview, setOverview] = useState(null);
  const [publishData, setPublishData] = useState([]);
  const [topVideos, setTopVideos] = useState([]);
  const [tagData, setTagData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [dayRange, setDayRange] = useState(30);

  useEffect(() => {
    Promise.all([
      getOverview(),
      getVideoPublishTrend(dayRange),
      getTopVideos(10),
      getTagCloud(50),
      getVideoStatusDistribution()
    ]).then(([ov, publish, videos, tags, status]) => {
      setOverview(ov || {});
      setPublishData(Array.isArray(publish) ? publish : []);
      setTopVideos(Array.isArray(videos) ? videos : []);
      setTagData(Array.isArray(tags) ? tags : []);
      setStatusData(Array.isArray(status) ? status : []);
    }).catch(err => console.error("Error fetching content ops:", err));
  }, [dayRange]);

  const totalVideos = overview?.totalVideos || 0;
  const todayVideos = overview?.todayNewVideos || 0;
  const totalTags = tagData.length;
  const totalStatusCount = statusData.reduce((s, d) => s + d.count, 0);

  // Video publish trend
  const publishOption = useMemo(() => ({
    tooltip: { trigger: 'axis', backgroundColor: '#1F2937', textStyle: { color: '#F3F4F6' }, borderColor: '#374151' },
    grid: { left: '3%', right: '4%', bottom: '10%', top: '8%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: publishData.map(d => d.date),
      axisLine: { lineStyle: { color: '#4B5563' } }, axisLabel: { fontSize: 11, color: '#9CA3AF' }
    },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1F2937', type: 'dashed' } }, axisLabel: { color: '#9CA3AF' } },
    dataZoom: [{ type: 'inside' }, { type: 'slider', height: 20, bottom: 0, textStyle: { color: '#9CA3AF' } }],
    series: [{
      name: '新发布视频', type: 'line', smooth: true,
      lineStyle: { width: 2, color: '#A855F7' }, showSymbol: true, symbolSize: 6,
      areaStyle: {
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: 'rgba(168, 85, 247, 0.4)' }, { offset: 1, color: 'rgba(168, 85, 247, 0)' }]
        }
      },
      data: publishData.map(d => d.value)
    }]
  }), [publishData]);

  // Tag cloud
  const tagCloudOption = useMemo(() => ({
    tooltip: { show: true, backgroundColor: '#1F2937', textStyle: { color: '#F3F4F6' }, borderColor: '#374151' },
    series: [{
      type: 'wordCloud', shape: 'circle',
      left: 'center', top: 'center', width: '90%', height: '85%',
      sizeRange: [14, 48], rotationRange: [-30, 30], rotationStep: 15, gridSize: 8,
      drawOutOfBound: false,
      textStyle: {
        color: function () {
          const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#A855F7', '#06B6D4', '#EC4899', '#8B5CF6'];
          return colors[Math.floor(Math.random() * colors.length)];
        }
      },
      emphasis: { textStyle: { textShadowBlur: 4, textShadowColor: '#000' } },
      data: tagData.map(t => ({ name: t.tagName, value: t.videoCount }))
    }]
  }), [tagData]);

  // Video status distribution - ring chart
  const statusOption = useMemo(() => {
    const colorMap = { '已发布': '#10B981', '审核中': '#F59E0B', '已下架': '#EF4444', '草稿': '#6B7280' };
    const data = statusData.map(d => ({
      name: d.statusName || `状态 ${d.statusCode}`,
      value: d.count,
      itemStyle: { color: colorMap[d.statusName] || '#6B7280' }
    }));
    return {
      tooltip: { trigger: 'item', backgroundColor: '#1F2937', textStyle: { color: '#F3F4F6' }, borderColor: '#374151' },
      legend: { bottom: 10, textStyle: { color: '#9CA3AF', fontSize: 11 } },
      series: [{
        name: '视频状态', type: 'pie', radius: ['45%', '70%'], center: ['50%', '45%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 8, borderColor: '#0B0F19', borderWidth: 3 },
        label: {
          show: true, position: 'center', fontSize: 20, fontWeight: 'bold', color: '#FFF',
          formatter: () => totalStatusCount.toLocaleString() + '\n总数'
        },
        emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
        data: data
      }]
    };
  }, [statusData, totalStatusCount]);

  // Tag bar chart - horizontal
  const tagBarOption = useMemo(() => {
    const topTags = tagData.slice(0, 15);
    return {
      tooltip: { trigger: 'axis', backgroundColor: '#1F2937', textStyle: { color: '#F3F4F6' }, borderColor: '#374151', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '8%', bottom: '3%', top: '3%', containLabel: true },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: '#1F2937', type: 'dashed' } }, axisLabel: { color: '#9CA3AF' } },
      yAxis: { type: 'category', data: topTags.map(t => t.tagName).reverse(),
        axisLine: { lineStyle: { color: '#4B5563' } }, axisLabel: { fontSize: 11, color: '#D1D5DB', width: 120, overflow: 'truncate' }
      },
      series: [{
        name: '视频数量', type: 'bar', barWidth: 14,
        itemStyle: {
          borderRadius: [0, 4, 4, 0],
          color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [{ offset: 0, color: '#7C3AED' }, { offset: 1, color: '#A855F7' }]
          }
        },
        data: topTags.map(t => t.videoCount).reverse()
      }]
    };
  }, [tagData]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-200 flex items-center space-x-2">
          <Film className="w-5 h-5 text-purple-400" />
          <span>内容运营</span>
        </h2>
        <div className="flex items-center space-x-1 bg-gray-800/60 rounded-lg p-1">
          {[7, 14, 30, 90].map(d => (
            <button key={d} onClick={() => setDayRange(d)}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${dayRange === d ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
            >{d}天</button>
          ))}
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '总视频数', value: totalVideos, icon: Film, color: 'purple' },
          { label: '今日发布', value: todayVideos, icon: TrendingUp, color: 'pink' },
          { label: '标签种类', value: totalTags, icon: Hash, color: 'cyan' },
          { label: '内容总量', value: totalStatusCount, icon: BarChart3, color: 'emerald' },
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

      {/* Publish Trend + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 border border-gray-800 rounded-xl bg-gray-900/40 p-4">
          <h3 className="text-gray-300 text-sm font-medium mb-2 flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span>视频发布趋势</span>
          </h3>
          <div style={{ height: 300 }}>
            <ReactECharts option={publishOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="border border-gray-800 rounded-xl bg-gray-900/40 p-4">
          <h3 className="text-gray-300 text-sm font-medium mb-2 flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span>视频状态分布</span>
          </h3>
          <div style={{ height: 300 }}>
            <ReactECharts option={statusOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>

      {/* Tag Cloud + Tag Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-gray-800 rounded-xl bg-gray-900/40 p-4">
          <h3 className="text-gray-300 text-sm font-medium mb-2 flex items-center space-x-2">
            <Hash className="w-4 h-4 text-cyan-400" />
            <span>热门标签词云</span>
          </h3>
          <div style={{ height: 320 }}>
            <ReactECharts option={tagCloudOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="border border-gray-800 rounded-xl bg-gray-900/40 p-4">
          <h3 className="text-gray-300 text-sm font-medium mb-2 flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span>标签使用量排行 Top 15</span>
          </h3>
          <div style={{ height: 320 }}>
            <ReactECharts option={tagBarOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>

      {/* Top Videos Table */}
      <div className="border border-gray-800 rounded-xl bg-gray-900/40 p-4">
        <h3 className="text-gray-300 text-sm font-medium mb-4 flex items-center space-x-2">
          <Flame className="w-4 h-4 text-orange-500" />
          <span>热门视频排行 Top 10</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500">
                <th className="text-left py-2 px-3 font-medium">排名</th>
                <th className="text-left py-2 px-3 font-medium">视频</th>
                <th className="text-left py-2 px-3 font-medium">作者</th>
                <th className="text-right py-2 px-3 font-medium">
                  <span className="inline-flex items-center space-x-1"><Eye className="w-3 h-3" /><span>播放</span></span>
                </th>
                <th className="text-right py-2 px-3 font-medium">
                  <span className="inline-flex items-center space-x-1"><Heart className="w-3 h-3" /><span>点赞</span></span>
                </th>
                <th className="text-right py-2 px-3 font-medium">
                  <span className="inline-flex items-center space-x-1"><MessageSquare className="w-3 h-3" /><span>评论</span></span>
                </th>
                <th className="text-right py-2 px-3 font-medium">
                  <span className="inline-flex items-center space-x-1"><Share2 className="w-3 h-3" /><span>分享</span></span>
                </th>
              </tr>
            </thead>
            <tbody>
              {topVideos.map((video, idx) => (
                <tr key={video.videoId} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="py-2 px-3">
                    <span className={`font-mono font-bold ${idx < 3 ? 'text-orange-500' : 'text-gray-500'}`}>
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center space-x-2">
                      {video.coverUrl ? (
                        <img src={`http://localhost:8081${video.coverUrl}`} alt="" className="w-10 h-14 object-cover rounded border border-gray-700 bg-gray-800" />
                      ) : (
                        <div className="w-10 h-14 bg-gray-800 rounded flex items-center justify-center border border-gray-700">
                          <Film className="w-4 h-4 text-gray-500" />
                        </div>
                      )}
                      <span className="text-gray-200 font-medium truncate max-w-[200px]">{video.title || '无标题'}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-gray-400">@{video.authorName}</td>
                  <td className="py-2 px-3 text-right text-orange-400 font-mono">{(video.playCount || 0).toLocaleString()}</td>
                  <td className="py-2 px-3 text-right text-rose-400 font-mono">{(video.likeCount || 0).toLocaleString()}</td>
                  <td className="py-2 px-3 text-right text-cyan-400 font-mono">{(video.commentCount || 0).toLocaleString()}</td>
                  <td className="py-2 px-3 text-right text-purple-400 font-mono">{(video.shareCount || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
