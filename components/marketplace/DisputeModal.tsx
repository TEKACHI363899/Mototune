import React, { useState } from 'react';
import {
  Modal,
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import {
  X,
  AlertTriangle,
  Camera,
  ShieldAlert,
  CheckCircle,
  FileText,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadToCloudinary } from '../../services/cloudinaryService';
import { IOrder } from '../../interfaces/marketplace';
import { HIGTheme } from '../../constants/theme';

interface IDisputeModalProps {
  visible: boolean;
  order: IOrder | null;
  onClose: () => void;
  onSubmitDispute: (reason: string, mediaUrls: string[]) => Promise<void>;
}

const themeColors = HIGTheme.dark;
const COLORS = {
  bg: themeColors.systemBackground,
  card: themeColors.secondarySystemBackground,
  primary: themeColors.systemRed,
  text: themeColors.label,
  textDim: themeColors.secondaryLabel,
  warning: '#F59E0B',
  border: '#2C2C2E',
};

const COMMON_REASONS = [
  'Hàng bị bể vỡ / Xì dầu / Hỏng hóc',
  'Hàng giả / Fake không đúng mô tả',
  'Giao thiếu phụ kiện / Nhầm món',
  'Không vừa với dòng xe như cam kết',
];

export const DisputeModal: React.FC<IDisputeModalProps> = ({
  visible,
  order,
  onClose,
  onSubmitDispute,
}) => {
  const [selectedReason, setSelectedReason] = useState(COMMON_REASONS[0]);
  const [detailedNotes, setDetailedNotes] = useState('');
  const [evidenceImages, setEvidenceImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePickEvidence = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Thông báo', 'Cần quyền truy cập thư viện ảnh để đính kèm bằng chứng!');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 3,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const uris = result.assets.map((a) => a.uri);
      setEvidenceImages((prev) => [...prev, ...uris].slice(0, 3));
    }
  };

  const handleRemoveImage = (index: number) => {
    setEvidenceImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!order) return;
    if (evidenceImages.length === 0) {
      return Alert.alert(
        'Thiếu bằng chứng',
        'Vui lòng tải lên ít nhất 1 ảnh/video chụp rõ vị trí lỗi của món hàng để bảo vệ quyền lợi của bạn!'
      );
    }

    setIsSubmitting(true);
    try {
      // Tải ảnh bằng chứng lên Cloudinary
      const uploadPromises = evidenceImages.map((uri) =>
        uploadToCloudinary(uri, 'image')
      );
      const uploadedUrls = await Promise.all(uploadPromises);

      const finalReason = `${selectedReason}${
        detailedNotes.trim() ? ` - Chi tiết: ${detailedNotes.trim()}` : ''
      }`;

      await onSubmitDispute(finalReason, uploadedUrls);
      Alert.alert(
        'Đã gửi khiếu nại',
        'Hồ sơ khiếu nại đã được tạo. Tiền thanh toán trong Escrow đã bị đóng băng tạm thời để bảo vệ cả 2 bên.'
      );
      onClose();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể gửi khiếu nại lúc này. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!order) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <AlertTriangle size={22} color={COLORS.warning} />
            <Text style={styles.title}>YÊU CẦU KHIẾU NẠI & HOÀN TIỀN</Text>
          </View>
          <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
            <X size={24} color={COLORS.textDim} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.alertBanner}>
            <ShieldAlert size={20} color={COLORS.warning} style={{ marginTop: 2 }} />
            <Text style={styles.alertBannerText}>
              Khi gửi khiếu nại, tiền đơn hàng ({order.totalAmount.toLocaleString('vi-VN')} đ)
              sẽ được MotoTune đóng băng ngay lập tức. Người bán có 72 giờ để phản hồi.
            </Text>
          </View>

          <Text style={styles.sectionLabel}>Lý do khiếu nại chính:</Text>
          <View style={styles.reasonList}>
            {COMMON_REASONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.reasonChip,
                  selectedReason === r && styles.reasonChipActive,
                ]}
                onPress={() => setSelectedReason(r)}
                disabled={isSubmitting}
              >
                <Text
                  style={[
                    styles.reasonChipText,
                    selectedReason === r && { color: 'white', fontWeight: 'bold' },
                  ]}
                >
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Mô tả chi tiết tình trạng:</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Mô tả cụ thể vết nứt, xì dầu, hoặc điểm khác biệt so với bài đăng..."
            placeholderTextColor={COLORS.textDim}
            multiline
            numberOfLines={4}
            value={detailedNotes}
            onChangeText={setDetailedNotes}
            editable={!isSubmitting}
          />

          <Text style={styles.sectionLabel}>Ảnh/Video bằng chứng (Tối đa 3 ảnh):</Text>
          <View style={styles.mediaRow}>
            {evidenceImages.map((uri, index) => (
              <View key={index} style={styles.imagePreviewWrapper}>
                <Image source={{ uri }} style={styles.previewImg} />
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemoveImage(index)}
                  disabled={isSubmitting}
                >
                  <X size={14} color="white" />
                </TouchableOpacity>
              </View>
            ))}

            {evidenceImages.length < 3 && (
              <TouchableOpacity
                style={styles.addMediaBtn}
                onPress={handlePickEvidence}
                disabled={isSubmitting}
              >
                <Camera size={24} color={COLORS.primary} />
                <Text style={styles.addMediaText}>Thêm bằng chứng</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <FileText size={20} color="white" />
                <Text style={styles.submitBtnText}>GỬI HỒ SƠ KHIẾU NẠI</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  body: {
    flex: 1,
    padding: 20,
  },
  alertBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    gap: 10,
    marginBottom: 20,
  },
  alertBannerText: {
    color: COLORS.warning,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  sectionLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 10,
  },
  reasonList: {
    gap: 8,
    marginBottom: 15,
  },
  reasonChip: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reasonChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(227, 27, 35, 0.15)',
  },
  reasonChipText: {
    color: COLORS.textDim,
    fontSize: 13,
  },
  textArea: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    color: COLORS.text,
    fontSize: 14,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  mediaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  imagePreviewWrapper: {
    width: 90,
    height: 90,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  previewImg: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMediaBtn: {
    width: 90,
    height: 90,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.card,
  },
  addMediaText: {
    color: COLORS.textDim,
    fontSize: 10,
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
