export interface IMediaAsset {
  uri: string;
  type: 'image' | 'video';
}

export interface IProduct {
  id: string;
  title: string;
  price: number;
  desc: string;
  category: string;
  mediaUrls: string[];
  coverUrl: string;
  status: 'available' | 'sold' | 'deleted';
  createdAt: number;
  authorId: string;
  authorEmail: string;
  authorName: string;
  authorAvatar?: string | null;
}

export interface IOrder {
  id: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  productId: string;
  productTitle: string;
  productPrice: number;
  price: number; // Final transaction price
  status: 'pending' | 'processing' | 'paid' | 'completed' | 'cancelled';
  createdAt: number;
  updatedAt?: number;
  paymentMethod?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  amount?: number;
}
