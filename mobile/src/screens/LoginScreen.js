import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../contexts/AuthContext';
import { colors, spacing, fontSize, borderRadius } from '../constants/theme';

const { width, height } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const {
    handleLogin,
    handleRegister,
    loading,
    error,
    clearError,
  } = useAuthContext();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const tabIndicator = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 60,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.spring(tabIndicator, {
      toValue: mode === 'login' ? 0 : 1,
      tension: 80,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [mode]);

  // Clear errors when switching modes
  useEffect(() => {
    clearError();
    setFieldErrors({});
  }, [mode]);

  const validate = () => {
    const errors = {};
    if (!username.trim()) errors.username = '请输入用户名';
    else if (username.length < 3) errors.username = '用户名至少3个字符';
    if (!password.trim()) errors.password = '请输入密码';
    else if (password.length < 6) errors.password = '密码至少6个字符';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    if (mode === 'login') {
      await handleLogin(username, password);
    } else {
      // For register, navigate to interest selection
      navigation.navigate('Interest', {
        username,
        password,
        nickname: nickname.trim(),
      });
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setUsername('');
    setPassword('');
    setNickname('');
    setShowPassword(false);
    setFieldErrors({});
  };

  return (
    <View style={styles.container}>
      {/* Gradient Background */}
      <LinearGradient
        colors={['#0A0A0A', '#1A0A14', '#0A0A0A']}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative circles */}
      <View style={[styles.decorCircle, styles.decorCircle1]} />
      <View style={[styles.decorCircle, styles.decorCircle2]} />
      <View style={[styles.decorCircle, styles.decorCircle3]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.cardWrapper,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Logo */}
            <Animated.View
              style={[styles.logoContainer, { transform: [{ scale: logoScale }] }]}
            >
              <LinearGradient
                colors={[colors.primary, '#FF6B81']}
                style={styles.logoGradient}
              >
                <Ionicons name="musical-notes" size={32} color="white" />
              </LinearGradient>
              <Text style={styles.logoTitle}>Douyin</Text>
              <Text style={styles.logoSubtitle}>记录美好生活</Text>
            </Animated.View>

            {/* Tab Switcher */}
            <View style={styles.tabContainer}>
              <Animated.View
                style={[
                  styles.tabIndicator,
                  {
                    transform: [
                      {
                        translateX: tabIndicator.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, (width - 80) / 2],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <TouchableOpacity
                style={styles.tab}
                onPress={() => switchMode('login')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabText,
                    mode === 'login' && styles.tabTextActive,
                  ]}
                >
                  登录
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tab}
                onPress={() => switchMode('register')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabText,
                    mode === 'register' && styles.tabTextActive,
                  ]}
                >
                  注册
                </Text>
              </TouchableOpacity>
            </View>

            {/* Welcome Text */}
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>
                {mode === 'login' ? '欢迎回来' : '创建账号'}
              </Text>
              <Text style={styles.welcomeDesc}>
                {mode === 'login'
                  ? '登录后继续探索精彩短视频世界'
                  : '加入我们，开始你的创作之旅'}
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Username */}
              <View style={styles.inputGroup}>
                <View
                  style={[
                    styles.inputWrapper,
                    fieldErrors.username && styles.inputError,
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="用户名"
                    placeholderTextColor={colors.textHint}
                    value={username}
                    onChangeText={(t) => {
                      setUsername(t);
                      if (fieldErrors.username) {
                        setFieldErrors((e) => ({ ...e, username: undefined }));
                      }
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {fieldErrors.username && (
                  <Text style={styles.errorText}>{fieldErrors.username}</Text>
                )}
              </View>

              {/* Nickname (register only) */}
              {mode === 'register' && (
                <View style={styles.inputGroup}>
                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="happy-outline"
                      size={20}
                      color={colors.textMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="昵称（可选）"
                      placeholderTextColor={colors.textHint}
                      value={nickname}
                      onChangeText={setNickname}
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              )}

              {/* Password */}
              <View style={styles.inputGroup}>
                <View
                  style={[
                    styles.inputWrapper,
                    fieldErrors.password && styles.inputError,
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="密码"
                    placeholderTextColor={colors.textHint}
                    value={password}
                    onChangeText={(t) => {
                      setPassword(t);
                      if (fieldErrors.password) {
                        setFieldErrors((e) => ({ ...e, password: undefined }));
                      }
                    }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
                {fieldErrors.password && (
                  <Text style={styles.errorText}>{fieldErrors.password}</Text>
                )}
              </View>

              {/* Error Message */}
              {error ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color={colors.error} />
                  <Text style={styles.errorBannerText}>{error}</Text>
                </View>
              ) : null}

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    loading
                      ? ['#555', '#444']
                      : [colors.primary, '#FF6B81']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={styles.submitText}>
                      {mode === 'login' ? '登录' : '下一步'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <Text style={styles.footer}>
              {mode === 'login'
                ? '安全登录 · 数据加密传输'
                : '注册即表示同意服务条款'}
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.08,
  },
  decorCircle1: {
    width: 300,
    height: 300,
    backgroundColor: colors.primary,
    top: -80,
    right: -80,
  },
  decorCircle2: {
    width: 250,
    height: 250,
    backgroundColor: colors.accent,
    bottom: -60,
    left: -100,
  },
  decorCircle3: {
    width: 180,
    height: 180,
    backgroundColor: '#8B5CF6',
    top: height * 0.4,
    left: -60,
  },
  cardWrapper: {
    width: '100%',
  },
  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoGradient: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  logoSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.lg,
    padding: 4,
    marginBottom: 24,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: '50%',
    height: '100%',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    zIndex: 1,
  },
  tabText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  // Welcome
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  welcomeDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  // Form
  form: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    height: 52,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    height: '100%',
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderRadius: borderRadius.md,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginLeft: 8,
    flex: 1,
  },
  submitBtn: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginTop: 4,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitGradient: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: 'white',
  },
  footer: {
    textAlign: 'center',
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 8,
  },
});

export default LoginScreen;
