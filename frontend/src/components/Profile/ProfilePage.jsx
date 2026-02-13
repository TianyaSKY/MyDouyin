
import React, { useEffect, useState } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { getAuthorVideos } from '../../api/video';
import { getUserStats } from '../../api/user';
import { ProfileSkeleton } from '../Common/Skeleton';
import { Lock, Menu, Copy } from 'lucide-react';

const ProfilePage = () => {
    const { user, token, handleLogout } = useAuthContext();
    const [videos, setVideos] = useState([]);
    const [stats, setStats] = useState({ totalLikes: 0, workCount: 0, followingCount: 0, followerCount: 0 });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('works'); // works, likes, private

    useEffect(() => {
        const fetchData = async () => {
            if (user?.userId) {
                try {
                    setLoading(true);
                    const [videosData, statsData] = await Promise.all([
                        getAuthorVideos(token, user.userId),
                        getUserStats(token, user.userId)
                    ]);
                    setVideos(videosData.records || []);
                    setStats(statsData);
                } catch (err) {
                    console.error("Failed to fetch profile data", err);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchData();
    }, [user, token]);

    if (!user) return null;
    if (loading && videos.length === 0) return <ProfileSkeleton />;

    return (
        <div className="min-h-screen bg-black text-white pb-20 overflow-y-auto no-scrollbar">
            {/* Header / Banner */}
            <div className="relative h-32 bg-gray-800">
                {/* Optional: User Cover Image */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60"></div>
                <div className="absolute top-4 right-4 flex space-x-4 z-10">
                    <Menu className="text-white drop-shadow-md" size={24} onClick={handleLogout} />
                </div>
            </div>

            {/* Profile Info */}
            <div className="px-4 -mt-8 relative z-10">
                <div className="flex flex-col items-start">
                    <div className="w-24 h-24 rounded-full border-4 border-black bg-gray-700 overflow-hidden mb-3">
                        <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.userId}`}
                            alt="avatar"
                            className="w-full h-full object-cover"
                        />
                    </div >
                    <h1 className="text-xl font-bold mb-1">@{user.nickname || user.username}</h1>
                    <div className="flex items-center text-xs text-gray-400 mb-4 space-x-2">
                        <span>抖音号：{user.userId}</span>
                        <Copy size={12} className="cursor-pointer" />
                    </div>
                </div >

                <div className="flex items-center space-x-6 text-sm mb-6">
                    <div className="flex items-center space-x-1">
                        <span className="font-bold text-white">{stats.totalLikes}</span>
                        <span className="text-gray-400">获赞</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <span className="font-bold text-white">{stats.followingCount}</span>
                        <span className="text-gray-400">关注</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <span className="font-bold text-white">{stats.followerCount}</span>
                        <span className="text-gray-400">粉丝</span>
                    </div>
                </div>

                <p className="text-sm text-gray-300 mb-6 leading-relaxed">
                    {user.bio || '点击添加个人简介...'}
                </p>

                <div className="flex space-x-2 mb-8">
                    <button className="flex-1 bg-gray-800 py-2 rounded-[4px] text-sm font-medium hover:bg-gray-700 transition">编辑资料</button>
                    <button className="flex-1 bg-gray-800 py-2 rounded-[4px] text-sm font-medium hover:bg-gray-700 transition">添加朋友</button>
                </div>
            </div >

            {/* Tabs */}
            < div className="flex items-center justify-around border-b border-gray-800 sticky top-0 bg-black z-20" >
                <button
                    onClick={() => setActiveTab('works')}
                    className={`pb-3 text-sm font-medium relative ${activeTab === 'works' ? 'text-white' : 'text-gray-500'}`}
                >
                    作品 {videos.length > 0 && videos.length}
                    {activeTab === 'works' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-yellow-400 rounded-full"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('private')}
                    className={`pb-3 text-sm font-medium relative ${activeTab === 'private' ? 'text-white' : 'text-gray-500'}`}
                >
                    <div className="flex items-center space-x-1">
                        <Lock size={14} />
                        <span>私密</span>
                    </div>
                    {activeTab === 'private' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-yellow-400 rounded-full"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('likes')}
                    className={`pb-3 text-sm font-medium relative ${activeTab === 'likes' ? 'text-white' : 'text-gray-500'}`}
                >
                    喜欢
                    {activeTab === 'likes' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-yellow-400 rounded-full"></div>}
                </button>
            </div >

            {/* Grid */}
            < div className="grid grid-cols-3 gap-[1px] mt-[1px]" >
                {activeTab === 'works' ? (
                    videos.length > 0 ? (
                        videos.map(video => (
                            <div key={video.id} className="aspect-[3/4] bg-gray-900 relative">
                                <img src={video.coverUrl} className="w-full h-full object-cover" />
                                <div className="absolute bottom-1 left-1 flex items-center text-xs text-white drop-shadow-md">
                                    <span className="mr-1">▷</span>
                                    {video.viewCount || 0}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-3 py-20 text-center text-gray-500 text-sm">
                            暂时没有作品
                        </div>
                    )
                ) : (
                    <div className="col-span-3 py-20 text-center text-gray-500 text-sm">
                        {activeTab === 'private' ? '私密视频仅自己可见' : '喜欢的视频仅自己可见'}
                    </div>
                )}
            </div >
        </div >
    );
};

export default ProfilePage;
