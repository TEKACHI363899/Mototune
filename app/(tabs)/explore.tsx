import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, increment, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { Flame, MessageCircle, MoreHorizontal, Plus, Send, Trash2, X, Search } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, KeyboardAvoidingView, Modal, Platform, SafeAreaView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';

import UserBadge from '../../components/UserBadge';
import { recordUserStat } from '../../utils/badgeHelper';
import { IPost, IComment } from '../../interfaces/post';

const { height } = Dimensions.get('window');
const COLORS = { bg: '#000000', card: '#121212', primary: '#E31B23', text: '#FFFFFF', textDim: '#A0A0A0', textDarkDim: '#666666' };

const getRelativeTime = (timestamp: number): string => {
  if (!timestamp) return '';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Vừa xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
};

const PostVideo = ({ uri }: { uri: string }) => {
  const player = useVideoPlayer(uri, p => { p.loop = true; p.muted = true; p.play(); });
  return <View style={styles.mediaContainer}><VideoView player={player} style={styles.postMedia} contentFit="cover" /></View>;
};

interface IPostCardProps {
  item: IPost;
  onComment: (post: IPost) => void;
  router: any;
}

const PostCard = ({ item, onComment, router }: IPostCardProps) => {
  const currentUser = auth.currentUser;
  const isLikedByMe = item.likedBy && currentUser ? item.likedBy.includes(currentUser.uid) : false;
  const isOwner = currentUser?.uid === item.authorId;

  const handleLike = async () => {
    if (!currentUser) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const postRef = doc(db, 'posts', item.id);
    if (isLikedByMe) {
      await updateDoc(postRef, { likedBy: arrayRemove(currentUser.uid), likesCount: increment(-1) });
    } else {
      await updateDoc(postRef, { likedBy: arrayUnion(currentUser.uid), likesCount: increment(1) });
    }
  };

  const handleShare = async () => {
    Alert.alert("Chia sẻ", "Repost bài viết này về tường nhà bạn?", [
      { text: "Hủy", style: "cancel" },
      { text: "Repost ngay", onPress: async () => {
          try {
            await updateDoc(doc(db, 'posts', item.id), { repostsCount: increment(1) });
            await addDoc(collection(db, 'posts'), {
              content: item.content || '', mediaUrl: item.mediaUrl || null, mediaType: item.mediaType || null,
              authorId: currentUser?.uid, authorName: currentUser?.email?.split('@')[0] || 'Biker Ẩn Danh', authorAvatar: currentUser?.photoURL || null,
              createdAt: Date.now(), likesCount: 0, commentsCount: 0, repostsCount: 0,
              isShared: true, sharedFromStr: item.authorName
            });
            Alert.alert("Thành công", "Đã chia sẻ lên bảng tin!");
            
            if (currentUser) {
              await recordUserStat(currentUser.uid, 'post_creator', 1);
            }
          } catch (e) { Alert.alert("Lỗi", "Không thể chia sẻ"); }
      }}
    ]);
  };

  const handleUserClick = () => {
    if (!currentUser) return;
    if (currentUser.uid === item.authorId) {
      router.push('/profile' as any); 
    } else {
      router.push(`/user/${item.authorId}?name=${item.authorName}&avatar=${encodeURIComponent(item.authorAvatar || '')}` as any);
    }
  };

  const handleDeletePost = () => {
    if (Platform.OS === 'web') {
      const confirmDelete = window.confirm("Bài viết này sẽ bị xóa vĩnh viễn khỏi bảng tin. Bạn có chắc không?");
      if (confirmDelete) {
        deleteDoc(doc(db, 'posts', item.id)).catch(() => window.alert("Không thể xóa bài viết lúc này."));
      }
    } else {
      Alert.alert("Xóa bài viết", "Bài viết này sẽ bị xóa vĩnh viễn. Bạn có chắc không?", [
          { text: "Hủy", style: "cancel" },
          { text: "Xóa", style: "destructive", onPress: async () => {
              try { await deleteDoc(doc(db, 'posts', item.id)); } catch (error) { Alert.alert("Lỗi", "Không thể xóa."); }
            } 
          }
        ]);
    }
  };

  return (
    <View style={styles.postContainer}>
      <View style={styles.postHeader}>
        <TouchableOpacity style={styles.headerLeft} onPress={handleUserClick}>
          {item.authorAvatar ? <Image source={{ uri: item.authorAvatar }} style={styles.avatar} /> : <View style={[styles.avatar, {backgroundColor: '#333'}]} />}
          <View>
             <View style={{ flexDirection: 'row', alignItems: 'center' }}>
               <Text style={styles.authorName}>{item.authorName}</Text>
               <UserBadge userId={item.authorId} size={14} />
             </View>
             {item.isShared && <Text style={styles.sharedTag}>Shared via {item.sharedFromStr}</Text>}
          </View>
        </TouchableOpacity>
        
        {isOwner ? (
          <TouchableOpacity onPress={handleDeletePost}><Trash2 size={20} color="#EF4444" /></TouchableOpacity>
        ) : (
          <TouchableOpacity><MoreHorizontal size={20} color={COLORS.textDim} /></TouchableOpacity>
        )}
      </View>

      {item.mediaUrl && (item.mediaType === 'video' ? <PostVideo uri={item.mediaUrl} /> : <View style={styles.mediaContainer}><Image source={{ uri: item.mediaUrl }} style={styles.postMedia} resizeMode="cover" /></View>)}

      <View style={styles.actionBar}>
        <View style={styles.actionLeft}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
            <Flame size={28} color={isLikedByMe ? COLORS.primary : COLORS.text} fill={isLikedByMe ? COLORS.primary : 'transparent'} />
            <Text style={styles.actionText}>{item.likesCount || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => onComment(item)}>
            <MessageCircle size={28} color={COLORS.text} />
            <Text style={styles.actionText}>{item.commentsCount || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <Send size={28} color={COLORS.text} style={{transform: [{rotate: '-45deg'}], marginTop: -4}} />
            <Text style={styles.actionText}>{item.repostsCount || 0}</Text>
          </TouchableOpacity>
        </View> 
      </View>
      
      <View style={styles.infoContainer}>
        {item.content ? (
           <Text style={styles.captionText} numberOfLines={3}>
             <Text style={styles.captionAuthor} onPress={handleUserClick}>{item.authorName} </Text>
             {item.content}
           </Text>
        ) : null}
        <TouchableOpacity onPress={() => onComment(item)}>
          <Text style={styles.viewCommentsBtn}>Xem tất cả {item.commentsCount || 0} bình luận</Text>
        </TouchableOpacity>
        <Text style={styles.timestamp}>{getRelativeTime(item.createdAt)}</Text>
      </View>
    </View>
  );
};

export default function ExploreScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<IPost[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const [activePostForComment, setActivePostForComment] = useState<IPost | null>(null);
  const [comments, setComments] = useState<IComment[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IPost)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribeUsers();
  }, []);

  useEffect(() => {
    if (!activePostForComment) return;
    const q = query(collection(db, 'posts', activePostForComment.id, 'comments'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IComment)));
    });
    return () => unsubscribe();
  }, [activePostForComment]);

  const handleSendComment = async () => {
    const currentUser = auth.currentUser;
    if (!newComment.trim() || !currentUser || !activePostForComment) return;
    try {
      const txt = newComment;
      setNewComment('');
      
      await addDoc(collection(db, 'posts', activePostForComment.id, 'comments'), {
        text: txt,
        authorId: currentUser.uid,
        authorName: currentUser.email?.split('@')[0] || 'Biker',
        authorAvatar: currentUser.photoURL || null,
        createdAt: Date.now()
      });

      await updateDoc(doc(db, 'posts', activePostForComment.id), {
        commentsCount: increment(1)
      });

      await recordUserStat(currentUser.uid, 'social_butterfly', 1);

    } catch (error) { Alert.alert("Lỗi", "Không thể gửi bình luận"); }
  };

  const filteredPosts = posts.filter(post => {
    if (!searchQuery.trim()) return true;
    const queryLower = searchQuery.toLowerCase();
    const contentMatch = post.content?.toLowerCase().includes(queryLower);
    const authorMatch = post.authorName?.toLowerCase().includes(queryLower);
    return contentMatch || authorMatch;
  });

  const filteredUsers = users.filter(user => {
    if (!searchQuery.trim()) return false;
    const queryLower = searchQuery.toLowerCase();
    const displayName = (user.displayName || user.name || user.email?.split('@')[0] || '').toLowerCase();
    return displayName.includes(queryLower) && user.id !== auth.currentUser?.uid;
  });

  const renderBikersList = () => {
    if (!searchQuery.trim() || filteredUsers.length === 0) return null;

    return (
      <View style={styles.matchingBikersSection}>
        <Text style={styles.sectionTitle}>BIKERS TÌM THẤY ({filteredUsers.length})</Text>
        <FlatList 
          horizontal
          data={filteredUsers}
          keyExtractor={item => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingVertical: 10 }}
          renderItem={({ item }) => {
            const name = item.displayName || item.name || item.email?.split('@')[0] || 'Biker';
            const avatar = item.avatarUrl || item.photoURL;

            const handleBikerClick = () => {
              router.push(`/user/${item.id}?name=${name}&avatar=${encodeURIComponent(avatar || '')}` as any);
            };

            return (
              <TouchableOpacity style={styles.bikerCard} onPress={handleBikerClick}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.bikerAvatar} />
                ) : (
                  <View style={[styles.bikerAvatar, { backgroundColor: '#333' }]} />
                )}
                <Text style={styles.bikerName} numberOfLines={1}>{name}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <View style={styles.appHeaderWrapper}>
        <View style={styles.appHeader}>
          <Text style={styles.headerLogo}>MOTO<Text style={{color: COLORS.primary}}>TUNE</Text></Text>
          <View style={{flexDirection: 'row', gap: 20, alignItems: 'center'}}>
            <TouchableOpacity onPress={() => router.push('/create-post')}><Plus size={28} color={COLORS.text} /></TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/inbox' as any)}><MessageCircle size={28} color={COLORS.text} /></TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchBarContainer}>
          <View style={styles.searchInner}>
            <Search size={18} color={COLORS.textDim} style={styles.searchIcon} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Tìm kiếm bài viết hoặc biker..."
              placeholderTextColor={COLORS.textDim}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                <X size={16} color={COLORS.textDim} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 100 }} /> : (
        <FlatList
          data={filteredPosts} 
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (<PostCard item={item} onComment={(post) => setActivePostForComment(post)} router={router} />)}
          ListHeaderComponent={renderBikersList}
          contentContainerStyle={{ paddingBottom: 20, maxWidth: 600, width: '100%', alignSelf: 'center' }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={!!activePostForComment} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setActivePostForComment(null)} activeOpacity={1} />
          
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.bottomSheet}>
              
              <View style={styles.sheetHeader}>
                <View style={{width: 24}} />
                <Text style={styles.sheetTitle}>Bình luận</Text>
                <TouchableOpacity onPress={() => setActivePostForComment(null)}>
                  <X size={24} color={COLORS.textDim} />
                </TouchableOpacity>
              </View>

              <FlatList 
                data={comments}
                keyExtractor={(item) => item.id}
                inverted 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 15 }}
                ListEmptyComponent={<Text style={{color: COLORS.textDim, textAlign: 'center', marginTop: 20}}>Chưa có bình luận nào. Hãy là người đầu tiên!</Text>}
                renderItem={({item}) => (
                  <View style={styles.commentRow}>
                    {item.authorAvatar ? <Image source={{uri: item.authorAvatar}} style={styles.commentAvatar} /> : <View style={[styles.commentAvatar, {backgroundColor: '#333'}]} />}
                    <View style={styles.commentContent}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <Text style={styles.commentAuthor}>{item.authorName} </Text>
                        <UserBadge userId={item.authorId} size={10} />
                        <Text style={styles.commentTime}> • {getRelativeTime(item.createdAt)}</Text>
                      </View>
                      <Text style={styles.commentText}>{item.text}</Text>
                    </View>
                  </View>
                )}
              />

              <View style={styles.commentInputContainer}>
                <TextInput 
                  style={styles.commentInput} 
                  placeholder="Thêm bình luận..." 
                  placeholderTextColor={COLORS.textDim}
                  value={newComment}
                  onChangeText={setNewComment}
                  autoFocus
                />
                <TouchableOpacity onPress={handleSendComment} disabled={!newComment.trim()}>
                  <Text style={[styles.sendCommentBtn, !newComment.trim() && {color: COLORS.textDarkDim}]}>Đăng</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  appHeaderWrapper: { width: '100%', borderBottomWidth: 1, borderBottomColor: '#222', paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 25) : 0, backgroundColor: COLORS.bg },
  appHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, maxWidth: 600, width: '100%', alignSelf: 'center' },
  headerLogo: { color: COLORS.text, fontSize: 24, fontWeight: '900', fontStyle: 'italic', letterSpacing: 1 },
  searchBarContainer: { paddingHorizontal: 15, paddingBottom: 12, maxWidth: 600, width: '100%', alignSelf: 'center' },
  searchInner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 20, paddingHorizontal: 12, height: 40, borderWidth: 1, borderColor: '#333' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: 'white', fontSize: 14, padding: 0 },
  clearBtn: { padding: 4 },
  matchingBikersSection: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#222', backgroundColor: '#0A0A0A' },
  sectionTitle: { color: COLORS.primary, fontWeight: 'bold', fontSize: 11, letterSpacing: 1, marginBottom: 8 },
  bikerCard: { alignItems: 'center', width: 70, marginRight: 8 },
  bikerAvatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: '#333', marginBottom: 6 },
  bikerName: { color: 'white', fontSize: 11, fontWeight: '600', textAlign: 'center', width: '100%' },
  postContainer: { backgroundColor: COLORS.bg, marginBottom: 15, borderWidth: Platform.OS === 'web' ? 1 : 0, borderColor: '#222', borderRadius: Platform.OS === 'web' ? 8 : 0, overflow: 'hidden', marginTop: Platform.OS === 'web' ? 20 : 0 },
  postHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10, borderWidth: 1, borderColor: '#333' },
  authorName: { color: COLORS.text, fontWeight: 'bold', fontSize: 15 },
  sharedTag: { color: COLORS.textDim, fontSize: 11 },
  mediaContainer: { width: '100%', aspectRatio: 4 / 5, backgroundColor: '#1a1a1a' }, 
  postMedia: { width: '100%', height: '100%' },
  actionBar: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8 },
  actionLeft: { flexDirection: 'row', gap: 20, alignItems: 'center' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: COLORS.text, fontWeight: 'bold', fontSize: 14 },
  infoContainer: { paddingHorizontal: 12, paddingBottom: 15 },
  captionText: { color: COLORS.text, fontSize: 15, lineHeight: 22 },
  captionAuthor: { fontWeight: 'bold' },
  viewCommentsBtn: { color: COLORS.textDim, marginTop: 6, fontSize: 14 },
  timestamp: { color: COLORS.textDarkDim, fontSize: 12, marginTop: 4, textTransform: 'uppercase' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: COLORS.card, height: height * 0.7, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden', paddingBottom: Platform.OS === 'ios' ? 20 : 0 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#222' },
  sheetTitle: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  commentRow: { flexDirection: 'row', marginBottom: 15 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 10 },
  commentContent: { flex: 1 },
  commentAuthor: { color: COLORS.textDim, fontSize: 13, fontWeight: 'bold' },
  commentTime: { color: '#666', fontWeight: 'normal', fontSize: 11 },
  commentText: { color: 'white', fontSize: 14, lineHeight: 20, marginTop: 2 },
  commentInputContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, paddingHorizontal: 15, borderTopWidth: 1, borderTopColor: '#222', backgroundColor: '#0A0A0A' },
  commentInput: { flex: 1, backgroundColor: '#1A1A1A', color: 'white', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, fontSize: 15, marginRight: 10 },
  sendCommentBtn: { color: COLORS.primary, fontWeight: 'bold', fontSize: 15 }
});