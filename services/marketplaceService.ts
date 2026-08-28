import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  addDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  onSnapshot,
  Unsubscribe,
  DocumentSnapshot,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import {
  IProduct,
  IOrder,
  ICreateProductInput,
  ICreateOrderInput,
  TProductStatus,
  TOrderStatus,
  TDeliveryType,
  IShippingInfo,
  IMeetupShopInfo,
} from '../interfaces/marketplace';
import { uploadToCloudinary } from './cloudinaryService';
import { createMarketplaceNotification } from './notificationService';
import { recordSuccessfulTransaction, penalizeNoShow } from './trustScoreService';

const PAGE_SIZE_DEFAULT = 20;

/**
 * Đăng bán sản phẩm mới lên sàn Chợ Biker MotoTune
 */
export const createProductListing = async (
  input: ICreateProductInput
): Promise<string> => {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.isAnonymous) {
    throw new Error('UNAUTHORIZED_OPERATION');
  }

  if (!input.title.trim() || input.price <= 0 || input.assets.length === 0) {
    throw new Error('INVALID_PRODUCT_DATA');
  }

  // Tải lên các file media lên Cloudinary
  const uploadPromises = input.assets.map((asset) =>
    uploadToCloudinary(asset.uri, asset.type)
  );
  const mediaUrls = await Promise.all(uploadPromises);
  const coverUrl =
    input.assets[0].type === 'image'
      ? mediaUrls[0]
      : 'https://res.cloudinary.com/dqgymln1n/image/upload/v1741094033/moto-video-placeholder_joxit9.png';

  const authorDisplayName =
    currentUser.displayName ||
    currentUser.email?.split('@')[0] ||
    'Biker MotoTune';

  const now = Date.now();
  const productData: Omit<IProduct, 'id'> = {
    title: input.title.trim(),
    price: input.price,
    originalPrice: input.originalPrice || input.price,
    desc: input.desc.trim(),
    category: input.category,
    condition: input.condition,
    compatibleBikeModels: input.compatibleBikeModels || [],
    city: input.city || 'Toàn quốc',
    mediaUrls,
    coverUrl,
    status: 'available',
    isNegotiable: !!input.isNegotiable,
    viewCount: 0,
    favoriteCount: 0,
    authorId: currentUser.uid,
    authorEmail: currentUser.email || '',
    authorName: authorDisplayName,
    authorAvatar: currentUser.photoURL || null,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, 'marketplace'), productData);
  return docRef.id;
};

/**
 * Lấy danh sách sản phẩm có phân trang (Cursor-based) và lọc đa chiều
 */
