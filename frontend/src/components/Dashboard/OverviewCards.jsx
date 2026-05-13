import React, { useEffect, useState } from 'react';
import CountUp from 'react-countup';
import { 
  Users, 
  UserPlus, 
  Video, 
  Film, 
  PlayCircle, 
  HeartHandshake 
} from 'lucide-react';
import { getOverview } from '../../api/dashboard';

export default function OverviewCards() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getOverview();
        setData(result);
      } catch (error) {
        console.error("Failed to fetch overview data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    // Poll every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const cards = [
    {
      title: '总用户数',
      value: data?.totalUsers || 0,
      icon: <Users className="w-5 h-5 text-blue-400" />,
      color: 'from-blue-500/20 to-blue-500/0',
      border: 'border-blue-500/30'
    },
    {
      title: '今日新增用户',
      value: data?.todayNewUsers || 0,
      icon: <UserPlus className="w-5 h-5 text-emerald-400" />,
      color: 'from-emerald-500/20 to-emerald-500/0',
      border: 'border-emerald-500/30'
    },
    {
      title: '总视频数',
      value: data?.totalVideos || 0,
      icon: <Video className="w-5 h-5 text-purple-400" />,
      color: 'from-purple-500/20 to-purple-500/0',
      border: 'border-purple-500/30'
    },
    {
      title: '今日发布视频',
      value: data?.todayNewVideos || 0,
      icon: <Film className="w-5 h-5 text-pink-400" />,
      color: 'from-pink-500/20 to-pink-500/0',
      border: 'border-pink-500/30'
    },
    {
      title: '今日总播放量',
      value: data?.todayPlays || 0,
      icon: <PlayCircle className="w-5 h-5 text-orange-400" />,
      color: 'from-orange-500/20 to-orange-500/0',
      border: 'border-orange-500/30'
    },
    {
      title: '今日互动量',
      value: data?.todayInteractions || 0,
      icon: <HeartHandshake className="w-5 h-5 text-rose-400" />,
      color: 'from-rose-500/20 to-rose-500/0',
      border: 'border-rose-500/30'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
      {cards.map((card, index) => (
        <div 
          key={index}
          className={`relative p-3 rounded-xl border bg-gradient-to-b ${card.color} ${card.border} backdrop-blur-sm overflow-hidden flex flex-col justify-between h-20 group`}
        >
          <div className="flex justify-between items-start z-10">
            <span className="text-gray-400 text-xs font-medium">{card.title}</span>
            <div className="p-1.5 bg-gray-900/50 rounded-lg group-hover:scale-110 transition-transform">
              {card.icon}
            </div>
          </div>
          
          <div className="z-10 mt-1">
            {loading && !data ? (
              <div className="h-8 w-16 bg-gray-800 animate-pulse rounded" />
            ) : (
              <div className="text-xl font-bold text-white tracking-tight">
                <CountUp 
                  end={card.value} 
                  duration={2} 
                  separator="," 
                  useEasing={true}
                />
              </div>
            )}
          </div>
          
          {/* Decorative glow */}
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/5 blur-2xl rounded-full" />
        </div>
      ))}
    </div>
  );
}
