import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X, Wrench, Gauge, DollarSign, Tag, Check } from 'lucide-react-native';
import { IBike } from '../../interfaces/bike';
import { replaceMaintenancePart } from '../../services/bikeService';
import { COLORS } from '../../constants/colors';
import { HIGTouchTarget } from '../../constants/theme';

interface IQuickLogModalProps {
  activePartService: { id: string; name: string } | null;
  bikeObj: IBike;
  uid: string;
  onClose: () => void;
  onSuccess: (updatedBike: IBike) => void;
}

export default function QuickLogModal({
  activePartService,
  bikeObj,
  uid,
  onClose,
  onSuccess,
}: IQuickLogModalProps) {
  const [odoInput, setOdoInput] = useState<string>('');
  const [priceInput, setPriceInput] = useState<string>('');
  const [noteInput, setNoteInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const currentOdo = Math.max(0, Math.floor(bikeObj.odo) || 0);

  useEffect(() => {
    if (activePartService && bikeObj) {
      setOdoInput(currentOdo.toString());
      setPriceInput('');
      setNoteInput('');
      setIsSubmitting(false);
    }
  }, [activePartService, bikeObj, currentOdo]);

  if (!activePartService) return null;

  const handlePriceChange = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    if (!digitsOnly) {
      setPriceInput('');
      return;
    }
    const numericValue = parseInt(digitsOnly, 10);
    if (Number.isFinite(numericValue) && numericValue <= 500000000) {
      setPriceInput(numericValue.toString());
    }
  };

  const handleOdoChange = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    if (!digitsOnly) {
      setOdoInput('');
      return;
    }
    const numericValue = parseInt(digitsOnly, 10);
    if (Number.isFinite(numericValue) && numericValue <= 1000000) {
      setOdoInput(numericValue.toString());
    }
  };

  const executePartService = async () => {
    const parsedOdo = parseInt(odoInput.replace(/[^0-9]/g, ''), 10);
    const parsedPrice = parseInt(priceInput.replace(/[^0-9]/g, ''), 10);

    if (isNaN(parsedOdo) || parsedOdo < 0 || parsedOdo > 1000000) {
      if (Platform.OS === 'web') {
        window.alert('Vui lòng nhập chỉ số ODO hợp lệ (từ 0 đến 1.000.000 km)!');
      } else {
        Alert.alert('Lỗi nhập liệu', 'Vui lòng nhập chỉ số ODO hợp lệ (từ 0 đến 1.000.000 km)!');
      }
      return;
    }

    if (!priceInput.trim() || isNaN(parsedPrice) || parsedPrice < 0) {
      if (Platform.OS === 'web') {
        window.alert('Vui lòng nhập giá tiền hợp lệ!');
      } else {
        Alert.alert('Thiếu thông tin', 'Vui lòng nhập giá tiền hợp lệ!');
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await replaceMaintenancePart(uid, {
        bikeId: bikeObj.id || 'default',
        partId: activePartService.id,
        partName: activePartService.name,
        price: parsedPrice,
        note: noteInput.trim(),
        odoAtService: parsedOdo,
      });

      onSuccess(result.updatedBike);
      onClose();

      const successMsg = `Đã lưu Y bạ và làm mới hao mòn cho [${activePartService.name}] tại mốc ${parsedOdo.toLocaleString('vi-VN')} km.`;
      if (Platform.OS === 'web') {
        window.alert(successMsg);
      } else {
        Alert.alert('Thành công', successMsg);
      }
    } catch (error: any) {
      console.error('Lỗi khi ghi nhận bảo trì:', error);
      const errMsg = error?.message || 'Không thể lưu dữ liệu.';
      if (Platform.OS === 'web') {
        window.alert(errMsg);
      } else {
        Alert.alert('Lỗi', errMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={!!activePartService} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.quickLogOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <View style={styles.quickLogBox}>
            <View style={styles.quickLogHeader}>
              <View style={styles.titleWithIcon}>
                <Wrench size={18} color={COLORS.primary} />
                <Text style={styles.quickLogTitle}>Thay thế {activePartService.name}</Text>
              </View>
              <TouchableOpacity onPress={onClose} disabled={isSubmitting} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color={COLORS.textDim} />
              </TouchableOpacity>
            </View>

            <Text style={styles.helpText}>
              Ghi nhận vào Y bạ và tự động làm mới thanh hao mòn cho mốc ODO đã thực hiện.
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Mốc ODO bảo dưỡng (km) *</Text>
              <View style={styles.inputWrapper}>
                <Gauge size={16} color={COLORS.textDim} />
                <TextInput
                  style={styles.formInput}
                  placeholder="Ví dụ: 15000"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  value={odoInput}
                  onChangeText={handleOdoChange}
                  editable={!isSubmitting}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Chi phí (VND) *</Text>
                {priceInput ? (
                  <Text style={styles.currencyPreview}>
                    {parseInt(priceInput, 10).toLocaleString('vi-VN')} đ
                  </Text>
                ) : null}
              </View>
              <View style={styles.inputWrapper}>
                <DollarSign size={16} color={COLORS.safe} />
                <TextInput
                  style={styles.formInput}
                  placeholder="Ví dụ: 250000"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  value={priceInput}
                  onChangeText={handlePriceChange}
                  editable={!isSubmitting}
                  autoFocus
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Ghi chú (Tên hãng, nơi thay...)</Text>
              <View style={styles.inputWrapper}>
                <Tag size={16} color={COLORS.textDim} />
                <TextInput
                  style={styles.formInput}
                  placeholder="Ví dụ: Nhớt Motul 300V - Tiệm Bảy Gò Vấp"
                  placeholderTextColor="#666"
                  maxLength={250}
                  value={noteInput}
                  onChangeText={setNoteInput}
                  editable={!isSubmitting}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.quickLogSubmitBtn, isSubmitting && styles.btnDisabled]}
              onPress={executePartService}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Check size={18} color="#FFFFFF" />
                  <Text style={styles.btnText}>Lưu & Làm mới Hao mòn</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  quickLogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  keyboardContainer: {
    width: '100%',
    alignItems: 'center',
  },
  quickLogBox: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  quickLogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  quickLogTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  helpText: {
    color: COLORS.textDim,
    fontSize: 12,
    marginBottom: 16,
    lineHeight: 16,
  },
  formGroup: {
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  inputLabel: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  currencyPreview: {
    color: COLORS.safe,
    fontSize: 12,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    paddingHorizontal: 10,
  },
  formInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  quickLogSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: 8,
    marginTop: 8,
    minHeight: HIGTouchTarget.min,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});

