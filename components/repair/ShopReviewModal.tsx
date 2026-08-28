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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Star, X, Send, AlertCircle, Wrench } from 'lucide-react-native';
import { IRepairShop, TReplaceablePart, REPLACEABLE_PARTS } from '../../interfaces/repairShop';
import { HIGTheme, HIGTouchTarget } from '../../constants/theme';

interface IShopReviewModalProps {
  visible: boolean;
  shop: IRepairShop | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (data: {
    shopId: string;
    rating: number;
    replacedParts: TReplaceablePart[];
    costEstimate?: number;
    comment: string;
  }) => Promise<void>;
}

const ShopReviewModal = memo(({
  visible,
  shop,
  submitting,
  onClose,
  onSubmit,
}: IShopReviewModalProps) => {
  const theme = 'dark';
  const colors = HIGTheme[theme];

  const [rating, setRating] = useState<number>(5);
  const [selectedParts, setSelectedParts] = useState<TReplaceablePart[]>([]);
  const [costInput, setCostInput] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const togglePart = (part: TReplaceablePart) => {
    setSelectedParts((prev) =>
      prev.includes(part) ? prev.filter((p) => p !== part) : [...prev, part]
    );
  };

  const handleSubmit = async () => {
    if (!shop) return;
    if (selectedParts.length === 0) {
      setFormError('Vui lòng chọn ít nhất 1 linh kiện hoặc dịch vụ đã thực hiện.');
      return;
    }
    setFormError(null);

    const parsedCost = costInput ? parseInt(costInput.replace(/\D/g, ''), 10) : undefined;
    await onSubmit({
      shopId: shop.id,
      rating,
      replacedParts: selectedParts,
      costEstimate: parsedCost,
      comment: comment.trim(),
    });

    // Reset fields on success
    setSelectedParts([]);
    setCostInput('');
    setComment('');
    setRating(5);
  };

  if (!shop) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={[styles.container, { backgroundColor: colors.systemBackground, borderColor: colors.separator }]}>
          <View style={[styles.header, { borderBottomColor: colors.separator }]}>
            <View>
              <Text style={[styles.title, { color: colors.label }]}>ĐÁNH GIÁ & REVIEW</Text>
              <Text style={[styles.subtitle, { color: colors.systemRed }]} numberOfLines={1}>
                {shop.name}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={colors.secondaryLabel} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {/* Star Rating Selector */}
            <Text style={[styles.sectionLabel, { color: colors.label }]}>
              Chất lượng dịch vụ & tay nghề
            </Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((starVal) => (
                <TouchableOpacity
                  key={starVal}
                  onPress={() => setRating(starVal)}
                  style={styles.starTouch}
                  activeOpacity={0.7}
                >
                  <Star
                    size={36}
                    color={starVal <= rating ? '#FFB800' : colors.separator}
                    fill={starVal <= rating ? '#FFB800' : 'transparent'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Replaced Parts Selector */}
            <View style={styles.labelWithIcon}>
              <Wrench size={16} color={colors.systemRed} />
              <Text style={[styles.sectionLabel, { color: colors.label, marginBottom: 0 }]}>
                Bộ phận / Linh kiện đã thay thế hoặc bảo dưỡng
              </Text>
            </View>
            <View style={styles.partsGrid}>
              {REPLACEABLE_PARTS.map((part) => {
                const isSelected = selectedParts.includes(part);
                return (
                  <TouchableOpacity
                    key={part}
                    style={[
                      styles.partChip,
                      { backgroundColor: colors.secondarySystemBackground, borderColor: colors.separator },
                      isSelected && styles.partChipSelected,
                    ]}
                    onPress={() => togglePart(part)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.partChipText,
                        { color: colors.secondaryLabel },
                        isSelected && styles.partChipTextSelected,
                      ]}
                    >
                      {part}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Cost Estimate Input */}
            <Text style={[styles.sectionLabel, { color: colors.label }]}>
              Chi phí thanh toán (VNĐ - Tùy chọn)
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.secondarySystemBackground, color: colors.label, borderColor: colors.separator }]}
              placeholder="Ví dụ: 180000"
              placeholderTextColor={colors.secondaryLabel}
              keyboardType="numeric"
              value={costInput}
              onChangeText={setCostInput}
            />

            {/* Comment Input */}
            <Text style={[styles.sectionLabel, { color: colors.label }]}>
              Nhận xét chi tiết của Biker
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { backgroundColor: colors.secondarySystemBackground, color: colors.label, borderColor: colors.separator },
              ]}
              placeholder="Chia sẻ kinh nghiệm thực tế về thái độ, thời gian sửa và giá cả..."
              placeholderTextColor={colors.secondaryLabel}
              multiline
              numberOfLines={4}
              value={comment}
              onChangeText={setComment}
            />

            {formError ? (
              <View style={styles.errorRow}>
                <AlertCircle size={14} color={colors.systemRed} />
                <Text style={[styles.errorText, { color: colors.systemRed }]}>{formError}</Text>
              </View>
            ) : null}

            {/* Submit Button */}
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
                  <Send size={18} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>GỬI ĐÁNH GIÁ</Text>
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
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    gap: 12,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    paddingVertical: 10,
  },
  starTouch: {
    padding: 4,
  },
  partsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  partChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  partChipSelected: {
    backgroundColor: '#E31B23',
    borderColor: '#E31B23',
  },
  partChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  partChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
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

export default ShopReviewModal;
