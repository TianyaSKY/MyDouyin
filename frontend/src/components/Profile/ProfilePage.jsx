
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import { getAuthorVideos, getLikedVideos } from '../../api/video';
import { getUserStats, getUser } from '../../api/user';
import { ProfileSkeleton } from '../Common/Skeleton';
import { Menu, Copy, Play, ArrowLeft } from 'lucide-react';
import { getCoverUrl } from '../../utils/media';
import avatarImg from '../../resource/avatar.jpg';

const VideoGridItem = ({ video, onClick }) => {
    const [imgError, setImgError] = useState(false);

    return (
        <div
            className="aspect-[3/4] bg-gray-900 relative cursor-pointer group"
            onClick={() => onClick && onClick(video)}
        >
            {!imgError ? (
                <img
                    src={getCoverUrl(video.coverUrl)}
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                    loading="lazy"
                    alt={video.title}
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500">
                    <Play size={24} fill="currentColor" />
                </div>
            )}
            <div className="absolute bottom-1 left-1 flex items-center text-xs text-white drop-shadow-md font-medium">
                <span className="mr-1"><Play size={10} fill="currentColor" /></span>
                {video.viewCount || 0}
            </div>
        </div>
    );
};

const ProfilePage = () => {
    const navigate = useNavigate();
    const { id: routeUserId } = useParams();
    const { user, token, handleLogout } = useAuthContext();
    const [profileUser, setProfileUser] = useState(null);
    const [videos, setVideos] = useState([]);
    const [likedVideos, setLikedVideos] = useState([]);
    const [stats, setStats] = useState({ totalLikes: 0, workCount: 0, followingCount: 0, followerCount: 0 });
    const [loading, setLoading] = useState(true);
    const [likedLoading, setLikedLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [likedPage, setLikedPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [hasMoreLiked, setHasMoreLiked] = useState(true);
    const [activeTab, setActiveTab] = useState('works'); // works, likes, private
    const [likedFetched, setLikedFetched] = useState(false);
    const observer = useRef();
    const loadingRef = useRef(false);
    const likedLoadingRef = useRef(false);

    // Determine which user's profile to show
    const isOwnProfile = !routeUserId || (user && String(routeUserId) === String(user.userId));
    const targetUserId = routeUserId || user?.userId;

    // Fetch the profile user's info when viewing another user's profile
    useEffect(() => {
        if (isOwnProfile) {
            setProfileUser(user);
        } else if (targetUserId && token) {
            getUser(token, targetUserId)
                .then(data => setProfileUser(data))
                .catch(err => {
                    console.error("Failed to fetch profile user:", err);
                    setProfileUser(null);
                });
        }
    }, [isOwnProfile, targetUserId, user, token]);

    // Reset state when target user changes
    useEffect(() => {
        setVideos([]);
        setLikedVideos([]);
        setPage(1);
        setLikedPage(1);
        setHasMore(true);
        setHasMoreLiked(true);
        setLikedFetched(false);
        setStats({ totalLikes: 0, workCount: 0, followingCount: 0, followerCount: 0 });
    }, [targetUserId]);

    const fetchVideos = async (pageNum) => {
        if (!targetUserId || loadingRef.current) return;
        loadingRef.current = true;
        try {
            setLoading(true);
            const data = await getAuthorVideos(token, targetUserId, pageNum, 18);
            if (data.records && data.records.length > 0) {
                setVideos(prev => pageNum === 1 ? data.records : [...prev, ...data.records]);
                setHasMore(data.records.length === 18);
            } else {
                setHasMore(false);
            }
        } catch (err) {
            console.error("Failed to fetch videos", err);
        } finally {
            setLoading(false);
            loadingRef.current = false;
        }
    };

    const fetchStats = async () => {
        if (!targetUserId) return;
        try {
            const statsData = await getUserStats(token, targetUserId);
            setStats(statsData);
        } catch (err) {
            console.error("Failed to fetch stats", err);
        }
    };

    const fetchLikedVideos = async (pageNum) => {
        if (!targetUserId || likedLoadingRef.current) return;
        likedLoadingRef.current = true;
        try {
            setLikedLoading(true);
            const data = await getLikedVideos(token, targetUserId, pageNum, 18);
            if (data.records && data.records.length > 0) {
                setLikedVideos(prev => pageNum === 1 ? data.records : [...prev, ...data.records]);
                setHasMoreLiked(data.records.length === 18);
            } else {
                if (pageNum === 1) setLikedVideos([]);
                setHasMoreLiked(false);
            }
        } catch (err) {
            console.error("Failed to fetch liked videos", err);
        } finally {
            setLikedLoading(false);
            likedLoadingRef.current = false;
        }
    };

    useEffect(() => {
        if (targetUserId && token) {
            fetchVideos(1);
            fetchStats();
            setPage(1);
        }
    }, [targetUserId, token]);

    // Fetch liked videos when switching to the likes tab
    useEffect(() => {
        if (activeTab === 'likes' && !likedFetched && targetUserId && token) {
            setLikedFetched(true);
            fetchLikedVideos(1);
        }
    }, [activeTab, likedFetched, targetUserId, token]);

    const lastVideoRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => {
                    const nextPage = prevPage + 1;
                    fetchVideos(nextPage);
                    return nextPage;
                });
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    if (!user) {
        return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;
    }
    if (loading && videos.length === 0) return <ProfileSkeleton />;

    const displayUser = profileUser || user;

    return (
        <div className="h-screen bg-black text-white pb-20 overflow-y-auto custom-scrollbar">
            {/* Header / Banner */}
            <div className="relative h-32 bg-gray-800">
                {/* Optional: User Cover Image */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60"></div>
                <div className="absolute top-4 left-4 z-10">
                    {!isOwnProfile && (
                        <ArrowLeft
                            className="text-white drop-shadow-md cursor-pointer"
                            size={24}
                            onClick={() => navigate(-1)}
                        />
                    )}
                </div>
                <div className="absolute top-4 right-4 flex space-x-4 z-10">
                    {isOwnProfile && (
                        <Menu className="text-white drop-shadow-md cursor-pointer" size={24} onClick={handleLogout} />
                    )}
                </div>
            </div>

            {/* Profile Info */}
            <div className="px-4 -mt-8 relative z-10">
                <div className="flex flex-col items-start">
                    <div className="w-24 h-24 rounded-full border-4 border-black bg-gray-700 overflow-hidden mb-3">
                        <img
                            src={avatarImg}
                            alt="avatar"
                            className="w-full h-full object-cover"
                        />
                    </div >
                    <h1 className="text-xl font-bold mb-1">@{displayUser.nickname || displayUser.username}</h1>
                    <div className="flex items-center text-xs text-gray-400 mb-4 space-x-2">
                        <span>抖音号：{displayUser.userId}</span>
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
                    {displayUser.bio || (isOwnProfile ? '点击添加个人简介...' : '暂无个人简介')}
                </p>

                <div className="flex space-x-2 mb-8">
                    {isOwnProfile ? (
                        <>
                            <button className="flex-1 bg-gray-800 py-2 rounded-[4px] text-sm font-medium hover:bg-gray-700 transition">编辑资料</button>
                            <button className="flex-1 bg-gray-800 py-2 rounded-[4px] text-sm font-medium hover:bg-gray-700 transition">添加朋友</button>
                        </>
                    ) : (
                        <>
                            <button className="flex-1 bg-[#fe2c55] py-2 rounded-[4px] text-sm font-medium hover:bg-[#ef2950] transition">关注</button>
                            <button className="flex-1 bg-gray-800 py-2 rounded-[4px] text-sm font-medium hover:bg-gray-700 transition">私信</button>
                        </>
                    )}
                </div>
            </div >

            {/* Tabs */}
            < div className="flex items-center justify-around border-b border-gray-800 sticky top-0 bg-black z-20" >
                <button
                    onClick={() => setActiveTab('works')}
                    className={`pb-3 text-sm font-medium relative ${activeTab === 'works' ? 'text-white' : 'text-gray-500'}`}
                >
                    作品 {stats.workCount > 0 ? stats.workCount : (videos.length > 0 ? videos.length : '')}
                    {activeTab === 'works' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-yellow-400 rounded-full"></div>}
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
            <div className="grid grid-cols-3 gap-[1px] mt-[1px]">
                {activeTab === 'works' ? (
                    videos.length > 0 ? (
                        videos.map((video, index) => (
                            <div key={video.id} ref={index === videos.length - 1 ? lastVideoRef : null}>
                                <VideoGridItem video={video} onClick={(v) => navigate(`/video/${v.id}`)} />
                            </div>
                        ))
                    ) : (
                        <div className="col-span-3 py-20 text-center text-gray-500 text-sm">
                            暂时没有作品
                        </div>
                    )
                ) : activeTab === 'likes' ? (
                    likedLoading && likedVideos.length === 0 ? (
                        <div className="col-span-3 py-20 text-center text-gray-500 text-sm">
                            加载中...
                        </div>
                    ) : likedVideos.length > 0 ? (
                        likedVideos.map((video) => (
                            <div key={video.id}>
                                <VideoGridItem video={video} onClick={(v) => navigate(`/video/${v.id}`)} />
                            </div>
                        ))
                    ) : (
                        <div className="col-span-3 py-20 text-center text-gray-500 text-sm">
                            暂时没有喜欢的视频
                        </div>
                    )
                ) : null}
                {loading && videos.length > 0 && activeTab === 'works' && (
                    <div className="col-span-3 py-4 text-center text-gray-500 text-xs">
                        加载中...
                    </div>
                )}
                {likedLoading && likedVideos.length > 0 && activeTab === 'likes' && (
                    <div className="col-span-3 py-4 text-center text-gray-500 text-xs">
                        加载中...
                    </div>
                )}
            </div>
        </div >
    );
};

export default ProfilePage;
