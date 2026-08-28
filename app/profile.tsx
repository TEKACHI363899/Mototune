import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, where, Unsubscribe } from 'firebase/firestore';
import { Award, Camera, Flame, LogOut, MessageCircle, Send, Trash2, User, Grid, List, Bell, Compass, Repeat } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { uploadToCloudinary } from '../services/cloudinaryService';

import UserBadge from '../components/UserBadge';
import ProfileStatsRow from '../components/social/ProfileStatsRow';
import PostGridItem from '../components/social/PostGridItem';
import { IProfileStats } from '../interfaces/social';
import { IPost } from '../interfaces/post';
import { IBike } from '../interfaces/bike';
import { HIGTheme, HIGTouchTarget } from '../constants/theme';

const themeColors = HIGTheme.dark;
const COLORS = { bg: themeColors.systemBackground, card: themeColors.secondarySystemBackground, primary: themeColors.systemRed, text: themeColors.label, textDim: themeColors.secondaryLabel };

export default function ProfileScreen() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [myPosts, setMyPosts] = useState<IPost[]>([]);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [bikeObj, setBikeObj] = useState<IBike | null>(null);

  const [viewMode, setViewMode] = useState<'grid' | 'feed'>('grid');
  const [stats, setStats] = useState<IProfileStats>({ postsCount: 0, friendsCount: 0, tripsCount: 0 });
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [unreadNotifs, setUnreadNotifs] = useState<number>(0);

  useEffect(() => {
    let unsubscribeDoc: Unsubscribe | null = null;
    let unsubPosts: Unsubscribe | null = null;
    let unsubFriends: Unsubscribe | null = null;
    let unsubTrips: Unsubscribe | null = null;
    let unsubNotifs: Unsubscribe | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        setAvatar(user.photoURL);

        // My Posts listener
        const qPosts = query(collection(db, 'posts'), where('authorId', '==', user.uid), orderBy('createdAt', 'desc'));
        unsubPosts = onSnapshot(qPosts, (snapshot) => {
          const posts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as IPost));
          setMyPosts(posts);
          setStats(prev => ({ ...prev, postsCount: posts.length }));
        });

        // User Doc listener
        unsubscribeDoc = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
          if (docSnap.exists() && docSnap.data().bike) {
            setBikeObj(docSnap.data().bike);
          } else {
            setBikeObj(null);
          }
        });

        // Friends count listener
        const qFriends = query(collection(db, 'friendships'), where('users', 'array-contains', user.uid), where('status', '==', 'accepted'));
        unsubFriends = onSnapshot(qFriends, (snapshot) => {
          setStats(prev => ({ ...prev, friendsCount: snapshot.size }));
        });

        // Trips count listener
        const qTrips = query(collection(db, 'users', user.uid, 'trips'));
        unsubTrips = onSnapshot(qTrips, (snapshot) => {
          setStats(prev => ({ ...prev, tripsCount: snapshot.size }));
          setStatsLoading(false);
        });

        // Notifications unread count
        const qNotifs = query(collection(db, 'notifications'), where('userId', '==', user.uid), where('isRead', '==', false));
        unsubNotifs = onSnapshot(qNotifs, (snapshot) => {
          setUnreadNotifs(snapshot.size);
        });
      } else {
        setMyPosts([]);
        setBikeObj(null);
        setAvatar(null);
        setStatsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubPosts) unsubPosts();
      if (unsubscribeDoc) unsubscribeDoc();
      if (unsubFriends) unsubFriends();
      if (unsubTrips) unsubTrips();
      if (unsubNotifs) unsubNotifs();
    };
  }, []);

  const handleChangeAvatar = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    if (!result.canceled && currentUser) {
      setUploadingAvatar(true);
      try {
        const secureUrl = await uploadToCloudinary(result.assets[0].uri, 'image');
        await updateProfile(currentUser, { photoURL: secureUrl });
        await setDoc(doc(db, 'users', currentUser.uid), { avatarUrl: secureUrl }, { merge: true });
        setAvatar(secureUrl);
      } catch (error: any) { 
        console.error("Upload avatar error:", error);
        Alert.alert("Lỗi", "Tải ảnh thất bại"); 
      } finally { 
        setUploadingAvatar(false); 
      }
    }
  };

  const handleDeletePost = (postId: string) => {
    const targetPost = myPosts.find(p => p.id === postId);
    if (!currentUser || targetPost?.authorId !== currentUser.uid) return;

    if (Platform.OS === 'web') {
      const confirmDelete = window.confirm("Bài viết này sẽ bị xóa vĩnh viễn khỏi Hồ sơ. Bạn có chắc không?");
      if (confirmDelete) {
        deleteDoc(doc(db, 'posts', postId))
          .catch(() => window.alert("Không thể xóa bài viết lúc này."));
      }
    } else {
      Alert.alert(
        "Xóa bài viết",
        "Bài viết này sẽ bị xóa vĩnh viễn khỏi Hồ sơ. Bạn có chắc không?",
        [
          { text: "Hủy", style: "cancel" },
          { 
            text: "Xóa", 
            style: "destructive", 
            onPress: async () => {
              try {
                await deleteDoc(doc(db, 'posts', postId));
              } catch (error) {
                Alert.alert("Lỗi", "Không thể xóa bài viết lúc này.");
              }
            } 
          }
        ]
      );
    }
  };

  const handlePostClick = (post: IPost) => {
    router.push(`/post/${post.id}` as any);
  };

  const ProfileHeader = () => (
    <View>
      {/* Header Bar */}
      <View style={styles.header}>
        <Text style={styles.title}>HỒ SƠ CỦA TÔI</Text>
        <View style={styles.headerRightGroup}>
          <TouchableOpacity onPress={() => router.push('/notifications' as any)} style={styles.notifBtn}>
            <Bell size={22} color={COLORS.text} />
            {unreadNotifs > 0 && (
              <View style={styles.notifPill}>
                <Text style={styles.notifPillText}>{unreadNotifs > 99 ? '99+' : unreadNotifs}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: COLORS.textDim, fontWeight: 'bold' }}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <TouchableOpacity onPress={handleChangeAvatar} disabled={uploadingAvatar}>
          {uploadingAvatar ? <View style={styles.avatar}><ActivityIndicator color="white" /></View> : avatar ? <Image source={{ uri: avatar }} style={styles.avatar} /> : <View style={styles.avatar}><User size={40} color={COLORS.bg} /></View>}
          <View style={styles.cameraIcon}><Camera size={14} color="white" /></View>
        </TouchableOpacity>
        
        {/* Name & Realtime Badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
          <Text style={styles.name}>{currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Biker Ẩn Danh'}</Text>
          {currentUser && <UserBadge userId={currentUser.uid} size={18} realtime={true} />}
        </View>
        
        {bikeObj ? (
           <View style={styles.bikeDisplay}>
             <Compass size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
             <Text style={styles.bikeText}>Xe: <Text style={{color: 'white'}}>{bikeObj.nickname}</Text> ({bikeObj.model})</Text>
           </View>
        ) : (
           <View style={[styles.bikeDisplay, {borderColor: '#333', backgroundColor: 'transparent'}]}>
             <Text style={[styles.bikeText, {color: COLORS.textDim}]}>Chưa có xe trong Garage</Text>
           </View>
        )}

        {/* 3-Column Instagram Stats Row */}
        <ProfileStatsRow stats={stats} loading={statsLoading} />

        {/* Badges Showcase Button */}
        <TouchableOpacity style={styles.badgesShowcaseBtn} onPress={() => router.push('/badges' as any)}>
          <Award size={18} color="#FFD700" />
          <Text style={styles.badgesShowcaseText}>PHÒNG TRƯNG BÀY HUY HIỆU</Text>
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={async () => {
          try {
            await signOut(auth);
            router.replace('/login');
          } catch (error) {
            Alert.alert("Lỗi", "Không thể đăng xuất lúc này.");
          }
        }}
      >
        <LogOut size={18} color={COLORS.primary} />
        <Text style={styles.logoutText}>ĐĂNG XUẤT</Text>
      </TouchableOpacity>

      {/* Mode View Switcher Bar */}
      <View style={styles.tabSwitcher}>
        <TouchableOpacity
          style={[styles.tabBtn, viewMode === 'grid' && styles.activeTabBtn]}
          onPress={() => setViewMode('grid')}
        >
          <Grid size={20} color={viewMode === 'grid' ? COLORS.primary : COLORS.textDim} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, viewMode === 'feed' && styles.activeTabBtn]}
          onPress={() => setViewMode('feed')}
        >
          <List size={20} color={viewMode === 'feed' ? COLORS.primary : COLORS.textDim} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {viewMode === 'grid' ? (
        <FlatList
          data={myPosts}
          keyExtractor={item => item.id}
          ListHeaderComponent={<ProfileHeader />}
          numColumns={3}
          key={'grid-view'}
          contentContainerStyle={{ paddingBottom: 50, maxWidth: 600, width: '100%', alignSelf: 'center' }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Chưa có bài viết nào</Text>
            </View>
          }
          renderItem={({ item }) => <PostGridItem post={item} onPress={handlePostClick} />}
        />
      ) : (
        <FlatList 
          data={myPosts}
          keyExtractor={item => item.id}
          ListHeaderComponent={<ProfileHeader />}
          key={'feed-view'}
          contentContainerStyle={{ paddingBottom: 50, maxWidth: 600, width: '100%', alignSelf: 'center' }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Chưa có bài viết nào</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.miniPost}>
              <View style={styles.miniPostHeader}>
                {item.isShared ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Repeat size={14} color={COLORS.primary} />
                    <Text style={styles.sharedBadge}>Đã Repost từ {item.sharedFromStr}</Text>
                  </View>
                ) : (
                  <Text style={styles.dateBadge}>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</Text>
                )}
                <TouchableOpacity onPress={() => handleDeletePost(item.id)} style={{ padding: 4, marginRight: -4, marginTop: -4 }}>
                  <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>

              {item.content ? <Text style={styles.miniPostText} numberOfLines={2}>{item.content}</Text> : <Text style={[styles.miniPostText, {fontStyle: 'italic', color: COLORS.textDim}]}>[Bài viết chứa Ảnh/Video]</Text>}
              <View style={styles.statsBar}>
                <View style={styles.statItem}><Flame size={16} color={COLORS.textDim} /><Text style={styles.statText}>{item.likesCount || 0}</Text></View>
                <View style={styles.statItem}><MessageCircle size={16} color={COLORS.textDim} /><Text style={styles.statText}>{item.commentsCount || 0}</Text></View>
                <View style={styles.statItem}><Send size={16} color={COLORS.textDim} style={{transform: [{rotate: '-45deg'}]}} /><Text style={styles.statText}>{item.repostsCount || 0}</Text></View>
              </View>
            </View>
          )} 
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: '#333', marginTop: Platform.OS === 'android' ? 25 : 0 },
  headerRightGroup: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  notifBtn: { position: 'relative', padding: 4, minHeight: HIGTouchTarget.min, justifyContent: 'center' },
  notifPill: { position: 'absolute', top: 0, right: 0, backgroundColor: '#E31B23', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  notifPillText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  title: { color: 'white', fontWeight: '900', fontSize: 18 },
  profileCard: { backgroundColor: COLORS.card, marginHorizontal: 16, marginVertical: 12, padding: 20, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  cameraIcon: { position: 'absolute', bottom: 15, right: 0, backgroundColor: '#333', padding: 6, borderRadius: 15, borderWidth: 2, borderColor: COLORS.card },
  name: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  
  bikeDisplay: { flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: 'rgba(227, 27, 35, 0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.primary },
  bikeText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 13 },

  badgesShowcaseBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, backgroundColor: 'rgba(255, 215, 0, 0.1)', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.5)' },
  badgesShowcaseText: { color: '#FFD700', fontWeight: 'bold', fontSize: 12, letterSpacing: 0.5 },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)', marginHorizontal: 20, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#333', gap: 8 },
  logoutText: { color: COLORS.textDim, fontWeight: 'bold', fontSize: 14 },
  
  tabSwitcher: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#333', marginTop: 16 },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  activeTabBtn: { borderBottomWidth: 2, borderColor: '#E31B23' },

  miniPost: { backgroundColor: COLORS.card, marginHorizontal: 20, marginBottom: 12, padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  miniPostHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  sharedBadge: { color: COLORS.primary, fontSize: 12, fontWeight: 'bold' },
  dateBadge: { color: COLORS.textDim, fontSize: 12 },
  miniPostText: { color: COLORS.text, fontSize: 15, lineHeight: 22 },
  statsBar: { flexDirection: 'row', gap: 20, marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#333' },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { color: COLORS.textDim, fontSize: 14, fontWeight: 'bold' },
  emptyBox: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLORS.textDim, fontSize: 14 },
});
