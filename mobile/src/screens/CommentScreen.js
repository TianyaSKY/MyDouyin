import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../contexts/AuthContext';
import { getVideoComments, postComment, getCommentReplies, deleteComment } from '../api/comment';
import { formatTime } from '../utils/media';
import { colors, fontSize, borderRadius } from '../constants/theme';

const CommentScreen = ({ route, navigation }) => {
  const { videoId } = route.params;
  const { token, user } = useAuthContext();
  const [comments, setComments] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [expandedReplies, setExpandedReplies] = useState({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalComments, setTotalComments] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => { loadComments(1, true); }, [videoId]);

  const loadComments = useCallback(async (pageNum, reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const data = await getVideoComments(token, videoId, pageNum, 20);
      const items = data.records || [];
      setTotalComments(data.total || 0);
      if (reset) setComments(items);
      else setComments(prev => [...prev, ...items]);
      setPage(pageNum);
      setHasMore(items.length >= 20);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token, videoId, loading]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const nc = await postComment(token, videoId, text, replyTo?.id || null);
      nc.nickname = user?.nickname || user?.username || '我';
      nc.replyCount = 0;
      if (replyTo) {
        setExpandedReplies(p => ({ ...p, [replyTo.id]: [...(p[replyTo.id]||[]), nc] }));
        setComments(p => p.map(c => c.id===replyTo.id ? {...c,replyCount:(c.replyCount||0)+1} : c));
      } else {
        setComments(p => [nc, ...p]);
        setTotalComments(p => p + 1);
      }
      setInputText(''); setReplyTo(null);
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  const handleDelete = async (cid, pid = null) => {
    try {
      await deleteComment(token, cid);
      if (pid) {
        setExpandedReplies(p => ({ ...p, [pid]: (p[pid]||[]).filter(r=>r.id!==cid) }));
        setComments(p => p.map(c => c.id===pid ? {...c,replyCount:Math.max(0,(c.replyCount||0)-1)} : c));
      } else {
        setComments(p => p.filter(c => c.id !== cid));
        setTotalComments(p => Math.max(0, p - 1));
      }
    } catch (e) { console.error(e); }
  };

  const toggleReplies = async (cid) => {
    if (expandedReplies[cid]) {
      setExpandedReplies(p => { const n={...p}; delete n[cid]; return n; });
    } else {
      try {
        const data = await getCommentReplies(token, cid, 1, 50);
        setExpandedReplies(p => ({ ...p, [cid]: data.records || [] }));
      } catch (e) { console.error(e); }
    }
  };

  const renderComment = ({ item: c }) => (
    <View style={s.item}>
      <View style={s.avatar}><Ionicons name="person" size={18} color={colors.textMuted}/></View>
      <View style={s.body}>
        <View style={s.meta}>
          <Text style={s.nick}>{c.nickname||'用户'}</Text>
          <Text style={s.time}>{formatTime(c.createdAt)}</Text>
        </View>
        <Text style={s.text}>{c.content}</Text>
        <View style={s.actions}>
          <TouchableOpacity onPress={()=>{setReplyTo({id:c.id,nickname:c.nickname});inputRef.current?.focus();}}>
            <Text style={s.actBtn}>回复</Text>
          </TouchableOpacity>
          {user?.userId===c.userId && <TouchableOpacity onPress={()=>handleDelete(c.id)}><Ionicons name="trash-outline" size={14} color={colors.error}/></TouchableOpacity>}
        </View>
        {c.replyCount>0 && (
          <TouchableOpacity onPress={()=>toggleReplies(c.id)} style={s.expand}>
            <Ionicons name={expandedReplies[c.id]?'chevron-up':'chevron-down'} size={14} color={colors.accent}/>
            <Text style={s.expandTxt}>{expandedReplies[c.id]?'收起回复':`展开 ${c.replyCount} 条回复`}</Text>
          </TouchableOpacity>
        )}
        {expandedReplies[c.id]?.map(r => (
          <View key={r.id} style={s.reply}>
            <View style={s.replyAvatar}><Ionicons name="person" size={14} color={colors.textMuted}/></View>
            <View style={{flex:1}}>
              <View style={s.meta}><Text style={s.nick}>{r.nickname||'用户'}</Text><Text style={s.time}>{formatTime(r.createdAt)}</Text></View>
              <Text style={s.text}>{r.content}</Text>
              {user?.userId===r.userId && <TouchableOpacity onPress={()=>handleDelete(r.id,c.id)} style={{marginTop:4}}><Ionicons name="trash-outline" size={12} color={colors.error}/></TouchableOpacity>}
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS==='ios'?'padding':undefined}>
      <View style={s.header}>
        <TouchableOpacity onPress={()=>navigation.goBack()}><Ionicons name="close" size={24} color={colors.textPrimary}/></TouchableOpacity>
        <Text style={s.headerTitle}>{totalComments>0?`${totalComments} 条评论`:'评论'}</Text>
        <View style={{width:24}}/>
      </View>
      <FlatList data={comments} keyExtractor={i=>String(i.id)} renderItem={renderComment}
        onEndReached={()=>hasMore&&loadComments(page+1)} onEndReachedThreshold={0.3}
        ListEmptyComponent={!loading?<View style={s.empty}><Ionicons name="chatbubble-outline" size={40} color={colors.textMuted}/><Text style={s.emptyTxt}>还没有评论</Text></View>:null}
        ListFooterComponent={loading?<ActivityIndicator color={colors.primary} style={{padding:20}}/>:null}
        showsVerticalScrollIndicator={false} contentContainerStyle={{padding:16}}/>
      <View style={s.inputArea}>
        {replyTo && <View style={s.replyHint}><Text style={s.replyHintTxt}>回复 @{replyTo.nickname}</Text><TouchableOpacity onPress={()=>setReplyTo(null)}><Ionicons name="close" size={16} color={colors.textMuted}/></TouchableOpacity></View>}
        <View style={s.inputRow}>
          <TextInput ref={inputRef} style={s.input} placeholder={replyTo?`回复 @${replyTo.nickname}...`:'留下评论...'} placeholderTextColor={colors.textHint}
            value={inputText} onChangeText={setInputText} maxLength={500} editable={!sending} returnKeyType="send" onSubmitEditing={handleSend}/>
          <TouchableOpacity style={s.sendBtn} onPress={handleSend} disabled={!inputText.trim()||sending}>
            <Ionicons name="send" size={20} color={inputText.trim()?colors.primary:colors.textMuted}/>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:colors.background},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:50,paddingHorizontal:16,paddingBottom:12,borderBottomWidth:0.5,borderBottomColor:colors.border},
  headerTitle:{fontSize:fontSize.lg,fontWeight:'700',color:colors.textPrimary},
  item:{flexDirection:'row',marginBottom:20},
  avatar:{width:36,height:36,borderRadius:18,backgroundColor:colors.surfaceLight,alignItems:'center',justifyContent:'center',marginRight:12},
  body:{flex:1},
  meta:{flexDirection:'row',alignItems:'center',marginBottom:4},
  nick:{fontSize:fontSize.sm,fontWeight:'600',color:colors.textSecondary,marginRight:8},
  time:{fontSize:fontSize.xs,color:colors.textMuted},
  text:{fontSize:fontSize.md,color:colors.textPrimary,lineHeight:20},
  actions:{flexDirection:'row',alignItems:'center',gap:16,marginTop:6},
  actBtn:{fontSize:fontSize.xs,color:colors.textSecondary,fontWeight:'500'},
  expand:{flexDirection:'row',alignItems:'center',marginTop:8},
  expandTxt:{fontSize:fontSize.xs,color:colors.accent,marginLeft:4,fontWeight:'500'},
  reply:{flexDirection:'row',marginTop:12,paddingLeft:4},
  replyAvatar:{width:28,height:28,borderRadius:14,backgroundColor:colors.surfaceLight,alignItems:'center',justifyContent:'center',marginRight:10},
  empty:{alignItems:'center',justifyContent:'center',paddingVertical:80},
  emptyTxt:{fontSize:fontSize.md,color:colors.textMuted,marginTop:12},
  inputArea:{borderTopWidth:0.5,borderTopColor:colors.border,backgroundColor:colors.surface,paddingBottom:Platform.OS==='ios'?30:12,paddingTop:8,paddingHorizontal:16},
  replyHint:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:6,paddingHorizontal:12,backgroundColor:colors.surfaceLight,borderRadius:borderRadius.md,marginBottom:8},
  replyHintTxt:{fontSize:fontSize.sm,color:colors.accent},
  inputRow:{flexDirection:'row',alignItems:'center'},
  input:{flex:1,height:40,backgroundColor:colors.surfaceLight,borderRadius:borderRadius.xxl,paddingHorizontal:16,fontSize:fontSize.md,color:colors.textPrimary},
  sendBtn:{width:40,height:40,alignItems:'center',justifyContent:'center',marginLeft:8},
});

export default CommentScreen;