export const fetchMarketplaceProducts = async (params: {
  category?: string;
  condition?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  sortOrder?: 'newest' | 'price_asc' | 'price_desc';
  lastVisible?: DocumentSnapshot;
  pageSize?: number;
}): Promise<{ products: IProduct[]; lastVisibleDoc: DocumentSnapshot | null }> => {
  const limitCount = params.pageSize || PAGE_SIZE_DEFAULT;

  let q = query(
    collection(db, 'marketplace'),
    where('status', '==', 'available'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  if (params.lastVisible) {
    q = query(
      collection(db, 'marketplace'),
      where('status', '==', 'available'),
      orderBy('createdAt', 'desc'),
      startAfter(params.lastVisible),
      limit(limitCount)
    );
  }

  const snapshot = await getDocs(q);
  const products: IProduct[] = [];

  snapshot.forEach((docSnap: QueryDocumentSnapshot) => {
    const data = docSnap.data();
    products.push({
      id: docSnap.id,
      ...data,
    } as IProduct);
  });

  // Lọc client-side cho các trường phụ
  let filtered = products;
  if (params.category && params.category !== 'Tất cả') {
    filtered = filtered.filter((p) => p.category === params.category);
  }
  if (params.condition && params.condition !== 'all') {
    filtered = filtered.filter((p) => p.condition === params.condition);
  }
  if (params.city && params.city !== 'Toàn quốc') {
    filtered = filtered.filter((p) => p.city === params.city);
  }
  if (params.minPrice !== undefined) {
    filtered = filtered.filter((p) => p.price >= (params.minPrice || 0));
  }
  if (params.maxPrice !== undefined) {
    filtered = filtered.filter((p) => p.price <= (params.maxPrice || Infinity));
  }

  if (params.sortOrder === 'price_asc') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (params.sortOrder === 'price_desc') {
    filtered.sort((a, b) => b.price - a.price);
  }

  const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
  return { products: filtered, lastVisibleDoc: lastDoc };
};

/**
 * Tìm kiếm sản phẩm theo từ khóa
 */
export const searchMarketplaceProducts = async (
  keyword: string,
  limitCount = 30
): Promise<IProduct[]> => {
  const cleanKeyword = keyword.trim().toLowerCase();
  if (!cleanKeyword) return [];

  const q = query(
    collection(db, 'marketplace'),
    where('status', '==', 'available'),
    limit(limitCount * 2)
  );

  const snapshot = await getDocs(q);
  const matched: IProduct[] = [];

  snapshot.forEach((docSnap) => {
    const item = { id: docSnap.id, ...docSnap.data() } as IProduct;
    const titleMatch = (item.title || '').toLowerCase().includes(cleanKeyword);
    const descMatch = (item.desc || '').toLowerCase().includes(cleanKeyword);
    const bikeMatch = (item.compatibleBikeModels || []).some((m) =>
      m.toLowerCase().includes(cleanKeyword)
    );

    if (titleMatch || descMatch || bikeMatch) {
      matched.push(item);
    }
  });

  return matched.slice(0, limitCount);
};

/**
 * Xóa/Gỡ sản phẩm khỏi sàn (Bảo mật: Chỉ tác giả mới có quyền)
 */
export const deleteProductListing = async (productId: string): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('UNAUTHORIZED_OPERATION');

  const productRef = doc(db, 'marketplace', productId);
  const snap = await getDoc(productRef);
  if (!snap.exists()) throw new Error('PRODUCT_NOT_FOUND');

  if (snap.data().authorId !== currentUser.uid) {
    throw new Error('FORBIDDEN_OPERATION');
  }

  await deleteDoc(productRef);
};

/**
 * Tạo đơn hàng mới với Khóa nguyên tử (Atomic Lock) chống Race Condition
 */
export const createMarketplaceOrder = async (
  input: ICreateOrderInput
): Promise<string> => {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.isAnonymous) {
    throw new Error('UNAUTHORIZED_OPERATION');
  }

  const productRef = doc(db, 'marketplace', input.productId);
  const orderRef = doc(collection(db, 'orders'));

  return await runTransaction(db, async (transaction) => {
    const productSnap = await transaction.get(productRef);
    if (!productSnap.exists()) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    const product = productSnap.data() as IProduct;
    if (product.status !== 'available') {
      throw new Error('PRODUCT_ALREADY_RESERVED_OR_SOLD');
    }

    if (product.authorId === currentUser.uid) {
      throw new Error('CANNOT_BUY_OWN_PRODUCT');
    }

    const now = Date.now();
    const orderCode = `MT-${Date.now().toString().slice(-6)}`;
    const shippingFee = input.shippingInfo?.shippingFee || 0;
    const totalAmount = product.price + shippingFee;

    const buyerName =
      currentUser.displayName ||
      currentUser.email?.split('@')[0] ||
      'Biker MotoTune';

    const newOrder: IOrder = {
      id: orderRef.id,
      orderCode,
      buyerId: currentUser.uid,
      buyerName,
      buyerEmail: currentUser.email || '',
      buyerAvatar: currentUser.photoURL || null,
      sellerId: product.authorId,
      sellerName: product.authorName,
      sellerEmail: product.authorEmail,
      sellerAvatar: product.authorAvatar || null,
      productId: product.id,
      productTitle: product.title,
      productPrice: product.price,
      productImage: product.coverUrl,
      productCategory: product.category,
      price: product.price,
      shippingFee,
      totalAmount,
      deliveryType: input.deliveryType,
      shippingInfo: input.shippingInfo,
      meetupShopInfo: input.meetupShopInfo,
      paymentMethod: input.paymentMethod,
      status: 'pending_payment',
      createdAt: now,
      updatedAt: now,
    };

    // Khóa trạng thái sản phẩm sang reserved
    transaction.update(productRef, {
      status: 'reserved',
      updatedAt: now,
    });

    transaction.set(orderRef, newOrder);

    return orderRef.id;
  });
};

