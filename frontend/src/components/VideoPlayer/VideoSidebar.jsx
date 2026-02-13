import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, Plus } from 'lucide-react';

const VideoSidebar = ({ video, onLike, onComment, onShare }) => {
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(Math.floor(Math.random() * 1000)); // Placeholder

    const handleLike = () => {
        setLiked(!liked);
        setLikeCount(c => liked ? c - 1 : c + 1);
        if (onLike) onLike();
    };

    return (
        <div className="absolute right-2 bottom-20 flex flex-col items-center space-y-6 z-10">
            {/* Avatar */}
            <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-gray-600">
                    {/* Placeholder avatar */}
                    <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${video.authorId}`}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-red-500 rounded-full w-5 h-5 flex items-center justify-center text-xs text-white">
                    <Plus size={12} strokeWidth={4} />
                </div>
            </div>

            {/* Like */}
            <div className="flex flex-col items-center cursor-pointer" onClick={handleLike}>
                <div className={`p-2 rounded-full transition-transform active:scale-75 ${liked ? 'text-red-500' : 'text-white'}`}>
                    <Heart size={35} fill={liked ? "currentColor" : "none"} strokeWidth={1.5} />
                </div>
                <span className="text-white text-xs font-semibold drop-shadow-md">{likeCount}</span>
            </div>

            {/* Comment */}
            <div className="flex flex-col items-center cursor-pointer" onClick={onComment}>
                <div className="p-2 rounded-full text-white transition-transform active:scale-75">
                    <MessageCircle size={35} strokeWidth={1.5} />
                </div>
                <span className="text-white text-xs font-semibold drop-shadow-md">{Math.floor(Math.random() * 100)}</span>
            </div>

            {/* Share */}
            <div className="flex flex-col items-center cursor-pointer" onClick={onShare}>
                <div className="p-2 rounded-full text-white transition-transform active:scale-75">
                    <Share2 size={35} strokeWidth={1.5} />
                </div>
                <span className="text-white text-xs font-semibold drop-shadow-md">分享</span>
            </div>
        </div>
    );
};

export default VideoSidebar;
