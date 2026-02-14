import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, Volume1, VolumeX } from 'lucide-react';

const STORAGE_KEY = 'douyin_volume';

const getStoredVolume = () => {
    try {
        const v = localStorage.getItem(STORAGE_KEY);
        return v !== null ? parseFloat(v) : 0.7;
    } catch {
        return 0.7;
    }
};

const VolumeControl = ({ videoRef }) => {
    const [volume, setVolume] = useState(getStoredVolume);
    const [isMuted, setIsMuted] = useState(false);
    const [showSlider, setShowSlider] = useState(false);
    const hideTimer = useRef(null);
    const prevVolume = useRef(volume);

    // Sync volume to the <video> element
    useEffect(() => {
        const el = videoRef?.current;
        if (!el) return;
        el.volume = isMuted ? 0 : volume;
        el.muted = false; // we control volume directly
    }, [volume, isMuted, videoRef]);

    // Persist volume
    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY, String(volume)); } catch { /* noop */ }
    }, [volume]);

    const scheduleHide = useCallback(() => {
        hideTimer.current = setTimeout(() => setShowSlider(false), 300);
    }, []);

    const cancelHide = useCallback(() => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
    }, []);

    const handleMouseEnter = () => { cancelHide(); setShowSlider(true); };
    const handleMouseLeave = () => { scheduleHide(); };

    const handleSliderChange = (e) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        if (val > 0 && isMuted) setIsMuted(false);
        if (val === 0) setIsMuted(true);
    };

    const toggleMute = (e) => {
        e.stopPropagation();
        if (isMuted) {
            setIsMuted(false);
            if (volume === 0) setVolume(prevVolume.current || 0.7);
        } else {
            prevVolume.current = volume;
            setIsMuted(true);
        }
    };

    const displayVolume = isMuted ? 0 : volume;

    const VolumeIcon = displayVolume === 0
        ? VolumeX
        : displayVolume <= 0.5
            ? Volume1
            : Volume2;

    const pct = Math.round(displayVolume * 100);

    return (
        <div
            className="volume-control"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Slider container — above the icon */}
            <div className={`volume-slider-wrapper ${showSlider ? 'visible' : ''}`}>
                <div className="volume-slider-track">
                    <span className="volume-pct-label">{pct}</span>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={displayVolume}
                        onChange={handleSliderChange}
                        className="volume-range"
                        style={{ '--volume-pct': `${pct}%` }}
                        aria-label="Volume"
                    />
                </div>
            </div>

            {/* Icon button */}
            <button
                className="volume-icon-btn"
                onClick={toggleMute}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
                <VolumeIcon size={20} />
            </button>
        </div>
    );
};

export default VolumeControl;
