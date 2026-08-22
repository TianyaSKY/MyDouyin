import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, Dimensions, StyleSheet, Image,
  TouchableWithoutFeedback, TouchableOpacity,
  ActivityIndicator, Animated, Share, Platform, AppState,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthContext } from '../contexts/AuthContext';
import { useIsFocused } from '@react-navigation/native';
import { getFeed } from '../api/video';
import { likeVideo, unlikeVideo, getVideoLikeStatus, getShareCount, shareVideo } from '../api/video';
import { getCommentCount } from '../api/comment';
import { followUser, getFollowStatus, unfollowUser } from '../api/user';
import { getUser } from '../api/user';
import { getMediaUrl, getCoverUrl, formatCount } from '../utils/media';
import { colors, fontSize, borderRadius } from '../constants/theme';

const { width, height } = Dimensions.get('window');
const ITEM_HEIGHT = height;

/* ─── Video Sidebar ─── */
const VideoSidebar = React.memo(({ video, token, user, isActive, onOpenComments, onNavigateProfile, triggerLikeRef }) => {
  const [liked, setLiked] = useState(video.isLiked || false);
  const [likeCount, setLikeCount] = useState(video.likeCount || 0);
  const [commentCount, setCommentCount] = useState(0);
  const [shareCount, setShareCount] = useState(0);
  const [following, setFollowing] = useState(false);
  const heartScale = useRef(new Animated.Value(1)).current;

  useEffect(() => { setLikeCount(video.likeCount || 0); setLiked(video.isLiked || false); }, [video]);

  useEffect(() => {
    if (!isActive || !video?.id) return;
    getVideoLikeStatus(token, video.id).then(d => { setLiked(d.liked); setLikeCount(d.likeCount); }).catch(() => {});
    getCommentCount(token, video.id).then(c => setCommentCount(c || 0)).catch(() => {});
    getShareCount(token, video.id).then(d => setShareCount(d?.shareCount || 0)).catch(() => {});
  }, [isActive, video?.id, token]);

  useEffect(() => {
    if (isActive && video?.authorId && user?.userId !== video.authorId) {
      getFollowStatus(token, video.authorId).then(d => setFollowing(!!d.following)).catch(() => {});
    }
  }, [isActive, video?.authorId, token, user?.userId]);

  // Like action — can be called from sidebar button or double-tap
  const performLike = useCallback(async (forcelike = false) => {
    const newLiked = forcelike ? true : !liked;
    if (forcelike && liked) return; // already liked, double-tap does nothing
    setLiked(newLiked);
    setLikeCount(p => newLiked ? p + 1 : p - 1);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.4, tension: 200, friction: 5, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, tension: 200, friction: 5, useNativeDriver: true }),
    ]).start();
    try { newLiked ? await likeVideo(token, video.id) : await unlikeVideo(token, video.id); }
    catch { setLiked(!newLiked); setLikeCount(p => newLiked ? p - 1 : p + 1); }
  }, [liked, token, video.id]);

  // Expose performLike to parent (FeedItem) for double-tap
  useEffect(() => {
    if (triggerLikeRef) triggerLikeRef.current = performLike;
  }, [performLike, triggerLikeRef]);

  const handleFollow = useCallback(async () => {
    if (!video?.authorId || user?.userId === video.authorId) return;
    const next = !following; setFollowing(next);
    try { const d = next ? await followUser(token, video.authorId) : await unfollowUser(token, video.authorId); setFollowing(!!d.following); }
    catch { setFollowing(!next); }
  }, [following, token, video.authorId, user?.userId]);

  const handleShare = useCallback(async () => {
    try {
      const videoUrl = getMediaUrl(video.videoUrl);
      await Share.share({
        message: `来看看这个视频：${video.title || '精彩视频'}\n${videoUrl}`,
        title: video.title || 'Douyin 分享',
      });
      shareVideo(token, video.id, Platform.OS).catch(() => {});
      setShareCount(p => p + 1);
    } catch (err) {
      console.log('Share cancelled:', err);
    }
  }, [token, video.id, video.title, video.videoUrl]);

  return (
    <View style={sb.container}>
      <TouchableOpacity style={sb.avatarWrap} onPress={() => onNavigateProfile(video.authorId)} activeOpacity={0.8}>
        <View style={sb.avatar}><Ionicons name="person" size={24} color={colors.textSecondary} /></View>
        {user?.userId !== video.authorId && !following && (
          <TouchableOpacity style={sb.followBadge} onPress={handleFollow}><Ionicons name="add" size={14} color="white" /></TouchableOpacity>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={sb.btn} onPress={() => performLike(false)} activeOpacity={0.7}>
        <Animated.View style={{ transform: [{ scale: heartScale }] }}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={32} color={liked ? colors.primary : 'white'} />
        </Animated.View>
        <Text style={sb.count}>{formatCount(likeCount)}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={sb.btn} onPress={() => onOpenComments(video.id)} activeOpacity={0.7}>
        <Ionicons name="chatbubble-ellipses-outline" size={30} color="white" />
        <Text style={sb.count}>{formatCount(commentCount)}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={sb.btn} onPress={handleShare} activeOpacity={0.7}>
        <Ionicons name="share-social-outline" size={30} color="white" />
        <Text style={sb.count}>{shareCount > 0 ? formatCount(shareCount) : '分享'}</Text>
      </TouchableOpacity>
      <View style={sb.disc}><View style={sb.discOuter}><View style={sb.discInner}><Ionicons name="musical-notes" size={16} color={colors.textSecondary} /></View></View></View>
    </View>
  );
});