/**
 * Cập nhật trạng thái thanh toán Ký quỹ (Escrow Lock)
 */
export const markOrderAsPaidInEscrow = async (
  orderId: string
): Promise<void> => {
  const orderRef = doc(db, 'orders', orderId);
  const now = Date.now();

  await runTransaction(db, async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) throw new Error('ORDER_NOT_FOUND');

    const orderData = orderSnap.data() as IOrder;
    if (orderData.status !== 'pending_payment') {
      throw new Error('INVALID_ORDER_STATUS_FOR_PAYMENT');
    }

    const nextStatus: TOrderStatus =
      orderData.deliveryType === 'station_meetup'
        ? 'awaiting_meetup'
        : 'paid_in_escrow';

    transaction.update(orderRef, {
      status: nextStatus,
      paidAt: now,
      updatedAt: now,
    });
  });

  // Phát thông báo đẩy đến Người bán
  const snap = await getDoc(orderRef);
  if (snap.exists()) {
    const o = snap.data() as IOrder;
    await createMarketplaceNotification(
      o.sellerId,
      'ESCROW_PAID',
      `Tiền cho đơn hàng ${o.productTitle} đã được MotoTune niêm phong an toàn.`,
      orderId
    );
  }
};

/**
 * Sinh mã Handshake QR xoay vòng (Time-based Rotating Token - TTL 60s)
 */
export const generateDynamicHandshakeToken = async (
  orderId: string
): Promise<{ token: string; expiresAt: number }> => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('UNAUTHORIZED_OPERATION');

  const orderRef = doc(db, 'orders', orderId);
  const snap = await getDoc(orderRef);
  if (!snap.exists()) throw new Error('ORDER_NOT_FOUND');

  const order = snap.data() as IOrder;
  if (order.sellerId !== currentUser.uid) {
    throw new Error('ONLY_SELLER_CAN_GENERATE_HANDSHAKE');
  }

  const now = Date.now();
  const expiresAt = now + 60 * 1000; // 60 giây
  
  // Sinh mã nonce ngẫu nhiên an toàn
  const randomChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let nonce = '';
  for (let i = 0; i < 6; i++) {
    nonce += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
  }
  const token = `HS_${orderId.slice(-4)}_${now}_${nonce}`;

  await updateDoc(orderRef, {
    handshakeToken: token,
    handshakeExpiresAt: expiresAt,
    updatedAt: now,
  });

  return { token, expiresAt };
};

/**
 * Người mua quét mã QR Bắt tay tại tiệm để giải ngân tức thì trong 3 giây
 */
