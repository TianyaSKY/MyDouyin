import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  ActivityIndicator, Alert, Image, ScrollView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuthContext } from '../contexts/AuthContext';
import { createVideo } from '../api/video';
import { initUpload, uploadChunk, completeUpload, uploadCover, CHUNK_SIZE } from '../api/upload';
import { colors, fontSize, borderRadius } from '../constants/theme';

const UploadScreen = ({ navigation }) => {
  const { token } = useAuthContext();
  const [videoUri, setVideoUri] = useState(null);
  const [coverUri, setCoverUri] = useState(null);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');

  const pickVideo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('权限不足', '请允许访问相册'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) setVideoUri(result.assets[0].uri);
  };

  const pickCover = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('权限不足', '请允许访问相册'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) setCoverUri(result.assets[0].uri);
  };

  const handleUpload = async () => {
    if (!videoUri) { Alert.alert('提示', '请先选择视频'); return; }
    if (!title.trim()) { Alert.alert('提示', '请输入视频标题'); return; }

    setUploading(true);
    setProgress(0);
    try {
      // 1. Read video file as blob
      setStage('准备文件...');
      const videoResp = await fetch(videoUri);
      const videoBlob = await videoResp.blob();
      const fileSize = videoBlob.size;
      const fileName = `video_${Date.now()}.mp4`;
      const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
      const fileHash = `rn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 2. Init upload
      setStage('初始化上传...');
      const initData = await initUpload(token, { fileName, fileHash, fileSize, totalChunks });
      const uploadId = initData.uploadId;

      // 3. Upload chunks
      for (let i = 0; i < totalChunks; i++) {
        setStage(`上传分片 ${i + 1}/${totalChunks}`);
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, fileSize);
        const chunk = videoBlob.slice(start, end);
        await uploadChunk(token, uploadId, i, chunk);
        setProgress(((i + 1) / totalChunks) * 80);
      }

      // 4. Complete upload
      setStage('合并文件...');
      const completeData = await completeUpload(token, { uploadId, fileName, fileHash, fileSize, totalChunks });
      setProgress(85);

      // 5. Upload cover if selected
      let coverUrl = null;
      if (coverUri) {
        setStage('上传封面...');
        const coverResp = await fetch(coverUri);
        const coverBlob = await coverResp.blob();
        const coverFormData = new FormData();
        coverFormData.append('file', { uri: coverUri, name: 'cover.jpg', type: 'image/jpeg' });
        const coverData = await uploadCover(token, coverFormData);
        coverUrl = coverData.url || coverData.coverUrl;
        setProgress(90);
      }

      // 6. Create video
      setStage('发布视频...');
      const tagList = tags.split(/[,，\s]+/).filter(Boolean);
      await createVideo(token, {
        title: title.trim(),
        videoUrl: completeData.url || completeData.videoUrl,
        coverUrl,
        tags: tagList,
      });
      setProgress(100);

      Alert.alert('发布成功', '视频已发布！', [{ text: '确定', onPress: () => navigation.goBack() }]);
    } catch (err) {
      Alert.alert('上传失败', err.message);
    } finally {
      setUploading(false);
      setStage('');
    }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="close" size={24} color={colors.textPrimary} /></TouchableOpacity>
        <Text style={s.headerTitle}>发布视频</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Video picker */}
        <TouchableOpacity style={s.videoPicker} onPress={pickVideo} disabled={uploading}>
          {videoUri ? (
            <View style={s.videoPreview}>
              <Ionicons name="videocam" size={40} color={colors.accent} />
              <Text style={s.videoPreviewTxt}>视频已选择</Text>
              <Text style={s.changeTxt}>点击更换</Text>
            </View>
          ) : (
            <View style={s.videoPickerInner}>
              <View style={s.addIcon}><Ionicons name="add" size={40} color={colors.textMuted} /></View>
              <Text style={s.pickTxt}>选择视频</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Cover picker */}
        <TouchableOpacity style={s.coverPicker} onPress={pickCover} disabled={uploading}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={s.coverImg} />
          ) : (
            <View style={s.coverPickerInner}>
              <Ionicons name="image-outline" size={24} color={colors.textMuted} />
              <Text style={s.coverTxt}>选择封面（可选）</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Title */}
        <TextInput style={s.titleInput} placeholder="添加标题..." placeholderTextColor={colors.textHint}
          value={title} onChangeText={setTitle} maxLength={100} editable={!uploading} />

        {/* Tags */}
        <TextInput style={s.tagInput} placeholder="添加标签（空格或逗号分隔）" placeholderTextColor={colors.textHint}
          value={tags} onChangeText={setTags} editable={!uploading} />

        {/* Progress */}
        {uploading && (
          <View style={s.progressSection}>
            <Text style={s.stageTxt}>{stage}</Text>
            <View style={s.progressBar}>
              <LinearGradient colors={[colors.primary, '#FF6B81']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[s.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={s.progressTxt}>{Math.round(progress)}%</Text>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity style={[s.submitBtn, uploading && { opacity: 0.6 }]} onPress={handleUpload} disabled={uploading} activeOpacity={0.8}>
          <LinearGradient colors={[colors.primary, '#FF6B81']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.submitGradient}>
            {uploading ? <ActivityIndicator color="white" /> : <Text style={s.submitTxt}>发布</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  content: { padding: 20, paddingBottom: 40 },
  videoPicker: { height: 200, borderRadius: borderRadius.lg, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', overflow: 'hidden', marginBottom: 16 },
  videoPickerInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  addIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surfaceLight, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  pickTxt: { fontSize: fontSize.md, color: colors.textMuted },
  videoPreview: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceLight },
  videoPreviewTxt: { fontSize: fontSize.md, color: colors.accent, fontWeight: '600', marginTop: 8 },
  changeTxt: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 4 },
  coverPicker: { height: 100, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 16 },
  coverPickerInner: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  coverTxt: { fontSize: fontSize.sm, color: colors.textMuted },
  coverImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  titleInput: { backgroundColor: colors.surfaceLight, borderRadius: borderRadius.lg, padding: 16, fontSize: fontSize.md, color: colors.textPrimary, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  tagInput: { backgroundColor: colors.surfaceLight, borderRadius: borderRadius.lg, padding: 16, fontSize: fontSize.md, color: colors.textPrimary, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  progressSection: { marginBottom: 20 },
  stageTxt: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: 8 },
  progressBar: { height: 4, backgroundColor: colors.surfaceLight, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressTxt: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 4, textAlign: 'right' },
  submitBtn: { borderRadius: borderRadius.lg, overflow: 'hidden' },
  submitGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
  submitTxt: { fontSize: fontSize.lg, fontWeight: '700', color: 'white' },
});

export default UploadScreen;
