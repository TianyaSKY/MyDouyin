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

    // Parse tags from video
    const tags = video.tags || [];

    return (
        <div className="dy-overlay">
            <div className="dy-overlay-content">
                {/* Author Name */}
                <h3 className="dy-overlay-author">
                    @{author?.nickname || author?.username || '用户'}
                </h3>

                {/* Video Description */}
                <p className="dy-overlay-desc">
                    {video.title}
                </p>

                {/* Tags */}
                {tags.length > 0 && (
                    <div className="dy-overlay-tags">
                        {tags.map((tag, idx) => (
                            <span key={idx} className="dy-overlay-tag">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Music Ticker */}
                <div className="dy-overlay-music">
                    <Music size={14} className="dy-overlay-music-icon" />
                    <div className="dy-overlay-music-scroll">
                        <span className="scrolling-text">
                            原声 - {author?.nickname || '用户'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoOverlay;
