import React, { useState, useEffect } from 'react';
import { Heart, Share2, Plus, Check, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import { likeVideo, unlikeVideo, getVideoLikeStatus, deleteVideo } from '../../api/video';
import { useAuthContext } from '../../contexts/AuthContext';
import { useAnalytics } from '../../hooks/useAnalytics';
import ConfirmDialog from '../Common/ConfirmDialog';
import avatarImg from '../../resource/avatar.jpg';

const VideoSidebar = ({ video, onToggleFit, fitMode, isActive, onDelete }) => {
    const { token, user } = useAuthContext();
    const { track } = useAnalytics();
    const [liked, setLiked] = useState(video.isLiked || false); // Default from prop
    const [likeCount, setLikeCount] = useState(video.likeCount || 0);
    const [copied, setCopied] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Sync with props
    useEffect(() => {
        setLikeCount(video.likeCount || 0);
        setLiked(video.isLiked || false);
    }, [video]);

    // Fetch fresh status when active
    useEffect(() => {
        if (isActive && video?.id) {
            getVideoLikeStatus(token, video.id)
                .then(data => {
                    setLiked(data.liked);
                    setLikeCount(data.likeCount);
                })
                .catch(err => {
                    console.error("Failed to fetch like status:", err);
                });
        }
    }, [isActive, video?.id, token]);

    const handleLike = async () => {
        const newLiked = !liked;
        setLiked(newLiked);
        setLikeCount(prev => newLiked ? prev + 1 : prev - 1);

        try {
            if (newLiked) {
                await likeVideo(token, video.id);
            } else {
                await unlikeVideo(token, video.id);
            }
        } catch (error) {
            console.error("Like operation failed", error);
            setLiked(!newLiked);
            setLikeCount(prev => newLiked ? prev - 1 : prev + 1);
        }
    };

    const handleShare = async () => {
        track('SHARE', video.id);
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy!', err);
        }
    };

    const handleDeleteClick = (e) => {
        e.stopPropagation();
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        try {
            await deleteVideo(token, video.id);
            if (onDelete) {
                onDelete(video.id);
            }
        } catch (error) {
            console.error("Failed to delete video:", error);
            // We might want to show a toast here instead of alert, but for now alert is fine for error
            alert("删除失败: " + error.message);
        }
    };

    return (
        <div className="absolute right-2 bottom-24 flex flex-col items-center space-y-5 z-10 pointer-events-auto">
            {/* Avatar */}
            <div className="relative group cursor-pointer mb-2">
                <div className="w-12 h-12 rounded-full border border-white/50 overflow-hidden bg-gray-800 transition-transform group-hover:scale-105">
                    <img
                        src={avatarImg}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                    />
                </div>
                {/* Follow Button Placeholder */}
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-[#FE2C55] rounded-full w-5 h-5 flex items-center justify-center text-white shadow-md transition-opacity">
                    <Plus size={10} strokeWidth={4} />
                </div>
            </div>

            {/* Like */}
            <div className="flex flex-col items-center cursor-pointer group" onClick={handleLike}>
                <div className={`p-2 rounded-full transition-all duration-200 active:scale-75 ${liked ? 'text-[#FE2C55]' : 'text-white bg-black/20 hover:bg-black/40'}`}>
                    <Heart size={32} fill={liked ? "currentColor" : "none"} strokeWidth={liked ? 0 : 2} className={`filter drop-shadow-lg ${liked ? 'animate-heart-pop' : ''}`} />
                </div>
                <span className="text-white text-xs font-medium drop-shadow-md mt-1">{likeCount}</span>
            </div>

            {/* Aspect Ratio Toggle */}
            <div className="flex flex-col items-center cursor-pointer group" onClick={onToggleFit}>
                <div className="p-2 rounded-full text-white bg-black/20 hover:bg-black/40 transition-all duration-200 active:scale-75">
                    {fitMode === 'contain' ? <Maximize2 size={28} strokeWidth={2} /> : <Minimize2 size={28} strokeWidth={2} />}
                </div>
                <span className="text-white text-[10px] font-medium drop-shadow-md mt-1">{fitMode === 'contain' ? '填充' : '比例'}</span>
            </div>

            {/* Share */}
            <div className="flex flex-col items-center cursor-pointer group" onClick={handleShare}>
                <div className="p-2 rounded-full text-white bg-black/20 hover:bg-black/40 transition-all duration-200 active:scale-75">
                    {copied ? <Check size={30} className="text-green-400" /> : <Share2 size={30} strokeWidth={2} className="filter drop-shadow-lg" />}
                </div>
                <span className="text-white text-xs font-medium drop-shadow-md mt-1">{copied ? '已复制' : '分享'}</span>
            </div>

            {/* Delete Button (Only for Author) */}
            {user && user.userId === video.authorId && (
                <div className="flex flex-col items-center cursor-pointer group" onClick={handleDeleteClick}>
                    <div className="p-2 rounded-full text-white bg-black/20 hover:bg-black/40 transition-all duration-200 active:scale-75 hover:text-red-500">
                        <Trash2 size={28} strokeWidth={2} className="filter drop-shadow-lg" />
                    </div>
                    <span className="text-white text-[10px] font-medium drop-shadow-md mt-1">删除</span>
                </div>
            )}

            {/* Spinning Disc (Music) Animation - Aesthetic Touch */}
            <div className="relative mt-4 animate-spin-slow-linear">
                <div className="w-10 h-10 bg-gray-800 rounded-full border-[6px] border-gray-900 overflow-hidden flex items-center justify-center">
                    <img
                        src={avatarImg}
                        className="w-6 h-6 rounded-full"
                    />
                </div>
            </div>

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleConfirmDelete}
                title="删除视频"
                message="确定要删除这个视频吗？此操作无法撤销。"
                confirmText="删除"
                cancelText="取消"
                isDangerous={true}
            />
        </div>
    );
};

export default VideoSidebar;
