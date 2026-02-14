import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getFeed } from '../../api/video';
import { useAuthContext } from '../../contexts/AuthContext';
import VideoPlayer from '../VideoPlayer/VideoPlayer';
import { VideoSkeleton } from '../Common/Skeleton';

const VideoFeed = () => {
    const [videos, setVideos] = useState([]);
    const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
    const { token, user } = useAuthContext();
    const observer = useRef();
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const loadMoreVideos = useCallback(async () => {
        if (loading || !hasMore || !user) return;
        setLoading(true);
        try {
            const data = await getFeed(token, user.userId, 10);
            if (data.videos && data.videos.length > 0) {
                const existingIds = new Set(videos.map(v => v.id));
                const newVideos = data.videos.filter(v => !existingIds.has(v.id));

                if (newVideos.length === 0) {
                    setHasMore(false);
                    return;
                }

                setVideos(prev => [...prev, ...newVideos]);
                setHasMore(Boolean(data.hasMore));
            } else {
                setHasMore(false);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [token, user?.userId, loading, hasMore, videos]);


    // Load videos when user is ready
    useEffect(() => {
        if (user && videos.length === 0) {
            loadMoreVideos();
        }
    }, [user, videos.length, loadMoreVideos]);

    // Intersection Observer to update current video index
    const lastVideoRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                loadMoreVideos();
            }
        });

        if (node) observer.current.observe(node);
    }, [loading, hasMore, loadMoreVideos]);

    const handleScroll = (e) => {
        const { scrollTop, clientHeight } = e.target;
        const index = Math.round(scrollTop / clientHeight);
        if (index !== currentVideoIndex) {
            setCurrentVideoIndex(index);
        }
    };

    return (
        <div
            className="h-screen w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar feed-atmosphere"
            onScroll={handleScroll}
        >
            {videos.map((video, index) => (
                <div
                    key={video.id + '-' + index}
                    className="h-full w-full snap-start relative"
                    ref={index === videos.length - 1 ? lastVideoRef : null}
                >
                    <VideoPlayer
                        video={video}
                        isActive={index === currentVideoIndex}
                    />
                </div>
            ))}

            {loading && videos.length === 0 && (
                <div className="h-full w-full snap-start">
                    <VideoSkeleton />
                </div>
            )}

            {loading && videos.length > 0 && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 px-3 py-1.5 rounded-full bg-black/50 border border-white/10 backdrop-blur-sm text-xs text-white/90">
                    正在加载更多...
                </div>
            )}
        </div>
    );
};

export default VideoFeed;
