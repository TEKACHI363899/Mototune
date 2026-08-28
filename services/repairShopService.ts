import {
  collection,
  doc,
  getDocs,
  query,
  where,
  limit,
  addDoc,
  runTransaction,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import {
  IRepairShop,
  IRepairReview,
  ICreateRepairShopInput,
  ICreateRepairReviewInput,
} from '../interfaces/repairShop';
import { VIETNAM_CURATED_REPAIR_SHOPS } from '../constants/vietnamRepairShops';

const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_CACHE_ENTRIES = 50;
const PROXIMITY_DEDUPE_KM = 0.04;
const OVERPASS_TIMEOUT_MS = 5000;
const MAX_PAGE_LIMIT = 50;

interface ICacheEntry {
  data: IRepairShop[];
  timestamp: number;
}

const osmCache = new Map<string, ICacheEntry>();

const cleanOldCache = (): void => {
  if (osmCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = osmCache.keys().next().value;
    if (oldestKey) osmCache.delete(oldestKey);
  }
};

/**
 * Tính khoảng cách địa lý theo công thức Haversine (KM)
 */
export const calculateDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Bán kính Trái Đất (KM)
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
};

export const calculateBoundingBox = (
  lat: number,
  lng: number,
  radiusKm: number
): { minLat: number; maxLat: number; minLng: number; maxLng: number } => {
  const latDelta = radiusKm / 110.574;
  const lngDelta = radiusKm / (111.32 * Math.cos(lat * (Math.PI / 180)));
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
};

/**
 * Danh sách các mirror endpoint của OpenStreetMap Overpass API
 */
