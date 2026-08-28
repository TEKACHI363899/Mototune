import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video as ExpoVideo, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  ArrowDownUp,
  ArrowRight,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  CreditCard,
  Eye,
  Lock,
  PlusCircle,
  ShieldCheck,
  ShoppingBag,
  Store,
  Trash2,
  Truck,
  Video,
  X,
  Search,
  MessageCircle,
  MapPin,
  QrCode,
  AlertTriangle,
  Star,
  Navigation,
  Sparkles,
  RefreshCw,
} from 'lucide-react-native';

import { auth } from '../../firebaseConfig';
import {
  IProduct,
  IOrder,
  IMediaAsset,
  TProductCondition,
  TDeliveryType,
  IShippingInfo,
  IMeetupShopInfo,
} from '../../interfaces/marketplace';
import {
  fetchMarketplaceProducts,
  searchMarketplaceProducts,
  createProductListing,
  deleteProductListing,
  createMarketplaceOrder,
  markOrderAsPaidInEscrow,
  updateOrderShippingInfo,
  confirmDeliveryAndReleasePayout,
  openOrderDispute,
  cancelOrderAndReleaseProduct,
  deleteMarketplaceOrder,
  subscribeUserOrders,
} from '../../services/marketplaceService';
import {
  getTrustScoreProfile,
  submitOrderReview,
} from '../../services/trustScoreService';
import { SelectMeetupShopModal } from '../../components/marketplace/SelectMeetupShopModal';
import { HandshakeQrModal } from '../../components/marketplace/HandshakeQrModal';
import { DisputeModal } from '../../components/marketplace/DisputeModal';
import { HIGTheme } from '../../constants/theme';

const { width } = Dimensions.get('window');
const themeColors = HIGTheme.dark;
const COLORS = {
  bg: themeColors.systemBackground,
  card: themeColors.secondarySystemBackground,
  primary: themeColors.systemRed,
  text: themeColors.label,
  textDim: themeColors.secondaryLabel,
  safe: themeColors.systemGreen,
  warning: '#F59E0B',
  info: themeColors.systemBlue,
  border: '#2C2C2E',
};

const CATEGORIES = ['Tất cả', 'Phụ tùng', 'Xe cộ', 'Bảo hộ', 'Khác'];
const CONDITIONS: { label: string; value: TProductCondition | 'all' }[] = [
  { label: 'Tất cả tình trạng', value: 'all' },
  { label: 'Mới 100%', value: 'brand_new' },
  { label: 'Likenew 99%', value: 'like_new_99' },
  { label: 'Đã qua sử dụng', value: 'used_good' },
  { label: 'Rã xác / Phụ tùng', value: 'for_parts' },
];

