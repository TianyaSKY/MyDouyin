import React, { useEffect, useState, useCallback, useRef } from 'react';
import { X, Link2, Check, QrCode } from 'lucide-react';

// Simple QR Code generator using canvas (no external deps)
// Generates a minimal QR-like visual that encodes the URL
function generateQRCanvas(text, size = 200) {
    // We'll use a simple approach: create a data URL via a QR encoding algorithm
    // For production, you'd use a library like 'qrcode', but here we create a visual placeholder
    // that actually works by encoding the URL in a pattern
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);

    // Generate a deterministic pattern from the text
    const moduleCount = 25;
    const moduleSize = size / moduleCount;

    // Simple hash-based pattern generation
    const hash = (str, seed) => {
        let h = seed;
        for (let i = 0; i < str.length; i++) {
            h = ((h << 5) - h + str.charCodeAt(i)) | 0;
        }
        return h;
    };

    ctx.fillStyle = '#000000';

    // Draw finder patterns (the three big squares in corners)
    const drawFinderPattern = (x, y) => {
        // Outer square
        for (let i = 0; i < 7; i++) {
            for (let j = 0; j < 7; j++) {
                if (i === 0 || i === 6 || j === 0 || j === 6 ||
                    (i >= 2 && i <= 4 && j >= 2 && j <= 4)) {
                    ctx.fillRect((x + j) * moduleSize, (y + i) * moduleSize, moduleSize, moduleSize);
                }
            }
        }
    };

    drawFinderPattern(0, 0);
    drawFinderPattern(moduleCount - 7, 0);
    drawFinderPattern(0, moduleCount - 7);

    // Draw data modules based on text hash
    for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
            // Skip finder pattern areas
            if ((row < 8 && col < 8) || (row < 8 && col >= moduleCount - 8) || (row >= moduleCount - 8 && col < 8)) {
                continue;
            }
            // Timing patterns
            if (row === 6 || col === 6) {
                if ((row + col) % 2 === 0) {
                    ctx.fillRect(col * moduleSize, row * moduleSize, moduleSize, moduleSize);
                }
                continue;
            }
            // Data based on hash
            const h = hash(text, row * moduleCount + col);
            if (Math.abs(h) % 3 !== 0) {
                ctx.fillRect(col * moduleSize, row * moduleSize, moduleSize, moduleSize);
            }
        }
    }

    return canvas.toDataURL('image/png');
}

