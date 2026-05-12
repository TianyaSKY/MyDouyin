import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVideoById } from '../../api/video';
import { useAuthContext } from '../../contexts/AuthContext';
import VideoPlayer from '../VideoPlayer/VideoPlayer';
import { VideoSkeleton } from '../Common/Skeleton';
import { Home, ArrowLeft } from 'lucide-react';

const SingleVideoPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuthContext();
    const [video, setVideo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchVideo = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getVideoById(token, id);
                setVideo(data);
                document.title = `${data.title || '视频'} - Douyin`;
            } catch (err) {
                console.error('Failed to fetch video:', err);
                setError(err.message || '视频不存在或已被删除');
            } finally {
                setLoading(false);
            }
        };

        if (token && id) {
            fetchVideo();
        }

        return () => {
            document.title = 'Douyin';
        };
    }, [token, id]);

    if (loading) {
        return (
            <div className="h-screen w-full bg-black">
                <VideoSkeleton />
            </div>
        );
    }

    if (error || !video) {
        return (
            <div className="h-screen w-full bg-black flex flex-col items-center justify-center text-white">
                <div className="text-center px-6">
                    <div className="text-6xl mb-4">😢</div>
                    <h2 className="text-xl font-semibold mb-2">视频不存在</h2>
                    <p className="text-white/60 mb-8">{error || '该视频可能已被删除'}</p>
                    <button
                        onClick={() => navigate('/', { replace: true })}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#fe2c55] hover:bg-[#ef2950] transition-colors text-white font-medium"
                    >
                        <Home size={18} />
                        回到首页
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-full overflow-hidden bg-black relative">
            {/* Back / Home button */}
            <div className="absolute top-4 left-4 z-50 flex gap-2">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white hover:bg-black/60 transition-colors"
                    title="返回"
                >
                    <ArrowLeft size={20} />
                </button>
                <button
                    onClick={() => navigate('/', { replace: true })}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white hover:bg-black/60 transition-colors"
                    title="首页"
                >
                    <Home size={20} />
                </button>
            </div>

            {/* Video Player */}
            <div className="h-full w-full">
                <VideoPlayer
                    video={video}
                    isActive={true}
                    onDelete={() => navigate('/', { replace: true })}
                />
            </div>
        </div>
    );
};

export default SingleVideoPage;
