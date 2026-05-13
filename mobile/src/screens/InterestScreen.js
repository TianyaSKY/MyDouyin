import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../contexts/AuthContext';
import { getRegisterTags } from '../api/auth';
import { colors, spacing, fontSize, borderRadius } from '../constants/theme';

const { width } = Dimensions.get('window');

const TAG_COLORS = [
  ['#FE2C55', '#FF6B81'],
  ['#00F2EA', '#00C4BD'],
  ['#8B5CF6', '#A78BFA'],
  ['#F59E0B', '#FBBF24'],
  ['#10B981', '#34D399'],
  ['#EC4899', '#F472B6'],
  ['#3B82F6', '#60A5FA'],
  ['#EF4444', '#F87171'],
];

const InterestScreen = ({ route, navigation }) => {
  const { username, password, nickname } = route.params;
  const { handleRegister, loading, error } = useAuthContext();
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [loadingTags, setLoadingTags] = useState(true);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const tagList = await getRegisterTags();
      setTags(tagList);
    } catch (err) {
      console.error('Failed to load tags:', err);
    } finally {
      setLoadingTags(false);
    }
  };

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleComplete = async () => {
    const success = await handleRegister(username, password, nickname, selectedTags);
    if (!success) {
      // Error will be shown from context
    }
  };

  const handleSkip = async () => {
    const success = await handleRegister(username, password, nickname, []);
    if (!success) {
      // Error will be shown from context
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A0A0A', '#1A0A14', '#0A0A0A']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSkip} disabled={loading}>
          <Text style={styles.skipText}>跳过</Text>
        </TouchableOpacity>
      </View>

      {/* Title */}
      <View style={styles.titleSection}>
        <Text style={styles.title}>选择你感兴趣的内容</Text>
        <Text style={styles.subtitle}>
          选择标签帮助我们为你推荐更好的内容
        </Text>
      </View>

      {/* Tags */}
      <ScrollView
        style={styles.tagsScroll}
        contentContainerStyle={styles.tagsContainer}
        showsVerticalScrollIndicator={false}
      >
        {loadingTags ? (
          <ActivityIndicator color={colors.primary} size="large" />
        ) : tags.length === 0 ? (
          <Text style={styles.emptyText}>暂无可选标签</Text>
        ) : (
          <View style={styles.tagsGrid}>
            {tags.map((tag, index) => {
              const isSelected = selectedTags.includes(tag);
              const colorPair = TAG_COLORS[index % TAG_COLORS.length];
              return (
                <TouchableOpacity
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  activeOpacity={0.7}
                  style={[
                    styles.tagChip,
                    isSelected && styles.tagChipSelected,
                  ]}
                >
                  {isSelected ? (
                    <LinearGradient
                      colors={colorPair}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.tagGradient}
                    >
                      <Ionicons
                        name="checkmark"
                        size={14}
                        color="white"
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.tagTextSelected}>{tag}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.tagInner}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Error */}
      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Bottom Button */}
      <View style={styles.bottomSection}>
        <Text style={styles.selectedCount}>
          已选择 {selectedTags.length} 个标签
        </Text>
        <TouchableOpacity
          style={[styles.confirmBtn, loading && { opacity: 0.6 }]}
          onPress={handleComplete}
          disabled={loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.primary, '#FF6B81']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.confirmGradient}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.confirmText}>完成注册</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  backBtn: {
    padding: 4,
  },
  skipText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  titleSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  tagsScroll: {
    flex: 1,
  },
  tagsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tagChip: {
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
  },
  tagChipSelected: {
    // Handled by gradient
  },
  tagGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: borderRadius.xxl,
  },
  tagInner: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  tagTextSelected: {
    fontSize: fontSize.md,
    color: 'white',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 60,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderRadius: borderRadius.md,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginLeft: 8,
    flex: 1,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
  },
  selectedCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  confirmBtn: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  confirmGradient: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
  },
  confirmText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: 'white',
  },
});

export default InterestScreen;