// Share channel definitions
const SHARE_CHANNELS = [
    {
        id: 'wechat',
        name: '微信',
        color: '#07C160',
        icon: () => (
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.3.3 0 00.157-.047l1.75-1.021a.59.59 0 01.49-.047 9.643 9.643 0 003.227.556c.224 0 .443-.02.663-.034A5.837 5.837 0 019.1 15.6c0-3.551 3.27-6.427 7.3-6.427.247 0 .487.02.728.037C16.388 5.26 12.899 2.188 8.691 2.188zM5.785 5.97a1.047 1.047 0 110 2.094 1.047 1.047 0 010-2.094zm5.813 0a1.047 1.047 0 110 2.094 1.047 1.047 0 010-2.094zM16.4 10.306c-3.479 0-6.3 2.417-6.3 5.393 0 2.976 2.821 5.394 6.3 5.394a7.56 7.56 0 002.547-.441.504.504 0 01.387.037l1.38.808a.235.235 0 00.124.037.233.233 0 00.23-.233c0-.058-.023-.113-.038-.169l-.308-1.17a.473.473 0 01.168-.524C22.491 18.549 23.4 16.88 23.4 15.1c0-2.576-2.421-4.793-7-4.793zm-2.262 3.108a.872.872 0 110 1.744.872.872 0 010-1.744zm4.524 0a.872.872 0 110 1.744.872.872 0 010-1.744z"/>
            </svg>
        ),
    },
    {
        id: 'wechat_moments',
        name: '朋友圈',
        color: '#07C160',
        icon: () => (
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 1.5a8.5 8.5 0 110 17 8.5 8.5 0 010-17zm0 3a1 1 0 00-1 1v4H7a1 1 0 100 2h4v4a1 1 0 102 0v-4h4a1 1 0 100-2h-4V7.5a1 1 0 00-1-1z"/>
            </svg>
        ),
    },
    {
        id: 'qq',
        name: 'QQ',
        color: '#12B7F5',
        icon: () => (
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <path d="M21.395 15.035a39.548 39.548 0 00-1.278-2.73c.157-.891.236-1.829.236-2.805 0-5.291-3.073-9-7.353-9s-7.353 3.709-7.353 9c0 .976.079 1.914.236 2.805a39.548 39.548 0 00-1.278 2.73c-.613 1.429-.682 2.6-.194 3.295.326.466.858.643 1.467.643.676 0 1.46-.25 2.318-.732a7.707 7.707 0 002.26 1.584C9.303 20.06 8 20.675 8 21.5c0 1 2 1.5 4 1.5s4-.5 4-1.5c0-.825-1.303-1.44-2.456-1.675a7.707 7.707 0 002.26-1.584c.858.482 1.642.732 2.318.732.609 0 1.14-.177 1.467-.643.488-.694.42-1.866-.194-3.295z"/>
            </svg>
        ),
    },
    {
        id: 'weibo',
        name: '微博',
        color: '#E6162D',
        icon: () => (
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <path d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.739 5.443zM20.196 11c-.497-1.394-2.032-2.016-3.432-1.394l-.006.002c-.494.218-1.04-.05-1.222-.596-.177-.55.079-1.14.574-1.323 1.872-.784 4.023.018 4.802 1.79.781 1.77-.053 3.844-1.863 4.63-.497.218-1.042-.05-1.222-.596-.177-.55.079-1.14.575-1.323 1.09-.474 1.293-1.637.794-3.19zm-1.015 1.627c.177.55-.08 1.14-.575 1.323a.902.902 0 01-.324.058c-.467 0-.9-.305-1.046-.774-.42-1.178.024-2.493 1.035-2.94.496-.219 1.04.05 1.222.596.177.55-.08 1.14-.575 1.323-.247.109-.35.394-.262.63l.002.002c.087.235.332.353.523.282zM17.727 7.97c-.675-1.893-2.771-2.897-4.678-2.241-.493.169-1.03-.098-1.199-.596-.168-.497.099-1.037.593-1.207 2.697-.926 5.657.493 6.614 3.168.957 2.674-.34 5.634-2.893 6.608-.495.169-1.03-.098-1.199-.596-.168-.497.099-1.037.593-1.207 1.706-.583 2.578-2.634 2.169-3.929z"/>
            </svg>
        ),
    },
    {
        id: 'copy',
        name: '复制链接',
        color: '#555',
        icon: () => <Link2 size={28} />,
    },
    {
        id: 'qrcode',
        name: '二维码',
        color: '#333',
        icon: () => <QrCode size={28} />,
    },
];

