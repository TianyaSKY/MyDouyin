import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, Dimensions, StyleSheet, Image,
  TouchableWithoutFeedback, TouchableOpacity,
  ActivityIndicator, Animated, Share, Platform, AppState,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from '@react-navigation/native';
import { useAuthContext } from '../contexts/AuthContext';
import {
  getVideoById, likeVideo, unlikeVideo,
  getVideoLikeStatus, getShareCount, shareVideo
} from '../api/video';
import { getCommentCount } from '../api/comment';
import { getUser, followUser, unfollowUser, getFollowStatus } from '../api/user';
import { getMediaUrl, getCoverUrl, formatCount } from '../utils/media';
import { colors, fontSize, borderRadius } from '../constants/theme';

const { width, height } = Dimensions.get('window');
const ITEM_HEIGHT = height;
const DOUBLE_TAP_DELAY = 300;

/* ─── Floating Heart Animation for Double-tap ─── */
const FloatingHeart = ({ x, y, onDone }) => {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, tension: 200, friction: 6, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(400),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -120, duration: 400, useNativeDriver: true }),
        ]),
      ]),
    ]).start(() => onDone?.());
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x - 40,
        top: y - 40,
        zIndex: 100,
        opacity,
        transform: [{ scale }, { translateY }],
      }}
    >
      <Ionicons name="heart" size={80} color={colors.primary} />
    </Animated.View>
  );
};

