import { useCallback } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { reportEvent } from '../api/event';

export const useAnalytics = () => {
    const { token, user } = useAuthContext();

    const track = useCallback((eventType, videoId, extraCtx = {}, extraPayload = {}) => {
        if (!token || !user) return;

        const payload = {
            userId: user.userId,
            videoId: videoId,
            eventType: eventType,
            ts: new Date().toISOString(),
            tsMs: Date.now(),
            ...extraPayload,
            // Ensure context matches backend expectation (Map<String, Object>)
            ctx: {
                userAgent: navigator.userAgent,
                page: window.location.pathname,
                screen: `${window.screen.width}x${window.screen.height}`,
                ...extraCtx
            }
        };

        reportEvent(token, payload);
    }, [token, user]);

    return { track };
};
