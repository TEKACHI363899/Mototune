import React, { memo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Activity, ChevronRight, RefreshCw, AlertCircle, Users, Compass } from 'lucide-react-native';
import { IFriendTrip } from '../../interfaces/social';
import { HIGTheme, HIGSpacing, HIGTypography } from '../../constants/theme';

interface IFriendsInMotionCardProps {
  friendTrips: IFriendTrip[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onViewAll: () => void;
  onSelectTrip: (trip: IFriendTrip) => void;
  onShareRide: () => void;
}

const formatTimeAgo = (timestamp: number): string => {
  if (!timestamp) return '';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'VỪA XONG';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} PHÚT`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} GIỜ`;
  return `${Math.floor(hours / 24)} NGÀY`;
};

const FriendsInMotionCard = memo(({
  friendTrips,
  loading,
  error,
  onRetry,
  onViewAll,
  onSelectTrip,
  onShareRide,
}: IFriendsInMotionCardProps) => {
  const theme = 'dark';
  const colors = HIGTheme[theme];
  const previewTrips = friendTrips.slice(0, 3);

  return (
    <View style={[styles.card, { backgroundColor: '#141416', borderColor: '#222224' }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>HÀNH TRÌNH BẠN BÈ</Text>
        <TouchableOpacity onPress={onViewAll} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.viewAllText}>XEM TẤT CẢ</Text>
        </TouchableOpacity>
      </View>

      {/* Body States */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color="#E31B23" />
          <Text style={styles.stateText}>Đang tải hành trình bạn bè...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <AlertCircle size={20} color="#E31B23" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
            <RefreshCw size={14} color="#FFFFFF" />
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : friendTrips.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Users size={28} color="#8E8E93" />
          <Text style={styles.emptyText}>Chưa có bạn bè nào chia sẻ hành trình</Text>
          <Text style={styles.emptySubText}>Kết bạn với các Biker khác để xem lộ trình của họ</Text>
        </View>
      ) : (
        <View style={styles.tripsList}>
          {previewTrips.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.tripRow}
              onPress={() => onSelectTrip(item)}
              activeOpacity={0.7}
            >
              {/* Avatar / Bike Icon */}
              <View style={styles.avatarWrapper}>
                {item.userAvatar ? (
                  <Image source={{ uri: item.userAvatar }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Compass size={20} color="#E31B23" />
                  </View>
                )}
              </View>

              {/* Rider and Trip Info */}
              <View style={styles.infoCol}>
                <Text style={styles.riderNameBike} numberOfLines={1}>
                  {item.userName.toUpperCase()} / {item.bikeModel.toUpperCase()}
                </Text>
                <Text style={styles.routeCaption} numberOfLines={1}>
                  {item.routeCaption}
                </Text>
              </View>

              {/* Timestamp */}
              <View style={styles.timeCol}>
                <Text style={styles.timeAgoText}>{formatTimeAgo(item.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Share Ride with Garage Crew Banner */}
      <TouchableOpacity
        style={styles.shareBanner}
        onPress={onShareRide}
        activeOpacity={0.8}
      >
        <View style={styles.shareBannerLeft}>
          <Activity size={18} color="#E31B23" />
          <Text style={styles.shareBannerText}>Share a ride with your garage crew</Text>
        </View>
        <ChevronRight size={18} color="#E31B23" />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  viewAllText: {
    color: '#E31B23',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  tripsList: {
    gap: 12,
    marginBottom: 16,
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  avatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E1214',
    borderWidth: 1,
    borderColor: 'rgba(227, 27, 35, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  riderNameBike: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  routeCaption: {
    color: '#8E8E93',
    fontSize: 12,
    lineHeight: 16,
  },
  timeCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  timeAgoText: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  shareBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F0F11',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#261517',
  },
  shareBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  shareBannerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  centerContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stateText: {
    color: '#8E8E93',
    fontSize: 13,
  },
  errorText: {
    color: '#E31B23',
    fontSize: 13,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubText: {
    color: '#8E8E93',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default FriendsInMotionCard;
