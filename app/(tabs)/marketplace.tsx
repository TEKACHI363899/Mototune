import { Video as ExpoVideo, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { ArrowDownUp, ArrowRight, CheckCircle, ChevronLeft, ChevronRight, ClipboardList, Clock, CreditCard, Eye, Lock, PlusCircle, ShieldCheck, ShoppingBag, Store, Trash2, Truck, Video, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';
import { uploadToCloudinary } from '../../services/cloudinaryService';

const { width, height } = Dimensions.get('window');
const COLORS = { bg: '#000000', card: '#121212', primary: '#E31B23', text: '#FFFFFF', textDim: '#A0A0A0', safe: '#4ADE80', warning: '#F59E0B', info: '#3B82F6' };
// Cloudinary config loaded from env via cloudinaryService

const CATEGORIES = ["Phụ tùng", "Xe cộ", "Bảo hộ", "Khác"];

type MediaAsset = { uri: string; type: 'image' | 'video' };

export default function MarketplaceScreen() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [activeTab, setActiveTab] = useState<'market' | 'orders'>('market');
  
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterCat, setFilterCat] = useState('Tất cả');
  const [sortOrder, setSortOrder] = useState<'newest' | 'asc' | 'desc'>('newest');

  const [showAddModal, setShowAddModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newProduct, setNewProduct] = useState({ title: '', price: '', desc: '', category: 'Phụ tùng', assets: [] as MediaAsset[] });

  const [viewProduct, setViewProduct] = useState<any>(null);
  const [currentMediaIdx, setCurrentMediaIdx] = useState(0);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    let unsubscribeOrders: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => { 
      setCurrentUser(user); 
      if (user && !user.isAnonymous) {
        if (unsubscribeOrders) unsubscribeOrders();
        unsubscribeOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
          const allOrders: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const myOrders = allOrders.filter(o => o.buyerId === user.uid || o.sellerId === user.uid).sort((a, b) => b.createdAt - a.createdAt);
          setOrders(myOrders);
        });
      } else {
        setOrders([]);
        if (unsubscribeOrders) {
          unsubscribeOrders();
          unsubscribeOrders = null;
        }
      }
    });
    const q = query(collection(db, 'marketplace'), where('status', '==', 'available'), orderBy('createdAt', 'desc'));
    const unsubscribeMarket = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => { 
      unsubscribeAuth(); 
      unsubscribeMarket(); 
      if (unsubscribeOrders) unsubscribeOrders();
    };
  }, []);

  // 🛑 KIỂM TRA ĐĂNG NHẬP ẨN DANH / CHƯA ĐĂNG NHẬP
  if (!currentUser || currentUser.isAnonymous) {
    return (
      <SafeAreaView style={styles.blockedContainer}>
        <View style={styles.blockedIconCircle}>
          <Lock size={60} color={COLORS.primary} />
        </View>
        <Text style={styles.blockedTitle}>KHU VỰC ĐỘC QUYỀN</Text>
        <Text style={styles.blockedSub}>
          Chợ Biker là khu vực giao dịch an toàn. Vui lòng đăng nhập tài khoản chính thức để trải nghiệm tính năng mua bán phụ tùng!
        </Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/profile')}>
          <Text style={styles.loginBtnText}>ĐI TỚI ĐĂNG NHẬP</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // --- CÁC HÀM XỬ LÝ (GIỮ NGUYÊN) ---
  const displayProducts = products
    .filter(p => filterCat === 'Tất cả' || p.category === filterCat)
    .sort((a, b) => {
      if (sortOrder === 'asc') return a.price - b.price;
      if (sortOrder === 'desc') return b.price - a.price;
      return 0;
    });

  const toggleSort = () => {
    if (sortOrder === 'newest') setSortOrder('asc');
    else if (sortOrder === 'asc') setSortOrder('desc');
    else setSortOrder('newest');
  };

  const getSortLabel = () => {
    if (sortOrder === 'asc') return "Giá: Thấp -> Cao";
    if (sortOrder === 'desc') return "Giá: Cao -> Thấp";
    return "Mới nhất";
  };

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert("Lỗi", "Cần quyền truy cập Thư viện ảnh!");

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All, allowsMultipleSelection: true, selectionLimit: 5, quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      const newAssets: MediaAsset[] = result.assets.map(asset => ({ uri: asset.uri, type: asset.type === 'video' ? 'video' : 'image' }));
      setNewProduct(prev => ({ ...prev, assets: [...prev.assets, ...newAssets].slice(0, 5) })); 
    }
  };

  const removeAsset = (index: number) => { setNewProduct(prev => ({ ...prev, assets: prev.assets.filter((_, i) => i !== index) })); };

  // Local uploadToCloudinary function removed and moved to cloudinaryService

  const handlePostProduct = async () => {
    if (!currentUser) return Alert.alert("Lỗi", "Đăng nhập.");
    if (!newProduct.title || !newProduct.price || newProduct.assets.length === 0) return Alert.alert("Thiếu", "Cần Tên, Giá và ít nhất 1 ảnh/video.");

    setIsUploading(true);
    try {
      const uploadPromises = newProduct.assets.map(asset => uploadToCloudinary(asset.uri, asset.type));
      const mediaUrls = await Promise.all(uploadPromises); 
      
      const authorDisplayName = currentUser.displayName || currentUser.email?.split('@')[0] || "Biker";

      await addDoc(collection(db, 'marketplace'), {
        title: newProduct.title, price: parseInt(newProduct.price), desc: newProduct.desc, category: newProduct.category,
        mediaUrls: mediaUrls, coverUrl: newProduct.assets[0].type === 'image' ? mediaUrls[0] : 'https://res.cloudinary.com/dqgymln1n/image/upload/v1741094033/moto-video-placeholder_joxit9.png',
        authorId: currentUser.uid, authorEmail: currentUser.email || '', authorName: authorDisplayName, status: 'available', createdAt: Date.now()
      });

      setShowAddModal(false);
      setNewProduct({ title: '', price: '', desc: '', category: 'Phụ tùng', assets: [] });
      Alert.alert("Hoàn tất", "Sản phẩm của bạn đã lên kệ!");
    } catch (error) { Alert.alert("Lỗi", "Không thể đăng sản phẩm."); } finally { setIsUploading(false); }
  };

  const handleDeleteProduct = (productId: string) => {
    const executeDelete = async () => {
      try { 
        await deleteDoc(doc(db, 'marketplace', productId)); 
        setViewProduct(null);
        if (Platform.OS !== 'web') Alert.alert("Thành công", "Đã gỡ bài!");
      } 
      catch (error) { Alert.alert("Lỗi", "Không thể xóa sản phẩm."); }
    };

    if (Platform.OS === 'web') {
      const isConfirm = window.confirm("Bạn có chắc chắn muốn gỡ bài viết này khỏi chợ?");
      if (isConfirm) executeDelete();
    } else {
      Alert.alert("Gỡ bài", "Bạn có muốn gỡ sản phẩm này khỏi chợ?", [
        { text: "Hủy" }, { text: "Xóa", style: "destructive", onPress: executeDelete }
      ]);
    }
  };

  const handleCreateOrder = (product: any) => {
    if (!currentUser) return;
    const executeOrder = async () => {
      try {
        const sellerDisplayName = product.authorName || product.authorEmail?.split('@')[0] || "Biker ẩn danh";
        
        await addDoc(collection(db, 'orders'), {
          productId: product.id, productTitle: product.title, productImage: product.coverUrl, price: product.price,
          sellerId: product.authorId, sellerEmail: product.authorEmail || '', sellerName: sellerDisplayName,
          buyerId: currentUser.uid, buyerEmail: currentUser.email || '', buyerName: currentUser.displayName || currentUser.email?.split('@')[0] || "Biker",
          status: 'pending', createdAt: Date.now()
        });
        await updateDoc(doc(db, 'marketplace', product.id), { status: 'sold' });
        setViewProduct(null); 
        Alert.alert("Chốt đơn thành công!", "Vào tab ĐƠN HÀNG để thanh toán bảo kim.");
        setActiveTab('orders');
      } catch (error) { Alert.alert("Lỗi", "Chốt đơn thất bại."); }
    };

    if (Platform.OS === 'web') {
      const isConfirm = window.confirm(`Chốt đơn giá ${product.price.toLocaleString('vi-VN')}đ?\nTiền sẽ được MotoTune giữ đảm bảo an toàn.`);
      if (isConfirm) executeOrder();
    } else {
      Alert.alert("Chốt đơn?", `Giá: ${product.price.toLocaleString('vi-VN')}đ. Sàn sẽ giữ tiền để đảm bảo.`, [
        { text: "Hủy" }, { text: "Mua ngay", onPress: executeOrder }
      ]);
    }
  };

  const simulatePayment = async () => { 
    setIsProcessingPayment(true);
    setTimeout(async () => {
      try { await updateDoc(doc(db, 'orders', selectedOrder.id), { status: 'paid', paidAt: Date.now() });
        setIsProcessingPayment(false); setShowPaymentModal(false); Alert.alert("Đã nhận tiền", "Người bán sẽ giao hàng.");
      } catch (error) { setIsProcessingPayment(false); Alert.alert("Lỗi", "Thanh toán thất bại."); }
    }, 1500);
  };
  const updateOrderStatus = async (orderId: string, newStatus: string) => { 
    try { await updateDoc(doc(db, 'orders', orderId), { status: newStatus }); } catch (error) { Alert.alert("Lỗi", "Cập nhật thất bại."); }
  };

  const renderProductItem = ({ item }: { item: any }) => {
    const isOwner = currentUser?.uid === item.authorId;
    const mediaCount = item.mediaUrls?.length || 1;
    const postDate = new Date(item.createdAt).toLocaleDateString('vi-VN');
    const sellerDisplayName = item.authorName || item.authorEmail?.split('@')[0] || "Biker ẩn danh";

    return (
      <TouchableOpacity style={styles.productCard} onPress={() => { setViewProduct(item); setCurrentMediaIdx(0); }} activeOpacity={0.8}>
        <View>
          <Image source={{ uri: item.coverUrl }} style={styles.productImage} />
          <View style={styles.mediaBadge}><Text style={styles.mediaBadgeText}>+{mediaCount}</Text></View>
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productCategory}>{item.category}</Text>
          <Text style={styles.productTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.productPrice}>{item.price.toLocaleString('vi-VN')} đ</Text>
          <View style={styles.sellerRow}>
            <Store size={14} color={COLORS.textDim} />
            <Text style={styles.sellerName} numberOfLines={1}>{sellerDisplayName}</Text>
          </View>
          <Text style={styles.postDateText}>{postDate}</Text>
          <View style={styles.actionRow}>
            {isOwner ? (
              <View style={styles.deleteBtn}><Trash2 size={16} color="white" /><Text style={styles.actText}>Bài của bạn</Text></View>
            ) : (
              <View style={styles.buyBtn}><Eye size={16} color="white" /><Text style={styles.actText}>Xem chi tiết</Text></View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderOrderItem = ({ item }: { item: any }) => { 
    const isBuyer = currentUser?.uid === item.buyerId;
    const partnerName = isBuyer ? (item.sellerName || item.sellerEmail?.split('@')[0] || "Biker ẩn danh") : (item.buyerName || item.buyerEmail?.split('@')[0] || "Biker ẩn danh");

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}><Text style={styles.orderRole}>{isBuyer ? "Đơn Mua" : "Đơn Bán"}</Text><Text style={styles.orderDate}>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</Text></View>
        <View style={styles.orderBody}><Image source={{ uri: item.productImage }} style={styles.orderImg} /><View style={{flex: 1}}><Text style={styles.oTitle} numberOfLines={1}>{item.productTitle}</Text><Text style={styles.oPrice}>{item.price.toLocaleString('vi-VN')} đ</Text><Text style={styles.oPartner}>Đối tác: {partnerName}</Text></View></View>
        <View style={styles.orderFooter}>
          {item.status === 'pending' && <>{<Text style={{color: COLORS.warning, fontWeight: 'bold', flex: 1}}>Chờ thanh toán</Text>}{isBuyer && <TouchableOpacity style={styles.oActionBtn} onPress={() => { setSelectedOrder(item); setShowPaymentModal(true); }}><Text style={styles.oActionText}>Thanh Toán</Text></TouchableOpacity>}</>}
          {item.status === 'paid' && <>{<Text style={{color: COLORS.info, fontWeight: 'bold', flex: 1}}>Chờ giao hàng</Text>}{!isBuyer && <TouchableOpacity style={[styles.oActionBtn, {backgroundColor: COLORS.info}]} onPress={() => updateOrderStatus(item.id, 'shipped')}><Truck size={16} color="white" /><Text style={styles.oActionText}>Đã giao hàng</Text></TouchableOpacity>}</>}
          {item.status === 'shipped' && <>{<Text style={{color: COLORS.warning, fontWeight: 'bold', flex: 1}}>Đang vận chuyển</Text>}{isBuyer && <TouchableOpacity style={[styles.oActionBtn, {backgroundColor: COLORS.safe}]} onPress={() => {Alert.alert("Hoàn tất", "Xác nhận đã nhận hàng Ok?", [{text: "Hủy"}, {text: "OK", onPress: () => updateOrderStatus(item.id, 'completed')}])}}><CheckCircle size={16} color="white" /><Text style={styles.oActionText}>Đã nhận hàng</Text></TouchableOpacity>}</>}
          {item.status === 'completed' && <><Text style={{color: COLORS.safe, fontWeight: 'bold', flex: 1}}>Thành công</Text>{!isBuyer && <Text style={{color: COLORS.textDim, fontSize: 11}}>Đã nhận tiền (-5%)</Text>}</>}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'market' && styles.tabBtnActive]} onPress={() => setActiveTab('market')}><ShoppingBag size={20} color={activeTab === 'market' ? COLORS.primary : COLORS.textDim} /><Text style={[styles.tabText, activeTab === 'market' && {color: COLORS.primary}]}>CHỢ BIKER</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'orders' && styles.tabBtnActive]} onPress={() => setActiveTab('orders')}><ClipboardList size={20} color={activeTab === 'orders' ? COLORS.primary : COLORS.textDim} /><Text style={[styles.tabText, activeTab === 'orders' && {color: COLORS.primary}]}>ĐƠN HÀNG</Text></TouchableOpacity>
        </View>
        {activeTab === 'market' && <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addTriggerBtn}><PlusCircle size={28} color={COLORS.primary} /></TouchableOpacity>}
      </View>

      {/* THANH LỌC VÀ SẮP XẾP */}
      {activeTab === 'market' && (
        <View style={styles.filterSection}>
          <TouchableOpacity style={styles.sortBtn} onPress={toggleSort}>
            <ArrowDownUp size={16} color="white" />
            <Text style={{color: 'white', fontSize: 12, fontWeight: 'bold'}}>{getSortLabel()}</Text>
          </TouchableOpacity>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 10, paddingRight: 20}}>
            {['Tất cả', ...CATEGORIES].map(cat => (
              <TouchableOpacity key={cat} style={[styles.catFilterChip, filterCat === cat && {backgroundColor: COLORS.primary, borderColor: COLORS.primary}]} onPress={() => setFilterCat(cat)}>
                <Text style={{color: filterCat === cat ? 'white' : COLORS.textDim, fontSize: 12, fontWeight: 'bold'}}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {activeTab === 'market' ? (
        loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 50}} /> : (
          <FlatList key="market-list" data={displayProducts} keyExtractor={item => item.id} numColumns={2} columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 15 }} contentContainerStyle={{ paddingBottom: 100, paddingTop: 15 }} ListEmptyComponent={<Text style={{color: COLORS.textDim, textAlign: 'center', marginTop: 50}}>Không tìm thấy mặt hàng nào.</Text>} renderItem={renderProductItem} />
        )
      ) : (
        <FlatList key="orders-list" data={orders} keyExtractor={item => item.id} contentContainerStyle={{ padding: 15, paddingBottom: 100 }} ListEmptyComponent={<Text style={{color: COLORS.textDim, textAlign: 'center', marginTop: 50}}>Bạn chưa có giao dịch.</Text>} renderItem={renderOrderItem} />
      )}

      {/* 🛑 MODAL CHI TIẾT SẢN PHẨM & CAROUSEL */}
      <Modal visible={!!viewProduct} animationType="slide" presentationStyle="pageSheet">
        {viewProduct && (
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>CHI TIẾT MÓN HÀNG</Text>
              <TouchableOpacity onPress={() => setViewProduct(null)}><X size={28} color={COLORS.textDim} /></TouchableOpacity>
            </View>
            
            <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false}>
              <View style={styles.carouselContainer}>
                {viewProduct.mediaUrls && (viewProduct.mediaUrls[currentMediaIdx].includes('.mp4') || viewProduct.mediaUrls[currentMediaIdx].includes('video/upload')) ? (
                  <ExpoVideo source={{uri: viewProduct.mediaUrls[currentMediaIdx]}} style={styles.carouselMedia} useNativeControls resizeMode={ResizeMode.CONTAIN} isLooping />
                ) : (
                  <Image source={{ uri: viewProduct.mediaUrls ? viewProduct.mediaUrls[currentMediaIdx] : viewProduct.coverUrl }} style={styles.carouselMedia} resizeMode="contain" />
                )}

                {viewProduct.mediaUrls && viewProduct.mediaUrls.length > 1 && (
                  <>
                    <TouchableOpacity style={styles.navBtnLeft} onPress={() => setCurrentMediaIdx(prev => (prev - 1 + viewProduct.mediaUrls.length) % viewProduct.mediaUrls.length)}>
                      <ChevronLeft size={30} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.navBtnRight} onPress={() => setCurrentMediaIdx(prev => (prev + 1) % viewProduct.mediaUrls.length)}>
                      <ChevronRight size={30} color="white" />
                    </TouchableOpacity>
                    <View style={styles.carouselBadge}><Text style={{color: 'white', fontWeight: 'bold'}}>{currentMediaIdx + 1} / {viewProduct.mediaUrls.length}</Text></View>
                  </>
                )}
              </View>

              <View style={{padding: 20}}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10}}>
                  <Text style={{color: 'white', fontSize: 22, fontWeight: '900', flex: 1, marginRight: 10}}>{viewProduct.title}</Text>
                  <Text style={{color: COLORS.safe, fontSize: 22, fontWeight: '900'}}>{viewProduct.price.toLocaleString('vi-VN')} đ</Text>
                </View>
                
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10}}>
                  <View style={{backgroundColor: '#222', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 5}}>
                    <Text style={{color: COLORS.primary, fontSize: 12, fontWeight: 'bold'}}>{viewProduct.category}</Text>
                  </View>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
                    <Store size={14} color={COLORS.textDim}/>
                    <Text style={{color: COLORS.textDim, fontSize: 13}}>Người bán: <Text style={{color: 'white', fontWeight: 'bold'}}>{viewProduct.authorName || viewProduct.authorEmail?.split('@')[0] || "Biker ẩn danh"}</Text></Text>
                  </View>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
                    <Clock size={14} color={COLORS.textDim}/>
                    <Text style={{color: COLORS.textDim, fontSize: 13}}>Đăng ngày: <Text style={{color: 'white'}}>{new Date(viewProduct.createdAt).toLocaleDateString('vi-VN')}</Text></Text>
                  </View>
                </View>

                <Text style={{color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 10}}>Mô tả hàng hóa:</Text>
                <Text style={{color: COLORS.textDim, fontSize: 15, lineHeight: 24}}>{viewProduct.desc || "Không có mô tả chi tiết."}</Text>
              </View>
            </ScrollView>

            <View style={{padding: 20, borderTopWidth: 1, borderTopColor: '#222', backgroundColor: COLORS.card}}>
              {currentUser?.uid === viewProduct.authorId ? (
                <TouchableOpacity style={[styles.submitBtn, {backgroundColor: '#EF4444'}]} onPress={() => handleDeleteProduct(viewProduct.id)}>
                  <Trash2 size={20} color="white" />
                  <Text style={styles.submitBtnText}>GỠ BỎ SẢN PHẨM NÀY</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.submitBtn} onPress={() => handleCreateOrder(viewProduct)}>
                  <ShieldCheck size={20} color="white" />
                  <Text style={styles.submitBtnText}>CHỐT ĐƠN QUA MOTOTUNE</Text>
                </TouchableOpacity>
              )}
            </View>
          </SafeAreaView>
        )}
      </Modal>

      {/* MODAL THANH TOÁN (MÔ PHỎNG) */}
      <Modal visible={showPaymentModal} animationType="slide" transparent={true}><View style={styles.paymentOverlay}><View style={styles.paymentBox}><View style={styles.payHeader}><CreditCard size={28} color={COLORS.primary} /><Text style={styles.payTitle}>CỔNG THANH TOÁN (SANDBOX)</Text></View><View style={styles.payInfo}><Text style={{color: COLORS.textDim, marginBottom: 5}}>Mã đơn: {selectedOrder?.id.substring(0,8).toUpperCase()}</Text><Text style={{color: 'white', fontSize: 16, fontWeight: 'bold'}} numberOfLines={1}>{selectedOrder?.productTitle}</Text><View style={styles.payTotalRow}><Text style={{color: 'white', fontSize: 18}}>Tổng thanh toán:</Text><Text style={{color: COLORS.safe, fontSize: 24, fontWeight: '900'}}>{selectedOrder?.price.toLocaleString('vi-VN')} đ</Text></View><Text style={{color: COLORS.warning, fontSize: 11, marginTop: 15, fontStyle: 'italic', textAlign: 'center'}}>* Môi trường thử nghiệm. Hệ thống không trừ tiền thật.</Text></View><TouchableOpacity style={[styles.paySubmitBtn, isProcessingPayment && {opacity: 0.7}]} onPress={simulatePayment} disabled={isProcessingPayment}>{isProcessingPayment ? (<><ActivityIndicator color="white" /><Text style={styles.paySubmitText}>Đang xử lý...</Text></>) : (<><Text style={styles.paySubmitText}>XÁC NHẬN CHUYỂN KHOẢN</Text><ArrowRight size={20} color="white" /></>)}</TouchableOpacity><TouchableOpacity style={{marginTop: 15, padding: 10}} onPress={() => setShowPaymentModal(false)} disabled={isProcessingPayment}><Text style={{color: COLORS.textDim, textAlign: 'center'}}>Hủy giao dịch</Text></TouchableOpacity></View></View></Modal>

      {/* MODAL ĐĂNG BÁN SẢN PHẨM */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>ĐĂNG BÁN SẢN PHẨM</Text><TouchableOpacity onPress={() => setShowAddModal(false)} disabled={isUploading}><X size={28} color={COLORS.textDim} /></TouchableOpacity></View>
          <View style={styles.formContainer}>
            <View style={styles.mediaPickerRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 12}}>
                {newProduct.assets.length < 5 && (
                  <TouchableOpacity style={styles.mediaAddSquare} onPress={pickMedia} disabled={isUploading}>
                    <PlusCircle size={30} color={COLORS.primary} /><Text style={{color: COLORS.textDim, fontSize: 11, marginTop: 5, textAlign: 'center'}}>Thêm Ảnh/Video</Text>
                  </TouchableOpacity>
                )}
                {newProduct.assets.map((asset, index) => (
                  <View key={index} style={styles.mediaSquare}>
                    {asset.type === 'video' ? <View style={[styles.previewMedia, styles.videoPlaceholder]}><Video size={30} color="white" /><Text style={{color: 'white', fontSize: 10, marginTop: 2}}>Video</Text></View> : <Image source={{ uri: asset.uri }} style={styles.previewMedia} />}
                    <TouchableOpacity style={styles.removeMediaBtn} onPress={() => removeAsset(index)} disabled={isUploading}><X size={16} color="white" strokeWidth={3} /></TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
              <Text style={{color: '#666', fontSize: 11, marginTop: 10, alignSelf: 'flex-start'}}>* Tối đa 5 ảnh hoặc video miêu tả.</Text>
            </View>
            <TextInput style={styles.input} placeholder="Tên sản phẩm" placeholderTextColor="#666" value={newProduct.title} onChangeText={t => setNewProduct({...newProduct, title: t})} editable={!isUploading} />
            <TextInput style={styles.input} placeholder="Giá tiền (VND)" placeholderTextColor="#666" keyboardType="numeric" value={newProduct.price} onChangeText={t => setNewProduct({...newProduct, price: t.replace(/[^0-9]/g, '')})} editable={!isUploading} />
            <TextInput style={[styles.input, {height: 80, textAlignVertical: 'top'}]} placeholder="Mô tả tình trạng hàng hóa..." placeholderTextColor="#666" multiline value={newProduct.desc} onChangeText={t => setNewProduct({...newProduct, desc: t})} editable={!isUploading} />
            <View style={styles.chipRow}>{CATEGORIES.map(cat => (<TouchableOpacity key={cat} style={[styles.catChip, newProduct.category === cat && styles.catChipActive]} onPress={() => setNewProduct({...newProduct, category: cat})} disabled={isUploading}><Text style={[styles.catChipText, newProduct.category === cat && {color: 'white'}]}>{cat}</Text></TouchableOpacity>))}</View>
            <TouchableOpacity style={[styles.submitBtn, isUploading && {opacity: 0.5}]} onPress={handlePostProduct} disabled={isUploading}>{isUploading ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>ĐĂNG BÁN NGAY</Text>}</TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  
  // 🛑 STYLE CHO MÀN HÌNH CHẶN NGƯỜI DÙNG ẨN DANH
  blockedContainer: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center', padding: 30 },
  blockedIconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(227, 27, 35, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 30, borderWidth: 2, borderColor: COLORS.primary },
  blockedTitle: { color: 'white', fontSize: 24, fontWeight: '900', marginBottom: 15, textAlign: 'center', letterSpacing: 1 },
  blockedSub: { color: COLORS.textDim, fontSize: 16, textAlign: 'center', marginBottom: 40, lineHeight: 24 },
  loginBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 35, paddingVertical: 18, borderRadius: 30, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },
  loginBtnText: { color: 'white', fontWeight: '900', fontSize: 16, letterSpacing: 1 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, paddingBottom: 10 },
  tabContainer: { flexDirection: 'row', gap: 20 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: COLORS.primary },
  tabText: { color: COLORS.textDim, fontSize: 16, fontWeight: 'bold' },
  addTriggerBtn: { padding: 5, marginBottom: 10 },

  filterSection: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#222', gap: 15 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#1A1A1A', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  catFilterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, borderWidth: 1, borderColor: '#333', backgroundColor: '#111' },

  productCard: { width: (width / 2) - 22, backgroundColor: COLORS.card, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#333', overflow: 'hidden' },
  productImage: { width: '100%', height: 150, backgroundColor: '#222' },
  mediaBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1, borderColor: '#333' },
  mediaBadgeText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  productInfo: { padding: 12 },
  productCategory: { color: COLORS.primary, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
  productTitle: { color: 'white', fontSize: 14, fontWeight: 'bold', lineHeight: 20, height: 40 },
  productPrice: { color: COLORS.safe, fontSize: 16, fontWeight: '900', marginTop: 8 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 5 },
  sellerName: { color: COLORS.textDim, fontSize: 12, flex: 1 },
  postDateText: { color: '#666', fontSize: 10, marginTop: 4 }, 
  actionRow: { marginTop: 15, borderTopWidth: 1, borderTopColor: '#333', paddingTop: 10 },
  buyBtn: { backgroundColor: 'rgba(59, 130, 246, 0.1)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, gap: 5, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.3)' },
  deleteBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, gap: 5, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  actText: {color: 'white', fontWeight: 'bold', fontSize: 12},

  carouselContainer: { width: '100%', height: width, backgroundColor: '#111', position: 'relative' },
  carouselMedia: { width: '100%', height: '100%' },
  navBtnLeft: { position: 'absolute', left: 10, top: '45%', backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 25 },
  navBtnRight: { position: 'absolute', right: 10, top: '45%', backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 25 },
  carouselBadge: { position: 'absolute', bottom: 15, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20 },

  orderCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#333' },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#222', paddingBottom: 10, marginBottom: 15 },
  orderRole: { color: COLORS.primary, fontWeight: '900', textTransform: 'uppercase' },
  orderDate: { color: COLORS.textDim, fontSize: 12 },
  orderBody: { flexDirection: 'row', gap: 15, marginBottom: 15 },
  orderImg: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#222' },
  oTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  oPrice: { color: COLORS.safe, fontSize: 15, fontWeight: 'bold', marginBottom: 5 },
  oPartner: { color: '#888', fontSize: 13 },
  orderFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#222', paddingTop: 15 },
  oActionBtn: { backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, gap: 5 },
  oActionText: { color: 'white', fontWeight: 'bold', fontSize: 13 },

  paymentOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  paymentBox: { width: '100%', backgroundColor: '#1A1A1A', borderRadius: 20, padding: 25, borderWidth: 1, borderColor: '#333' },
  payHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 15 },
  payTitle: { color: 'white', fontSize: 18, fontWeight: '900' },
  payInfo: { backgroundColor: '#111', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#333', marginBottom: 25 },
  payTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#333' },
  paySubmitBtn: { backgroundColor: COLORS.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 18, borderRadius: 12, gap: 10 },
  paySubmitText: { color: 'white', fontSize: 16, fontWeight: '900', letterSpacing: 1 },

  modalContainer: { flex: 1, backgroundColor: COLORS.bg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#222' },
  modalTitle: { color: 'white', fontSize: 18, fontWeight: '900', flex: 1 },
  formContainer: { padding: 20 },
  mediaPickerRow: { marginBottom: 25, alignItems: 'center' },
  mediaAddSquare: { width: 100, height: 100, backgroundColor: '#111', borderRadius: 12, borderWidth: 1.5, borderColor: '#333', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  mediaSquare: { width: 100, height: 100, borderRadius: 12, overflow: 'hidden', backgroundColor: '#111', borderWidth: 1, borderColor: '#333' },
  previewMedia: { width: '100%', height: '100%' },
  videoPlaceholder: { backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' },
  removeMediaBtn: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.6)', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },

  input: { backgroundColor: '#111', color: 'white', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#333', fontSize: 15, marginBottom: 15 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 30 },
  catChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#444', backgroundColor: '#222' },
  catChipActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(227, 27, 35, 0.2)' },
  catChipText: { color: COLORS.textDim, fontWeight: 'bold' },
  submitBtn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 },
  submitBtnText: { color: 'white', fontWeight: '900', fontSize: 16, letterSpacing: 1 }
});