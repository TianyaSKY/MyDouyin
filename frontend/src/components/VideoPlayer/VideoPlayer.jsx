import React, { useRef, useEffect, useState } from 'react';
import VideoOverlay from './VideoOverlay';
import VideoSidebar from './VideoSidebar';
import { Play } from 'lucide-react';

const VideoPlayer = ({ video, isActive }) => {
    const videoRef = useRef(null);
    const [playing, setPlaying] = useState(false);

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

    return (
        <div className="relative w-full h-full bg-black snap-start flex justify-center items-center">
            <video
                ref={videoRef}
                onClick={handleVideoPress}
                className="w-full h-full object-cover"
                src={video.videoUrl}
                poster={video.coverUrl}
                loop
                playsInline
                muted // Muted for autoplay
            />

            {/* Play/Pause Indicator (optional overlay) */}
            {!playing && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-black/30 rounded-full p-4 backdrop-blur-sm">
                        <Play size={48} fill="white" className="text-white ml-2" />
                    </div>
                </div>
            )}

            <VideoOverlay video={video} />
            <VideoSidebar video={video} />
        </div>
    );
};

export default VideoPlayer;
