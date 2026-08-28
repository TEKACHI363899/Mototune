import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import {
  ArrowLeft,
  Search,
  Crosshair,
  Star,
  LifeBuoy,
  Phone,
  Navigation,
  MapPin,
  X,
  AlertCircle,
  RefreshCw,
  Plus,
  Wrench,
  Clock,
} from 'lucide-react-native';

import { HIGTheme, HIGTouchTarget } from '../constants/theme';
import { db, auth } from '../firebaseConfig';
import { IRepairShop, IRepairReview, ICreateRepairShopInput, ICreateRepairReviewInput } from '../interfaces/repairShop';
import {
  fetchNearbyRepairShops,
  fetchShopReviews,
  submitShopReview,
  addCommunityRepairShop,
} from '../services/repairShopService';

import ShopDetailSheet from '../components/repair/ShopDetailSheet';
import ShopReviewModal from '../components/repair/ShopReviewModal';
import AddShopModal from '../components/repair/AddShopModal';

type TShopFilter = 'ALL' | 'NEARBY' | 'RESCUE_247' | 'HIGH_RATING';

const { width, height } = Dimensions.get('window');

export default function RepairShopsScreen() {
  const router = useRouter();
  const theme = 'dark';
  const colors = HIGTheme[theme];
  const currentUser = auth.currentUser;

  // State
  const [shops, setShops] = useState<IRepairShop[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number }>({
    latitude: 10.7769,
    longitude: 106.7009,
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<TShopFilter>('ALL');

  const [selectedShop, setSelectedShop] = useState<IRepairShop | null>(null);
  const [reviews, setReviews] = useState<IRepairReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState<boolean>(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  const [reviewModalVisible, setReviewModalVisible] = useState<boolean>(false);
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  const [addModalVisible, setAddModalVisible] = useState<boolean>(false);
  const [submittingShop, setSubmittingShop] = useState<boolean>(false);

  const mapRef = React.useRef<MapView | null>(null);
  const isMountedRef = React.useRef<boolean>(true);
  const lastFetchedLocationRef = React.useRef<{ latitude: number; longitude: number } | null>(null);

  // 1. Hàm tải tiệm sửa xe độc lập theo tọa độ cụ thể (không phụ thuộc state để tránh re-render loop)
  const loadShopsForCoords = useCallback(async (lat: number, lng: number, forceRefresh = false) => {
    if (!forceRefresh && lastFetchedLocationRef.current) {
      const last = lastFetchedLocationRef.current;
      // Tránh fetch lại nếu khoảng cách di chuyển nhỏ hơn 300 mét
      const dist = Math.sqrt(Math.pow(last.latitude - lat, 2) + Math.pow(last.longitude - lng, 2)) * 111;
      if (dist < 0.3) {
        return;
      }
    }
    lastFetchedLocationRef.current = { latitude: lat, longitude: lng };

    setLoading(true);
    setError(null);
    try {
      const data = await fetchNearbyRepairShops(lat, lng, 30);
      if (isMountedRef.current) {
        setShops(data);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err?.message || 'Không thể tải dữ liệu tiệm sửa xe.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // 2. Lấy vị trí GPS của người dùng
  const requestLocation = useCallback(async (forceRefresh = false) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (forceRefresh) loadShopsForCoords(10.7769, 106.7009, true);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const newLoc = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      if (isMountedRef.current) {
        setUserLocation(newLoc);
      }
      loadShopsForCoords(newLoc.latitude, newLoc.longitude, forceRefresh);

      if (mapRef.current) {
        try {
          mapRef.current.animateToRegion(
            {
              latitude: newLoc.latitude,
              longitude: newLoc.longitude,
              latitudeDelta: 0.03,
              longitudeDelta: 0.03,
            },
            800
          );
        } catch {
          // Ignore animation errors on unmounted views
        }
      }
    } catch {
      if (forceRefresh) loadShopsForCoords(10.7769, 106.7009, true);
    }
  }, [loadShopsForCoords]);

  // 3. Khởi tạo 1 LẦN DUY NHẤT khi mở màn hình (ngăn chặn hoàn toàn infinite loop)
  useEffect(() => {
    isMountedRef.current = true;
    loadShopsForCoords(10.7769, 106.7009, true);
    requestLocation(false);

    return () => {
      isMountedRef.current = false;
    };
  }, [loadShopsForCoords, requestLocation]);

  // 3. Load Shop Reviews when a shop is selected
  const loadReviews = useCallback(async (shopId: string) => {
    setReviewsLoading(true);
    setReviewsError(null);
    try {
      const data = await fetchShopReviews(shopId);
      setReviews(data);
    } catch (err: any) {
      setReviewsError(err?.message || 'Không thể tải đánh giá.');
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  const handleSelectShop = (shop: IRepairShop) => {
    setSelectedShop(shop);
    loadReviews(shop.id);

    if (mapRef.current) {
      try {
        mapRef.current.animateToRegion(
          {
            latitude: shop.latitude,
            longitude: shop.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          },
          600
        );
      } catch {
        // Ignore animation errors
      }
    }
  };

  // 4. Filter shops
  const filteredShops = useMemo(() => {
    return shops.filter((shop) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        q.length === 0 ||
        shop.name.toLowerCase().includes(q) ||
        shop.address.toLowerCase().includes(q);

      if (!matchSearch) return false;

      switch (activeFilter) {
        case 'NEARBY':
          return (shop.distanceKm ?? 999) <= 5.0;
        case 'RESCUE_247':
          return shop.isRescueService;
        case 'HIGH_RATING':
          return (shop.ratingAverage || 5.0) >= 4.0;
        case 'ALL':
        default:
          return true;
      }
    });
  }, [shops, searchQuery, activeFilter]);

  // 5. Submit Review
  const handleSubmitReview = async (reviewInput: ICreateRepairReviewInput & { shopId: string }) => {
    if (!currentUser) {
      Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để gửi đánh giá.');
      return;
    }
    setSubmittingReview(true);
    try {
      await submitShopReview(reviewInput.shopId, currentUser.uid, reviewInput);
      setReviewModalVisible(false);
      Alert.alert('Thành công', 'Cảm ơn bạn đã đóng góp đánh giá hữu ích cho cộng đồng Biker!');
      loadReviews(reviewInput.shopId);
      loadShopsForCoords(userLocation.latitude, userLocation.longitude, true);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể gửi đánh giá.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // 6. Submit New Community Shop
  const handleAddCommunityShop = async (shopInput: ICreateRepairShopInput) => {
    if (!currentUser) {
      Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để đóng góp tiệm sửa xe.');
      return;
    }
    setSubmittingShop(true);
    try {
      await addCommunityRepairShop(shopInput, currentUser.uid);
      setAddModalVisible(false);
      Alert.alert('Thành công', 'Tiệm sửa xe đã được thêm vào mạng lưới cộng đồng!');
      loadShopsForCoords(userLocation.latitude, userLocation.longitude, true);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể thêm tiệm sửa xe.');
    } finally {
      setSubmittingShop(false);
    }
  };

  const initialRegion = {
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.systemBackground }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.systemBackground} />

      {/* Top Floating Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.secondarySystemBackground, borderColor: colors.separator }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color={colors.label} />
          </TouchableOpacity>

          <View style={[styles.searchWrapper, { backgroundColor: colors.secondarySystemBackground, borderColor: colors.separator }]}>
            <Search size={16} color={colors.secondaryLabel} style={{ marginRight: 6 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.label }]}
              placeholder="Tìm tiệm sửa xe, cứu hộ..."
              placeholderTextColor={colors.secondaryLabel}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                <X size={16} color={colors.secondaryLabel} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.secondarySystemBackground, borderColor: colors.separator }]}
            onPress={() => requestLocation(true)}
            activeOpacity={0.7}
          >
            <Crosshair size={20} color={colors.systemRed} />
          </TouchableOpacity>
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'NEARBY', label: 'Gần tôi (< 5km)' },
            { key: 'RESCUE_247', label: 'Cứu hộ 24/7' },
            { key: 'HIGH_RATING', label: 'Đánh giá 4.0+ ★' },
          ].map((f) => {
            const isActive = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterChip,
                  { backgroundColor: colors.secondarySystemBackground, borderColor: colors.separator },
                  isActive && styles.filterChipActive,
                ]}
                onPress={() => setActiveFilter(f.key as TShopFilter)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: colors.secondaryLabel },
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Map View */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={true}
      >
        <UrlTile
          urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />

        {filteredShops.map((shop) => {
          const isSelected = selectedShop?.id === shop.id;
          return (
            <Marker
              key={shop.id}
              coordinate={{ latitude: shop.latitude, longitude: shop.longitude }}
              onPress={() => handleSelectShop(shop)}
            >
              <View
                style={[
                  styles.mapMarker,
                  shop.isRescueService ? styles.markerRescue : styles.markerStandard,
                  isSelected && styles.markerSelected,
                ]}
              >
                {shop.isRescueService ? (
                  <LifeBuoy size={16} color="#FFFFFF" />
                ) : (
                  <Wrench size={16} color="#FFFFFF" />
                )}
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Bottom Horizontal Carousel */}
      {!selectedShop && (
        <View style={styles.carouselContainer}>
          {loading ? (
            <View style={[styles.statusCard, { backgroundColor: colors.secondarySystemBackground, borderColor: colors.separator }]}>
              <ActivityIndicator size="small" color={colors.systemRed} />
              <Text style={[styles.statusText, { color: colors.secondaryLabel }]}>
                Đang quét mạng lưới tiệm sửa xe OpenStreetMap & Cứu hộ...
              </Text>
            </View>
          ) : error ? (
            <View style={[styles.statusCard, { backgroundColor: colors.secondarySystemBackground, borderColor: colors.separator }]}>
              <AlertCircle size={20} color={colors.systemRed} />
              <Text style={[styles.errorText, { color: colors.systemRed }]}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => requestLocation(true)}>
                <RefreshCw size={14} color="#FFFFFF" />
                <Text style={styles.retryBtnText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          ) : filteredShops.length === 0 ? (
            <View style={[styles.statusCard, { backgroundColor: colors.secondarySystemBackground, borderColor: colors.separator }]}>
              <MapPin size={24} color={colors.secondaryLabel} />
              <Text style={[styles.statusText, { color: colors.secondaryLabel }]}>
                Không tìm thấy trạm sửa xe nào trong bán kính 15km
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselScroll}
            >
              {filteredShops.map((shop) => {
                const distanceText =
                  shop.distanceKm !== undefined
                    ? shop.distanceKm < 1
                      ? `${Math.round(shop.distanceKm * 1000)}m`
                      : `${shop.distanceKm.toFixed(1)} km`
                    : 'Gần đây';

                return (
                  <TouchableOpacity
                    key={shop.id}
                    style={[
                      styles.shopCard,
                      { backgroundColor: colors.secondarySystemBackground, borderColor: colors.separator },
                      shop.isRescueService && { borderColor: 'rgba(227, 27, 35, 0.5)' },
                    ]}
                    onPress={() => handleSelectShop(shop)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.shopCardTop}>
                      <Text style={[styles.shopCardName, { color: colors.label }]} numberOfLines={1}>
                        {shop.name}
                      </Text>
                      {shop.isRescueService && (
                        <View style={styles.rescueCardBadge}>
                          <Clock size={10} color="#FFFFFF" />
                          <Text style={styles.rescueCardBadgeText}>24/7</Text>
                        </View>
                      )}
                    </View>

                    <Text style={[styles.shopCardAddress, { color: colors.secondaryLabel }]} numberOfLines={1}>
                      {shop.address}
                    </Text>

                    <View style={styles.shopCardBottom}>
                      <View style={styles.ratingRow}>
                        <Star size={13} color="#FFB800" fill="#FFB800" />
                        <Text style={[styles.ratingVal, { color: colors.label }]}>
                          {shop.ratingAverage > 0 ? shop.ratingAverage.toFixed(1) : '5.0'}
                        </Text>
                        <Text style={[styles.ratingCountText, { color: colors.secondaryLabel }]}>
                          ({shop.ratingCount || 0})
                        </Text>
                      </View>

                      <View style={styles.distanceBadge}>
                        <Navigation size={12} color={colors.systemRed} />
                        <Text style={[styles.distanceText, { color: colors.systemRed }]}>
                          {distanceText}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      {/* Floating Add Shop Button */}
      <TouchableOpacity
        style={[styles.addShopFab, { backgroundColor: colors.systemRed }]}
        onPress={() => setAddModalVisible(true)}
        activeOpacity={0.8}
      >
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Bottom Sheet Box when Shop is clicked */}
      <ShopDetailSheet
        shop={selectedShop}
        reviews={reviews}
        reviewsLoading={reviewsLoading}
        reviewsError={reviewsError}
        onClose={() => setSelectedShop(null)}
        onOpenReviewModal={() => setReviewModalVisible(true)}
        onRetryReviews={() => selectedShop && loadReviews(selectedShop.id)}
      />

      {/* Rating & Review Modal */}
      <ShopReviewModal
        visible={reviewModalVisible}
        shop={selectedShop}
        submitting={submittingReview}
        onClose={() => setReviewModalVisible(false)}
        onSubmit={handleSubmitReview}
      />

      {/* Add New Shop Modal */}
      <AddShopModal
        visible={addModalVisible}
        userCoords={userLocation}
        submitting={submittingShop}
        onClose={() => setAddModalVisible(false)}
        onSubmit={handleAddCommunityShop}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 20,
    left: 16,
    right: 16,
    zIndex: 15,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: HIGTouchTarget.min,
    height: HIGTouchTarget.min,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: HIGTouchTarget.min,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  filterScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: '#E31B23',
    borderColor: '#E31B23',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerStandard: {
    backgroundColor: '#007AFF',
  },
  markerRescue: {
    backgroundColor: '#E31B23',
  },
  markerSelected: {
    transform: [{ scale: 1.25 }],
    borderColor: '#FFD700',
    borderWidth: 3,
  },
  carouselContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 34 : 20,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  carouselScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  shopCard: {
    width: 250,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  shopCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shopCardName: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  rescueCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E31B23',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rescueCardBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  shopCardAddress: {
    fontSize: 12,
  },
  shopCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  ratingCountText: {
    fontSize: 11,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusCard: {
    marginHorizontal: 16,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 13,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E31B23',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  addShopFab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 140 : 120,
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E31B23',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 12,
  },
});
