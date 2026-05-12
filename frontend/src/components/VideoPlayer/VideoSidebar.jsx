import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Plus, Maximize2, Minimize2, Trash2, Share2, MessageCircle } from 'lucide-react';
import { likeVideo, unlikeVideo, getVideoLikeStatus, deleteVideo, getShareCount, shareVideo } from '../../api/video';
import { getCommentCount } from '../../api/comment';
import { followUser, getFollowStatus, unfollowUser } from '../../api/user';
import { useAuthContext } from '../../contexts/AuthContext';
import { useAnalytics } from '../../hooks/useAnalytics';
import ConfirmDialog from '../Common/ConfirmDialog';
import SharePanel from '../Common/SharePanel';
import avatarImg from '../../resource/avatar.jpg';

const VideoSidebar = ({ video, onToggleFit, fitMode, isActive, onDelete, onOpenComments }) => {
    const navigate = useNavigate();
    const { token, user } = useAuthContext();
    const { track } = useAnalytics();
    const [liked, setLiked] = useState(video.isLiked || false); // Default from prop
    const [likeCount, setLikeCount] = useState(video.likeCount || 0);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showShare, setShowShare] = useState(false);
    const [following, setFollowing] = useState(false);
    const [followSaving, setFollowSaving] = useState(false);

    const [commentCount, setCommentCount] = useState(0);
    const [shareCount, setShareCount] = useState(0);

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

    useEffect(() => {
        if (isActive && video?.authorId && user?.userId !== video.authorId) {
            getFollowStatus(token, video.authorId)
                .then(data => setFollowing(!!data.following))
                .catch(err => console.error('Failed to fetch follow status:', err));
        } else {
            setFollowing(false);
        }
    }, [isActive, video?.authorId, token, user?.userId]);

    // Fetch comment count when active
    useEffect(() => {
        if (isActive && video?.id) {
            getCommentCount(token, video.id)
                .then(count => setCommentCount(count || 0))
                .catch(err => console.error('Failed to fetch comment count:', err));
        }
    }, [isActive, video?.id, token]);

    // Fetch share count when active
    useEffect(() => {
        if (isActive && video?.id) {
            getShareCount(token, video.id)
                .then(data => setShareCount(data?.shareCount || 0))
                .catch(err => console.error('Failed to fetch share count:', err));
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

    const handleDeleteClick = (e) => {
        e.stopPropagation();
        setShowDeleteConfirm(true);
    };

    const handleFollowClick = async (e) => {
        e.stopPropagation();
        if (!video?.authorId || followSaving || user?.userId === video.authorId) return;

        const nextFollowing = !following;
        setFollowSaving(true);
        setFollowing(nextFollowing);

        try {
            const data = nextFollowing
                ? await followUser(token, video.authorId)
                : await unfollowUser(token, video.authorId);
            setFollowing(!!data.following);
        } catch (error) {
            console.error('Follow operation failed:', error);
            setFollowing(!nextFollowing);
        } finally {
            setFollowSaving(false);
        }
    };

    const handleConfirmDelete = async () => {
        try {
            await deleteVideo(token, video.id);
            if (onDelete) {
                onDelete(video.id);
            }
        } catch (error) {
            console.error("Failed to delete video:", error);
            alert("删除失败: " + error.message);
        }
    };

    // Format count display like Douyin (e.g., 1.2w for 12000)
    const formatCount = (count) => {
        if (count >= 10000) {
            return (count / 10000).toFixed(1) + 'w';
        }
        return String(count);
    };

    return (
        <div className="dy-sidebar">
            {/* Avatar */}
            <div className="dy-sidebar-avatar-wrap" onClick={() => {
                const targetPath = user && user.userId === video.authorId ? '/me' : `/user/${video.authorId}`;
                navigate(targetPath);
            }}>
                <div className="dy-sidebar-avatar">
                    <img
                        src={avatarImg}
                        alt="Avatar"
                        className="dy-sidebar-avatar-img"
                    />
                </div>
                {/* Follow Button */}
                {user?.userId !== video.authorId && !following && (
                    <div className="dy-sidebar-follow" onClick={handleFollowClick}>
                        <Plus size={12} strokeWidth={3} />
                    </div>
                )}
            </div>

            {/* Like */}
            <div className="dy-sidebar-btn" onClick={handleLike}>
                <div className={`dy-sidebar-icon ${liked ? 'dy-sidebar-icon--liked' : ''}`}>
                    <Heart
                        size={28}
                        fill={liked ? "currentColor" : "none"}
                        strokeWidth={liked ? 0 : 2.2}
                        className={liked ? 'animate-heart-pop' : ''}
                    />
                </div>
                <span className="dy-sidebar-count">{formatCount(likeCount)}</span>
            </div>

            {/* Comment */}
            <div className="dy-sidebar-btn" onClick={onOpenComments}>
                <div className="dy-sidebar-icon">
                    <MessageCircle size={26} strokeWidth={2.2} />
                </div>
                <span className="dy-sidebar-count">{formatCount(commentCount)}</span>
            </div>

            {/* Share */}
            <div className="dy-sidebar-btn" onClick={() => setShowShare(true)}>
                <div className="dy-sidebar-icon">
                    <Share2 size={26} strokeWidth={2.2} />
                </div>
                <span className="dy-sidebar-count">{shareCount > 0 ? formatCount(shareCount) : '分享'}</span>
            </div>

            {/* Aspect Ratio Toggle */}
            <div className="dy-sidebar-btn" onClick={onToggleFit}>
                <div className="dy-sidebar-icon">
                    {fitMode === 'contain'
                        ? <Maximize2 size={24} strokeWidth={2.2} />
                        : <Minimize2 size={24} strokeWidth={2.2} />
                    }
                </div>
                <span className="dy-sidebar-count">{fitMode === 'contain' ? '填充' : '比例'}</span>
            </div>

            {/* Delete Button (Only for Author) */}
            {user && user.userId === video.authorId && (
                <div className="dy-sidebar-btn" onClick={handleDeleteClick}>
                    <div className="dy-sidebar-icon dy-sidebar-icon--delete">
                        <Trash2 size={24} strokeWidth={2.2} />
                    </div>
                    <span className="dy-sidebar-count">删除</span>
                </div>
            )}

            {/* Spinning Music Disc */}
            <div className="dy-sidebar-disc">
                <div className="dy-sidebar-disc-outer">
                    <div className="dy-sidebar-disc-inner">
                        <img
                            src={avatarImg}
                            alt="Music"
                            className="dy-sidebar-disc-img"
                        />
                    </div>
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

            <SharePanel
                isOpen={showShare}
                onClose={() => setShowShare(false)}
                videoId={video.id}
                videoTitle={video.title}
                onShare={(channel) => {
                    shareVideo(token, video.id, channel)
                        .then(data => {
                            if (data?.shareCount != null) {
                                setShareCount(data.shareCount);
                            } else {
                                setShareCount(prev => prev + 1);
                            }
                        })
                        .catch(err => console.error('Failed to report share:', err));
                }}
            />


        </div>
    );
};

export default VideoSidebar;
