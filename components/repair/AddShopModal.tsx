import React, { memo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Plus, X, MapPin, Phone, Clock, LifeBuoy, AlertCircle } from 'lucide-react-native';
import { ICreateRepairShopInput } from '../../interfaces/repairShop';
import { HIGTheme, HIGTouchTarget } from '../../constants/theme';

interface IAddShopModalProps {
  visible: boolean;
  userCoords: { latitude: number; longitude: number } | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (shopData: ICreateRepairShopInput) => Promise<void>;
}

const AddShopModal = memo(({
  visible,
  userCoords,
  submitting,
  onClose,
  onSubmit,
}: IAddShopModalProps) => {
  const theme = 'dark';
  const colors = HIGTheme[theme];

  const [name, setName] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [openingHours, setOpeningHours] = useState<string>('7:30 - 18:30');
  const [isRescueService, setIsRescueService] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setFormError('Vui lòng nhập tên tiệm sửa xe.');
      return;
    }
    if (!address.trim()) {
      setFormError('Vui lòng nhập địa chỉ tiệm.');
      return;
    }
    if (!userCoords) {
      setFormError('Chưa có tọa độ GPS. Vui lòng bật vị trí.');
      return;
    }
    setFormError(null);

    await onSubmit({
      name: name.trim(),
      address: address.trim(),
      latitude: userCoords.latitude,
      longitude: userCoords.longitude,
      phone: phone.trim() || undefined,
      openingHours: openingHours.trim() || undefined,
      isRescueService,
    });

    // Reset fields
    setName('');
    setAddress('');
    setPhone('');
    setIsRescueService(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={[styles.container, { backgroundColor: colors.systemBackground, borderColor: colors.separator }]}>
          <View style={[styles.header, { borderBottomColor: colors.separator }]}>
            <Text style={[styles.title, { color: colors.label }]}>ĐÓNG GÓP TIỆM SỬA XE MỚI</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={colors.secondaryLabel} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {/* Shop Name */}
            <Text style={[styles.label, { color: colors.label }]}>Tên tiệm sửa xe / Điểm cứu hộ *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.secondarySystemBackground, color: colors.label, borderColor: colors.separator }]}
              placeholder="Ví dụ: Tiệm Sửa Xe Bảy Cường"
              placeholderTextColor={colors.secondaryLabel}
              value={name}
              onChangeText={setName}
            />

            {/* Address */}
            <Text style={[styles.label, { color: colors.label }]}>Địa chỉ chi tiết *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.secondarySystemBackground, color: colors.label, borderColor: colors.separator }]}
              placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
              placeholderTextColor={colors.secondaryLabel}
              value={address}
              onChangeText={setAddress}
            />

            {/* Phone */}
            <Text style={[styles.label, { color: colors.label }]}>Số điện thoại liên hệ</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.secondarySystemBackground, color: colors.label, borderColor: colors.separator }]}
              placeholder="Số hotline hoặc số thợ sửa (Ví dụ: 0901234567)"
              placeholderTextColor={colors.secondaryLabel}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            {/* Opening hours */}
            <Text style={[styles.label, { color: colors.label }]}>Giờ hoạt động</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.secondarySystemBackground, color: colors.label, borderColor: colors.separator }]}
              placeholder="Ví dụ: 24/7 hoặc 7:30 - 19:00"
              placeholderTextColor={colors.secondaryLabel}
              value={openingHours}
              onChangeText={setOpeningHours}
            />

            {/* 24/7 Rescue Switch */}
            <View style={[styles.switchRow, { backgroundColor: colors.secondarySystemBackground, borderColor: colors.separator }]}>
              <View style={styles.switchTextGroup}>
                <View style={styles.switchTitleRow}>
                  <LifeBuoy size={16} color={colors.systemRed} />
                  <Text style={[styles.switchTitle, { color: colors.label }]}>Có dịch vụ cứu hộ 24/7</Text>
                </View>
                <Text style={[styles.switchSubtitle, { color: colors.secondaryLabel }]}>
                  Tiệm có hỗ trợ vá săm đêm, cứu hộ xe chết máy trên đường
                </Text>
              </View>
              <Switch
                value={isRescueService}
                onValueChange={setIsRescueService}
                trackColor={{ false: colors.separator, true: '#E31B23' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Current GPS Coordinates info */}
            <View style={[styles.gpsBadge, { backgroundColor: 'rgba(0, 122, 255, 0.1)', borderColor: 'rgba(0, 122, 255, 0.3)' }]}>
              <MapPin size={14} color="#007AFF" />
              <Text style={styles.gpsText}>
                {userCoords
                  ? `Vị trí GPS: ${userCoords.latitude.toFixed(4)}, ${userCoords.longitude.toFixed(4)}`
                  : 'Đang xác định tọa độ GPS...'}
              </Text>
            </View>

            {formError ? (
              <View style={styles.errorRow}>
                <AlertCircle size={14} color={colors.systemRed} />
                <Text style={[styles.errorText, { color: colors.systemRed }]}>{formError}</Text>
              </View>
            ) : null}

            {/* Submit button */}
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Plus size={18} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>THÊM TIỆM MỚI</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    padding: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    gap: 12,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  switchTextGroup: {
    flex: 1,
    paddingRight: 10,
    gap: 2,
  },
  switchTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  switchSubtitle: {
    fontSize: 11,
    lineHeight: 16,
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  gpsText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E31B23',
    height: HIGTouchTarget.min,
    borderRadius: 12,
    marginTop: 10,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});

export default AddShopModal;
