import { useCallback } from 'react';
import { Dimensions, Platform } from 'react-native';
import { useAuthContext } from '../contexts/AuthContext';
import { reportEvent } from '../api/event';

export const useAnalytics = () => {
  const { token, user } = useAuthContext();
  const { width, height } = Dimensions.get('window');

  const track = useCallback(
    (eventType, videoId, extraCtx = {}, extraPayload = {}) => {
      if (!token || !user) return;

      const payload = {
        userId: user.userId,
        videoId: videoId,
        eventType: eventType,
        ts: new Date().toISOString(),
        tsMs: Date.now(),
        ...extraPayload,
        ctx: {
          userAgent: `ReactNative/${Platform.OS}`,
          page: 'mobile_feed',
          screen: `${width}x${height}`,
          ...extraCtx,
        },
      };

      reportEvent(token, payload);
    },
    [token, user, width, height]
  );

  return { track };
};
