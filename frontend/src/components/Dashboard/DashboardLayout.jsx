import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, LayoutDashboard, Users, Film, Sparkles, MessageSquare } from 'lucide-react';
import OverviewCards from './OverviewCards';
import UserAnalytics from './UserAnalytics';
import ContentAnalytics from './ContentAnalytics';
import CenterMetrics from './CenterMetrics';
import RealtimeFeed from './RealtimeFeed';
import UserInsightsTab from './tabs/UserInsightsTab';
import ContentOpsTab from './tabs/ContentOpsTab';
import RecommendTab from './tabs/RecommendTab';
import CommentSentimentTab from './tabs/CommentSentimentTab';

const TABS = [
  { key: 'overview', label: '数据总览', icon: LayoutDashboard },
  { key: 'users', label: '用户洞察', icon: Users },
  { key: 'content', label: '内容运营', icon: Film },
  { key: 'recommend', label: '推荐效果', icon: Sparkles },
  { key: 'comments', label: '评论情感', icon: MessageSquare },
];

export default function DashboardLayout() {
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-50 shrink-0">
        <div className="flex items-center justify-between px-6 h-14">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-800 rounded-full transition-colors flex items-center justify-center text-gray-400 hover:text-white"
              title="返回首页"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-blue-500" />
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent uppercase tracking-wider">
                Douyin Data Center
              </h1>
            </div>
          </div>
          <div className="text-gray-400 text-sm font-mono flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{time.toLocaleString('zh-CN', { hour12: false })}</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 space-x-1 -mb-px">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  flex items-center space-x-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all duration-200
                  ${isActive 
                    ? 'bg-gray-800/80 text-white border-b-2 border-blue-500' 
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/30'}
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 overflow-y-auto max-w-[1920px] mx-auto w-full">
        {activeTab === 'overview' && (
          <>
            <OverviewCards />
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-12 lg:col-span-3 flex flex-col gap-3">
                <UserAnalytics />
              </div>
              <div className="col-span-12 lg:col-span-6 flex flex-col gap-3">
                <CenterMetrics />
                <RealtimeFeed />
              </div>
              <div className="col-span-12 lg:col-span-3 flex flex-col gap-3">
                <ContentAnalytics />
              </div>
            </div>
          </>
        )}
        {activeTab === 'users' && <UserInsightsTab />}
        {activeTab === 'content' && <ContentOpsTab />}
        {activeTab === 'recommend' && <RecommendTab />}
        {activeTab === 'comments' && <CommentSentimentTab />}
      </main>
    </div>
  );
}
