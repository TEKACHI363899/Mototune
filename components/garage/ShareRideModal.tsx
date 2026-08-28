import React, { memo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Share2, MessageCircle, X } from 'lucide-react-native';
import { HIGTheme } from '../../constants/theme';

interface IShareRideModalProps {
  visible: boolean;
  onClose: () => void;
  onShareToFeed: () => void;
  onSendInChat: () => void;
}

const ShareRideModal = memo(({
  visible,
  onClose,
  onShareToFeed,
  onSendInChat,
}: IShareRideModalProps) => {
  const theme = 'dark';
  const colors = HIGTheme[theme];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, { backgroundColor: '#18181A', borderColor: '#2C2C2E' }]}>
              {/* Header */}
              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetTitle, { color: colors.label }]}>
                  Chia sẻ hành trình với Garage Crew
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <X size={20} color={colors.secondaryLabel} />
                </TouchableOpacity>
              </View>

              {/* Options */}
              <View style={styles.optionsList}>
                <TouchableOpacity
                  style={[styles.optionItem, { backgroundColor: '#222224' }]}
                  onPress={onShareToFeed}
                  activeOpacity={0.75}
                >
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(227, 27, 35, 0.15)' }]}>
                    <Share2 size={20} color="#E31B23" />
                  </View>
                  <View style={styles.optionTextCol}>
                    <Text style={[styles.optionTitle, { color: colors.label }]}>
                      Chia sẻ lên Bảng tin
                    </Text>
                    <Text style={[styles.optionSub, { color: colors.secondaryLabel }]}>
                      Đăng lộ trình và chỉ số hành trình lên cộng đồng
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.optionItem, { backgroundColor: '#222224' }]}
                  onPress={onSendInChat}
                  activeOpacity={0.75}
                >
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(0, 122, 255, 0.15)' }]}>
                    <MessageCircle size={20} color="#007AFF" />
                  </View>
                  <View style={styles.optionTextCol}>
                    <Text style={[styles.optionTitle, { color: colors.label }]}>
                      Gửi qua Tin nhắn trực tiếp
                    </Text>
                    <Text style={[styles.optionSub, { color: colors.secondaryLabel }]}>
                      Chọn một người bạn hoặc nhóm để chia sẻ riêng
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Cancel */}
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: '#333336' }]}
                onPress={onClose}
              >
                <Text style={[styles.cancelText, { color: colors.secondaryLabel }]}>Hủy</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    gap: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 4,
  },
  optionsList: {
    gap: 12,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTextCol: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  optionSub: {
    fontSize: 12,
  },
  cancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default ShareRideModal;
