export interface IMediaAsset {
  uri: string;
  type: 'image' | 'video';
}

export type TProductStatus = 'available' | 'reserved' | 'sold' | 'deleted' | 'hidden';

export type TProductCondition = 'brand_new' | 'like_new_99' | 'used_good' | 'for_parts';

export type TDeliveryType = 'station_meetup' | 'courier_shipping';

export type TPaymentMethod = 'vietqr_escrow' | 'bank_transfer' | 'cash_at_station';

export type TOrderStatus =
  | 'pending_payment'       // Chờ người mua thanh toán VietQR
  | 'paid_in_escrow'        // Sàn đã nhận tiền và niêm phong tạm giữ
  | 'awaiting_meetup'       // Hẹn gặp tại tiệm sửa xe, chờ quét mã QR Bắt tay
  | 'shipping'              // Người bán đã gửi hàng bưu điện, có mã vận đơn
  | 'delivered_inspecting'  // Đã giao hàng, trong thời gian 48h kiểm tra
  | 'completed'             // Giao dịch thành công, sàn giải ngân cho người bán
  | 'disputed'              // Đang có khiếu nại tranh chấp, tiền bị đóng băng
  | 'cancelled';            // Hủy đơn và hoàn tiền nếu có

export interface IShippingInfo {
  recipientName: string;
  phoneNumber: string;
  city: string;
  district: string;
  detailedAddress: string;
  carrierName?: string;
  trackingCode?: string;
  shippingFee: number;
  shippedAt?: number;
}

export interface IMeetupShopInfo {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string | null;
  scheduledTime?: number;
  isPartnerVerified?: boolean;
}

export interface IProduct {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  desc: string;
  category: string;
  condition: TProductCondition;
  compatibleBikeModels?: string[];
  city: string;
  mediaUrls: string[];
  coverUrl: string;
  status: TProductStatus;
  isNegotiable: boolean;
  viewCount: number;
  favoriteCount: number;
  serialNumberHash?: string | null;
  authorId: string;
  authorEmail: string;
  authorName: string;
  authorAvatar?: string | null;
  authorPhone?: string | null;
  authorTrustScore?: number;
  authorTrustTier?: string;
  createdAt: number;
  updatedAt: number;
}

export interface IDisputeDetails {
  openedBy: 'buyer' | 'seller';
  reason: string;
  evidenceMediaUrls: string[];
  createdAt: number;
  status: 'pending_review' | 'resolved_refund_buyer' | 'resolved_payout_seller';
  resolvedAt?: number;
  resolutionNote?: string;
}

export interface IOrder {
  id: string;
  orderCode: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  buyerAvatar?: string | null;
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  sellerAvatar?: string | null;
  productId: string;
  productTitle: string;
  productPrice: number;
  productImage: string;
  productCategory: string;
  price: number;
  shippingFee: number;
  totalAmount: number;
  deliveryType: TDeliveryType;
  shippingInfo?: IShippingInfo;
  meetupShopInfo?: IMeetupShopInfo;
  paymentMethod: TPaymentMethod;
  status: TOrderStatus;
  handshakeToken?: string;
  handshakeExpiresAt?: number;
  disputeDetails?: IDisputeDetails;
  paidAt?: number;
  shippedAt?: number;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface ITrustScoreProfile {
  userId: string;
  score: number;
  tier: 'restricted' | 'rookie' | 'verified' | 'pro' | 'master';
  tierLabel: string;
  isKycVerified: boolean;
  isPhoneVerified: boolean;
  isPartnerShop: boolean;
  ratingAverage: number;
  ratingCount: number;
  successfulOrdersCount: number;
  disputeRatePercent: number;
  updatedAt: number;
}

export interface ITrustScoreLog {
  id: string;
  userId: string;
  pointsDelta: number;
  reason: string;
  relatedOrderId?: string;
  createdAt: number;
}

export interface IReviewItem {
  id: string;
  orderId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar?: string | null;
  targetUserId: string;
  rating: number;
  comment: string;
  photos?: string[];
  createdAt: number;
  isPublished: boolean;
}

export interface ICreateProductInput {
  title: string;
  price: number;
  originalPrice?: number;
  desc: string;
  category: string;
  condition: TProductCondition;
  compatibleBikeModels?: string[];
  city: string;
  isNegotiable: boolean;
  assets: IMediaAsset[];
}

export interface ICreateOrderInput {
  productId: string;
  deliveryType: TDeliveryType;
  paymentMethod: TPaymentMethod;
  shippingInfo?: IShippingInfo;
  meetupShopInfo?: IMeetupShopInfo;
}
