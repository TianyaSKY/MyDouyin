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
        <div className="absolute bottom-0 left-0 w-full pl-8 pr-8 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none pb-[82px] z-10 transition-all duration-300">
            <div className="pointer-events-auto max-w-[80%]">
                <h3 className="font-bold text-white text-xl md:text-2xl mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                    @{author?.nickname || author?.username || '用户'}
                </h3>
                <p className="text-white text-sm md:text-base mb-4 line-clamp-2 drop-shadow-md leading-relaxed font-normal opacity-95">
                    {video.title}
                </p>
                <div className="flex items-center text-white text-xs md:text-sm opacity-90 slide-in-bottom">
                    <Music size={16} className="mr-2.5 flex-shrink-0 animate-spin-slow" />
                    <div className="overflow-hidden whitespace-nowrap mask-music-fade" style={{ width: '100%' }}>
                        <span className="scrolling-text inline-block tracking-wide">
                            原声 - {author?.nickname || '用户'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoOverlay;