/* ─── Main Single Video Screen ─── */
export default function SingleVideoScreen({ route, navigation }) {
  const { videoId } = route.params || {};
  const { token, user } = useAuthContext();
  const isFocused = useIsFocused();

  const [video, setVideo] = useState(null);
  const [author, setAuthor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Interaction States
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [shareCount, setShareCount] = useState(0);
  const [following, setFollowing] = useState(false);
  const [hearts, setHearts] = useState([]);

  // Refs for animations & click debounce
  const lastTapRef = useRef(0);
  const tapTimeoutRef = useRef(null);
  const pauseOpacity = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(1)).current;

  // expo-video Player
  const player = useVideoPlayer(null, (p) => {
    p.loop = true;
    p.muted = false;
  });
  const mountedRef = useRef(true);
  const isFocusedRef = useRef(isFocused);
  const videoRef = useRef(null);

  const safeSetMuted = useCallback((muted) => {
    if (!mountedRef.current) return;
    try { player.muted = muted; } catch {}
  }, [player]);

  const safePause = useCallback(() => {
    if (!mountedRef.current) return;
    try { player.pause()?.catch?.(() => {}); } catch {}
  }, [player]);

  const safePlay = useCallback(() => {
    if (!mountedRef.current) return;
    try { player.play()?.catch?.(() => {}); } catch {}
  }, [player]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  useEffect(() => {
    videoRef.current = video;
  }, [video]);

  // 1. Fetch Video and Associated Metadata
  const fetchVideoDetails = async () => {
    if (!videoId || !token) return;
    setLoading(true);
    setError(null);
    try {
      const vData = await getVideoById(token, videoId);
      setVideo(vData);
      setLikeCount(vData.likeCount || 0);

      // Fetch Author Info
      if (vData.authorId) {
        getUser(token, vData.authorId)
          .then(setAuthor)
          .catch(err => console.log('Fetch author failed:', err));
        
        // Fetch Follow Status
        if (user && user.userId !== vData.authorId) {
          getFollowStatus(token, vData.authorId)
            .then(d => setFollowing(!!d.following))
            .catch(() => {});
        }
      }

      // Fetch Like Status
      getVideoLikeStatus(token, vData.id)
        .then(d => {
          setLiked(d.liked);
          setLikeCount(d.likeCount);
        })
        .catch(() => {});

      // Fetch Comment Count
      getCommentCount(token, vData.id)
        .then(c => setCommentCount(c || 0))
        .catch(() => {});

      // Fetch Share Count
      getShareCount(token, vData.id)
        .then(d => setShareCount(d?.shareCount || 0))
        .catch(() => {});

    } catch (err) {
      console.error('Fetch single video details error:', err);
      setError(err.message || '获取视频详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideoDetails();
  }, [videoId, token]);

  // 2. Control video source swapping
  useEffect(() => {
    if (video?.videoUrl) {
      let cancelled = false;
      const sourceUrl = getMediaUrl(video.videoUrl);
      (async () => {
        try {
          await player.replaceAsync(sourceUrl);
          if (cancelled) return;
          if (isFocusedRef.current && AppState.currentState === 'active') {
            safeSetMuted(false);
            safePlay();
          } else {
            safePause();
            safeSetMuted(true);
          }
        } catch (err) {
          console.warn('Replace single video source error:', err);
        }
      })();

      return () => {
        cancelled = true;
      };
    }
  }, [video, player]);

  // 3. Play/Pause video when screen focus or AppState changes.
  //    Also mute on blur as a safety net in case pause() is delayed by the native player.
  useEffect(() => {
    if (!player) return;

    if (isFocused) {
      safeSetMuted(false);
      if (video) safePlay();
    } else {
      safePause();
      safeSetMuted(true);
    }

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState !== 'active') {
        safePause();
        safeSetMuted(true);
      } else if (isFocusedRef.current && videoRef.current) {
        safeSetMuted(false);
        safePlay();
      }
    });

    return () => subscription.remove();
  }, [isFocused, player, video, safePause, safePlay, safeSetMuted]);

  // 4. Clean up hearts array after animation ends
  const removeHeart = useCallback((id) => {
    setHearts(prev => prev.filter(h => h.id !== id));
  }, []);

  // 5. Play/Pause toggle
  const handleTogglePlay = useCallback(() => {
    if (!player) return;
    if (player.playing) {
      safePause();
    } else {
      safeSetMuted(false);
      safePlay();
    }
  }, [player, safePause, safePlay, safeSetMuted]);

  const showPauseIcon = useCallback(() => {
    Animated.sequence([
      Animated.timing(pauseOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.delay(500),
      Animated.timing(pauseOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [pauseOpacity]);

  // 6. Like action (supports sidebar button click or double-tap)
  const performLike = useCallback(async (forceLike = false) => {
    if (!video || !token) return;
    const newLiked = forceLike ? true : !liked;
    if (forceLike && liked) return; // double-tap when already liked does nothing

    setLiked(newLiked);
    setLikeCount(p => newLiked ? p + 1 : p - 1);

    // Heart scale animation
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.4, tension: 200, friction: 5, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, tension: 200, friction: 5, useNativeDriver: true }),
    ]).start();

    try {
      if (newLiked) {
        await likeVideo(token, video.id);
      } else {
        await unlikeVideo(token, video.id);
      }
    } catch (err) {
      // Revert states on API error
      setLiked(!newLiked);
      setLikeCount(p => newLiked ? p - 1 : p + 1);
    }
  }, [liked, token, video]);

  // 7. Follow Toggle
  const handleFollow = useCallback(async () => {
    if (!video?.authorId || !user || user.userId === video.authorId || !token) return;
    const next = !following;
    setFollowing(next);
    try {
      if (next) {
        await followUser(token, video.authorId);
      } else {
        await unfollowUser(token, video.authorId);
      }
    } catch {
      setFollowing(!next);
    }
  }, [following, token, video, user]);

  // 8. Share action
  const handleShare = useCallback(async () => {
    if (!video || !token) return;
    try {
      const shareUrl = getMediaUrl(video.videoUrl);
      await Share.share({
        message: `快来看看这个抖音视频：${video.title || '精彩视频'}\n${shareUrl}`,
        title: video.title || 'Douyin 分享',
      });
      shareVideo(token, video.id, Platform.OS).catch(() => {});
      setShareCount(p => p + 1);
    } catch (err) {
      console.log('Share action error/cancel:', err);
    }
  }, [token, video]);

  // 9. Navigate to user profile
  const handleNavigateProfile = useCallback((authorId) => {
    if (!authorId) return;
    safePause(); // pause video when leaving
    safeSetMuted(true);
    if (user?.userId === authorId) {
      navigation.navigate('MainTabs', { screen: 'Profile' });
    } else {
      navigation.navigate('UserProfile', { userId: authorId });
    }
  }, [navigation, user?.userId, safePause, safeSetMuted]);

  // 10. Open Comments modal
  const handleOpenComments = useCallback((id) => {
    safePause(); // pause video when opening comment overlay
    safeSetMuted(true);
    navigation.navigate('Comments', { videoId: id });
  }, [navigation, safePause, safeSetMuted]);

  // Gesture router (Single-tap vs Double-tap)
  const handleTap = useCallback((evt) => {
    const now = Date.now();
    const { locationX, locationY } = evt.nativeEvent;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // ── Double tap: spawn heart and like ──
      clearTimeout(tapTimeoutRef.current);
      lastTapRef.current = 0;

      const id = now;
      setHearts(prev => [...prev, { id, x: locationX, y: locationY }]);
      performLike(true);
    } else {
      // ── Single tap ──
      lastTapRef.current = now;
      tapTimeoutRef.current = setTimeout(() => {
        handleTogglePlay();
        showPauseIcon();
        lastTapRef.current = 0;
      }, DOUBLE_TAP_DELAY);
    }
  }, [performLike, handleTogglePlay, showPauseIcon]);

  // Loading View
  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={s.loadingText}>加载中...</Text>
      </View>
    );
  }

  // Error View
  if (error || !video) {
    return (
      <View style={s.loadingContainer}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Ionicons name="alert-circle-outline" size={60} color={colors.textMuted} />
        <Text style={s.loadingText}>{error || '视频不存在或已被删除'}</Text>
        <TouchableOpacity onPress={fetchVideoDetails} style={s.retryBtn}>
          <Text style={s.retryText}>重试</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const tags = video.tags || [];

  return (
    <View style={s.container}>
      {/* 1. Video Player */}
      <View style={s.videoLayer} pointerEvents="none">
        <VideoView
          player={player}
          style={s.video}
          contentFit="contain"
          nativeControls={false}
        />
      </View>

      {/* 2. Floating Header: Back Button */}
      <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>

      {/* 3. Gesture layer (single tap toggle play, double tap like) */}
      <TouchableWithoutFeedback onPress={handleTap}>
        <View style={s.tapLayer} />
      </TouchableWithoutFeedback>

      {/* 4. Pause Indicator */}
      <Animated.View style={[s.pauseIndicator, { opacity: pauseOpacity }]} pointerEvents="none">
        <View style={s.pauseCircle}>
          <Ionicons name="pause" size={40} color="white" />
        </View>
      </Animated.View>

      {/* 5. Double tap floating hearts */}
      {hearts.map(h => (
        <FloatingHeart key={h.id} x={h.x} y={h.y} onDone={() => removeHeart(h.id)} />
      ))}

      {/* 6. Video Info Overlay (Bottom Left) */}
      <View style={s.overlayContainer} pointerEvents="none">
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={s.gradient} />
        <View style={s.overlayContent}>
          <Text style={s.author}>@{author?.nickname || author?.username || '用户'}</Text>
          <Text style={s.title} numberOfLines={2}>{video.title}</Text>
          {tags.length > 0 && (
            <View style={s.tags}>
              {tags.map((t, i) => <Text key={i} style={s.tag}>#{t}</Text>)}
            </View>
          )}
          <View style={s.music}>
            <Ionicons name="musical-note" size={14} color="white" />
            <Text style={s.musicTxt} numberOfLines={1}>原声 - {author?.nickname || '用户'}</Text>
          </View>
        </View>
      </View>

      {/* 7. Sidebar Buttons (Bottom Right) */}
      <View style={s.sidebarContainer}>
        {/* Profile Avatar & Follow Badge */}
        <TouchableOpacity
          style={s.avatarWrap}
          onPress={() => handleNavigateProfile(video.authorId)}
          activeOpacity={0.8}
        >
          <View style={s.avatar}>
            <Ionicons name="person" size={24} color={colors.textSecondary} />
          </View>
          {user?.userId !== video.authorId && !following && (
            <TouchableOpacity style={s.followBadge} onPress={handleFollow}>
              <Ionicons name="add" size={14} color="white" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Heart / Like Button */}
        <TouchableOpacity style={s.sidebarBtn} onPress={() => performLike(false)} activeOpacity={0.7}>
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={32} color={liked ? colors.primary : 'white'} />
          </Animated.View>
          <Text style={s.sidebarCount}>{formatCount(likeCount)}</Text>
        </TouchableOpacity>

        {/* Comment Button */}
        <TouchableOpacity style={s.sidebarBtn} onPress={() => handleOpenComments(video.id)} activeOpacity={0.7}>
          <Ionicons name="chatbubble-ellipses-outline" size={30} color="white" />
          <Text style={s.sidebarCount}>{formatCount(commentCount)}</Text>
        </TouchableOpacity>

        {/* Share Button */}
        <TouchableOpacity style={s.sidebarBtn} onPress={handleShare} activeOpacity={0.7}>
          <Ionicons name="share-social-outline" size={30} color="white" />
          <Text style={s.sidebarCount}>{shareCount > 0 ? formatCount(shareCount) : '分享'}</Text>
        </TouchableOpacity>

        {/* Musical Disc Spinner representation */}
        <View style={s.disc}>
          <View style={s.discOuter}>
            <View style={s.discInner}>
              <Ionicons name="musical-notes" size={16} color={colors.textSecondary} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black', overflow: 'hidden' },
  loadingContainer: { flex: 1, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: 12 },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: borderRadius.xxl },
  retryText: { fontSize: fontSize.md, color: 'white', fontWeight: '600' },
  videoLayer: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  video: { ...StyleSheet.absoluteFillObject },
  backBtn: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 100,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapLayer: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  pauseIndicator: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  pauseCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  
  // Info Overlay
  overlayContainer: { position: 'absolute', bottom: 0, left: 0, right: 80, zIndex: 5 },
  gradient: { ...StyleSheet.absoluteFillObject },
  overlayContent: { padding: 16, paddingBottom: 40 },
  author: { fontSize: fontSize.lg, fontWeight: '700', color: 'white', marginBottom: 6, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  title: { fontSize: fontSize.md, color: 'rgba(255,255,255,0.9)', marginBottom: 8, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  tag: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.8)', marginRight: 8, fontWeight: '500' },
  music: { flexDirection: 'row', alignItems: 'center' },
  musicTxt: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.8)', marginLeft: 6, flex: 1 },

  // Sidebar
  sidebarContainer: { position: 'absolute', right: 8, bottom: 60, alignItems: 'center', zIndex: 50 },
  avatarWrap: { marginBottom: 20, alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceLight, borderWidth: 2, borderColor: 'white', alignItems: 'center', justifyContent: 'center' },
  followBadge: { position: 'absolute', bottom: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sidebarBtn: { alignItems: 'center', marginBottom: 16, padding: 4 },
  sidebarCount: { fontSize: fontSize.xs, color: 'white', marginTop: 2, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  disc: { marginTop: 4 },
  discOuter: { width: 44, height: 44, borderRadius: 22, borderWidth: 8, borderColor: colors.surfaceLight, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  discInner: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
});
