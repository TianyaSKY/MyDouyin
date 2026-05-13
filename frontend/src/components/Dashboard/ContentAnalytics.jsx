import React, { useEffect, useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import 'echarts-wordcloud';
import { getVideoPublishTrend, getTopVideos, getTagCloud, getVideoStatusDistribution } from '../../api/dashboard';
import { Flame, Film } from 'lucide-react';

export default function ContentAnalytics() {
  const [publishData, setPublishData] = useState([]);
  const [topVideos, setTopVideos] = useState([]);
  const [tagData, setTagData] = useState([]);
  const [statusData, setStatusData] = useState([]);

  useEffect(() => {
    Promise.all([getVideoPublishTrend(30), getTopVideos(5), getTagCloud(30), getVideoStatusDistribution()])
      .then(([publish, videos, tags, status]) => {
        setPublishData(Array.isArray(publish) ? publish : []);
        setTopVideos(Array.isArray(videos) ? videos : []);
        setTagData(Array.isArray(tags) ? tags : []);
        setStatusData(Array.isArray(status) ? status : []);
      }).catch(err => console.error("Error fetching content analytics:", err));
  }, []);

  const publishOption = useMemo(() => ({
    title: { text: '发布趋势 (30天)', textStyle: { color: '#9CA3AF', fontSize: 12, fontWeight: 'normal' }, left: 4, top: 2 },
    tooltip: { trigger: 'axis', backgroundColor: '#1F2937', textStyle: { color: '#F3F4F6', fontSize: 11 }, borderColor: '#374151' },
    grid: { left: '2%', right: '3%', bottom: '2%', top: '20%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: publishData.map(d => d.date), show: false },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1F2937', type: 'dashed' } }, axisLabel: { color: '#6B7280', fontSize: 9 } },
    series: [{
      type: 'line', smooth: true, lineStyle: { width: 2, color: '#A855F7' }, showSymbol: false,
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(168,85,247,0.4)' }, { offset: 1, color: 'rgba(168,85,247,0)' }] } },
      data: publishData.map(d => d.value)
    }]
  }), [publishData]);

  const tagCloudOption = useMemo(() => ({
    tooltip: { show: true, backgroundColor: '#1F2937', textStyle: { color: '#F3F4F6', fontSize: 11 }, borderColor: '#374151' },
    series: [{
      type: 'wordCloud', shape: 'circle', left: 'center', top: 'center', width: '95%', height: '90%',
      sizeRange: [10, 28], rotationRange: [-30, 30], rotationStep: 15, gridSize: 5, drawOutOfBound: false,
      textStyle: { color: () => { const c = ['#3B82F6','#10B981','#F59E0B','#EF4444','#A855F7','#06B6D4','#EC4899']; return c[Math.floor(Math.random()*c.length)]; } },
      data: tagData.map(t => ({ name: t.tagName, value: t.videoCount }))
    }]
  }), [tagData]);

  const statusOption = useMemo(() => {
    const colorMap = { '已发布': '#10B981', '审核中': '#F59E0B', '已下架': '#EF4444', '草稿': '#6B7280' };
    return {
      title: { text: '状态分布', textStyle: { color: '#9CA3AF', fontSize: 12, fontWeight: 'normal' }, left: 4, top: 2 },
      tooltip: { trigger: 'item', backgroundColor: '#1F2937', textStyle: { color: '#F3F4F6', fontSize: 11 }, borderColor: '#374151' },
      legend: { bottom: 0, textStyle: { color: '#6B7280', fontSize: 9 }, itemWidth: 8, itemHeight: 8 },
      series: [{
        type: 'pie', radius: ['35%', '60%'], center: ['50%', '45%'],
        itemStyle: { borderRadius: 6, borderColor: '#0B0F19', borderWidth: 2 },
        label: { show: false },
        data: statusData.map(d => ({ name: d.statusName || `Status ${d.statusCode}`, value: d.count, itemStyle: { color: colorMap[d.statusName] || '#6B7280' } }))
      }]
    };
  }, [statusData]);

  return (
    <>
      <div className="border border-gray-800 rounded-xl bg-gray-900/40 p-2">
        <div style={{ height: 110 }}><ReactECharts option={publishOption} style={{ height: '100%', width: '100%' }} /></div>
        <h3 className="text-gray-500 text-[11px] px-1 mt-1 mb-0.5">热门标签</h3>
        <div style={{ height: 130 }}><ReactECharts option={tagCloudOption} style={{ height: '100%', width: '100%' }} /></div>
        <div style={{ height: 140 }}><ReactECharts option={statusOption} style={{ height: '100%', width: '100%' }} /></div>
      </div>
      <div className="border border-gray-800 rounded-xl bg-gray-900/40 p-2">
        <h3 className="text-gray-400 text-xs mb-1.5 flex items-center space-x-1 px-1">
          <Flame className="w-3 h-3 text-orange-500" /><span>热门视频 Top 5</span>
        </h3>
        <div className="space-y-1">
          {topVideos.map((video, idx) => (
            <div key={video.videoId} className="flex items-center px-1.5 py-1 rounded bg-gray-800/50 hover:bg-gray-800 transition-colors">
              <span className={`font-mono text-xs font-bold w-3 mr-1.5 ${idx < 3 ? 'text-orange-500' : 'text-gray-500'}`}>{idx + 1}</span>
              {video.coverUrl ? (
                <img src={`http://localhost:8081${video.coverUrl}`} alt="" className="w-7 h-10 object-cover rounded border border-gray-700 bg-gray-800 mr-1.5" />
              ) : (
                <div className="w-7 h-10 bg-gray-800 rounded flex items-center justify-center border border-gray-700 mr-1.5"><Film className="w-3 h-3 text-gray-500" /></div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-gray-200 truncate">{video.title || '无标题'}</p>
                <div className="flex items-center space-x-2 text-[10px] text-gray-500">
                  <span>@{video.authorName}</span>
                  <span className="text-rose-400/80">{video.likeCount || 0}赞</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
