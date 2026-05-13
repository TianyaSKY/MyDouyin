import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

import UserInsightsTab from './dashboard/UserInsightsTab';
import ContentOpsTab from './dashboard/ContentOpsTab';
import RecommendTab from './dashboard/RecommendTab';
import CommentSentimentTab from './dashboard/CommentSentimentTab';

const TABS = [
  { key: 'users', label: '用户洞察', icon: 'people' },
  { key: 'content', label: '内容运营', icon: 'videocam' },
  { key: 'recommend', label: '推荐效果', icon: 'sparkles' },
  { key: 'comments', label: '评论情感', icon: 'chatbubbles' },
];

const TAB_COLORS = {
  users: '#3B82F6',
  content: '#A855F7',
  recommend: '#F59E0B',
  comments: '#06B6D4',
};

export default function DashboardScreen() {
  const [activeTab, setActiveTab] = useState('users');
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const accentColor = TAB_COLORS[activeTab];

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View style={s.headerLeft}>
            <Ionicons name="analytics" size={20} color={accentColor} />
            <Text style={s.headerTitle}>Douyin Data Center</Text>
          </View>
          <View style={s.headerRight}>
            <View style={[s.liveDot, { backgroundColor: '#25D366' }]} />
            <Text style={s.headerTime}>
              {time.toLocaleTimeString('zh-CN', { hour12: false })}
            </Text>
          </View>
        </View>

        {/* Tab Bar */}
        <View style={s.tabBar}>
          {TABS.map(tab => {
            const active = activeTab === tab.key;
            const tColor = TAB_COLORS[tab.key];
            return (
              <TouchableOpacity
                key={tab.key}
                style={[s.tab, active && { borderBottomColor: tColor }]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tab.icon}
                  size={15}
                  color={active ? tColor : '#555'}
                />
                <Text style={[s.tabText, active && { color: '#fff' }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Tab Content */}
      <View style={s.tabContent}>
        {activeTab === 'users' && <UserInsightsTab />}
        {activeTab === 'content' && <ContentOpsTab />}
        {activeTab === 'recommend' && <RecommendTab />}
        {activeTab === 'comments' && <CommentSentimentTab />}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F19' },
  header: { backgroundColor: '#0B0F19', borderBottomWidth: 1, borderBottomColor: '#1E2433', paddingTop: 50 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#E5E7EB', fontSize: 16, fontWeight: '700', marginLeft: 8, letterSpacing: 1, textTransform: 'uppercase' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  liveDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  headerTime: { color: '#6B7280', fontSize: 11, fontFamily: 'monospace' },
  tabBar: { flexDirection: 'row' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { color: '#555', fontSize: 11, fontWeight: '600', marginTop: 2 },
  tabContent: { flex: 1 },
});
