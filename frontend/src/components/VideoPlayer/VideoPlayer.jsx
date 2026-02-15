import React, { useRef, useEffect, useState, useCallback } from 'react';
import VideoOverlay from './VideoOverlay';
import VideoSidebar from './VideoSidebar';
import VolumeControl from './VolumeControl';
import { Play } from 'lucide-react';
import { getMediaUrl } from '../../utils/media';
import { useAnalytics } from '../../hooks/useAnalytics';

const VideoPlayer = ({ video, isActive, onDelete }) => {
    const videoRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [fitMode, setFitMode] = useState('contain'); // 'contain' or 'cover'
    const { track } = useAnalytics();


    const watchedMsRef = useRef(0);
    const lastPlaybackSecRef = useRef(0);

    const resetWatchSession = useCallback(() => {
        watchedMsRef.current = 0;
        lastPlaybackSecRef.current = videoRef.current?.currentTime || 0;
    }, []);

    const syncWatchProgress = useCallback(() => {
        const videoEl = videoRef.current;
        if (!videoEl) {
            return;
        }
        const currentSec = videoEl.currentTime || 0;
        const deltaSec = currentSec - lastPlaybackSecRef.current;
        if (deltaSec > 0) {
            watchedMsRef.current += deltaSec * 1000;
        }
        lastPlaybackSecRef.current = currentSec;
    }, []);

    const reportLeave = useCallback(() => {
        syncWatchProgress();
        const watchMs = Math.floor(watchedMsRef.current);
        if (watchMs > 100) {
            track('LEAVE', video.id, {}, { watchMs });
        }
        resetWatchSession();
    }, [resetWatchSession, syncWatchProgress, track, video.id]);

    useEffect(() => {
        const videoEl = videoRef.current;
        if (!videoEl) {
            return;
        }

        if (isActive) {
            resetWatchSession();
            const playPromise = videoEl.play();
            if (playPromise !== undefined) {
                playPromise.then(_ => {
                    setPlaying(true);
                }).catch(error => {
                    console.log("Auto-play prevented:", error);
                    setPlaying(false);
                });
            }
        } else {
            videoEl.pause();
            setPlaying(false);
            videoEl.currentTime = 0;
            resetWatchSession();
        }

        return () => {
            if (isActive) {
                reportLeave();
            }
        };
    }, [isActive, reportLeave, resetWatchSession]);

    const handleVideoPress = () => {
        const videoEl = videoRef.current;
        if (!videoEl) {
            return;
        }

        if (videoEl.paused) {
            lastPlaybackSecRef.current = videoEl.currentTime || 0;
            const playPromise = videoEl.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    setPlaying(true);
                }).catch(err => {
                    console.error("Play failed:", err);
                    setPlaying(false);
                });
            }
        } else {
            syncWatchProgress();
            videoEl.pause();
            setPlaying(false);
        }
    };

    const handleTimeUpdate = () => {
        syncWatchProgress();
    };

    const handleEnded = () => {
        const videoEl = videoRef.current;
        if (!videoEl) {
            return;
        }
        syncWatchProgress();
        const watchMs = Math.floor(watchedMsRef.current);
        track('FINISH', video.id, {}, { watchMs });
        resetWatchSession();

        // Manually loop the video
        videoEl.currentTime = 0;
        videoEl.play().then(() => {
            setPlaying(true);
        }).catch(err => {
            console.error("Manual loop failed:", err);
            setPlaying(false);
        });
    };

    const toggleFitMode = () => {
        setFitMode(prev => prev === 'contain' ? 'cover' : 'contain');
    };


    return (
        <div className="relative w-full h-full bg-black snap-start flex justify-center items-center overflow-hidden">
            {/* Background Layer for 'contain' mode to provide blur effect */}
            {fitMode === 'contain' && (
                <div
                    className="absolute inset-0 z-0 opacity-50 bg-cover bg-center scale-110 blur-2xl transition-opacity duration-700"
                    style={{ backgroundImage: `url(${getMediaUrl(video.coverUrl)})` }}
                />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none z-[1]" />

            <video
                ref={videoRef}
                onClick={handleVideoPress}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                className={`w-full h-full relative z-[1] transition-all duration-300 ${fitMode === 'contain' ? 'object-contain' : 'object-cover'}`}
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

            <VideoSidebar
                video={video}
                onToggleFit={toggleFitMode}
                fitMode={fitMode}
                isActive={isActive}
                onDelete={onDelete}
            />
        </div>
    );
};

export default VideoPlayer;