export const verifyHandshakeAndReleasePayout = async (
  orderId: string,
  scannedToken: string
): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('UNAUTHORIZED_OPERATION');

  const orderRef = doc(db, 'orders', orderId);
  const now = Date.now();

  await runTransaction(db, async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) throw new Error('ORDER_NOT_FOUND');

    const order = orderSnap.data() as IOrder;
    if (order.buyerId !== currentUser.uid) {
      throw new Error('ONLY_BUYER_CAN_VERIFY_HANDSHAKE');
    }

    if (
      order.status !== 'awaiting_meetup' &&
      order.status !== 'paid_in_escrow'
    ) {
      throw new Error('INVALID_ORDER_STATUS_FOR_HANDSHAKE');
    }

    if (order.handshakeToken !== scannedToken) {
      throw new Error('INVALID_HANDSHAKE_TOKEN');
    }

    if (order.handshakeExpiresAt && now > order.handshakeExpiresAt) {
      throw new Error('HANDSHAKE_TOKEN_EXPIRED');
    }

    const productRef = doc(db, 'marketplace', order.productId);

    transaction.update(orderRef, {
      status: 'completed',
      completedAt: now,
      updatedAt: now,
    });

    transaction.update(productRef, {
      status: 'sold',
      updatedAt: now,
    });
  });

  // Thưởng điểm tín nhiệm cho 2 bên
  const finalSnap = await getDoc(orderRef);
  if (finalSnap.exists()) {
    const o = finalSnap.data() as IOrder;
    await recordSuccessfulTransaction(o.sellerId, o.buyerId, o.id, 'meetup');
    await createMarketplaceNotification(
      o.sellerId,
      'PAYOUT_RELEASED',
      `Đơn hàng ${o.productTitle} đã được xác nhận thành công tại tiệm! Tiền đã về tài khoản.`,
      orderId
    );
  }
};

/**
 * Người bán cập nhật mã vận đơn khi gửi hàng bưu điện
 */
export const updateOrderShippingInfo = async (
  orderId: string,
  carrierName: string,
  trackingCode: string
): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('UNAUTHORIZED_OPERATION');

  const orderRef = doc(db, 'orders', orderId);
  const now = Date.now();

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(orderRef);
    if (!snap.exists()) throw new Error('ORDER_NOT_FOUND');

    const order = snap.data() as IOrder;
    if (order.sellerId !== currentUser.uid) {
      throw new Error('FORBIDDEN_OPERATION');
    }

    transaction.update(orderRef, {
      status: 'shipping',
      'shippingInfo.carrierName': carrierName.trim(),
      'shippingInfo.trackingCode': trackingCode.trim(),
      'shippingInfo.shippedAt': now,
      shippedAt: now,
      updatedAt: now,
    });
  });

  const snap = await getDoc(orderRef);
  if (snap.exists()) {
    const o = snap.data() as IOrder;
    await createMarketplaceNotification(
      o.buyerId,
      'ORDER_SHIPPED',
      `Đơn hàng ${o.productTitle} đã được giao cho ${carrierName} (Mã VĐ: ${trackingCode}).`,
      orderId
    );
  }
};

/**
 * Người mua xác nhận đã nhận hàng bưu điện và hài lòng (Giải ngân)
 */
export const confirmDeliveryAndReleasePayout = async (
  orderId: string
): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('UNAUTHORIZED_OPERATION');

  const orderRef = doc(db, 'orders', orderId);
  const now = Date.now();

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(orderRef);
    if (!snap.exists()) throw new Error('ORDER_NOT_FOUND');

    const order = snap.data() as IOrder;
    if (order.buyerId !== currentUser.uid) {
      throw new Error('ONLY_BUYER_CAN_CONFIRM_DELIVERY');
    }

    const productRef = doc(db, 'marketplace', order.productId);

    transaction.update(orderRef, {
      status: 'completed',
      completedAt: now,
      updatedAt: now,
    });

    transaction.update(productRef, {
      status: 'sold',
      updatedAt: now,
    });
  });

  const snap = await getDoc(orderRef);
  if (snap.exists()) {
    const o = snap.data() as IOrder;
    await recordSuccessfulTransaction(o.sellerId, o.buyerId, o.id, 'shipping');
    await createMarketplaceNotification(
      o.sellerId,
      'PAYOUT_RELEASED',
      `Người mua đã xác nhận hài lòng với món hàng ${o.productTitle}! Sàn đã giải ngân.`,
      orderId
    );
  }
};