const sb = StyleSheet.create({
  container: { position: 'absolute', right: 8, bottom: 120, alignItems: 'center', zIndex: 50, elevation: 50 },
  avatarWrap: { marginBottom: 20, alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceLight, borderWidth: 2, borderColor: 'white', alignItems: 'center', justifyContent: 'center' },
  followBadge: { position: 'absolute', bottom: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  btn: { alignItems: 'center', marginBottom: 16, padding: 4 },
  count: { fontSize: fontSize.xs, color: 'white', marginTop: 2, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  disc: { marginTop: 4 },
  discOuter: { width: 44, height: 44, borderRadius: 22, borderWidth: 8, borderColor: colors.surfaceLight, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  discInner: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
});

/* ─── Video Overlay ─── */
const VideoOverlay = React.memo(({ video, token }) => {
  const [author, setAuthor] = useState(null);
  const tags = video.tags || [];

  useEffect(() => {
    if (video.authorId) getUser(token, video.authorId).then(setAuthor).catch(() => {});
  }, [video.authorId, token]);

  return (
    <View style={ov.container} pointerEvents="none">
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={ov.gradient} />
      <View style={ov.content}>
        <Text style={ov.author}>@{author?.nickname || author?.username || '用户'}</Text>
        <Text style={ov.title} numberOfLines={2}>{video.title}</Text>
        {tags.length > 0 && <View style={ov.tags}>{tags.map((t, i) => <Text key={i} style={ov.tag}>#{t}</Text>)}</View>}
        <View style={ov.music}>
          <Ionicons name="musical-note" size={14} color="white" />
          <Text style={ov.musicTxt} numberOfLines={1}>原声 - {author?.nickname || '用户'}</Text>
        </View>
      </View>
    </View>
  );
});

const ov = StyleSheet.create({
  container: { position: 'absolute', bottom: 0, left: 0, right: 80, zIndex: 5 },
  gradient: { ...StyleSheet.absoluteFillObject },
  content: { padding: 16, paddingBottom: 90 },
  author: { fontSize: fontSize.lg, fontWeight: '700', color: 'white', marginBottom: 6, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  title: { fontSize: fontSize.md, color: 'rgba(255,255,255,0.9)', marginBottom: 8, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  tag: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.8)', marginRight: 8, fontWeight: '500' },
  music: { flexDirection: 'row', alignItems: 'center' },
  musicTxt: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.8)', marginLeft: 6, flex: 1 },
});

/* ─── Poster: lightweight cover image for non-active items ─── */
const PosterItem = React.memo(({ video }) => {
  const posterUri = getCoverUrl(video.coverUrl);
  const [imgError, setImgError] = useState(false);
  return (
    <View style={vi.posterWrap}>
      {posterUri && !imgError ? (
        <Image
          source={{ uri: posterUri }}
          style={vi.poster}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <View style={vi.posterPlaceholder}>
          <Ionicons name="play-circle-outline" size={60} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8 }}>封面加载中...</Text>
        </View>
      )}
    </View>
  );
});

/* ─── Floating Heart (double-tap animation) ─── */
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

/* ─── Feed Item ─── */
const DOUBLE_TAP_DELAY = 300;

const FeedItem = React.memo(({ video, isActive, token, user, player,
  onOpenComments, onNavigateProfile, onTogglePlay }) => {
  const pauseOpacity = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef(0);
  const tapTimeoutRef = useRef(null);
  const triggerLikeRef = useRef(null);
  const [hearts, setHearts] = useState([]);

  const showPauseIcon = useCallback(() => {
    Animated.sequence([
      Animated.timing(pauseOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.delay(500),
      Animated.timing(pauseOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [pauseOpacity]);

  const handleTap = useCallback((evt) => {
    if (!isActive) return;
    const now = Date.now();
    const { locationX, locationY } = evt.nativeEvent;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // ── Double tap: LIKE ──
      clearTimeout(tapTimeoutRef.current);
      lastTapRef.current = 0;

      // Spawn heart at tap position
      const id = now;
      setHearts(prev => [...prev, { id, x: locationX, y: locationY }]);

      // Trigger like via sidebar ref (force like = true)
      triggerLikeRef.current?.(true);
    } else {
      // ── First tap: wait to see if second tap comes ──
      lastTapRef.current = now;
      tapTimeoutRef.current = setTimeout(() => {
        // Single tap confirmed → toggle play/pause
        onTogglePlay();
        showPauseIcon();
        lastTapRef.current = 0;
      }, DOUBLE_TAP_DELAY);
    }
  }, [isActive, onTogglePlay, showPauseIcon]);

  const removeHeart = useCallback((id) => {
    setHearts(prev => prev.filter(h => h.id !== id));
  }, []);

  return (
    <View style={vi.container}>
      {/* Layer 0: Video or poster */}
      {isActive && player ? (
        <View style={vi.videoLayer} pointerEvents="none">
          <VideoView
            player={player}
            style={vi.video}
            contentFit="contain"
            nativeControls={false}
          />
        </View>
      ) : (
        <PosterItem video={video} />
      )}

      {/* Layer 1: Tap area (single = pause, double = like) */}
      <TouchableWithoutFeedback onPress={handleTap}>
        <View style={vi.tapLayer} />
      </TouchableWithoutFeedback>

      {/* Layer 2: Pause indicator */}
      <Animated.View style={[vi.pauseIndicator, { opacity: pauseOpacity }]} pointerEvents="none">
        <View style={vi.pauseCircle}>
          <Ionicons name="pause" size={40} color="white" />
        </View>
      </Animated.View>

      {/* Double-tap hearts */}
      {hearts.map(h => (
        <FloatingHeart key={h.id} x={h.x} y={h.y} onDone={() => removeHeart(h.id)} />
      ))}

      {/* Layer 3: Author/title overlay */}
      <VideoOverlay video={video} token={token} />

      {/* Layer 4: Sidebar buttons */}
      <VideoSidebar video={video} token={token} user={user} isActive={isActive}
        onOpenComments={onOpenComments} onNavigateProfile={onNavigateProfile}
        triggerLikeRef={triggerLikeRef} />
    </View>
  );
});

const vi = StyleSheet.create({
  container: { width, height: ITEM_HEIGHT, backgroundColor: 'black', overflow: 'hidden' },
  videoLayer: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  video: { ...StyleSheet.absoluteFillObject },
  posterWrap: { position: 'absolute', top: 0, left: 0, width, height: ITEM_HEIGHT, zIndex: 0 },
  poster: { width: '100%', height: '100%' },
  posterPlaceholder: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' },
  tapLayer: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  pauseIndicator: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  pauseCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
});

/* ══════════════════════════════════════════════
   FeedScreen — SINGLE PLAYER architecture.
   One useVideoPlayer for the entire feed.
   Source is swapped via replaceAsync on swipe.
   ══════════════════════════════════════════════ */
const FeedScreen = ({ navigation }) => {
  const { token, user } = useAuthContext();
  const isFocused = useIsFocused();
  const [videos, setVideos] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);

  // The ONE player for the entire feed
  const player = useVideoPlayer(null, (p) => {
    p.loop = true;
    p.muted = false;
  });

  // Track the currently loaded video URL to avoid redundant replaces
  const currentSourceRef = useRef(null);
  const mountedRef = useRef(true);
  const isFocusedRef = useRef(isFocused);
  const hasVideosRef = useRef(false);

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
    hasVideosRef.current = videos.length > 0;
  }, [videos.length]);

  // When active video changes, swap the source
  useEffect(() => {
    const activeVideo = videos[activeIndex];
    if (!activeVideo) return;

    const newSource = getMediaUrl(activeVideo.videoUrl);
    if (!newSource) return;

    if (newSource === currentSourceRef.current) {
      if (isFocusedRef.current && AppState.currentState === 'active') {
        safeSetMuted(false);
        safePlay();
      } else {
        safePause();
        safeSetMuted(true);
      }
      return;
    }

    currentSourceRef.current = newSource;

    // Replace source and only play while this screen is focused.
    let cancelled = false;
    (async () => {
      try {
        await player.replaceAsync(newSource);
        if (cancelled) return;
        if (isFocusedRef.current && AppState.currentState === 'active') {
          safeSetMuted(false);
          safePlay();
        } else {
          safePause();
          safeSetMuted(true);
        }
      } catch (err) {
        console.warn('Video replace failed:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeIndex, videos, player, safePause, safePlay, safeSetMuted]);

  // Load feed data
  const loadVideos = useCallback(async () => {
    if (loading || !hasMore || !user) return;
    setLoading(true);
    try {
      const data = await getFeed(token, user.userId, 10);
      if (data.videos?.length > 0) {
        setVideos(prev => {
          const ids = new Set(prev.map(v => v.id));
          const fresh = data.videos.filter(v => !ids.has(v.id));
          if (fresh.length === 0) { setHasMore(false); return prev; }
          return [...prev, ...fresh];
        });
        setHasMore(Boolean(data.hasMore));
      } else { setHasMore(false); }
    } catch (e) { console.error('Feed load error:', e); }
    finally { setLoading(false); setInitialLoading(false); }
  }, [token, user?.userId, loading, hasMore]);

  useEffect(() => { if (user && videos.length === 0) loadVideos(); }, [user]);

  // Pause/Play feed video player when screen focus or AppState changes.
  // Also mute on blur (in case pause alone doesn't release audio) and
  // restore mute state on focus.
  useEffect(() => {
    if (!player) return;

    if (isFocused) {
      safeSetMuted(false);
      if (videos.length > 0) safePlay();
    } else {
      safePause();
      // Mute as a safety net: even if pause doesn't stop native audio,
      // the volume will be silenced until the screen is focused again.
      safeSetMuted(true);
    }

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState !== 'active') {
        safePause();
        safeSetMuted(true);
      } else if (isFocusedRef.current && hasVideosRef.current) {
        safeSetMuted(false);
        safePlay();
      }
    });

    return () => subscription.remove();
  }, [isFocused, player, videos.length, safePause, safePlay, safeSetMuted]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const idx = viewableItems[0].index;
      if (idx != null) setActiveIndex(idx);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const handleOpenComments = useCallback((videoId) => {
    navigation.navigate('Comments', { videoId });
  }, [navigation]);

  const handleNavigateProfile = useCallback((authorId) => {
    if (user?.userId === authorId) navigation.navigate('MainTabs', { screen: 'Profile' });
    else navigation.navigate('UserProfile', { userId: authorId });
  }, [navigation, user?.userId]);

  const handleTogglePlay = useCallback(() => {
    if (player.playing) safePause();
    else {
      safeSetMuted(false);
      safePlay();
    }
  }, [player, safePause, safePlay, safeSetMuted]);

  const renderItem = useCallback(({ item, index }) => (
    <FeedItem
      video={item}
      isActive={index === activeIndex}
      token={token}
      user={user}
      player={index === activeIndex ? player : null}
      onOpenComments={handleOpenComments}
      onNavigateProfile={handleNavigateProfile}
      onTogglePlay={handleTogglePlay}
    />
  ), [activeIndex, token, user, player, handleOpenComments, handleNavigateProfile, handleTogglePlay]);

  const keyExtractor = useCallback((item) => String(item.id), []);

  const getItemLayout = useCallback((_, index) => ({
    length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index,
  }), []);

  if (initialLoading) {
    return (
      <View style={fs.loadingContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={fs.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={fs.container}>
      <View style={fs.header}><Text style={fs.headerTitle}>推荐</Text></View>
      <FlatList
        data={videos}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        pagingEnabled
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getItemLayout}
        onEndReached={loadVideos}
        onEndReachedThreshold={0.5}
        windowSize={3}
        maxToRenderPerBatch={2}
        initialNumToRender={1}
        removeClippedSubviews={false}
        ListFooterComponent={loading && videos.length > 0 ? <View style={fs.footer}><ActivityIndicator color={colors.primary} size="small" /></View> : null}
        ListEmptyComponent={!loading ? (
          <View style={fs.emptyContainer}>
            <Ionicons name="videocam-outline" size={60} color={colors.textMuted} />
            <Text style={fs.emptyText}>暂无推荐视频</Text>
            <TouchableOpacity onPress={() => { setHasMore(true); loadVideos(); }} style={fs.retryBtn}>
              <Text style={fs.retryText}>刷新试试</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      />
    </View>
  );
};

const fs = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30, paddingTop: 50, paddingBottom: 10, alignItems: 'center' },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: 'white', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  loadingContainer: { flex: 1, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: 12 },
  footer: { height: 60, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: fontSize.md, color: colors.textMuted, marginTop: 12 },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: borderRadius.xxl },
  retryText: { fontSize: fontSize.md, color: 'white', fontWeight: '600' },
});

export default FeedScreen;
