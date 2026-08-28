import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { ArrowLeft, Flame, MessageCircle, Send, User, Grid, List, Compass, Repeat } from 'lucide-react-native';
import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';
import ProfileStatsRow from '../../components/social/ProfileStatsRow';
import FriendshipActionButtons from '../../components/social/FriendshipActionButtons';
import PostGridItem from '../../components/social/PostGridItem';
import { IProfileStats, TFriendshipStatus } from '../../interfaces/social';
import { IPost } from '../../interfaces/post';
import { IBike } from '../../interfaces/bike';
import {
  getFriendshipStatus,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  revokeFriendRequest,
  unfriend,
} from '../../services/friendService';

import { HIGTheme } from '../../constants/theme';
const themeColors = HIGTheme.dark;
const COLORS = { bg: themeColors.systemBackground, card: themeColors.secondarySystemBackground, primary: themeColors.systemRed, text: themeColors.label, textDim: themeColors.secondaryLabel };

export default function OtherUserProfileScreen() {
  const { id, name, avatar } = useLocalSearchParams<{ id: string; name?: string; avatar?: string }>();
  const router = useRouter();
  const currentUser = auth.currentUser;

  const [userPosts, setUserPosts] = useState<IPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState<boolean>(true);
  const [bikeObj, setBikeObj] = useState<IBike | null>(null);

  const [viewMode, setViewMode] = useState<'grid' | 'feed'>('grid');
  const [stats, setStats] = useState<IProfileStats>({ postsCount: 0, friendsCount: 0, tripsCount: 0 });
  const [statsLoading, setStatsLoading] = useState<boolean>(true);

  const [friendshipStatus, setFriendshipStatus] = useState<TFriendshipStatus>('none');
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [friendshipLoading, setFriendshipLoading] = useState<boolean>(true);

  const targetUid = id as string;
  const isSelf = currentUser?.uid === targetUid;

  const syncFriendship = useCallback(async () => {
    if (!currentUser || !targetUid || isSelf) {
      setFriendshipLoading(false);
      return;
    }
    try {
      const res = await getFriendshipStatus(currentUser.uid, targetUid);
      setFriendshipStatus(res.status);
      setFriendshipId(res.friendshipId);
    } catch (err) {
      console.error('Error getting friendship status:', err);
    } finally {
      setFriendshipLoading(false);
    }
  }, [currentUser, targetUid, isSelf]);

  useEffect(() => {
    if (!targetUid) return;

    // Posts query
    const q = query(collection(db, 'posts'), where('authorId', '==', targetUid), orderBy('createdAt', 'desc'));
    const unsubscribePosts = onSnapshot(
      q,
      (snapshot) => {
        const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IPost));
        setUserPosts(posts);
        setStats(prev => ({ ...prev, postsCount: posts.length }));
        setLoadingPosts(false);
      },
      () => setLoadingPosts(false)
    );

    // Fetch user bike & stats
    const fetchUserBike = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'users', targetUid));
        if (docSnap.exists() && docSnap.data().bike) {
          setBikeObj(docSnap.data().bike);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchUserBike();

    // Friends count listener
    const qFriends = query(collection(db, 'friendships'), where('users', 'array-contains', targetUid), where('status', '==', 'accepted'));
    const unsubFriends = onSnapshot(qFriends, (snapshot) => {
      setStats(prev => ({ ...prev, friendsCount: snapshot.size }));
    });

    // Trips count listener
    const qTrips = query(collection(db, 'users', targetUid, 'trips'));
    const unsubTrips = onSnapshot(qTrips, (snapshot) => {
      setStats(prev => ({ ...prev, tripsCount: snapshot.size }));
      setStatsLoading(false);
    });

    syncFriendship();

    return () => {
      unsubscribePosts();
      unsubFriends();
      unsubTrips();
    };
  }, [targetUid, syncFriendship]);

  const handleAddFriend = async () => {
    if (!currentUser || !targetUid) return;
    setFriendshipLoading(true);
    try {
      const senderInfo = {
        uid: currentUser.uid,
        displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Biker',
        avatarUrl: currentUser.photoURL || null,
      };
      const receiverInfo = {
        uid: targetUid,
        displayName: (name as string) || 'Biker',
        avatarUrl: (avatar as string) || null,
      };
      const fId = await sendFriendRequest(currentUser.uid, targetUid, senderInfo, receiverInfo);
      setFriendshipId(fId);
      setFriendshipStatus('pending_sent');
      Alert.alert('Thành công', 'Đã gửi lời mời kết bạn!');
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      Alert.alert('Lỗi', 'Không thể gửi lời mời kết bạn.');
    } finally {
      setFriendshipLoading(false);
    }
  };

  const handleRevokeRequest = async () => {
    if (!currentUser || !friendshipId) return;
    setFriendshipLoading(true);
    try {
      await revokeFriendRequest(friendshipId, currentUser.uid);
      setFriendshipStatus('none');
      setFriendshipId(null);
    } catch (error) {
      console.error('Error revoking friend request:', error);
      Alert.alert('Lỗi', 'Không thể thu hồi lời mời.');
    } finally {
      setFriendshipLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!currentUser || !friendshipId) return;
    setFriendshipLoading(true);
    try {
      await acceptFriendRequest(friendshipId, currentUser.uid);
      setFriendshipStatus('friends');
      Alert.alert('Thành công', 'Đã đồng ý kết bạn!');
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Lỗi', 'Không thể chấp nhận lời mời.');
    } finally {
      setFriendshipLoading(false);
    }
  };

  const handleDeclineRequest = async () => {
    if (!currentUser || !friendshipId) return;
    setFriendshipLoading(true);
    try {
      await declineFriendRequest(friendshipId, currentUser.uid);
      setFriendshipStatus('none');
      setFriendshipId(null);
    } catch (error) {
      console.error('Error declining friend request:', error);
      Alert.alert('Lỗi', 'Không thể từ chối lời mời.');
    } finally {
      setFriendshipLoading(false);
    }
  };

  const handleUnfriend = async () => {
    if (!currentUser || !friendshipId) return;
    setFriendshipLoading(true);
    try {
      await unfriend(friendshipId, currentUser.uid);
      setFriendshipStatus('none');
      setFriendshipId(null);
      Alert.alert('Hoàn tất', 'Đã hủy kết bạn.');
    } catch (error) {
      console.error('Error unfriending:', error);
      Alert.alert('Lỗi', 'Không thể hủy kết bạn lúc này.');
    } finally {
      setFriendshipLoading(false);
    }
  };

  const handleDirectMessage = () => {
    router.push(`/chat/${targetUid}?name=${name || 'Biker'}&avatar=${encodeURIComponent((avatar as string) || '')}` as any);
  };

  const handlePostClick = (post: IPost) => {
    router.push(`/post/${post.id}` as any);
  };

  const ProfileHeader = () => (
    <View>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 5 }}>
          <ArrowLeft size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{name || 'Hồ sơ Biker'}</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.profileCard}>
        {avatar ? (
          <Image source={{ uri: avatar as string }} style={styles.avatar} />
        ) : (
          <View style={styles.avatar}><User size={40} color={COLORS.bg} /></View>
        )}
        <Text style={styles.name}>{name || 'Biker'}</Text>
        
        {bikeObj ? (
           <View style={styles.bikeDisplay}>
             <Compass size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
             <Text style={styles.bikeText}>
               Garage: <Text style={{color: 'white'}}>{bikeObj.nickname}</Text> ({bikeObj.model})
             </Text>
           </View>
        ) : null}

        {/* 3-Column Instagram Stats Row */}
        <ProfileStatsRow stats={stats} loading={statsLoading} />

        {/* Friendship Action Buttons */}
        <FriendshipActionButtons
          status={friendshipStatus}
          isSelf={isSelf}
          loading={friendshipLoading}
          onAddFriend={handleAddFriend}
          onRevokeRequest={handleRevokeRequest}
          onAcceptRequest={handleAcceptRequest}
          onDeclineRequest={handleDeclineRequest}
          onUnfriend={handleUnfriend}
          onDirectMessage={handleDirectMessage}
        />
      </View>

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
          data={userPosts}
          keyExtractor={item => item.id}
          ListHeaderComponent={<ProfileHeader />}
          numColumns={3}
          key={'other-user-grid'}
          contentContainerStyle={{ paddingBottom: 50, maxWidth: 600, width: '100%', alignSelf: 'center' }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Biker này chưa có bài viết nào</Text>
            </View>
          }
          renderItem={({ item }) => <PostGridItem post={item} onPress={handlePostClick} />}
        />
      ) : (
        <FlatList 
          data={userPosts} 
          keyExtractor={item => item.id} 
          ListHeaderComponent={<ProfileHeader />}
          key={'other-user-feed'}
          contentContainerStyle={{ paddingBottom: 50, maxWidth: 600, width: '100%', alignSelf: 'center' }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Biker này chưa có bài viết nào</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.miniPost}>
              {item.isShared && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                  <Repeat size={14} color={COLORS.primary} />
                  <Text style={styles.sharedBadge}>Đã Repost từ {item.sharedFromStr}</Text>
                </View>
              )}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderColor: '#333' },
  title: { color: 'white', fontWeight: '900', fontSize: 18 },
  profileCard: { backgroundColor: COLORS.card, marginHorizontal: 16, marginVertical: 12, padding: 18, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  name: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  
  bikeDisplay: { flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: 'rgba(227, 27, 35, 0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.primary },
  bikeText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 13 },

  tabSwitcher: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#333', marginTop: 10 },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  activeTabBtn: { borderBottomWidth: 2, borderColor: '#E31B23' },

  miniPost: { backgroundColor: COLORS.card, marginHorizontal: 20, marginBottom: 12, padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  sharedBadge: { color: COLORS.primary, fontSize: 12, fontWeight: 'bold' },
  miniPostText: { color: COLORS.text, fontSize: 15, lineHeight: 22 },
  statsBar: { flexDirection: 'row', gap: 20, marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#333' },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { color: COLORS.textDim, fontSize: 14, fontWeight: 'bold' },
  emptyBox: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLORS.textDim, fontSize: 14 },
});
