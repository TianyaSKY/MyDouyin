import React, { useRef, useEffect, useState } from 'react';
import VideoOverlay from './VideoOverlay';
import VideoSidebar from './VideoSidebar';
import { Play, Volume2, VolumeX } from 'lucide-react';
import { getMediaUrl } from '../../utils/media';

const VideoPlayer = ({ video, isActive }) => {
    const videoRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        if (isActive) {
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
                playPromise.then(_ => {
                    setPlaying(true);
                }).catch(error => {
                    console.log("Auto-play prevented:", error);
                    setPlaying(false);
                });
            }
        } else {
            videoRef.current.pause();
            setPlaying(false);
            videoRef.current.currentTime = 0; // Reset video when scrolled away
        }
    }, [isActive]);

    const handleVideoPress = () => {
        if (playing) {
            videoRef.current.pause();
            setPlaying(false);
        } else {
            videoRef.current.play();
            setPlaying(true);
        }
    };

    const toggleMute = (e) => {
        e.stopPropagation();
        setIsMuted(!isMuted);
    };

    return (
        <div className="relative w-full h-full bg-black snap-start flex justify-center items-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20 pointer-events-none z-[1]" />
            <video
                ref={videoRef}
                onClick={handleVideoPress}
                className="w-full h-full object-cover transition-transform duration-500"
                src={getMediaUrl(video.videoUrl)}
                poster={getMediaUrl(video.coverUrl)}
                loop
                playsInline
                muted={isMuted}
            />

            {/* Sound Control - Top Right */}
            <div
                className="absolute top-4 right-4 z-30 p-2 bg-black/20 rounded-full backdrop-blur-sm cursor-pointer hover:bg-black/40 transition-colors"
                onClick={toggleMute}
            >
                {isMuted ? <VolumeX size={20} color="white" /> : <Volume2 size={20} color="white" />}
            </div>

            {/* Play/Pause Indicator (optional overlay) */}
            {!playing && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <div className="bg-black/35 border border-white/30 rounded-full p-4 backdrop-blur-md shadow-[0_12px_28px_rgba(0,0,0,0.45)]">
                        <Play size={44} fill="white" className="text-white ml-1" />
                    </div>
                </div>
            )}

            <VideoOverlay video={video} />
            <VideoSidebar video={video} />
        </div>
    );
};

export default VideoPlayer;
