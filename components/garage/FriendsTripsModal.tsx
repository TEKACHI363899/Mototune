import React, { memo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { X, Users, Compass, ChevronRight } from 'lucide-react-native';
import { IFriendTrip } from '../../interfaces/social';
import { HIGTheme, HIGSpacing } from '../../constants/theme';

interface IFriendsTripsModalProps {
  visible: boolean;
  friendTrips: IFriendTrip[];
  onClose: () => void;
  onSelectTrip: (trip: IFriendTrip) => void;
}

const formatTimeAgo = (timestamp: number): string => {
  if (!timestamp) return '';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Vừa xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
};

const formatDuration = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '00:00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const FriendsTripsModal = memo(({
  visible,
  friendTrips,
  onClose,
  onSelectTrip,
}: IFriendsTripsModalProps) => {
  const theme = 'dark';
  const colors = HIGTheme[theme];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.systemBackground }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.separator }]}>
          <View style={styles.headerTitleGroup}>
            <Users size={20} color={colors.systemRed} />
            <Text style={[styles.headerTitle, { color: colors.label }]}>HÀNH TRÌNH BẠN BÈ</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={24} color={colors.label} />
          </TouchableOpacity>
        </View>

        {/* List */}
        <FlatList
          data={friendTrips}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Users size={40} color={colors.secondaryLabel} />
              <Text style={[styles.emptyText, { color: colors.secondaryLabel }]}>
                Chưa có chuyến đi nào từ bạn bè
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.tripCard, { backgroundColor: colors.secondarySystemBackground, borderColor: colors.separator }]}
              onPress={() => onSelectTrip(item)}
              activeOpacity={0.75}
            >
              <View style={styles.cardHeader}>
                <View style={styles.avatarWrapper}>
                  {item.userAvatar ? (
                    <Image source={{ uri: item.userAvatar }} style={styles.avatarImage} />
                  ) : (
                    <Compass size={20} color={colors.systemRed} />
                  )}
                </View>
                <View style={styles.userMeta}>
                  <Text style={[styles.userName, { color: colors.label }]}>{item.userName}</Text>
                  <Text style={[styles.bikeModel, { color: colors.systemRed }]}>{item.bikeModel}</Text>
                </View>
                <Text style={[styles.timeAgo, { color: colors.secondaryLabel }]}>
                  {formatTimeAgo(item.createdAt)}
                </Text>
              </View>

              <Text style={[styles.caption, { color: colors.label }]}>
                {item.routeCaption}
              </Text>

              <View style={[styles.metricsFooter, { borderTopColor: colors.separator }]}>
                <Text style={[styles.metricItem, { color: colors.secondaryLabel }]}>
                  Quãng đường: <Text style={{ color: colors.label, fontWeight: 'bold' }}>{item.distanceKm.toFixed(1)} km</Text>
                </Text>
                <Text style={[styles.metricItem, { color: colors.secondaryLabel }]}>
                  Thời gian: <Text style={{ color: colors.label, fontWeight: 'bold' }}>{formatDuration(item.durationSeconds)}</Text>
                </Text>
                <ChevronRight size={16} color={colors.systemRed} style={{ marginLeft: 'auto' }} />
              </View>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1,
  },
  closeBtn: {
    padding: 4,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  tripCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  userMeta: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '800',
  },
  bikeModel: {
    fontSize: 12,
    fontWeight: '700',
  },
  timeAgo: {
    fontSize: 11,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
  },
  metricsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    gap: 14,
  },
  metricItem: {
    fontSize: 12,
  },
});

export default FriendsTripsModal;
