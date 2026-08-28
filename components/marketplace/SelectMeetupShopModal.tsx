import React, { useEffect, useState } from 'react';
import {
  Modal,
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import {
  X,
  Store,
  MapPin,
  Phone,
  Clock,
  ShieldCheck,
  Search,
  Navigation,
  Fuel,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { fetchNearbyRepairShops } from '../../services/repairShopService';
import { IRepairShop } from '../../interfaces/repairShop';
import { IMeetupShopInfo } from '../../interfaces/marketplace';
import { HIGTheme } from '../../constants/theme';

interface ISelectMeetupShopModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectShop: (shop: IMeetupShopInfo) => void;
}

const themeColors = HIGTheme.dark;
const COLORS = {
  bg: themeColors.systemBackground,
  card: themeColors.secondarySystemBackground,
  primary: themeColors.systemRed,
  text: themeColors.label,
  textDim: themeColors.secondaryLabel,
  safe: themeColors.systemGreen,
  border: '#2C2C2E',
};

export const SelectMeetupShopModal: React.FC<ISelectMeetupShopModalProps> = ({
  visible,
  onClose,
  onSelectShop,
}) => {
  const [shops, setShops] = useState<IRepairShop[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({
    lat: 10.7769,
    lng: 106.7009, // Mặc định TP.HCM
  });

  useEffect(() => {
    if (!visible) return;

    const loadShops = async () => {
      setLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        let lat = 10.7769;
        let lng = 106.7009;

        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
          setUserCoords({ lat, lng });
        }

        const nearby = await fetchNearbyRepairShops(lat, lng, 30);
        setShops(nearby);
      } catch (error) {
        console.log('Error fetching meetup shops:', error);
      } finally {
        setLoading(false);
      }
    };

    loadShops();
  }, [visible]);

  const filteredShops = shops.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleChooseShop = (shop: IRepairShop) => {
    onSelectShop({
      id: shop.id,
      name: shop.name,
      address: shop.address,
      latitude: shop.latitude,
      longitude: shop.longitude,
      phone: shop.phone,
      isPartnerVerified: shop.isCommunityVerified || shop.source === 'community',
    });
    onClose();
  };

  const handleSelectFallbackGasStation = () => {
    onSelectShop({
      id: `gas_station_${Date.now()}`,
      name: 'Cây xăng Petrolimex gần nhất (Điểm hẹn công cộng)',
      address: 'Điểm hẹn công cộng an toàn có camera an ninh và ánh sáng',
      latitude: userCoords.lat,
      longitude: userCoords.lng,
      phone: null,
      isPartnerVerified: true,
    });
    onClose();
  };

  const renderShopItem = ({ item }: { item: IRepairShop }) => {
    const isVerified = item.isCommunityVerified || item.source === 'community';

    return (
      <TouchableOpacity
        style={styles.shopCard}
        onPress={() => handleChooseShop(item)}
        activeOpacity={0.7}
      >
        <View style={styles.shopHeader}>
          <View style={styles.iconCircle}>
            <Store size={20} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={styles.shopName} numberOfLines={1}>
                {item.name}
              </Text>
              {isVerified && (
                <View style={styles.badgeVerified}>
                  <ShieldCheck size={12} color={COLORS.safe} />
                  <Text style={styles.badgeText}>Trạm Chuẩn</Text>
                </View>
              )}
            </View>
            <View style={styles.metaRow}>
              <Navigation size={12} color={COLORS.primary} />
              <Text style={styles.distanceText}>
                Cách bạn {item.distanceKm ? item.distanceKm.toFixed(1) : '1.5'} km
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.addressRow}>
          <MapPin size={14} color={COLORS.textDim} style={{ marginTop: 2 }} />
          <Text style={styles.addressText} numberOfLines={2}>
            {item.address || 'Khu vực lân cận'}
          </Text>
        </View>

        <View style={styles.footerRow}>
          {item.phone && (
            <View style={styles.infoPill}>
              <Phone size={12} color={COLORS.textDim} />
              <Text style={styles.pillText}>{item.phone}</Text>
            </View>
          )}
          <View style={styles.infoPill}>
            <Clock size={12} color={COLORS.textDim} />
            <Text style={styles.pillText}>
              {item.openingHours || '7:30 - 18:30'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.title} numberOfLines={1}>CHỌN ĐIỂM HẸN TẠI TRẠM</Text>
            <Text style={styles.subTitle} numberOfLines={2}>
              Gặp mặt an toàn, có thợ cơ khí hỗ trợ tháo lắp thử đồ
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Search size={18} color={COLORS.textDim} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm tên tiệm sửa xe hoặc đường..."
            placeholderTextColor={COLORS.textDim}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <TouchableOpacity
          style={styles.fallbackBtn}
          onPress={handleSelectFallbackGasStation}
          activeOpacity={0.8}
        >
          <Fuel size={18} color={COLORS.safe} />
          <Text style={styles.fallbackBtnText}>
            Tiệm đóng cửa? Hẹn tại Cây xăng / Cửa hàng tiện lợi 24/7
          </Text>
        </TouchableOpacity>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Đang quét các tiệm sửa xe gần bạn...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredShops}
            keyExtractor={(item) => item.id}
            renderItem={renderShopItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Không tìm thấy tiệm sửa xe phù hợp.</Text>
                <Text style={styles.emptySubText}>
                  Bạn có thể chọn phương án hẹn tại cây xăng lớn gần nhất.
                </Text>
              </View>
            }
          />
        )}
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
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subTitle: {
    color: COLORS.textDim,
    fontSize: 12,
    marginTop: 4,
  },
  closeBtn: {
    padding: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: 15,
    marginTop: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },
  fallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    marginHorizontal: 15,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
    gap: 8,
  },
  fallbackBtnText: {
    color: COLORS.safe,
    fontSize: 12,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 15,
    paddingBottom: 40,
  },
  shopCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(227, 27, 35, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(227, 27, 35, 0.3)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  shopName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: 'bold',
    flex: 1,
  },
  badgeVerified: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  badgeText: {
    color: COLORS.safe,
    fontSize: 10,
    fontWeight: 'bold',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  distanceText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
    gap: 6,
  },
  addressText: {
    color: COLORS.textDim,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#222',
    gap: 10,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 6,
  },
  pillText: {
    color: COLORS.textDim,
    fontSize: 11,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    color: COLORS.textDim,
    marginTop: 12,
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: 'bold',
  },
  emptySubText: {
    color: COLORS.textDim,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },
});
