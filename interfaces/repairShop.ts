export type TReplaceablePart =
  | 'Dầu nhớt'
  | 'Bố thắng / Má phanh'
  | 'Lốp xe / Săm xe'
  | 'Bugi'
  | 'Nhông sên dĩa'
  | 'Bình ắc quy'
  | 'Nồi / Côn xe'
  | 'Dây curoa'
  | 'Lọc gió'
  | 'Phuộc / Giảm xóc'
  | 'Cứu hộ khẩn cấp'
  | 'Khác';

export const REPLACEABLE_PARTS: readonly TReplaceablePart[] = [
  'Dầu nhớt',
  'Bố thắng / Má phanh',
  'Lốp xe / Săm xe',
  'Bugi',
  'Nhông sên dĩa',
  'Bình ắc quy',
  'Nồi / Côn xe',
  'Dây curoa',
  'Lọc gió',
  'Phuộc / Giảm xóc',
  'Cứu hộ khẩn cấp',
  'Khác',
] as const;

export interface IRepairShop {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string | null;
  openingHours?: string | null;
  isRescueService: boolean;
  isCommunityVerified: boolean;
  ratingAverage: number;
  ratingCount: number;
  source: 'osm' | 'community';
  osmId?: number | null;
  distanceKm?: number;
  createdAt: number;
  updatedAt?: number;
  createdBy?: string | null;
  tags?: Record<string, string>;
}

export interface IRepairReview {
  id: string;
  shopId: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  rating: number; // 1 to 5
  replacedParts: TReplaceablePart[];
  costEstimate?: number | null;
  comment: string;
  createdAt: number;
}

export interface ICreateRepairShopInput {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  openingHours?: string;
  isRescueService: boolean;
}

export interface ICreateRepairReviewInput {
  rating: number;
  replacedParts: TReplaceablePart[];
  costEstimate?: number;
  comment: string;
}
