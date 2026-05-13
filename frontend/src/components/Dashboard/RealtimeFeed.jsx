import React, { useEffect, useState } from 'react';
import { getRecentEvents } from '../../api/dashboard';
import { Activity, Play, Heart, MessageSquare, Share2 } from 'lucide-react';

export default function RealtimeFeed() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await getRecentEvents(20);
        setEvents(data || []);
      } catch (err) {
        console.error("Error fetching recent events:", err);
      }
    };

    fetchEvents();
    const interval = setInterval(fetchEvents, 5000); // Poll every 5s for realtime feel
    return () => clearInterval(interval);
  }, []);

  const getEventIcon = (type) => {
    switch (type) {
      case 'click':
      case 'finish':
        return <Play className="w-4 h-4 text-blue-400" />;
      case 'like':
        return <Heart className="w-4 h-4 text-rose-400" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-emerald-400" />;
      case 'share':
        return <Share2 className="w-4 h-4 text-purple-400" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getEventDescription = (type) => {
    switch (type) {
      case 'click': return '观看了';
      case 'finish': return '完整播放了';
      case 'like': return '点赞了';
      case 'comment': return '评论了';
      case 'share': return '分享了';
      default: return '浏览了';
    }
  };

  return (
    <div className="h-28 border border-gray-800 rounded-xl bg-gray-900/40 p-2 flex flex-col overflow-hidden relative">
      <h3 className="text-gray-400 text-xs mb-1.5 flex items-center space-x-1.5 z-10 bg-gray-900/80 w-max pr-2 rounded">
        <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
        <span>实时动态</span>
      </h3>
      
      {/* Container with mask for fade out at top/bottom */}
      <div className="flex-1 overflow-hidden relative" style={{ maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)' }}>
        {/* Animated scrolling wrapper */}
        <div className="absolute w-full animate-[marquee_20s_linear_infinite] hover:[animation-play-state:paused] flex flex-col gap-2 pt-4 pb-4">
          {events.concat(events).map((ev, idx) => ( // Duplicate for seamless loop
            <div key={`${ev.eventId || idx}-${idx}`} className="flex items-center text-sm px-2 py-1.5 rounded bg-gray-800/30 w-max border border-gray-800/50">
              <span className="text-gray-500 font-mono text-xs mr-3">
                {ev.ts ? new Date(ev.ts).toLocaleTimeString('zh-CN', { hour12: false }) : '--:--:--'}
              </span>
              {getEventIcon(ev.eventType)}
              <span className="text-blue-400 font-medium ml-2 mr-1">@{ev.nickname || '匿名'}</span>
              <span className="text-gray-400 mx-1">{getEventDescription(ev.eventType)}</span>
              <span className="text-gray-300 truncate max-w-[200px]" title={ev.videoTitle}>
                视频《{ev.videoTitle || '未知'}》
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
