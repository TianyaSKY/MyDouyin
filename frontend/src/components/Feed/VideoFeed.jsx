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
        if (loading || !hasMore) return;
        setLoading(true);
        try {
            // Pass the current user ID to get personalized feed
            const data = await getFeed(token, user.userId);
            if (data.videos && data.videos.length > 0) {
                setVideos(prev => [...prev, ...data.videos]);
                setHasMore(data.hasMore);
            } else {
                setHasMore(false);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [token, user.userId, loading, hasMore]);


    useEffect(() => {
        loadMoreVideos();
    }, []); // Initial load

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
            className="h-screen w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar bg-black"
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
        </div>
    );
};

export default VideoFeed;