/**
 * Mở hồ sơ khiếu nại tranh chấp (Dispute) và đóng băng tiền
 */
export const openOrderDispute = async (
  orderId: string,
  reason: string,
  evidenceMediaUrls: string[]
): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('UNAUTHORIZED_OPERATION');

  const orderRef = doc(db, 'orders', orderId);
  const now = Date.now();

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(orderRef);
    if (!snap.exists()) throw new Error('ORDER_NOT_FOUND');

    const order = snap.data() as IOrder;
    if (order.buyerId !== currentUser.uid && order.sellerId !== currentUser.uid) {
      throw new Error('FORBIDDEN_OPERATION');
    }

    const openedBy = order.buyerId === currentUser.uid ? 'buyer' : 'seller';

    transaction.update(orderRef, {
      status: 'disputed',
      disputeDetails: {
        openedBy,
        reason: reason.trim(),
        evidenceMediaUrls,
        createdAt: now,
        status: 'pending_review',
      },
      updatedAt: now,
    });
  });

  const snap = await getDoc(orderRef);
  if (snap.exists()) {
    const o = snap.data() as IOrder;
    const targetUserId = o.buyerId === currentUser.uid ? o.sellerId : o.buyerId;
    await createMarketplaceNotification(
      targetUserId,
      'DISPUTE_OPENED',
      `Đơn hàng ${o.productTitle} đang có yêu cầu khiếu nại: "${reason.slice(0, 50)}...".`,
      orderId
    );
  }
};

/**
 * Hủy đơn hàng và nhả lại sản phẩm về trạng thái available
 */
export const cancelOrderAndReleaseProduct = async (
  orderId: string
): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('UNAUTHORIZED_OPERATION');

  const orderRef = doc(db, 'orders', orderId);
  const now = Date.now();

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(orderRef);
    if (!snap.exists()) throw new Error('ORDER_NOT_FOUND');

    const order = snap.data() as IOrder;
    if (order.buyerId !== currentUser.uid && order.sellerId !== currentUser.uid) {
      throw new Error('FORBIDDEN_OPERATION');
    }

    if (order.status === 'completed') {
      throw new Error('CANNOT_CANCEL_COMPLETED_ORDER');
    }

    const productRef = doc(db, 'marketplace', order.productId);

    transaction.update(orderRef, {
      status: 'cancelled',
      updatedAt: now,
    });

    transaction.update(productRef, {
      status: 'available',
      updatedAt: now,
    });
  });
};

/**
 * Lắng nghe realtime danh sách đơn hàng của người dùng (mua và bán)
 */
export const subscribeUserOrders = (
  userId: string,
  callback: (orders: IOrder[]) => void
): Unsubscribe => {
  if (!userId) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, 'orders'),
    where('buyerId', '==', userId),
    limit(50)
  );

  const qSeller = query(
    collection(db, 'orders'),
    where('sellerId', '==', userId),
    limit(50)
  );

  let buyerOrders: IOrder[] = [];
  let sellerOrders: IOrder[] = [];

  const mergeAndEmit = () => {
    const all = [...buyerOrders, ...sellerOrders];
    const unique = Array.from(new Map(all.map((item) => [item.id, item])).values());
    unique.sort((a, b) => b.createdAt - a.createdAt);
    callback(unique);
  };

  const unsubBuyer = onSnapshot(
    q,
    (snapshot) => {
      buyerOrders = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as IOrder));
      mergeAndEmit();
    },
    (error) => {
      console.error('[subscribeUserOrders] Buyer stream error:', error);
    }
  );

  const unsubSeller = onSnapshot(
    qSeller,
    (snapshot) => {
      sellerOrders = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as IOrder));
      mergeAndEmit();
    },
    (error) => {
      console.error('[subscribeUserOrders] Seller stream error:', error);
    }
  );

  return () => {
    unsubBuyer();
    unsubSeller();
  };
};
