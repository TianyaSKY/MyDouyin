import React, { useEffect, useState } from 'react';
import { getUser } from '../../api/user';
import { useAuthContext } from '../../contexts/AuthContext';
import { Music } from 'lucide-react';

const VideoOverlay = ({ video }) => {
    const { token } = useAuthContext();
    const [author, setAuthor] = useState(null);

    useEffect(() => {
        const fetchAuthor = async () => {
            if (video.authorId) {
                try {
                    // simple in-memory cache could be added here later
                    const userData = await getUser(token, video.authorId);
                    setAuthor(userData);
                } catch (error) {
                    console.error('Failed to fetch author:', error);
                }
            }
        };

        fetchAuthor();
    }, [video.authorId, token]);

    return (
        <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none pb-20">
            <div className="pointer-events-auto">
                <h3 className="font-bold text-white text-lg mb-2 drop-shadow-md">@{author?.nickname || author?.username || '用户'}</h3>
                <p className="text-white text-sm mb-3 line-clamp-2 drop-shadow-md">{video.title}</p>
                <div className="flex items-center text-white text-xs opacity-90 slide-in-bottom">
                    <Music size={14} className="mr-2 animate-spin-slow" />
                    <span className="scrolling-text">原声 - {author?.nickname || '用户'}</span>
                </div>
            </div>
        </div>
    );
};

export default VideoOverlay;
