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
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
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
        const videoEl = videoRef.current;
        if (videoEl && videoEl.duration) {
            setProgress((videoEl.currentTime / videoEl.duration) * 100);
            setCurrentTime(videoEl.currentTime);
            setDuration(videoEl.duration);
        }
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

    const handleProgressClick = (e) => {
        const videoEl = videoRef.current;
        if (!videoEl || !videoEl.duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = x / rect.width;
        videoEl.currentTime = pct * videoEl.duration;
    };

    const toggleFitMode = () => {
        setFitMode(prev => prev === 'contain' ? 'cover' : 'contain');
    };

    // Format time as mm:ss
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };


    return (
        <div className="dy-player">
            {/* Background Layer for 'contain' mode to provide blur effect */}
            {fitMode === 'contain' && (
                <div
                    className="dy-player-bg"
                    style={{ backgroundImage: `url(${getMediaUrl(video.coverUrl)})` }}
                />
            )}

            <video
                ref={videoRef}
                onClick={handleVideoPress}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                className={`dy-player-video ${fitMode === 'contain' ? 'dy-player-video--contain' : 'dy-player-video--cover'}`}
                src={getMediaUrl(video.videoUrl)}
                poster={getMediaUrl(video.coverUrl)}
                playsInline
            />

            {/* Volume Control - Top Right */}
            <VolumeControl videoRef={videoRef} />

            {/* Play/Pause Indicator */}
            {!playing && (
                <div className="dy-player-pause-indicator">
                    <div className="dy-player-pause-icon">
                        <Play size={48} fill="white" className="ml-1" />
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

            {/* Bottom Progress Bar — Douyin style */}
            <div className="dy-progress" onClick={handleProgressClick}>
                <div className="dy-progress-bar">
                    <div
                        className="dy-progress-fill"
                        style={{ width: `${progress}%` }}
                    />
                    <div
                        className="dy-progress-thumb"
                        style={{ left: `${progress}%` }}
                    />
                </div>
                <div className="dy-progress-time">
                    <span>{formatTime(currentTime)}</span>
                    <span> / </span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>
        </div>
    );
};

export default VideoPlayer;