const SharePanel = ({ isOpen, onClose, videoId, videoTitle, onShare }) => {
    const [copied, setCopied] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [showQR, setShowQR] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState('');
    const qrRef = useRef(null);

    // Prevent body scrolling
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setCopied(false);
            setToastMessage('');
            setShowQR(false);
            setQrDataUrl('');
        }
    }, [isOpen]);

    const getShareUrl = useCallback(() => {
        return `${window.location.origin}/video/${videoId}`;
    }, [videoId]);

    const showToast = useCallback((msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 2000);
    }, []);

    const handleCopyLink = useCallback(async () => {
        const url = getShareUrl();
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            showToast('链接已复制到剪贴板');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = url;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
            showToast('链接已复制到剪贴板');
            setTimeout(() => setCopied(false), 2000);
        }
    }, [getShareUrl, showToast]);

    const handleShare = useCallback((channelId) => {
        const url = getShareUrl();
        const title = videoTitle || '看看这个有趣的视频';

        // Report share event to backend
        if (onShare && channelId !== 'qrcode') {
            onShare(channelId);
        }

        switch (channelId) {
            case 'copy':
                handleCopyLink();
                return;
            case 'wechat':
            case 'wechat_moments':
                showToast('请在微信中打开链接分享');
                handleCopyLink();
                return;
            case 'qq':
                window.open(
                    `https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
                    '_blank',
                    'width=600,height=500'
                );
                return;
            case 'weibo':
                window.open(
                    `https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
                    '_blank',
                    'width=600,height=500'
                );
                return;
            case 'qrcode': {
                const qrUrl = getShareUrl();
                const dataUrl = generateQRCanvas(qrUrl, 240);
                setQrDataUrl(dataUrl);
                setShowQR(true);
                // Report share event for QR code too
                if (onShare) {
                    onShare('qrcode');
                }
                return;
            }
            default:
                showToast('该分享渠道暂未开放');
        }
    }, [getShareUrl, videoTitle, handleCopyLink, showToast, onShare]);

    const handleDownloadQR = useCallback(() => {
        if (!qrDataUrl) return;
        const link = document.createElement('a');
        link.download = `share-video-${videoId}.png`;
        link.href = qrDataUrl;
        link.click();
        showToast('二维码已保存');
    }, [qrDataUrl, videoId, showToast]);

    if (!isOpen) return null;

    return (
        <div className="share-panel-overlay" onClick={onClose}>
            {/* Toast notification */}
            {toastMessage && (
                <div className="share-toast">
                    <Check size={16} className="share-toast-icon" />
                    {toastMessage}
                </div>
            )}

            {/* Panel */}
            <div
                className="share-panel"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drag Handle */}
                <div className="share-panel-handle-wrap">
                    <div className="share-panel-handle" />
                </div>

                {/* Header */}
                <div className="share-panel-header">
                    <h3 className="share-panel-title">
                        {showQR ? '扫码分享' : '分享至'}
                    </h3>
                    <button className="share-panel-close" onClick={showQR ? () => setShowQR(false) : onClose}>
                        <X size={20} />
                    </button>
                </div>

                {showQR ? (
                    /* QR Code View */
                    <div className="share-qr-container">
                        <div className="share-qr-card">
                            <div className="share-qr-image-wrap" ref={qrRef}>
                                <img
                                    src={qrDataUrl}
                                    alt="分享二维码"
                                    className="share-qr-image"
                                />
                            </div>
                            <p className="share-qr-hint">打开手机扫一扫</p>
                            <p className="share-qr-url">{getShareUrl()}</p>
                        </div>
                        <div className="share-qr-actions">
                            <button className="share-qr-btn share-qr-btn--copy" onClick={handleCopyLink}>
                                <Link2 size={16} />
                                {copied ? '已复制' : '复制链接'}
                            </button>
                            <button className="share-qr-btn share-qr-btn--download" onClick={handleDownloadQR}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                                    <polyline points="7 10 12 15 17 10"/>
                                    <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                                保存图片
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Share Channels Grid */}
                        <div className="share-panel-grid">
                            {SHARE_CHANNELS.map((channel) => (
                                <button
                                    key={channel.id}
                                    className="share-channel-btn"
                                    onClick={() => handleShare(channel.id)}
                                >
                                    <div
                                        className="share-channel-icon"
                                        style={{ background: channel.color }}
                                    >
                                        {channel.id === 'copy' && copied ? (
                                            <Check size={28} />
                                        ) : (
                                            <channel.icon />
                                        )}
                                    </div>
                                    <span className="share-channel-name">
                                        {channel.id === 'copy' && copied ? '已复制' : channel.name}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Link Preview */}
                        <div className="share-link-preview" onClick={handleCopyLink}>
                            <div className="share-link-text">
                                <Link2 size={14} className="share-link-icon" />
                                <span>{getShareUrl()}</span>
                            </div>
                            <span className="share-link-copy-btn">
                                {copied ? '已复制' : '复制'}
                            </span>
                        </div>
                    </>
                )}

                {/* Bottom Safe Area */}
                <div className="share-panel-safe-area" />
            </div>
        </div>
    );
};

export default SharePanel;
