import React, { memo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import {
  Phone,
  Navigation,
  Star,
  X,
  Wrench,
  Clock,
  ShieldCheck,
  MapPin,
  AlertCircle,
  CheckCircle,
} from 'lucide-react-native';
import { IRepairShop, IRepairReview } from '../../interfaces/repairShop';
import { HIGTheme, HIGTouchTarget } from '../../constants/theme';

interface IShopDetailSheetProps {
  shop: IRepairShop | null;
  reviews: IRepairReview[];
  reviewsLoading: boolean;
  reviewsError: string | null;
  onClose: () => void;
  onOpenReviewModal: () => void;
  onRetryReviews: () => void;
}

const ShopDetailSheet = memo(({
  shop,
  reviews,
  reviewsLoading,
  reviewsError,
  onClose,
  onOpenReviewModal,
  onRetryReviews,
}: IShopDetailSheetProps) => {
  const theme = 'dark';
  const colors = HIGTheme[theme];

  if (!shop) return null;

  const handleCall = () => {
    if (shop.phone) {
      Linking.openURL(`tel:${shop.phone}`);
    }
  };

  const handleDirections = () => {
    const lat = shop.latitude;
    const lon = shop.longitude;
    const label = encodeURIComponent(shop.name);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lon}`,
      android: `geo:0,0?q=${lat},${lon}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
    });
    if (url) Linking.openURL(url);
  };

  const distanceFormatted =
    shop.distanceKm !== undefined
      ? shop.distanceKm < 1
        ? `Cách bạn ${Math.round(shop.distanceKm * 1000)}m`
        : `Cách bạn ${shop.distanceKm.toFixed(1)} km`
      : 'Vị trí lân cận';

  return (
    <View style={styles.sheetBackdrop}>
      <View style={[styles.sheetContainer, { backgroundColor: colors.systemBackground, borderColor: colors.separator }]}>
        <View style={[styles.handleBar, { backgroundColor: colors.separator }]} />

        {/* Header */}
        <View style={styles.sheetHeader}>
          <View style={styles.titleWrapper}>
            <View style={styles.badgeRow}>
              {shop.isRescueService && (
                <View style={styles.rescueBadge}>
                  <Clock size={11} color="#FFFFFF" />
                  <Text style={styles.rescueBadgeText}>CỨU HỘ 24/7</Text>
                </View>
              )}
              {shop.isCommunityVerified && (
                <View style={styles.verifiedBadge}>
                  <CheckCircle size={11} color="#34C759" />
                  <Text style={styles.verifiedBadgeText}>ĐÃ XÁC THỰC</Text>
                </View>
              )}
            </View>

            <Text style={[styles.sheetTitle, { color: colors.label }]} numberOfLines={2}>
              {shop.name}
            </Text>

            <View style={styles.distanceBadge}>
              <Navigation size={13} color={colors.systemRed} />
              <Text style={[styles.distanceBadgeText, { color: colors.systemRed }]}>
                {distanceFormatted}
              </Text>
            </View>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={20} color={colors.secondaryLabel} />
          </TouchableOpacity>
        </View>

        {/* Address */}
        <View style={styles.addressRow}>
          <MapPin size={14} color={colors.secondaryLabel} style={{ marginTop: 2 }} />
          <Text style={[styles.addressText, { color: colors.secondaryLabel }]} numberOfLines={2}>
            {shop.address}
          </Text>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionButtonsRow}>
          {shop.phone ? (
            <TouchableOpacity style={[styles.actionBtn, styles.callButton]} onPress={handleCall} activeOpacity={0.8}>
              <Phone size={16} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Gọi Cứu Hộ</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={[styles.actionBtn, styles.navButton]} onPress={handleDirections} activeOpacity={0.8}>
            <Navigation size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Chỉ Đường</Text>
          </TouchableOpacity>
        </View>

        {/* Rating & Review Overview */}
        <View style={[styles.statsSection, { borderColor: colors.separator }]}>
          <View style={styles.ratingSummary}>
            <Star size={20} color="#FFB800" fill="#FFB800" />
            <Text style={[styles.ratingBig, { color: colors.label }]}>
              {shop.ratingAverage > 0 ? shop.ratingAverage.toFixed(1) : '5.0'}
            </Text>
            <Text style={[styles.ratingTotal, { color: colors.secondaryLabel }]}>
              ({shop.ratingCount || reviews.length} đánh giá)
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.addReviewBtn, { backgroundColor: colors.secondarySystemBackground, borderColor: colors.separator }]}
            onPress={onOpenReviewModal}
            activeOpacity={0.8}
          >
            <Star size={14} color={colors.systemRed} />
            <Text style={[styles.addReviewBtnText, { color: colors.systemRed }]}>
              Đánh giá & Review
            </Text>
          </TouchableOpacity>
        </View>

        {/* Reviews Section */}
        <Text style={[styles.sectionHeading, { color: colors.label }]}>Đánh giá của cộng đồng Biker</Text>

        {reviewsLoading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator size="small" color={colors.systemRed} />
            <Text style={[styles.stateText, { color: colors.secondaryLabel }]}>Đang tải đánh giá...</Text>
          </View>
        ) : reviewsError ? (
          <View style={styles.stateBox}>
            <AlertCircle size={18} color={colors.systemRed} />
            <Text style={[styles.errorText, { color: colors.systemRed }]}>{reviewsError}</Text>
            <TouchableOpacity style={styles.inlineRetryBtn} onPress={onRetryReviews}>
              <Text style={styles.inlineRetryText}>Tải lại</Text>
            </TouchableOpacity>
          </View>
        ) : reviews.length === 0 ? (
          <View style={styles.stateBox}>
            <ShieldCheck size={20} color={colors.secondaryLabel} />
            <Text style={[styles.stateText, { color: colors.secondaryLabel }]}>
              Chưa có review nào. Hãy là biker đầu tiên đánh giá tiệm này!
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.reviewsList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {reviews.map((rev) => (
              <View key={rev.id} style={[styles.reviewItem, { borderBottomColor: colors.separator }]}>
                <View style={styles.reviewHeader}>
                  <Text style={[styles.reviewerName, { color: colors.label }]}>{rev.userName}</Text>
                  <View style={styles.reviewRatingRow}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={12}
                        color={i < rev.rating ? '#FFB800' : colors.separator}
                        fill={i < rev.rating ? '#FFB800' : 'transparent'}
                      />
                    ))}
                  </View>
                </View>

                {/* Replaced Parts Chips */}
                {rev.replacedParts && rev.replacedParts.length > 0 && (
                  <View style={styles.reviewPartsRow}>
                    {rev.replacedParts.map((part) => (
                      <View key={part} style={[styles.miniPartTag, { backgroundColor: colors.secondarySystemBackground }]}>
                        <Wrench size={10} color={colors.systemRed} />
                        <Text style={[styles.miniPartTagText, { color: colors.label }]}>{part}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {rev.comment ? (
                  <Text style={[styles.reviewComment, { color: colors.label }]}>{rev.comment}</Text>
                ) : null}

                {rev.costEstimate ? (
                  <Text style={[styles.reviewCost, { color: colors.systemGreen }]}>
                    Chi phí: {rev.costEstimate.toLocaleString('vi-VN')} đ
                  </Text>
                ) : null}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  sheetBackdrop: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    maxHeight: '70%',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleWrapper: {
    flex: 1,
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  rescueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E31B23',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rescueBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    color: '#34C759',
    fontSize: 10,
    fontWeight: '800',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 16,
  },
  addressText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: HIGTouchTarget.min,
    borderRadius: 12,
  },
  callButton: {
    backgroundColor: '#E31B23',
  },
  navButton: {
    backgroundColor: '#007AFF',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  ratingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingBig: {
    fontSize: 18,
    fontWeight: '800',
  },
  ratingTotal: {
    fontSize: 12,
  },
  addReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  addReviewBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  stateBox: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  stateText: {
    fontSize: 12,
  },
  errorText: {
    fontSize: 12,
  },
  inlineRetryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#E31B23',
  },
  inlineRetryText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  reviewsList: {
    maxHeight: 160,
  },
  reviewItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 4,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: '700',
  },
  reviewRatingRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewPartsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginVertical: 2,
  },
  miniPartTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  miniPartTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reviewComment: {
    fontSize: 13,
    lineHeight: 18,
  },
  reviewCost: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});

export default ShopDetailSheet;
