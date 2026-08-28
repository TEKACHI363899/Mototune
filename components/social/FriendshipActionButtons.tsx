import React, { memo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { UserPlus, UserCheck, UserX, Check, X, MessageCircle } from 'lucide-react-native';
import { TFriendshipStatus } from '../../interfaces/social';
import { HIGTheme } from '../../constants/theme';

interface IFriendshipActionButtonsProps {
  status: TFriendshipStatus;
  isSelf: boolean;
  loading?: boolean;
  onAddFriend: () => void;
  onRevokeRequest: () => void;
  onAcceptRequest: () => void;
  onDeclineRequest: () => void;
  onUnfriend: () => void;
  onDirectMessage: () => void;
}

const FriendshipActionButtons = memo(({
  status,
  isSelf,
  loading = false,
  onAddFriend,
  onRevokeRequest,
  onAcceptRequest,
  onDeclineRequest,
  onUnfriend,
  onDirectMessage,
}: IFriendshipActionButtonsProps) => {
  const theme = 'dark';
  const colors = HIGTheme[theme];

  if (isSelf) return null;

  const handleConfirmUnfriend = () => {
    Alert.alert(
      'Hủy kết bạn',
      'Bạn có chắc muốn hủy kết bạn không?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Hủy kết bạn', style: 'destructive', onPress: onUnfriend },
      ]
    );
  };

  const handleConfirmRevoke = () => {
    Alert.alert(
      'Thu hồi lời mời',
      'Hủy lời mời kết bạn đã gửi?',
      [
        { text: 'Không', style: 'cancel' },
        { text: 'Thu hồi', style: 'destructive', onPress: onRevokeRequest },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={colors.systemRed} />
        </View>
      ) : (
        <View style={styles.buttonRow}>
          {/* Main Action based on Relationship Status */}
          <View style={styles.primaryActionWrapper}>
            {/* Status NONE: Add Friend */}
            {status === 'none' && (
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={onAddFriend}
                activeOpacity={0.8}
              >
                <UserPlus size={18} color="#FFFFFF" />
                <Text style={styles.btnTextWhite}>Kết bạn</Text>
              </TouchableOpacity>
            )}

            {/* Status PENDING_SENT: Revoke */}
            {status === 'pending_sent' && (
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={handleConfirmRevoke}
                activeOpacity={0.8}
              >
                <UserX size={18} color={colors.secondaryLabel} />
                <Text style={[styles.btnTextSecondary, { color: colors.secondaryLabel }]}>
                  Đã gửi
                </Text>
              </TouchableOpacity>
            )}

            {/* Status PENDING_RECEIVED: Accept / Decline */}
            {status === 'pending_received' && (
              <View style={styles.twinGroup}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnAccept]}
                  onPress={onAcceptRequest}
                  activeOpacity={0.8}
                >
                  <Check size={18} color="#FFFFFF" />
                  <Text style={styles.btnTextWhite}>Đồng ý</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnDecline]}
                  onPress={onDeclineRequest}
                  activeOpacity={0.8}
                >
                  <X size={18} color="#FFFFFF" />
                  <Text style={styles.btnTextWhite}>Từ chối</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Status FRIENDS: Unfriend */}
            {status === 'friends' && (
              <TouchableOpacity
                style={[styles.btn, styles.btnFriends]}
                onPress={handleConfirmUnfriend}
                activeOpacity={0.8}
              >
                <UserCheck size={18} color="#34C759" />
                <Text style={styles.btnTextFriends}>Bạn bè</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Direct Message Icon Button (Instagram style) */}
          <TouchableOpacity
            style={styles.btnChatIcon}
            onPress={onDirectMessage}
            activeOpacity={0.8}
          >
            <MessageCircle size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 14,
  },
  loadingBox: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  primaryActionWrapper: {
    flex: 1,
  },
  twinGroup: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  btnPrimary: {
    backgroundColor: '#E31B23',
  },
  btnSecondary: {
    backgroundColor: '#222224',
    borderWidth: 1,
    borderColor: '#333336',
  },
  btnAccept: {
    backgroundColor: '#34C759',
  },
  btnDecline: {
    backgroundColor: '#3A3A3C',
  },
  btnFriends: {
    backgroundColor: '#16281E',
    borderWidth: 1,
    borderColor: '#34C759',
  },
  btnChatIcon: {
    width: 44,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTextWhite: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  btnTextSecondary: {
    fontSize: 13,
    fontWeight: '700',
  },
  btnTextFriends: {
    color: '#34C759',
    fontSize: 13,
    fontWeight: '800',
  },
});

export default FriendshipActionButtons;