const OVERPASS_MIRRORS = [
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

/**
 * Truy vấn Overpass OpenStreetMap lấy các tiệm sửa xe xung quanh vị trí GPS
 */
const fetchOverpassOsmShops = async (
  userLat: number,
  userLng: number,
  radiusKm: number
): Promise<IRepairShop[]> => {
  const cacheKey = `${userLat.toFixed(2)}_${userLng.toFixed(2)}_${Math.round(radiusKm)}`;
  const cached = osmCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const radiusMeters = Math.min(Math.round(radiusKm * 1000), 50000);
  const overpassQuery = `[out:json][timeout:10];(node["shop"="motorcycle_repair"](around:${radiusMeters},${userLat},${userLng});node["shop"="motorcycle"](around:${radiusMeters},${userLat},${userLng});node["shop"="motorcycle_parts"](around:${radiusMeters},${userLat},${userLng});node["amenity"="motorcycle_repair"](around:${radiusMeters},${userLat},${userLng});node["service"="tyres"](around:${radiusMeters},${userLat},${userLng});way["shop"="motorcycle_repair"](around:${radiusMeters},${userLat},${userLng});way["shop"="motorcycle"](around:${radiusMeters},${userLat},${userLng}););out center 50;`;

  for (const baseUrl of OVERPASS_MIRRORS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);

    try {
      const url = `${baseUrl}?data=${encodeURIComponent(overpassQuery)}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'MotoTune-App/1.0 (contact@mototune.vn)',
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timer);
      if (!response.ok) continue;

      const json = await response.json();
      const elements: any[] = json.elements || [];
      if (!elements || elements.length === 0) continue;

      const shops: IRepairShop[] = elements
        .filter((elem) => (elem.lat || elem.center?.lat) && (elem.lon || elem.center?.lon))
        .map((elem) => {
          const lat = elem.lat || elem.center?.lat;
          const lon = elem.lon || elem.center?.lon;
          const tags = elem.tags || {};
          const name = tags.name || tags['name:vi'] || tags['name:en'] || 'Tiệm Sửa Xe Máy';
          const address =
            [tags['addr:housenumber'], tags['addr:street'], tags['addr:district'], tags['addr:city']]
              .filter(Boolean)
              .join(', ') || tags['addr:full'] || 'Khu vực lân cận';

          const isRescue =
            tags.emergency === 'yes' ||
            tags['service:motorcycle:repair'] === 'yes' ||
            tags.opening_hours === '24/7' ||
            name.toLowerCase().includes('cứu hộ') ||
            name.toLowerCase().includes('vá đêm');

          return {
            id: `osm_${elem.type}_${elem.id}`,
            name,
            latitude: lat,
            longitude: lon,
            address,
            phone: tags.phone || tags['contact:phone'] || null,
            openingHours: tags.opening_hours || (isRescue ? '24/7' : '7:30 - 19:00'),
            isRescueService: isRescue,
            isCommunityVerified: false,
            ratingAverage: 0,
            ratingCount: 0,
            source: 'osm' as const,
            osmId: elem.id,
            createdAt: now,
            updatedAt: now,
            tags,
          };
        });

      if (shops.length > 0) {
        cleanOldCache();
        osmCache.set(cacheKey, { data: shops, timestamp: now });
        return shops;
      }
    } catch (err: any) {
      clearTimeout(timer);
      console.warn(`[repairShopService] OSM Mirror failed: ${baseUrl}`, err?.message || err);
      // Thử mirror tiếp theo
    }
  }

  return [];
};

/**
 * Lấy danh sách tiệm sửa xe do cộng đồng Biker đóng góp trên Firestore
 */
const fetchCommunityShops = async (
  userLat: number,
  userLng: number,
  radiusKm: number
): Promise<IRepairShop[]> => {
  try {
    const bbox = calculateBoundingBox(userLat, userLng, radiusKm);
    const q = query(
      collection(db, 'repair_shops'),
      where('latitude', '>=', bbox.minLat),
      where('latitude', '<=', bbox.maxLat),
      limit(MAX_PAGE_LIMIT)
    );

    const snapshot = await getDocs(q);
    const results: IRepairShop[] = [];

    snapshot.forEach((docSnap: QueryDocumentSnapshot) => {
      const data = docSnap.data();
      if (
        data.longitude >= bbox.minLng &&
        data.longitude <= bbox.maxLng
      ) {
        results.push({
          id: docSnap.id,
          name: data.name || 'Tiệm Sửa Xe',
          latitude: data.latitude,
          longitude: data.longitude,
          address: data.address || '',
          phone: data.phone || null,
          openingHours: data.openingHours || '8:00 - 18:00',
          isRescueService: !!data.isRescueService,
          isCommunityVerified: !!data.isCommunityVerified,
          ratingAverage: data.ratingAverage || 0,
          ratingCount: data.ratingCount || 0,
          source: 'community',
          createdBy: data.createdBy || null,
          createdAt: data.createdAt || 0,
          updatedAt: data.updatedAt || 0,
          tags: data.tags || {},
        });
      }
    });

    return results;
  } catch (error) {
    console.error('Error fetching community shops:', error);
    return [];
  }
};

/**
 * Lấy toàn bộ tiệm sửa xe gần người dùng, kết hợp OpenStreetMap + Curated Seed + Firestore
 */
export const fetchNearbyRepairShops = async (
  userLat: number,
  userLng: number,
  radiusKm = 25
): Promise<IRepairShop[]> => {
  const boundedRadius = Math.max(1, Math.min(radiusKm, 100));

  const [communityShops, osmShops] = await Promise.all([
    fetchCommunityShops(userLat, userLng, boundedRadius),
    fetchOverpassOsmShops(userLat, userLng, boundedRadius),
  ]);

  // Merge: Curated Seed + Firestore Community + OpenStreetMap
  const merged: IRepairShop[] = [
    ...VIETNAM_CURATED_REPAIR_SHOPS,
    ...communityShops,
  ];

  for (const osmShop of osmShops) {
    const isDuplicate = merged.some(
      (shop) =>
        calculateDistanceKm(
          shop.latitude,
          shop.longitude,
          osmShop.latitude,
          osmShop.longitude
        ) < PROXIMITY_DEDUPE_KM
    );
    if (!isDuplicate) {
      merged.push(osmShop);
    }
  }

  const withDistance = merged
    .map((shop) => ({
      ...shop,
      distanceKm: calculateDistanceKm(
        userLat,
        userLng,
        shop.latitude,
        shop.longitude
      ),
    }))
    .filter((shop) => (shop.distanceKm ?? Infinity) <= boundedRadius);

  withDistance.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));

  // If strict radius returned few items, expand to return closest certified shops in Vietnam
  if (withDistance.length === 0) {
    const allWithDistance = merged.map((shop) => ({
      ...shop,
      distanceKm: calculateDistanceKm(
        userLat,
        userLng,
        shop.latitude,
        shop.longitude
      ),
    }));
    allWithDistance.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    return allWithDistance.slice(0, MAX_PAGE_LIMIT);
  }

  return withDistance.slice(0, MAX_PAGE_LIMIT);
};

/**
 * Gửi đánh giá và review cho một tiệm sửa xe (nguyên tử qua transaction)
 */
export const submitShopReview = async (
  shopId: string,
  userId: string,
  reviewData: ICreateRepairReviewInput
): Promise<string> => {
  const currentAuth = auth.currentUser;
  if (!currentAuth || currentAuth.uid !== userId) {
    throw new Error('UNAUTHORIZED_OPERATION');
  }

  if (reviewData.rating < 1 || reviewData.rating > 5) {
    throw new Error('INVALID_RATING_VALUE');
  }

  const sanitizedComment = (reviewData.comment || '').trim().slice(0, 1000);
  const now = Date.now();
  const userName = currentAuth.displayName || currentAuth.email?.split('@')[0] || 'Biker Đồng Đội';
  const userAvatar = currentAuth.photoURL || null;

  const reviewRef = doc(collection(db, 'repair_reviews'));
  const shopRef = doc(db, 'repair_shops', shopId);

  await runTransaction(db, async (transaction) => {
    const shopSnap = await transaction.get(shopRef);

    let currentAvg = 0;
    let currentCount = 0;

    if (shopSnap.exists()) {
      const shopData = shopSnap.data();
      currentAvg = shopData.ratingAverage || 0;
      currentCount = shopData.ratingCount || 0;
    }

    const nextCount = currentCount + 1;
    const nextAvg =
      Math.round(((currentAvg * currentCount + reviewData.rating) / nextCount) * 10) / 10;

    transaction.set(reviewRef, {
      shopId,
      userId,
      userName,
      userAvatar,
      rating: reviewData.rating,
      replacedParts: reviewData.replacedParts || [],
      costEstimate: reviewData.costEstimate || null,
      comment: sanitizedComment,
      createdAt: now,
    });

    if (shopSnap.exists()) {
      transaction.update(shopRef, {
        ratingAverage: nextAvg,
        ratingCount: nextCount,
        updatedAt: now,
      });
    } else {
      transaction.set(
        shopRef,
        {
          id: shopId,
          ratingAverage: nextAvg,
          ratingCount: nextCount,
          source: shopId.startsWith('osm_') ? 'osm' : 'community',
          createdAt: now,
          updatedAt: now,
        },
        { merge: true }
      );
    }
  });

  return reviewRef.id;
};

/**
 * Lấy danh sách đánh giá của một tiệm sửa xe
 */
export const fetchShopReviews = async (
  shopId: string,
  limitCount = 20
): Promise<IRepairReview[]> => {
  if (!shopId) return [];
  const boundedLimit = Math.min(Math.max(1, limitCount), MAX_PAGE_LIMIT);

  const q = query(
    collection(db, 'repair_reviews'),
    where('shopId', '==', shopId),
    limit(boundedLimit)
  );

  const snapshot = await getDocs(q);
  const reviews = snapshot.docs.map((docSnap: QueryDocumentSnapshot) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      shopId: data.shopId,
      userId: data.userId,
      userName: data.userName || 'Biker',
      userAvatar: data.userAvatar || null,
      rating: data.rating || 5,
      replacedParts: data.replacedParts || [],
      costEstimate: data.costEstimate || null,
      comment: data.comment || '',
      createdAt: data.createdAt || 0,
    } as IRepairReview;
  });

  reviews.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return reviews;
};

/**
 * Biker đóng góp một tiệm sửa xe mới lên hệ thống
 */
export const addCommunityRepairShop = async (
  shopData: ICreateRepairShopInput,
  userId: string
): Promise<string> => {
  const currentAuth = auth.currentUser;
  if (!currentAuth || currentAuth.uid !== userId) {
    throw new Error('UNAUTHORIZED_OPERATION');
  }

  if (!shopData.name || shopData.name.trim().length === 0) {
    throw new Error('SHOP_NAME_REQUIRED');
  }

  if (
    shopData.latitude < 8.0 ||
    shopData.latitude > 24.5 ||
    shopData.longitude < 102.0 ||
    shopData.longitude > 110.0
  ) {
    throw new Error('INVALID_COORDINATES');
  }

  const now = Date.now();
  const payload = {
    name: shopData.name.trim().slice(0, 150),
    latitude: shopData.latitude,
    longitude: shopData.longitude,
    address: (shopData.address || '').trim().slice(0, 300),
    phone: (shopData.phone || '').trim().slice(0, 20),
    openingHours: (shopData.openingHours || '7:30 - 18:30').trim().slice(0, 100),
    isRescueService: !!shopData.isRescueService,
    isCommunityVerified: true,
    source: 'community',
    createdBy: userId,
    ratingAverage: 0,
    ratingCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, 'repair_shops'), payload);
  return docRef.id;
};
