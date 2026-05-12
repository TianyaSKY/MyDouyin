import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, MessageCircle, ChevronDown, Trash2 } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { getVideoComments, postComment, getCommentReplies, deleteComment } from '../../api/comment';
import avatarImg from '../../resource/avatar.jpg';

const CommentPanel = ({ isOpen, onClose, videoId }) => {
    const { token, user } = useAuthContext();
    const [comments, setComments] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [replyTo, setReplyTo] = useState(null); // { id, nickname }
    const [expandedReplies, setExpandedReplies] = useState({}); // commentId -> replies[]
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [totalComments, setTotalComments] = useState(0);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    // Load comments when panel opens
    useEffect(() => {
        if (isOpen && videoId) {
            loadComments(1, true);
        }
        if (!isOpen) {
            setComments([]);
            setPage(1);
            setHasMore(true);
            setReplyTo(null);
            setExpandedReplies({});
        }
    }, [isOpen, videoId]);

    const loadComments = useCallback(async (pageNum, reset = false) => {
        if (loading) return;
        setLoading(true);
        try {
            const data = await getVideoComments(token, videoId, pageNum, 20);
            const newComments = data.records || [];
            setTotalComments(data.total || 0);

            if (reset) {
                setComments(newComments);
            } else {
                setComments(prev => [...prev, ...newComments]);
            }

            setPage(pageNum);
            setHasMore(newComments.length >= 20);
        } catch (err) {
            console.error('Failed to load comments:', err);
        } finally {
            setLoading(false);
        }
    }, [token, videoId, loading]);

    const handleSend = async () => {
        const text = inputText.trim();
        if (!text || sending) return;

        setSending(true);
        try {
            const newComment = await postComment(
                token,
                videoId,
                text,
                replyTo?.id || null
            );

            // Add user info to the new comment for immediate display
            newComment.nickname = user?.nickname || user?.username || '我';
            newComment.avatarUrl = user?.avatarUrl || null;
            newComment.replyCount = 0;

            if (replyTo) {
                // Add to replies of the parent comment
                setExpandedReplies(prev => ({
                    ...prev,
                    [replyTo.id]: [...(prev[replyTo.id] || []), newComment]
                }));
                // Increment reply count on parent
                setComments(prev => prev.map(c =>
                    c.id === replyTo.id
                        ? { ...c, replyCount: (c.replyCount || 0) + 1 }
                        : c
                ));
            } else {
                setComments(prev => [newComment, ...prev]);
                setTotalComments(prev => prev + 1);
            }

            setInputText('');
            setReplyTo(null);
        } catch (err) {
            console.error('Failed to send comment:', err);
        } finally {
            setSending(false);
        }
    };

    const handleReply = (comment) => {
        setReplyTo({ id: comment.id, nickname: comment.nickname });
        inputRef.current?.focus();
    };

    const handleDelete = async (commentId, parentId = null) => {
        try {
            await deleteComment(token, commentId);
            if (parentId) {
                setExpandedReplies(prev => ({
                    ...prev,
                    [parentId]: (prev[parentId] || []).filter(r => r.id !== commentId)
                }));
                setComments(prev => prev.map(c =>
                    c.id === parentId
                        ? { ...c, replyCount: Math.max(0, (c.replyCount || 0) - 1) }
                        : c
                ));
            } else {
                setComments(prev => prev.filter(c => c.id !== commentId));
                setTotalComments(prev => Math.max(0, prev - 1));
            }
        } catch (err) {
            console.error('Failed to delete comment:', err);
        }
    };

    const toggleReplies = async (commentId) => {
        if (expandedReplies[commentId]) {
            setExpandedReplies(prev => {
                const next = { ...prev };
                delete next[commentId];
                return next;
            });
        } else {
            try {
                const data = await getCommentReplies(token, commentId, 1, 50);
                setExpandedReplies(prev => ({
                    ...prev,
                    [commentId]: data.records || []
                }));
            } catch (err) {
                console.error('Failed to load replies:', err);
            }
        }
    };

    const handleScroll = () => {
        const el = listRef.current;
        if (!el || loading || !hasMore) return;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) {
            loadComments(page + 1);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        const date = new Date(timeStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHour = Math.floor(diffMs / 3600000);
        const diffDay = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return '刚刚';
        if (diffMin < 60) return `${diffMin}分钟前`;
        if (diffHour < 24) return `${diffHour}小时前`;
        if (diffDay < 30) return `${diffDay}天前`;
        return date.toLocaleDateString('zh-CN');
    };

    if (!isOpen) return null;

    return (
        <div className="dy-comment-overlay" onClick={onClose}>
            <div className="dy-comment-panel" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="dy-comment-header">
                    <span className="dy-comment-header-title">
                        {totalComments > 0 ? `${totalComments} 条评论` : '评论'}
                    </span>
                    <button className="dy-comment-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Comment List */}
                <div
                    className="dy-comment-list custom-scrollbar"
                    ref={listRef}
                    onScroll={handleScroll}
                >
                    {comments.length === 0 && !loading ? (
                        <div className="dy-comment-empty">
                            <MessageCircle size={40} strokeWidth={1.2} />
                            <p>还没有评论，来抢沙发吧！</p>
                        </div>
                    ) : (
                        comments.map(comment => (
                            <div key={comment.id} className="dy-comment-item">
                                <img
                                    src={comment.avatarUrl || avatarImg}
                                    alt=""
                                    className="dy-comment-avatar"
                                />
                                <div className="dy-comment-body">
                                    <div className="dy-comment-meta">
                                        <span className="dy-comment-nickname">
                                            {comment.nickname || '用户'}
                                        </span>
                                        <span className="dy-comment-time">
                                            {formatTime(comment.createdAt)}
                                        </span>
                                    </div>
                                    <p className="dy-comment-text">{comment.content}</p>
                                    <div className="dy-comment-actions">
                                        <button
                                            className="dy-comment-action-btn"
                                            onClick={() => handleReply(comment)}
                                        >
                                            回复
                                        </button>
                                        {user && user.userId === comment.userId && (
                                            <button
                                                className="dy-comment-action-btn dy-comment-action-btn--danger"
                                                onClick={() => handleDelete(comment.id)}
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Replies */}
                                    {comment.replyCount > 0 && (
                                        <button
                                            className="dy-comment-expand-replies"
                                            onClick={() => toggleReplies(comment.id)}
                                        >
                                            <ChevronDown
                                                size={14}
                                                className={expandedReplies[comment.id] ? 'rotate-180' : ''}
                                            />
                                            {expandedReplies[comment.id]
                                                ? '收起回复'
                                                : `展开 ${comment.replyCount} 条回复`}
                                        </button>
                                    )}

                                    {expandedReplies[comment.id] && (
                                        <div className="dy-comment-replies">
                                            {expandedReplies[comment.id].map(reply => (
                                                <div key={reply.id} className="dy-comment-reply-item">
                                                    <img
                                                        src={reply.avatarUrl || avatarImg}
                                                        alt=""
                                                        className="dy-comment-reply-avatar"
                                                    />
                                                    <div className="dy-comment-reply-body">
                                                        <div className="dy-comment-meta">
                                                            <span className="dy-comment-nickname">
                                                                {reply.nickname || '用户'}
                                                            </span>
                                                            <span className="dy-comment-time">
                                                                {formatTime(reply.createdAt)}
                                                            </span>
                                                        </div>
                                                        <p className="dy-comment-text">{reply.content}</p>
                                                        <div className="dy-comment-actions">
                                                            {user && user.userId === reply.userId && (
                                                                <button
                                                                    className="dy-comment-action-btn dy-comment-action-btn--danger"
                                                                    onClick={() => handleDelete(reply.id, comment.id)}
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}

                    {loading && (
                        <div className="dy-comment-loading">
                            <div className="loading-spinner" />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="dy-comment-input-area">
                    {replyTo && (
                        <div className="dy-comment-reply-hint">
                            <span>回复 @{replyTo.nickname}</span>
                            <button onClick={() => setReplyTo(null)}>
                                <X size={14} />
                            </button>
                        </div>
                    )}
                    <div className="dy-comment-input-row">
                        <input
                            ref={inputRef}
                            type="text"
                            className="dy-comment-input"
                            placeholder={replyTo ? `回复 @${replyTo.nickname}...` : '留下你的精彩评论...'}
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            maxLength={500}
                            disabled={sending}
                        />
                        <button
                            className={`dy-comment-send-btn ${inputText.trim() ? 'dy-comment-send-btn--active' : ''}`}
                            onClick={handleSend}
                            disabled={!inputText.trim() || sending}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommentPanel;