export default function MarketplaceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [activeTab, setActiveTab] = useState<'market' | 'orders'>('market');
  const [orderSubTab, setOrderSubTab] = useState<'buying' | 'selling'>('buying');

  const [products, setProducts] = useState<IProduct[]>([]);
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCat, setFilterCat] = useState('Tất cả');
  const [filterCondition, setFilterCondition] = useState<TProductCondition | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');

  // Modals & Flows
  const [showAddModal, setShowAddModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newProduct, setNewProduct] = useState({
    title: '',
    price: '',
    originalPrice: '',
    desc: '',
    category: 'Phụ tùng',
    condition: 'like_new_99' as TProductCondition,
    compatibleBikeModels: '',
    city: 'TP. Hồ Chí Minh',
    isNegotiable: true,
    assets: [] as IMediaAsset[],
  });

  const [viewProduct, setViewProduct] = useState<IProduct | null>(null);
  const [currentMediaIdx, setCurrentMediaIdx] = useState(0);
  const [sellerTrustScore, setSellerTrustScore] = useState<number | null>(null);
  const [sellerTrustTier, setSellerTrustTier] = useState<string>('Biker');

  // Checkout Flow
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutDeliveryType, setCheckoutDeliveryType] = useState<TDeliveryType>('station_meetup');
  const [selectedMeetupShop, setSelectedMeetupShop] = useState<IMeetupShopInfo | null>(null);
  const [shippingAddress, setShippingAddress] = useState({
    name: '',
    phone: '',
    city: 'TP. Hồ Chí Minh',
    district: 'Quận 1',
    address: '',
  });
  const [showShopSelectModal, setShowShopSelectModal] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  // Payment Modal (VietQR Sandbox)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activePaymentOrder, setActivePaymentOrder] = useState<IOrder | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Handshake QR Modal
  const [showHandshakeModal, setShowHandshakeModal] = useState(false);
  const [handshakeOrder, setHandshakeOrder] = useState<IOrder | null>(null);
  const [isHandshakeSeller, setIsHandshakeSeller] = useState(false);

  // Dispute Modal
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeTargetOrder, setDisputeTargetOrder] = useState<IOrder | null>(null);

  // Review Modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTargetOrder, setReviewTargetOrder] = useState<IOrder | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Tracking Code Input Modal
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState<IOrder | null>(null);
  const [carrierInput, setCarrierInput] = useState('Viettel Post');
  const [trackingCodeInput, setTrackingCodeInput] = useState('');
  const [isSubmittingTracking, setIsSubmittingTracking] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      if (searchQuery.trim()) {
        const results = await searchMarketplaceProducts(searchQuery);
        setProducts(results);
      } else {
        const res = await fetchMarketplaceProducts({
          category: filterCat,
          condition: filterCondition,
          sortOrder,
          pageSize: 30,
        });
        setProducts(res.products);
      }
    } catch (error) {
      console.log('Error fetching products:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery, filterCat, filterCondition, sortOrder]);

  useEffect(() => {
    let unsubscribeOrders: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user && !user.isAnonymous) {
        unsubscribeOrders = subscribeUserOrders(user.uid, (myOrders) => {
          setOrders(myOrders);
        });
      } else {
        setOrders([]);
      }
    });

    loadProducts();

    return () => {
      unsubAuth();
      if (unsubscribeOrders) unsubscribeOrders();
    };
  }, [loadProducts]);

  useEffect(() => {
    if (viewProduct && viewProduct.authorId) {
      getTrustScoreProfile(viewProduct.authorId).then((profile) => {
        setSellerTrustScore(profile.score);
        setSellerTrustTier(profile.tierLabel);
      });
    }
  }, [viewProduct]);

  if (!currentUser || currentUser.isAnonymous) {
    return (
      <View style={[styles.blockedContainer, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.blockedIconCircle}>
          <Lock size={44} color={COLORS.primary} />
        </View>
        <Text style={styles.blockedTitle}>CẦN ĐĂNG NHẬP ĐỂ VÀO CHỢ</Text>
        <Text style={styles.blockedSub}>
          Chợ MotoTune là không gian mua bán bảo mật có ký quỹ Escrow. Vui lòng đăng
          nhập tài khoản để trải nghiệm!
        </Text>
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => router.push('/profile')}
          activeOpacity={0.8}
        >
          <Text style={styles.loginBtnText}>ĐI TỚI ĐĂNG NHẬP</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleSort = () => {
    if (sortOrder === 'newest') setSortOrder('price_asc');
    else if (sortOrder === 'price_asc') setSortOrder('price_desc');
    else setSortOrder('newest');
  };

  const getSortLabel = () => {
    if (sortOrder === 'price_asc') return 'Giá: Thấp -> Cao';
    if (sortOrder === 'price_desc') return 'Giá: Cao -> Thấp';
    return 'Mới nhất';
  };

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Lỗi', 'Cần quyền truy cập thư viện ảnh!');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const newAssets: IMediaAsset[] = result.assets.map((asset) => ({
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'image',
      }));
      setNewProduct((prev) => ({
        ...prev,
        assets: [...prev.assets, ...newAssets].slice(0, 5),
      }));
    }
  };

  const removeAsset = (index: number) => {
    setNewProduct((prev) => ({
      ...prev,
      assets: prev.assets.filter((_, i) => i !== index),
    }));
  };

  const handlePostProduct = async () => {
    if (!newProduct.title || !newProduct.price || newProduct.assets.length === 0) {
      return Alert.alert('Thiếu thông tin', 'Cần nhập Tên, Giá và ít nhất 1 ảnh/video!');
    }

    setIsUploading(true);
    try {
      const modelsArray = newProduct.compatibleBikeModels
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await createProductListing({
        title: newProduct.title,
        price: parseInt(newProduct.price.replace(/[^0-9]/g, ''), 10),
        originalPrice: newProduct.originalPrice
          ? parseInt(newProduct.originalPrice.replace(/[^0-9]/g, ''), 10)
          : undefined,
        desc: newProduct.desc,
        category: newProduct.category,
        condition: newProduct.condition,
        compatibleBikeModels: modelsArray,
        city: newProduct.city,
        isNegotiable: newProduct.isNegotiable,
        assets: newProduct.assets,
      });

      setShowAddModal(false);
      setNewProduct({
        title: '',
        price: '',
        originalPrice: '',
        desc: '',
        category: 'Phụ tùng',
        condition: 'like_new_99',
        compatibleBikeModels: '',
        city: 'TP. Hồ Chí Minh',
        isNegotiable: true,
        assets: [],
      });
      loadProducts();
      Alert.alert('Hoàn tất', 'Sản phẩm của bạn đã được đưa lên kệ Chợ Biker!');
    } catch (error: any) {
      console.error('[handlePostProduct Error]', error);
      Alert.alert('Lỗi đăng bán', error?.message || 'Không thể đăng sản phẩm lúc này.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteProduct = (productId: string) => {
    const executeDelete = async () => {
      try {
        await deleteProductListing(productId);
        setViewProduct(null);
        loadProducts();
        Alert.alert('Thành công', 'Đã gỡ bài đăng khỏi chợ!');
      } catch (error) {
        Alert.alert('Lỗi', 'Không thể xóa sản phẩm.');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Bạn có chắc muốn gỡ sản phẩm này?')) executeDelete();
    } else {
      Alert.alert('Gỡ bài đăng', 'Bạn có chắc chắn muốn gỡ sản phẩm này khỏi chợ?', [
        { text: 'Hủy' },
        { text: 'Gỡ bài', style: 'destructive', onPress: executeDelete },
      ]);
    }
  };

  const handleStartCheckout = (product: IProduct) => {
    setViewProduct(null);
    setShowCheckoutModal(true);
  };

  const handleConfirmOrderAndPay = async () => {
    if (!viewProduct && !checkoutDeliveryType) return;
    const targetProduct = viewProduct || products.find((p) => p.id === (viewProduct as any)?.id);
    if (!targetProduct) return;

    if (checkoutDeliveryType === 'station_meetup' && !selectedMeetupShop) {
      return Alert.alert(
        'Chưa chọn trạm',
        'Vui lòng chọn 1 Tiệm sửa xe trên bản đồ làm điểm hẹn!'
      );
    }

    if (checkoutDeliveryType === 'courier_shipping' && (!shippingAddress.name || !shippingAddress.phone || !shippingAddress.address)) {
      return Alert.alert(
        'Thiếu thông tin nhận hàng',
        'Vui lòng nhập đầy đủ Tên, SĐT và Địa chỉ giao nhận!'
      );
    }

    setIsCreatingOrder(true);
    try {
      const orderId = await createMarketplaceOrder({
        productId: targetProduct.id,
        deliveryType: checkoutDeliveryType,
        paymentMethod: 'vietqr_escrow',
        shippingInfo:
          checkoutDeliveryType === 'courier_shipping'
            ? {
                recipientName: shippingAddress.name,
                phoneNumber: shippingAddress.phone,
                city: shippingAddress.city,
                district: shippingAddress.district,
                detailedAddress: shippingAddress.address,
                shippingFee: 30000,
              }
            : undefined,
        meetupShopInfo:
          checkoutDeliveryType === 'station_meetup'
            ? selectedMeetupShop || undefined
            : undefined,
      });

      setShowCheckoutModal(false);
      loadProducts();

      // Mở modal thanh toán VietQR Escrow
      const createdOrder = orders.find((o) => o.id === orderId);
      if (createdOrder) {
        setActivePaymentOrder(createdOrder);
      } else {
        setActivePaymentOrder({
          id: orderId,
          orderCode: `MT-${orderId.slice(-6)}`,
          productTitle: targetProduct.title,
          totalAmount:
            targetProduct.price +
            (checkoutDeliveryType === 'courier_shipping' ? 30000 : 0),
        } as any);
      }
      setShowPaymentModal(true);
    } catch (error: any) {
      Alert.alert('Lỗi chốt đơn', error.message || 'Không thể tạo đơn hàng.');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const simulateVietQrPayment = async () => {
    if (!activePaymentOrder) return;
    setIsProcessingPayment(true);
    try {
      await markOrderAsPaidInEscrow(activePaymentOrder.id);
      setIsProcessingPayment(false);
      setShowPaymentModal(false);
      setActiveTab('orders');
      Alert.alert(
        'Thanh toán Ký quỹ thành công!',
        'MotoTune đã niêm phong tiền của bạn. Người bán sẽ chuẩn bị hàng hoặc hẹn gặp tại trạm.'
      );
    } catch (error) {
      setIsProcessingPayment(false);
      Alert.alert('Lỗi', 'Xác thực thanh toán thất bại.');
    }
  };

  const handleOpenChatWithSeller = (product: IProduct) => {
    setViewProduct(null);
    router.push({
      pathname: `/chat/${product.authorId}` as any,
      params: {
        name: product.authorName,
        avatar: product.authorAvatar || '',
        productId: product.id,
        productTitle: product.title,
        productPrice: product.price.toString(),
        productImage: product.coverUrl,
      },
    });
  };

  const handleSubmitReview = async () => {
    if (!reviewTargetOrder) return;
    setIsSubmittingReview(true);
    try {
      const isBuyer = currentUser?.uid === reviewTargetOrder.buyerId;
      const targetUserId = isBuyer
        ? reviewTargetOrder.sellerId
        : reviewTargetOrder.buyerId;

      await submitOrderReview({
        orderId: reviewTargetOrder.id,
        targetUserId,
        rating: reviewRating,
        comment: reviewComment,
      });

      setShowReviewModal(false);
      setReviewComment('');
      Alert.alert('Cảm ơn bạn', 'Đánh giá đã được ghi nhận vào hồ sơ Biker!');
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể gửi đánh giá.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleSubmitTracking = async () => {
    if (!trackingOrder || !trackingCodeInput.trim()) {
      return Alert.alert('Thông báo', 'Vui lòng nhập mã vận đơn tra cứu!');
    }
    setIsSubmittingTracking(true);
    try {
      await updateOrderShippingInfo(
        trackingOrder.id,
        carrierInput,
        trackingCodeInput.trim()
      );
      setShowTrackingModal(false);
      setTrackingCodeInput('');
      Alert.alert('Thành công', 'Đã cập nhật mã vận đơn!');
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể cập nhật mã vận đơn.');
    } finally {
      setIsSubmittingTracking(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await cancelOrderAndReleaseProduct(orderId);
      Alert.alert('Thành công', 'Đã hủy đơn hàng và mở lại món đồ trên sàn.');
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể hủy đơn hàng lúc này.');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await deleteMarketplaceOrder(orderId);
      Alert.alert('Thành công', 'Đã xóa bản ghi đơn hàng khỏi lịch sử.');
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể xóa đơn hàng lúc này.');
    }
  };

  const renderProductItem = ({ item }: { item: IProduct }) => {
    const isOwner = currentUser?.uid === item.authorId;
    const mediaCount = item.mediaUrls?.length || 1;
    const postDate = new Date(item.createdAt).toLocaleDateString('vi-VN');

    const conditionText =
      item.condition === 'brand_new'
        ? 'Mới 100%'
        : item.condition === 'like_new_99'
        ? '99% Like New'
        : item.condition === 'for_parts'
        ? 'Rã xác'
        : 'Đã sử dụng';

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => {
          setViewProduct(item);
          setCurrentMediaIdx(0);
        }}
        activeOpacity={0.8}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.coverUrl }} style={styles.productImage} />
          <View style={styles.mediaBadge}>
            <Text style={styles.mediaBadgeText}>+{mediaCount}</Text>
          </View>
          <View style={styles.conditionBadge}>
            <Text style={styles.conditionText}>{conditionText}</Text>
          </View>
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productCategory}>{item.category}</Text>
          <Text style={styles.productTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.productPrice}>
            {((item.price ?? 0)).toLocaleString('vi-VN')} đ
          </Text>

          <View style={styles.sellerRow}>
            <Store size={12} color={COLORS.textDim} />
            <Text style={styles.sellerName} numberOfLines={1}>
              {item.authorName || 'Biker ẩn danh'}
            </Text>
          </View>

          <View style={styles.cityRow}>
            <MapPin size={11} color={COLORS.textDim} />
            <Text style={styles.cityText} numberOfLines={1}>
              {item.city || 'Toàn quốc'}
            </Text>
          </View>

          <View style={styles.actionRow}>
            {isOwner ? (
              <View style={styles.ownerPill}>
                <Trash2 size={13} color="white" />
                <Text style={styles.actText}>Bài của bạn</Text>
              </View>
            ) : (
              <View style={styles.viewPill}>
                <Eye size={13} color="white" />
                <Text style={styles.actText}>Xem chi tiết</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderOrderItem = ({ item }: { item: IOrder }) => {
    const isBuyer = currentUser?.uid === item.buyerId;
    const partnerName = isBuyer ? item.sellerName : item.buyerName;
    const priceToDisplay = (item.totalAmount ?? item.productPrice) ?? 0;

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View style={styles.orderTypeRow}>
            <Text style={styles.orderRole}>
              {isBuyer ? 'ĐƠN MUA' : 'ĐƠN BÁN'}
            </Text>
            <View
              style={[
                styles.deliveryBadge,
                item.deliveryType === 'station_meetup'
                  ? styles.stationBadge
                  : styles.shippingBadge,
              ]}
            >
              <Text style={styles.deliveryBadgeText}>
                {item.deliveryType === 'station_meetup'
                  ? 'Gặp tại Trạm'
                  : 'Ship Bưu Điện'}
              </Text>
            </View>
          </View>
          <Text style={styles.orderDate}>
            {new Date(item.createdAt || Date.now()).toLocaleDateString('vi-VN')}
          </Text>
        </View>

        <View style={styles.orderBody}>
          {item.productImage ? (
            <Image source={{ uri: item.productImage }} style={styles.orderImg} />
          ) : (
            <View style={[styles.orderImg, { backgroundColor: '#333' }]} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.oTitle} numberOfLines={1}>
              {item.productTitle || 'Sản phẩm giao dịch'}
            </Text>
            <Text style={styles.oPrice}>
              {priceToDisplay.toLocaleString('vi-VN')} đ
            </Text>
            <Text style={styles.oPartner}>
              Đối tác: <Text style={{ color: 'white' }}>{partnerName || 'Biker'}</Text>
            </Text>
          </View>
        </View>

        {item.deliveryType === 'station_meetup' && item.meetupShopInfo && (
          <View style={styles.meetupInfoCard}>
            <Store size={14} color={COLORS.primary} />
            <Text style={styles.meetupShopText} numberOfLines={1}>
              Điểm hẹn: {item.meetupShopInfo.name} ({item.meetupShopInfo.address})
            </Text>
          </View>
        )}

        {/* STATUS FOOTER ACTIONS */}
        <View style={styles.orderFooter}>
          {item.status === 'pending_payment' && (
            <>
              <Text style={styles.statusWarning}>Chờ thanh toán Escrow</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.oActionBtn, { backgroundColor: '#333' }]}
                  onPress={() => handleCancelOrder(item.id)}
                >
                  <X size={14} color={COLORS.textDim} />
                  <Text style={[styles.oActionText, { color: COLORS.textDim }]}>Hủy Đơn</Text>
                </TouchableOpacity>

                {isBuyer && (
                  <TouchableOpacity
                    style={styles.oActionBtn}
                    onPress={() => {
                      setActivePaymentOrder(item);
                      setShowPaymentModal(true);
                    }}
                  >
                    <CreditCard size={14} color="white" />
                    <Text style={styles.oActionText}>Thanh Toán</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          {item.status === 'awaiting_meetup' && (
            <>
              <Text style={styles.statusSafe}>Đã ký quỹ - Chờ gặp tại tiệm</Text>
              {isBuyer ? (
                <TouchableOpacity
                  style={[styles.oActionBtn, { backgroundColor: COLORS.safe }]}
                  onPress={() => {
                    setHandshakeOrder(item);
                    setIsHandshakeSeller(false);
                    setShowHandshakeModal(true);
                  }}
                >
                  <QrCode size={14} color="white" />
                  <Text style={styles.oActionText}>Xác nhận nhận đồ</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.oActionBtn}
                  onPress={() => {
                    setHandshakeOrder(item);
                    setIsHandshakeSeller(true);
                    setShowHandshakeModal(true);
                  }}
                >
                  <QrCode size={14} color="white" />
                  <Text style={styles.oActionText}>Mở Mã Bắt Tay</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {item.status === 'paid_in_escrow' && (
            <>
              <Text style={styles.statusInfo}>Sàn đã giữ tiền an toàn</Text>
              {!isBuyer && (
                <TouchableOpacity
                  style={[styles.oActionBtn, { backgroundColor: COLORS.info }]}
                  onPress={() => {
                    setTrackingOrder(item);
                    setShowTrackingModal(true);
                  }}
                >
                  <Truck size={14} color="white" />
                  <Text style={styles.oActionText}>Nhập Mã Vận Đơn</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {item.status === 'shipping' && (
            <>
              <Text style={styles.statusWarning}>Đang vận chuyển bưu điện</Text>
              {isBuyer && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.oActionBtn, { backgroundColor: COLORS.border }]}
                    onPress={() => {
                      setDisputeTargetOrder(item);
                      setShowDisputeModal(true);
                    }}
                  >
                    <AlertTriangle size={14} color={COLORS.warning} />
                    <Text style={styles.oActionText}>Khiếu nại</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.oActionBtn, { backgroundColor: COLORS.safe }]}
                    onPress={() => confirmDeliveryAndReleasePayout(item.id)}
                  >
                    <CheckCircle size={14} color="white" />
                    <Text style={styles.oActionText}>Đã nhận hàng</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {item.status === 'completed' && (
            <>
              <Text style={styles.statusSafe}>Giao dịch thành công</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.oActionBtn, { backgroundColor: '#222' }]}
                  onPress={() => handleDeleteOrder(item.id)}
                >
                  <Trash2 size={13} color={COLORS.textDim} />
                  <Text style={[styles.oActionText, { color: COLORS.textDim }]}>Xóa</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.oActionBtn, { backgroundColor: '#333' }]}
                  onPress={() => {
                    setReviewTargetOrder(item);
                    setShowReviewModal(true);
                  }}
                >
                  <Star size={14} color={COLORS.warning} />
                  <Text style={styles.oActionText}>Đánh giá</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {item.status === 'disputed' && (
            <Text style={styles.statusWarning}>Đang xử lý khiếu nại (Tiền bị khóa)</Text>
          )}

          {item.status === 'cancelled' && (
            <>
              <Text style={styles.statusDim}>Đã hủy đơn hàng</Text>
              <TouchableOpacity
                style={[styles.oActionBtn, { backgroundColor: '#222' }]}
                onPress={() => handleDeleteOrder(item.id)}
              >
                <Trash2 size={13} color={COLORS.textDim} />
                <Text style={[styles.oActionText, { color: COLORS.textDim }]}>Xóa bản ghi</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const displayedOrders = orders.filter((o) =>
    orderSubTab === 'buying'
      ? o.buyerId === currentUser?.uid
      : o.sellerId === currentUser?.uid
  );

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 12 : 16) }]}>
      {/* HEADER TABS */}
      <View style={styles.header}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'market' && styles.tabBtnActive]}
            onPress={() => setActiveTab('market')}
          >
            <ShoppingBag
              size={18}
              color={activeTab === 'market' ? COLORS.primary : COLORS.textDim}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'market' && { color: COLORS.primary },
              ]}
            >
              CHỢ BIKER
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'orders' && styles.tabBtnActive]}
            onPress={() => setActiveTab('orders')}
          >
            <ClipboardList
              size={18}
              color={activeTab === 'orders' ? COLORS.primary : COLORS.textDim}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'orders' && { color: COLORS.primary },
              ]}
            >
              ĐƠN HÀNG ({orders.length})
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'market' && (
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            style={styles.addTriggerBtn}
          >
            <PlusCircle size={28} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* TAB CHỢ: TÌM KIẾM & BỘ LỌC */}
      {activeTab === 'market' && (
        <View style={styles.filterSection}>
          <View style={styles.searchBar}>
            <Search size={16} color={COLORS.textDim} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm phụ tùng, pô, phuộc, heo dầu, dòng xe..."
              placeholderTextColor={COLORS.textDim}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={loadProducts}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color={COLORS.textDim} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterRow}>
            <TouchableOpacity style={styles.sortBtn} onPress={toggleSort}>
              <ArrowDownUp size={14} color="white" />
              <Text style={styles.sortText}>{getSortLabel()}</Text>
            </TouchableOpacity>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catChip,
                    filterCat === cat && styles.catChipActive,
                  ]}
                  onPress={() => setFilterCat(cat)}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      filterCat === cat && { color: 'white' },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* TAB ĐƠN HÀNG: SUB-TABS (ĐƠN MUA / ĐƠN BÁN) */}
      {activeTab === 'orders' && (
        <View style={styles.orderSubTabContainer}>
          <TouchableOpacity
            style={[
              styles.orderSubTabBtn,
              orderSubTab === 'buying' && styles.orderSubTabBtnActive,
            ]}
            onPress={() => setOrderSubTab('buying')}
          >
            <Text
              style={[
                styles.orderSubTabText,
                orderSubTab === 'buying' && { color: COLORS.primary, fontWeight: 'bold' },
              ]}
            >
              ĐƠN MUA
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.orderSubTabBtn,
              orderSubTab === 'selling' && styles.orderSubTabBtnActive,
            ]}
            onPress={() => setOrderSubTab('selling')}
          >
            <Text
              style={[
                styles.orderSubTabText,
                orderSubTab === 'selling' && { color: COLORS.primary, fontWeight: 'bold' },
              ]}
            >
              ĐƠN BÁN
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* DANH SÁCH CHÍNH */}
      {activeTab === 'market' ? (
        loading ? (
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
            style={{ marginTop: 50 }}
          />
        ) : (
          <FlatList
            key="market-grid"
            data={products}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={{
              justifyContent: 'space-between',
              paddingHorizontal: 15,
            }}
            contentContainerStyle={{ paddingBottom: 100, paddingTop: 15 }}
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              loadProducts();
            }}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>Không tìm thấy mặt hàng nào.</Text>
                <Text style={styles.emptySub}>
                  Hãy thử tìm từ khóa khác hoặc đăng bán món đầu tiên!
                </Text>
              </View>
            }
            renderItem={renderProductItem}
          />
        )
      ) : (
        <FlatList
          key="orders-list"
          data={displayedOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Bạn chưa có đơn hàng nào.</Text>
              <Text style={styles.emptySub}>
                Các đơn mua và đơn bán được bảo đảm Escrow sẽ xuất hiện ở đây.
              </Text>
            </View>
          }
          renderItem={renderOrderItem}
        />
      )}

      {/* MODAL CHI TIẾT MÓN HÀNG */}
      <Modal visible={!!viewProduct} animationType="slide" presentationStyle="pageSheet">
        {viewProduct && (
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                CHI TIẾT MÓN HÀNG
              </Text>
              <TouchableOpacity onPress={() => setViewProduct(null)}>
                <X size={26} color={COLORS.textDim} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              <View style={styles.carouselContainer}>
                {viewProduct.mediaUrls &&
                (viewProduct.mediaUrls[currentMediaIdx].includes('.mp4') ||
                  viewProduct.mediaUrls[currentMediaIdx].includes('video/upload')) ? (
                  <ExpoVideo
                    source={{ uri: viewProduct.mediaUrls[currentMediaIdx] }}
                    style={styles.carouselMedia}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                    isLooping
                  />
                ) : (
                  <Image
                    source={{
                      uri: viewProduct.mediaUrls
                        ? viewProduct.mediaUrls[currentMediaIdx]
                        : viewProduct.coverUrl,
                    }}
                    style={styles.carouselMedia}
                    resizeMode="contain"
                  />
                )}

                {viewProduct.mediaUrls && viewProduct.mediaUrls.length > 1 && (
                  <>
                    <TouchableOpacity
                      style={styles.navBtnLeft}
                      onPress={() =>
                        setCurrentMediaIdx(
                          (prev) =>
                            (prev - 1 + viewProduct.mediaUrls.length) %
                            viewProduct.mediaUrls.length
                        )
                      }
                    >
                      <ChevronLeft size={28} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.navBtnRight}
                      onPress={() =>
                        setCurrentMediaIdx(
                          (prev) => (prev + 1) % viewProduct.mediaUrls.length
                        )
                      }
                    >
                      <ChevronRight size={28} color="white" />
                    </TouchableOpacity>
                    <View style={styles.carouselBadge}>
                      <Text style={{ color: 'white', fontWeight: 'bold' }}>
                        {currentMediaIdx + 1} / {viewProduct.mediaUrls.length}
                      </Text>
                    </View>
                  </>
                )}
              </View>

              <View style={{ padding: 20 }}>
                <View style={styles.priceRow}>
                  <Text style={styles.detailTitle}>{viewProduct.title}</Text>
                  <Text style={styles.detailPrice}>
                    {((viewProduct.price ?? 0)).toLocaleString('vi-VN')} đ
                  </Text>
                </View>

                {/* THẺ TÍN NHIỆM NGƯỜI BÁN */}
                <View style={styles.sellerTrustBox}>
                  <View style={styles.sellerInfoLeft}>
                    <Store size={18} color={COLORS.primary} />
                    <View>
                      <Text style={styles.sellerNameBold}>
                        {viewProduct.authorName || 'Biker ẩn danh'}
                      </Text>
                      <Text style={styles.sellerTierText}>
                        Hạng: {sellerTrustTier} ({sellerTrustScore ?? 100} Điểm Tín Nhiệm)
                      </Text>
                    </View>
                  </View>
                  <View style={styles.verifiedShield}>
                    <ShieldCheck size={16} color={COLORS.safe} />
                    <Text style={styles.verifiedShieldText}>Escrow Safe</Text>
                  </View>
                </View>

                <View style={styles.tagChipsRow}>
                  <View style={styles.tagPill}>
                    <Text style={styles.tagPillText}>{viewProduct.category}</Text>
                  </View>
                  <View style={styles.tagPill}>
                    <Text style={styles.tagPillText}>
                      {viewProduct.condition === 'brand_new'
                        ? 'Mới 100%'
                        : viewProduct.condition === 'like_new_99'
                        ? '99% Likenew'
                        : 'Đã sử dụng'}
                    </Text>
                  </View>
                  <View style={styles.tagPill}>
                    <MapPin size={12} color={COLORS.textDim} />
                    <Text style={styles.tagPillText}>
                      {viewProduct.city || 'Toàn quốc'}
                    </Text>
                  </View>
                </View>

                {viewProduct.compatibleBikeModels &&
                  viewProduct.compatibleBikeModels.length > 0 && (
                    <View style={{ marginBottom: 15 }}>
                      <Text style={styles.subHeading}>Dòng xe tương thích:</Text>
                      <Text style={styles.bodyText}>
                        {viewProduct.compatibleBikeModels.join(', ')}
                      </Text>
                    </View>
                  )}

                <Text style={styles.subHeading}>Mô tả chi tiết:</Text>
                <Text style={styles.descText}>
                  {viewProduct.desc || 'Người bán không để lại mô tả chi tiết.'}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.bottomBar}>
              {currentUser?.uid === viewProduct.authorId ? (
                <TouchableOpacity
                  style={[styles.actionButtonPrimary, { backgroundColor: '#EF4444' }]}
                  onPress={() => handleDeleteProduct(viewProduct.id)}
                >
                  <Trash2 size={18} color="white" />
                  <Text style={styles.actionBtnText}>GỠ BỎ SẢN PHẨM</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.buyerActionGroup}>
                  <TouchableOpacity
                    style={styles.chatBtn}
                    onPress={() => handleOpenChatWithSeller(viewProduct)}
                    activeOpacity={0.8}
                  >
                    <MessageCircle size={18} color="white" />
                    <Text style={styles.chatBtnText}>Chat</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.buyNowBtn}
                    onPress={() => handleStartCheckout(viewProduct)}
                    activeOpacity={0.8}
                  >
                    <ShieldCheck size={18} color="white" />
                    <Text style={styles.buyNowBtnText}>CHỐT ĐƠN ESCROW</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </SafeAreaView>
        )}
      </Modal>

      {/* MODAL CHECKOUT & CHỌN HÌNH THỨC GIAO HÀNG */}
      <Modal visible={showCheckoutModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>CHỌN HÌNH THỨC GIAO DỊCH</Text>
            <TouchableOpacity onPress={() => setShowCheckoutModal(false)}>
              <X size={26} color={COLORS.textDim} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, padding: 20 }}>
            <Text style={styles.sectionLabel}>Chọn phương thức nhận hàng:</Text>

            {/* OPTION 1: MEETUP AT SHOP */}
            <TouchableOpacity
              style={[
                styles.deliveryOptionCard,
                checkoutDeliveryType === 'station_meetup' &&
                  styles.deliveryOptionCardActive,
              ]}
              onPress={() => setCheckoutDeliveryType('station_meetup')}
            >
              <View style={styles.optionHeader}>
                <Store size={20} color={COLORS.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>
                    Gặp trực tiếp tại Tiệm Sửa Xe (Khuyên dùng)
                  </Text>
                  <Text style={styles.optionSub}>
                    Có thợ tháo lắp thử đồ, quét mã QR Bắt tay giải ngân tại chỗ.
                  </Text>
                </View>
              </View>

              {checkoutDeliveryType === 'station_meetup' && (
                <View style={styles.selectedShopPreview}>
                  {selectedMeetupShop ? (
                    <View>
                      <Text style={styles.shopSelectedName}>
                        {selectedMeetupShop.name}
                      </Text>
                      <Text style={styles.shopSelectedAddr}>
                        {selectedMeetupShop.address}
                      </Text>
                    </View>
                  ) : (
                    <Text style={{ color: COLORS.warning, fontSize: 12 }}>
                      Chưa chọn tiệm sửa xe làm điểm hẹn
                    </Text>
                  )}
                  <TouchableOpacity
                    style={styles.changeShopBtn}
                    onPress={() => setShowShopSelectModal(true)}
                  >
                    <Text style={styles.changeShopBtnText}>
                      {selectedMeetupShop ? 'Đổi tiệm khác' : 'Chọn Tiệm trên Map'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>

            {/* OPTION 2: COURIER DELIVERY */}
            <TouchableOpacity
              style={[
                styles.deliveryOptionCard,
                checkoutDeliveryType === 'courier_shipping' &&
                  styles.deliveryOptionCardActive,
              ]}
              onPress={() => setCheckoutDeliveryType('courier_shipping')}
            >
              <View style={styles.optionHeader}>
                <Truck size={20} color={COLORS.info} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>Giao Hàng Bưu Điện (Ship Tận Nơi)</Text>
                  <Text style={styles.optionSub}>
                    Giao bưu tá, có mã vận đơn + 48h kiểm tra hàng trước khi giải ngân.
                  </Text>
                </View>
              </View>

              {checkoutDeliveryType === 'courier_shipping' && (
                <View style={styles.addressForm}>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Họ và tên người nhận"
                    placeholderTextColor={COLORS.textDim}
                    value={shippingAddress.name}
                    onChangeText={(t) => setShippingAddress({ ...shippingAddress, name: t })}
                  />
                  <TextInput
                    style={styles.formInput}
                    placeholder="Số điện thoại nhận hàng"
                    placeholderTextColor={COLORS.textDim}
                    keyboardType="phone-pad"
                    value={shippingAddress.phone}
                    onChangeText={(t) => setShippingAddress({ ...shippingAddress, phone: t })}
                  />
                  <TextInput
                    style={styles.formInput}
                    placeholder="Địa chỉ chi tiết (Số nhà, Tên đường...)"
                    placeholderTextColor={COLORS.textDim}
                    value={shippingAddress.address}
                    onChangeText={(t) => setShippingAddress({ ...shippingAddress, address: t })}
                  />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.escrowNoticeBox}>
              <ShieldCheck size={20} color={COLORS.safe} />
              <Text style={styles.escrowNoticeText}>
                Tiền thanh toán sẽ được MotoTune giữ an toàn. Người bán chỉ nhận được
                tiền khi bạn đã kiểm tra và hài lòng với món đồ.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={[styles.actionButtonPrimary, isCreatingOrder && { opacity: 0.6 }]}
              onPress={handleConfirmOrderAndPay}
              disabled={isCreatingOrder}
            >
              {isCreatingOrder ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={styles.actionBtnText}>XÁC NHẬN & QUÉT VIETQR</Text>
                  <ArrowRight size={18} color="white" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* MODAL THANH TOÁN VIETQR SANDBOX */}
      <Modal visible={showPaymentModal} animationType="slide" transparent={true}>
        <View style={styles.paymentOverlay}>
          <View style={styles.paymentBox}>
            <View style={styles.payHeader}>
              <CreditCard size={24} color={COLORS.primary} />
              <Text style={styles.payTitle}>CỔNG KÝ QUỸ VIETQR</Text>
            </View>

            <View style={styles.payInfo}>
              <Text style={{ color: COLORS.textDim, marginBottom: 5 }}>
                Mã đơn: {activePaymentOrder?.id.substring(0, 8).toUpperCase()}
              </Text>
              <Text style={{ color: 'white', fontSize: 15, fontWeight: 'bold' }}>
                {activePaymentOrder?.productTitle}
              </Text>

              <View style={styles.payTotalRow}>
                <Text style={{ color: 'white', fontSize: 16 }}>Tổng tiền niêm phong:</Text>
                <Text style={{ color: COLORS.safe, fontSize: 22, fontWeight: '900' }}>
                  {activePaymentOrder?.totalAmount
                    ? activePaymentOrder.totalAmount.toLocaleString('vi-VN')
                    : '0'}{' '}
                  đ
                </Text>
              </View>

              <View style={styles.vietQrMock}>
                <QrCode size={130} color="white" />
                <Text style={{ color: COLORS.textDim, fontSize: 11, marginTop: 8 }}>
                  Nội dung CK: MT_ORDER_{activePaymentOrder?.id.slice(-6)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.actionButtonPrimary, isProcessingPayment && { opacity: 0.6 }]}
              onPress={simulateVietQrPayment}
              disabled={isProcessingPayment}
            >
              {isProcessingPayment ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.actionBtnText}>XÁC NHẬN ĐÃ CHUYỂN KHOẢN</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: 15, padding: 8 }}
              onPress={() => setShowPaymentModal(false)}
            >
              <Text style={{ color: COLORS.textDim, textAlign: 'center' }}>
                Thanh toán sau
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL ĐĂNG BÁN SẢN PHẨM */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>ĐĂNG BÁN SẢN PHẨM MỚI</Text>
            <TouchableOpacity
              onPress={() => setShowAddModal(false)}
              disabled={isUploading}
            >
              <X size={26} color={COLORS.textDim} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.mediaPickerRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {newProduct.assets.length < 5 && (
                  <TouchableOpacity
                    style={styles.mediaAddSquare}
                    onPress={pickMedia}
                    disabled={isUploading}
                  >
                    <PlusCircle size={28} color={COLORS.primary} />
                    <Text style={styles.addMediaLabel}>Thêm Ảnh/Video</Text>
                  </TouchableOpacity>
                )}
                {newProduct.assets.map((asset, index) => (
                  <View key={index} style={styles.mediaSquare}>
                    {asset.type === 'video' ? (
                      <View style={[styles.previewMedia, styles.videoPlaceholder]}>
                        <Video size={28} color="white" />
                        <Text style={{ color: 'white', fontSize: 10 }}>Video</Text>
                      </View>
                    ) : (
                      <Image source={{ uri: asset.uri }} style={styles.previewMedia} />
                    )}
                    <TouchableOpacity
                      style={styles.removeMediaBtn}
                      onPress={() => removeAsset(index)}
                      disabled={isUploading}
                    >
                      <X size={14} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Tên sản phẩm (ví dụ: Heo dầu Brembo 2 pis đối xứng)"
              placeholderTextColor={COLORS.textDim}
              value={newProduct.title}
              onChangeText={(t) => setNewProduct({ ...newProduct, title: t })}
              editable={!isUploading}
            />

            <TextInput
              style={styles.input}
              placeholder="Giá bán (VNĐ)"
              placeholderTextColor={COLORS.textDim}
              keyboardType="numeric"
              value={newProduct.price}
              onChangeText={(t) => setNewProduct({ ...newProduct, price: t })}
              editable={!isUploading}
            />

            <TextInput
              style={styles.input}
              placeholder="Dòng xe tương thích (ví dụ: Exciter 150, Winner X, SH...)"
              placeholderTextColor={COLORS.textDim}
              value={newProduct.compatibleBikeModels}
              onChangeText={(t) =>
                setNewProduct({ ...newProduct, compatibleBikeModels: t })
              }
              editable={!isUploading}
            />

            <TextInput
              style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
              placeholder="Mô tả chi tiết tình trạng, xuất xứ, vết xước nếu có..."
              placeholderTextColor={COLORS.textDim}
              multiline
              value={newProduct.desc}
              onChangeText={(t) => setNewProduct({ ...newProduct, desc: t })}
              editable={!isUploading}
            />

            <Text style={styles.subHeading}>Tình trạng món đồ:</Text>
            <View style={styles.conditionRow}>
              {CONDITIONS.filter((c) => c.value !== 'all').map((c) => (
                <TouchableOpacity
                  key={c.value}
                  style={[
                    styles.condChip,
                    newProduct.condition === c.value && styles.condChipActive,
                  ]}
                  onPress={() =>
                    setNewProduct({ ...newProduct, condition: c.value as TProductCondition })
                  }
                  disabled={isUploading}
                >
                  <Text
                    style={[
                      styles.condChipText,
                      newProduct.condition === c.value && { color: 'white' },
                    ]}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.actionButtonPrimary, isUploading && { opacity: 0.5 }]}
              onPress={handlePostProduct}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.actionBtnText}>ĐĂNG LÊN CHỢ NGAY</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* MODAL CHỌN TIỆM SỬA XE TRÊN MAP */}
      <SelectMeetupShopModal
        visible={showShopSelectModal}
        onClose={() => setShowShopSelectModal(false)}
        onSelectShop={(shop) => setSelectedMeetupShop(shop)}
      />

      {/* MODAL MÃ BẮT TAY TẠI TRẠM */}
      <HandshakeQrModal
        visible={showHandshakeModal}
        order={handshakeOrder}
        isSeller={isHandshakeSeller}
        onClose={() => setShowHandshakeModal(false)}
        onSuccess={() => {
          loadProducts();
        }}
      />

      {/* MODAL KHIẾU NẠI TRANH CHẤP */}
      <DisputeModal
        visible={showDisputeModal}
        order={disputeTargetOrder}
        onClose={() => setShowDisputeModal(false)}
        onSubmitDispute={async (reason, evidenceUrls) => {
          if (!disputeTargetOrder) return;
          await openOrderDispute(disputeTargetOrder.id, reason, evidenceUrls);
        }}
      />

      {/* MODAL NHẬP MÃ VẬN ĐƠN TRA CỨU */}
      <Modal visible={showTrackingModal} animationType="slide" transparent={true}>
        <View style={styles.paymentOverlay}>
          <View style={styles.paymentBox}>
            <Text style={styles.payTitle}>NHẬP MÃ VẬN ĐƠN SHIPPER</Text>
            <Text style={{ color: COLORS.textDim, fontSize: 13, marginBottom: 15 }}>
              Nhập mã vận đơn từ bưu tá để Người mua theo dõi hành trình gói hàng.
            </Text>

            <TextInput
              style={styles.formInput}
              placeholder="Đơn vị vận chuyển (Viettel Post, GHTK...)"
              placeholderTextColor={COLORS.textDim}
              value={carrierInput}
              onChangeText={setCarrierInput}
            />

            <TextInput
              style={styles.formInput}
              placeholder="Mã vận đơn (ví dụ: VTP123456789)"
              placeholderTextColor={COLORS.textDim}
              value={trackingCodeInput}
              onChangeText={setTrackingCodeInput}
            />

            <TouchableOpacity
              style={[styles.actionButtonPrimary, isSubmittingTracking && { opacity: 0.6 }]}
              onPress={handleSubmitTracking}
              disabled={isSubmittingTracking}
            >
              {isSubmittingTracking ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.actionBtnText}>LƯU MÃ VẬN ĐƠN</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: 10, padding: 8 }}
              onPress={() => setShowTrackingModal(false)}
            >
              <Text style={{ color: COLORS.textDim, textAlign: 'center' }}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL ĐÁNH GIÁ SAO (BLIND REVIEW) */}
      <Modal visible={showReviewModal} animationType="slide" transparent={true}>
        <View style={styles.paymentOverlay}>
          <View style={styles.paymentBox}>
            <Text style={styles.payTitle}>ĐÁNH GIÁ ĐỐI TÁC</Text>
            <Text style={{ color: COLORS.textDim, fontSize: 13, marginBottom: 15 }}>
              Đánh giá của bạn sẽ giúp cộng đồng Biker nâng cao chất lượng giao dịch.
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setReviewRating(star)}>
                  <Star
                    size={32}
                    color={star <= reviewRating ? COLORS.warning : '#444'}
                    fill={star <= reviewRating ? COLORS.warning : 'transparent'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Nhận xét về thái độ, chất lượng món đồ..."
              placeholderTextColor={COLORS.textDim}
              multiline
              value={reviewComment}
              onChangeText={setReviewComment}
            />

            <TouchableOpacity
              style={[styles.actionButtonPrimary, isSubmittingReview && { opacity: 0.6 }]}
              onPress={handleSubmitReview}
              disabled={isSubmittingReview}
            >
              {isSubmittingReview ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.actionBtnText}>GỬI ĐÁNH GIÁ</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: 10, padding: 8 }}
              onPress={() => setShowReviewModal(false)}
            >
              <Text style={{ color: COLORS.textDim, textAlign: 'center' }}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  blockedContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  blockedIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(227, 27, 35, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  blockedTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 10,
    textAlign: 'center',
  },
  blockedSub: {
    color: COLORS.textDim,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  loginBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  loginBtnText: { color: 'white', fontWeight: '900', fontSize: 14 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 8,
  },
  tabContainer: { flexDirection: 'row', gap: 15 },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: COLORS.primary },
  tabText: { color: COLORS.textDim, fontSize: 14, fontWeight: 'bold' },
  addTriggerBtn: { padding: 4 },

  filterSection: {
    paddingHorizontal: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 13 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sortText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#111',
  },
  catChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  catChipText: { color: COLORS.textDim, fontSize: 11, fontWeight: 'bold' },

  orderSubTabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  orderSubTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  orderSubTabBtnActive: { backgroundColor: '#1C1C1E' },
  orderSubTabText: { color: COLORS.textDim, fontSize: 12, fontWeight: '600' },

  productCard: {
    width: width / 2 - 22,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  imageContainer: { width: '100%', height: 140, backgroundColor: '#1C1C1E' },
  productImage: { width: '100%', height: '100%' },
  mediaBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  mediaBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  conditionBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  conditionText: { color: COLORS.warning, fontSize: 9, fontWeight: 'bold' },
  productInfo: { padding: 10 },
  productCategory: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  productTitle: { color: 'white', fontSize: 13, fontWeight: 'bold', minHeight: 34, lineHeight: 17 },
  productPrice: { color: COLORS.safe, fontSize: 15, fontWeight: '900', marginTop: 4 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  sellerName: { color: COLORS.textDim, fontSize: 11, flex: 1 },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  cityText: { color: '#888', fontSize: 10 },
  actionRow: { marginTop: 10, borderTopWidth: 1, borderColor: '#222', paddingTop: 8 },
  viewPill: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  ownerPill: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  actText: { color: 'white', fontSize: 11, fontWeight: 'bold' },

  orderCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#222',
    paddingBottom: 8,
    marginBottom: 10,
    gap: 8,
  },
  orderTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  orderRole: { color: COLORS.primary, fontWeight: '900', fontSize: 12 },
  deliveryBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  stationBadge: { backgroundColor: 'rgba(227, 27, 35, 0.15)' },
  shippingBadge: { backgroundColor: 'rgba(59, 130, 246, 0.15)' },
  deliveryBadgeText: { color: 'white', fontSize: 9, fontWeight: 'bold' },
  orderDate: { color: COLORS.textDim, fontSize: 11, flexShrink: 0 },
  orderBody: { flexDirection: 'row', gap: 12, marginBottom: 10, alignItems: 'center' },
  orderImg: { width: 55, height: 55, borderRadius: 8, backgroundColor: '#222' },
  oTitle: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  oPrice: { color: COLORS.safe, fontSize: 14, fontWeight: '900', marginTop: 2 },
  oPartner: { color: '#888', fontSize: 11, marginTop: 2 },
  meetupInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    padding: 8,
    borderRadius: 6,
    gap: 6,
    marginBottom: 10,
  },
  meetupShopText: { color: COLORS.textDim, fontSize: 11, flex: 1 },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderColor: '#222',
    paddingTop: 10,
  },
  statusWarning: { color: COLORS.warning, fontSize: 12, fontWeight: 'bold', flexShrink: 1 },
  statusSafe: { color: COLORS.safe, fontSize: 12, fontWeight: 'bold', flexShrink: 1 },
  statusInfo: { color: COLORS.info, fontSize: 12, fontWeight: 'bold', flexShrink: 1 },
  statusSub: { color: COLORS.textDim, fontSize: 11 },
  statusDim: { color: '#666', fontSize: 12 },
  oActionBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  oActionText: { color: 'white', fontSize: 11, fontWeight: 'bold' },

  emptyBox: { alignItems: 'center', padding: 50 },
  emptyTitle: { color: COLORS.text, fontSize: 15, fontWeight: 'bold' },
  emptySub: { color: COLORS.textDim, fontSize: 12, textAlign: 'center', marginTop: 6 },

  modalContainer: { flex: 1, backgroundColor: COLORS.bg },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: { color: 'white', fontSize: 16, fontWeight: '900', flex: 1 },
  carouselContainer: { width: '100%', height: width * 0.85, backgroundColor: '#111' },
  carouselMedia: { width: '100%', height: '100%' },
  navBtnLeft: {
    position: 'absolute',
    left: 10,
    top: '45%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 20,
  },
  navBtnRight: {
    position: 'absolute',
    right: 10,
    top: '45%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 20,
  },
  carouselBadge: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', flex: 1, marginRight: 10 },
  detailPrice: { color: COLORS.safe, fontSize: 20, fontWeight: '900' },
  sellerTrustBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sellerInfoLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sellerNameBold: { color: 'white', fontSize: 13, fontWeight: 'bold' },
  sellerTierText: { color: COLORS.textDim, fontSize: 11 },
  verifiedShield: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  verifiedShieldText: { color: COLORS.safe, fontSize: 10, fontWeight: 'bold' },
  tagChipsRow: { flexDirection: 'row', gap: 8, marginBottom: 15, flexWrap: 'wrap' },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  tagPillText: { color: COLORS.textDim, fontSize: 11 },
  subHeading: { color: 'white', fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
  bodyText: { color: COLORS.textDim, fontSize: 13, lineHeight: 20 },
  descText: { color: COLORS.textDim, fontSize: 13, lineHeight: 20 },
  bottomBar: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  buyerActionGroup: { flexDirection: 'row', gap: 10 },
  chatBtn: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 6,
  },
  chatBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  buyNowBtn: {
    flex: 2,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 6,
  },
  buyNowBtnText: { color: 'white', fontWeight: '900', fontSize: 14 },
  actionButtonPrimary: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  actionBtnText: { color: 'white', fontWeight: '900', fontSize: 14 },

  sectionLabel: { color: 'white', fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  deliveryOptionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  deliveryOptionCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(227, 27, 35, 0.08)',
  },
  optionHeader: { flexDirection: 'row', gap: 12 },
  optionTitle: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  optionSub: { color: COLORS.textDim, fontSize: 11, marginTop: 2, lineHeight: 16 },
  selectedShopPreview: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#2C2C2E',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shopSelectedName: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  shopSelectedAddr: { color: COLORS.textDim, fontSize: 11, maxWidth: 200 },
  changeShopBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  changeShopBtnText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  addressForm: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderColor: '#2C2C2E', gap: 10 },
  formInput: {
    backgroundColor: '#111',
    color: 'white',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 13,
    marginBottom: 10,
  },
  escrowNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 15,
  },
  escrowNoticeText: { color: COLORS.safe, fontSize: 11, lineHeight: 16, flex: 1 },

  paymentOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  paymentBox: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  payHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    paddingBottom: 12,
    marginBottom: 15,
  },
  payTitle: { color: 'white', fontSize: 16, fontWeight: '900' },
  payInfo: { backgroundColor: '#111', padding: 15, borderRadius: 10, marginBottom: 15 },
  payTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#222',
  },
  vietQrMock: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    padding: 12,
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
  },

  formContainer: { padding: 16 },
  mediaPickerRow: { marginBottom: 15 },
  mediaAddSquare: {
    width: 85,
    height: 85,
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  addMediaLabel: { color: COLORS.textDim, fontSize: 10, marginTop: 4 },
  mediaSquare: {
    width: 85,
    height: 85,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 10,
  },
  previewMedia: { width: '100%', height: '100%' },
  videoPlaceholder: { backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' },
  removeMediaBtn: {
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
  input: {
    backgroundColor: '#111',
    color: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 13,
    marginBottom: 12,
  },
  conditionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 25 },
  condChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#1C1C1E',
  },
  condChipActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(227, 27, 35, 0.2)' },
  condChipText: { color: COLORS.textDim, fontSize: 11 },
});

