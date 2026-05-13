import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Image,
  Dimensions, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthContext } from '../contexts/AuthContext';
import { getAuthorVideos, getLikedVideos } from '../api/video';
import { getUserStats, getUser, followUser, unfollowUser, getFollowStatus } from '../api/user';
import { getCoverUrl, formatCount } from '../utils/media';
import { colors, fontSize, spacing, borderRadius } from '../constants/theme';

const { width } = Dimensions.get('window');
const GRID_GAP = 1;
const GRID_COLS = 3;
const TILE_SIZE = (width - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;

const VideoGridItem = ({ video, onPress }) => {
  const [imgErr, setImgErr] = useState(false);
  const cover = getCoverUrl(video.coverUrl);
  return (
    <TouchableOpacity style={gs.tile} onPress={() => onPress?.(video)} activeOpacity={0.8}>
      {cover && !imgErr ? (
        <Image source={{ uri: cover }} style={gs.tileImg} onError={() => setImgErr(true)} />
      ) : (
        <View style={gs.tilePlaceholder}><Ionicons name="play" size={24} color={colors.textMuted} /></View>
      )}
      <View style={gs.tileStats}>
        <Ionicons name="play" size={10} color="white" />
        <Text style={gs.tileStat}>{video.viewCount || 0}</Text>
      </View>
    </TouchableOpacity>
  );
};

const gs = StyleSheet.create({
  tile: { width: TILE_SIZE, height: TILE_SIZE * 4 / 3, backgroundColor: colors.surface },
  tileImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  tilePlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceLight },
  tileStats: { position: 'absolute', bottom: 4, left: 4, flexDirection: 'row', alignItems: 'center' },
  tileStat: { fontSize: 10, color: 'white', marginLeft: 2, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
});

const ProfileScreen = ({ route, navigation }) => {
  const routeUserId = route?.params?.userId;
  const { user, token, handleLogout } = useAuthContext();
  const [profileUser, setProfileUser] = useState(null);
  const [videos, setVideos] = useState([]);
  const [likedVideos, setLikedVideos] = useState([]);
  const [stats, setStats] = useState({ totalLikes: 0, workCount: 0, followingCount: 0, followerCount: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('works');
  const [likedFetched, setLikedFetched] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followSaving, setFollowSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const isOwnProfile = !routeUserId || (user && String(routeUserId) === String(user.userId));
  const targetUserId = routeUserId || user?.userId;

  useEffect(() => {
    if (isOwnProfile) setProfileUser(user);
    else if (targetUserId && token) {
      getUser(token, targetUserId).then(setProfileUser).catch(() => setProfileUser(null));
    }
  }, [isOwnProfile, targetUserId, user, token]);

  useEffect(() => {
    setVideos([]); setLikedVideos([]); setPage(1); setHasMore(true); setLikedFetched(false);
    setStats({ totalLikes: 0, workCount: 0, followingCount: 0, followerCount: 0 });
  }, [targetUserId]);

  useEffect(() => {
    if (targetUserId && token) {
      fetchVideos(1);
      getUserStats(token, targetUserId).then(setStats).catch(() => {});
      setPage(1);
    }
  }, [targetUserId, token]);

  useEffect(() => {
    if (!isOwnProfile && targetUserId && token) {
      getFollowStatus(token, targetUserId).then(d => setFollowing(!!d.following)).catch(() => {});
    }
  }, [isOwnProfile, targetUserId, token]);

  useEffect(() => {
    if (activeTab === 'likes' && !likedFetched && targetUserId && token) {
      setLikedFetched(true);
      getLikedVideos(token, targetUserId, 1, 18).then(d => {
        setLikedVideos(d.records || []);
      }).catch(() => {});
    }
  }, [activeTab, likedFetched, targetUserId, token]);

  const fetchVideos = async (p) => {
    setLoading(true);
    try {
      const data = await getAuthorVideos(token, targetUserId, p, 18);
      if (data.records?.length > 0) {
        setVideos(prev => p === 1 ? data.records : [...prev, ...data.records]);
        setHasMore(data.records.length === 18);
      } else setHasMore(false);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleFollowToggle = async () => {
    if (!targetUserId || followSaving) return;
    const next = !following;
    setFollowSaving(true); setFollowing(next);
    try {
      const data = next ? await followUser(token, targetUserId) : await unfollowUser(token, targetUserId);
      setFollowing(!!data.following);
      if (data.followerCount != null) setStats(p => ({ ...p, followerCount: data.followerCount }));
    } catch { setFollowing(!next); }
    finally { setFollowSaving(false); }
  };

  const displayUser = profileUser || user;
  if (!user) return <View style={ps.loading}><ActivityIndicator color={colors.primary} /></View>;

  const gridData = activeTab === 'works' ? videos : likedVideos;

  const renderHeader = () => (
    <View>
      {/* Banner */}
      <View style={ps.banner}>
        <LinearGradient colors={[colors.surfaceLight, colors.background]} style={StyleSheet.absoluteFill} />
        {!isOwnProfile && (
          <TouchableOpacity style={ps.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        )}
        {isOwnProfile && (
          <TouchableOpacity style={ps.menuBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {/* Profile Info */}
      <View style={ps.info}>
        <View style={ps.avatarWrap}>
          <View style={ps.avatar}><Ionicons name="person" size={36} color={colors.textMuted} /></View>
        </View>
        <Text style={ps.displayName}>@{displayUser?.nickname || displayUser?.username}</Text>
        <Text style={ps.userId}>抖音号：{displayUser?.userId}</Text>

        <View style={ps.statsRow}>
          <View style={ps.statItem}><Text style={ps.statNum}>{stats.totalLikes}</Text><Text style={ps.statLabel}>获赞</Text></View>
          <View style={ps.statItem}><Text style={ps.statNum}>{stats.followingCount}</Text><Text style={ps.statLabel}>关注</Text></View>
          <View style={ps.statItem}><Text style={ps.statNum}>{stats.followerCount}</Text><Text style={ps.statLabel}>粉丝</Text></View>
        </View>

        {isOwnProfile ? (
          <View style={ps.btnRow}>
            <TouchableOpacity style={ps.editBtn}><Text style={ps.editBtnTxt}>编辑资料</Text></TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[ps.followBtn, following && ps.followBtnFollowing]}
            onPress={handleFollowToggle} disabled={followSaving}
          >
            <Text style={[ps.followBtnTxt, following && ps.followBtnTxtFollowing]}>
              {following ? '已关注' : '关注'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={ps.tabs}>
        <TouchableOpacity style={ps.tab} onPress={() => setActiveTab('works')}>
          <Text style={[ps.tabTxt, activeTab === 'works' && ps.tabTxtActive]}>
            作品 {stats.workCount > 0 ? stats.workCount : ''}
          </Text>
          {activeTab === 'works' && <View style={ps.tabBar} />}
        </TouchableOpacity>
        <TouchableOpacity style={ps.tab} onPress={() => setActiveTab('likes')}>
          <Text style={[ps.tabTxt, activeTab === 'likes' && ps.tabTxtActive]}>喜欢</Text>
          {activeTab === 'likes' && <View style={ps.tabBar} />}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={ps.container}>
      <FlatList
        data={gridData}
        keyExtractor={(item) => String(item.id)}
        numColumns={3}
        columnWrapperStyle={{ gap: GRID_GAP }}
        contentContainerStyle={{ gap: GRID_GAP }}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <VideoGridItem video={item} onPress={(v) => navigation.navigate('SingleVideo', { videoId: v.id })} />
        )}
        onEndReached={() => { if (activeTab === 'works' && hasMore) { const np = page + 1; setPage(np); fetchVideos(np); } }}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          !loading ? <View style={ps.empty}><Text style={ps.emptyTxt}>{activeTab === 'works' ? '暂无作品' : '暂无喜欢'}</Text></View> : null
        }
        ListFooterComponent={loading ? <ActivityIndicator color={colors.primary} style={{ padding: 20 }} /> : null}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const ps = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  banner: { height: 140, backgroundColor: colors.surfaceLight, justifyContent: 'flex-end' },
  backBtn: { position: 'absolute', top: 50, left: 16, zIndex: 10 },
  menuBtn: { position: 'absolute', top: 50, right: 16, zIndex: 10 },
  info: { paddingHorizontal: 16, marginTop: -36 },
  avatarWrap: { marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surfaceLight, borderWidth: 3, borderColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  displayName: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  userId: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 16 },
  statsRow: { flexDirection: 'row', marginBottom: 16, gap: 24 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statNum: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  statLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  btnRow: { marginBottom: 20 },
  editBtn: { backgroundColor: colors.surfaceLight, paddingVertical: 10, borderRadius: borderRadius.sm, alignItems: 'center' },
  editBtnTxt: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  followBtn: { backgroundColor: colors.primary, paddingVertical: 10, borderRadius: borderRadius.sm, alignItems: 'center', marginBottom: 20 },
  followBtnFollowing: { backgroundColor: colors.surfaceLight },
  followBtnTxt: { fontSize: fontSize.md, fontWeight: '600', color: 'white' },
  followBtnTxtFollowing: { color: colors.textPrimary },
  tabs: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: colors.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, position: 'relative' },
  tabTxt: { fontSize: fontSize.md, fontWeight: '500', color: colors.textMuted },
  tabTxtActive: { color: colors.textPrimary, fontWeight: '700' },
  tabBar: { position: 'absolute', bottom: 0, width: 32, height: 2, backgroundColor: colors.warning, borderRadius: 1 },
  empty: { paddingVertical: 80, alignItems: 'center' },
  emptyTxt: { fontSize: fontSize.md, color: colors.textMuted },
});

export default ProfileScreen;
