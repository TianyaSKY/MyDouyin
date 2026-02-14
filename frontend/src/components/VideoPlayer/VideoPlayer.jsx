import React, { useRef, useEffect, useState } from 'react';
import VideoOverlay from './VideoOverlay';
import VideoSidebar from './VideoSidebar';
import VolumeControl from './VolumeControl';
import { Play } from 'lucide-react';
import { getMediaUrl } from '../../utils/media';
import { useAnalytics } from '../../hooks/useAnalytics';

const VideoPlayer = ({ video, isActive }) => {
    const videoRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const { track } = useAnalytics();


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

    const handleEnded = () => {
        // Track finish event
        track('FINISH', video.id);

        // Manually loop the video
        videoRef.current.currentTime = 0;
        videoRef.current.play().then(() => {
            setPlaying(true);
        }).catch(err => {
            console.error("Manual loop failed:", err);
            setPlaying(false);
        });
    };



    return (
        <div className="relative w-full h-full bg-black snap-start flex justify-center items-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20 pointer-events-none z-[1]" />
            <video
                ref={videoRef}
                onClick={handleVideoPress}
                onEnded={handleEnded}
                className="w-full h-full object-cover transition-transform duration-500"
                src={getMediaUrl(video.videoUrl)}
                poster={getMediaUrl(video.coverUrl)}
                playsInline
            />

            {/* Volume Control - Top Right */}
            <VolumeControl videoRef={videoRef} />

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
