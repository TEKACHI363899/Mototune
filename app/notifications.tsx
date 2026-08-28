import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, Check, X, Bell, UserPlus, Heart, MessageCircle, CheckCheck } from 'lucide-react-native';
import { auth } from '../firebaseConfig';
import {
  subscribePendingReceivedRequests,
  acceptFriendRequest,
  declineFriendRequest,
} from '../services/friendService';
import {
  subscribeNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/notificationService';
import { IFriendship, INotification } from '../interfaces/social';
import { HIGTheme, HIGSpacing, HIGTouchTarget } from '../constants/theme';

export default function NotificationsScreen() {
  const router = useRouter();
  const theme = 'dark';
  const colors = HIGTheme[theme];
  const currentUser = auth.currentUser;

  const [activeTab, setActiveTab] = useState<'requests' | 'activity'>('requests');
  const [requests, setRequests] = useState<IFriendship[]>([]);
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(true);
  const [loadingNotifications, setLoadingNotifications] = useState<boolean>(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const unsubRequests = subscribePendingReceivedRequests(currentUser.uid, (list) => {
      setRequests(list);
      setLoadingRequests(false);
    });

    const unsubNotifs = subscribeNotifications(currentUser.uid, (list) => {
      setNotifications(list);
      setLoadingNotifications(false);
    });

    return () => {
      unsubRequests();
      unsubNotifs();
    };
  }, [currentUser]);

  const handleAccept = async (friendship: IFriendship) => {
    if (!currentUser) return;
    setActionInProgress(friendship.id);
    try {
      await acceptFriendRequest(friendship.id, currentUser.uid);
      Alert.alert('Thành công', 'Đã đồng ý kết bạn!');
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Lỗi', 'Không thể đồng ý kết bạn lúc này.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDecline = async (friendship: IFriendship) => {
    if (!currentUser) return;
    setActionInProgress(friendship.id);
    try {
      await declineFriendRequest(friendship.id, currentUser.uid);
    } catch (error) {
      console.error('Error declining friend request:', error);
      Alert.alert('Lỗi', 'Không thể từ chối lúc này.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    try {
      await markAllNotificationsAsRead(currentUser.uid);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = async (notif: INotification) => {
    if (!currentUser) return;
    try {
      if (!notif.isRead) {
        await markNotificationAsRead(notif.id, currentUser.uid);
      }
      if (notif.type === 'friend_request') {
        setActiveTab('requests');
      } else if (notif.targetId && notif.type !== 'friend_accept') {
        router.push(`/post/${notif.targetId}` as any);
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  const renderRequestItem = ({ item }: { item: IFriendship }) => {
    const senderInfo = item.usersInfo[item.senderId] || { displayName: 'Biker Ẩn Danh', avatarUrl: null };
    const isProcessing = actionInProgress === item.id;

    return (
      <View style={[styles.requestCard, { backgroundColor: colors.secondarySystemBackground, borderColor: colors.separator }]}>
        <TouchableOpacity
          style={styles.cardLeft}
          onPress={() => router.push(`/user/${item.senderId}?name=${senderInfo.displayName}&avatar=${encodeURIComponent(senderInfo.avatarUrl || '')}` as any)}
        >
          {senderInfo.avatarUrl ? (
            <Image source={{ uri: senderInfo.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: '#2C2C2E' }]}>
              <User size={20} color={colors.secondaryLabel} />
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.label }]}>{senderInfo.displayName}</Text>
            <Text style={[styles.subText, { color: colors.secondaryLabel }]}>Đã gửi lời mời kết bạn</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.actionButtons}>
          {isProcessing ? (
            <ActivityIndicator size="small" color={colors.systemRed} />
          ) : (
            <>
              <TouchableOpacity
                style={[styles.acceptBtn, { backgroundColor: '#34C759' }]}
                onPress={() => handleAccept(item)}
                activeOpacity={0.8}
              >
                <Check size={16} color="#FFFFFF" />
                <Text style={styles.btnTextWhite}>Đồng ý</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.declineBtn, { backgroundColor: '#3A3A3C' }]}
                onPress={() => handleDecline(item)}
                activeOpacity={0.8}
              >
                <X size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderNotificationItem = ({ item }: { item: INotification }) => {
    return (
      <TouchableOpacity
        style={[
          styles.notifCard,
          { backgroundColor: item.isRead ? colors.systemBackground : colors.secondarySystemBackground, borderBottomColor: colors.separator },
        ]}
        onPress={() => handleNotificationClick(item)}
        activeOpacity={0.75}
      >
        <View style={styles.notifIconBox}>
          {item.type === 'friend_request' && <UserPlus size={18} color="#007AFF" />}
          {item.type === 'friend_accept' && <Check size={18} color="#34C759" />}
          {item.type === 'post_like' && <Heart size={18} color="#E31B23" />}
          {item.type === 'post_comment' && <MessageCircle size={18} color="#FF9500" />}
          {item.type === 'trip_shared' && <Bell size={18} color="#E31B23" />}
        </View>

        <View style={styles.notifContent}>
          <Text style={[styles.notifTitle, { color: colors.label }]}>
            <Text style={{ fontWeight: 'bold' }}>{item.senderName} </Text>
            {item.message}
          </Text>
          <Text style={[styles.notifTime, { color: colors.secondaryLabel }]}>
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : ''}
          </Text>
        </View>

        {!item.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.systemBackground }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.systemBackground} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.label} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.label }]}>THÔNG BÁO</Text>
        {activeTab === 'activity' && notifications.some(n => !n.isRead) ? (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
            <CheckCheck size={20} color={colors.systemRed} />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      {/* Tab Switcher */}
      <View style={[styles.tabBar, { borderBottomColor: colors.separator }]}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'requests' && styles.activeTabItem]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'requests' ? colors.systemRed : colors.secondaryLabel }]}>
            Lời mời kết bạn ({requests.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'activity' && styles.activeTabItem]}
          onPress={() => setActiveTab('activity')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'activity' ? colors.systemRed : colors.secondaryLabel }]}>
            Hoạt động ({notifications.filter(n => !n.isRead).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'requests' ? (
        loadingRequests ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.systemRed} />
          </View>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id}
            renderItem={renderRequestItem}
            contentContainerStyle={styles.listPadding}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <UserPlus size={44} color={colors.secondaryLabel} />
                <Text style={[styles.emptyTitle, { color: colors.label }]}>Không có lời mời nào</Text>
                <Text style={[styles.emptySub, { color: colors.secondaryLabel }]}>
                  Khi các Biker khác gửi lời mời kết bạn, bạn sẽ thấy ở đây
                </Text>
              </View>
            }
          />
        )
      ) : (
        loadingNotifications ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.systemRed} />
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={renderNotificationItem}
            contentContainerStyle={styles.listPadding}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Bell size={44} color={colors.secondaryLabel} />
                <Text style={[styles.emptyTitle, { color: colors.label }]}>Chưa có thông báo nào</Text>
                <Text style={[styles.emptySub, { color: colors.secondaryLabel }]}>
                  Các thông báo tương tác của bạn sẽ xuất hiện ở đây
                </Text>
              </View>
            }
          />
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    padding: 4,
    minHeight: HIGTouchTarget.min,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1,
  },
  markAllBtn: {
    padding: 4,
    minHeight: HIGTouchTarget.min,
    justifyContent: 'center',
  },
  placeholder: {
    width: 32,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabItem: {
    borderBottomWidth: 2,
    borderColor: '#E31B23',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '800',
  },
  listPadding: {
    padding: 16,
    gap: 12,
  },
  requestCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  subText: {
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  declineBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnTextWhite: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  notifIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E1E20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifContent: {
    flex: 1,
    gap: 4,
  },
  notifTitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  notifTime: {
    fontSize: 11,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E31B23',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
  },
});
