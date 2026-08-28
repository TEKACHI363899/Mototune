import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  runTransaction,
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import {
  ITrustScoreProfile,
  IReviewItem,
} from '../interfaces/marketplace';

const INITIAL_SCORE = 100;
const ORDER_MEETUP_BONUS = 15;
const ORDER_SHIPPING_BONUS = 10;
const NO_SHOW_PENALTY = -30;
const DISPUTE_FAULT_PENALTY = -60;
const WASH_TRADING_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 14 ngày

export const calculateTrustTier = (
  score: number
): { tier: ITrustScoreProfile['tier']; tierLabel: string } => {
  if (score < 60) return { tier: 'restricted', tierLabel: 'Cần Thận Trọng' };
  if (score < 150) return { tier: 'rookie', tierLabel: 'Biker Mới' };
  if (score < 400) return { tier: 'verified', tierLabel: 'Biker Đáng Tin' };
  if (score < 800) return { tier: 'pro', tierLabel: 'Tay Lái Uy Tín' };
  return { tier: 'master', tierLabel: 'Biker Huyền Thoại' };
};

/**
 * Lấy hồ sơ điểm tín nhiệm của người dùng
 */
export const getTrustScoreProfile = async (
  userId: string
): Promise<ITrustScoreProfile> => {
  if (!userId) {
    const { tier, tierLabel } = calculateTrustTier(INITIAL_SCORE);
    return {
      userId: '',
      score: INITIAL_SCORE,
      tier,
      tierLabel,
      isKycVerified: false,
      isPhoneVerified: false,
      isPartnerShop: false,
      ratingAverage: 5.0,
      ratingCount: 0,
      successfulOrdersCount: 0,
      disputeRatePercent: 0,
      updatedAt: Date.now(),
    };
  }

  const profileRef = doc(db, 'trust_scores', userId);
  const snap = await getDoc(profileRef);

  if (snap.exists()) {
    const data = snap.data() as ITrustScoreProfile;
    const { tier, tierLabel } = calculateTrustTier(data.score || INITIAL_SCORE);
    return {
      ...data,
      tier,
      tierLabel,
    };
  }

  const { tier, tierLabel } = calculateTrustTier(INITIAL_SCORE);
  const newProfile: ITrustScoreProfile = {
    userId,
    score: INITIAL_SCORE,
    tier,
    tierLabel,
    isKycVerified: false,
    isPhoneVerified: false,
    isPartnerShop: false,
    ratingAverage: 5.0,
    ratingCount: 0,
    successfulOrdersCount: 0,
    disputeRatePercent: 0,
    updatedAt: Date.now(),
  };

  await setDoc(profileRef, newProfile);
  return newProfile;
};

/**
 * Kiểm tra chống cày điểm ảo (Wash-Trading Cooldown) giữa 2 tài khoản
 */
export const checkWashTradingCooldown = async (
  userA: string,
  userB: string
): Promise<boolean> => {
  const compositeKey = [userA, userB].sort().join('_');
  const recordRef = doc(db, 'trade_cooldowns', compositeKey);
  const snap = await getDoc(recordRef);

  const now = Date.now();
  if (snap.exists()) {
    const lastTradeTime = snap.data().lastRewardedAt || 0;
    if (now - lastTradeTime < WASH_TRADING_COOLDOWN_MS) {
      return false; // Đang trong thời gian giãn cách 14 ngày -> Không được cộng điểm
    }
  }

  await setDoc(recordRef, { lastRewardedAt: now, users: [userA, userB] });
  return true;
};

/**
 * Thưởng điểm tín nhiệm khi giao dịch thành công (Atomic single transaction)
 */
export const recordSuccessfulTransaction = async (
  sellerId: string,
  buyerId: string,
  orderId: string,
  tradeType: 'meetup' | 'shipping'
): Promise<void> => {
  const isEligible = await checkWashTradingCooldown(sellerId, buyerId);
  if (!isEligible) {
    return; // Bỏ qua cộng điểm nếu 2 người vừa giao dịch trong vòng 14 ngày
  }

  const bonusPoints =
    tradeType === 'meetup' ? ORDER_MEETUP_BONUS : ORDER_SHIPPING_BONUS;
  const buyerBonus = Math.round(bonusPoints / 2);
  const now = Date.now();

  // Hợp nhất cả Người Bán & Người Mua trong 1 Transaction duy nhất chống lệch ledger
  await runTransaction(db, async (transaction) => {
    const sellerRef = doc(db, 'trust_scores', sellerId);
    const buyerRef = doc(db, 'trust_scores', buyerId);

    const sellerSnap = await transaction.get(sellerRef);
    const buyerSnap = await transaction.get(buyerRef);

    // Xử lý Người Bán
    let curSellerScore = INITIAL_SCORE;
    let sellerSuccessfulOrders = 0;
    if (sellerSnap.exists()) {
      const data = sellerSnap.data() as ITrustScoreProfile;
      curSellerScore = data.score || INITIAL_SCORE;
      sellerSuccessfulOrders = data.successfulOrdersCount || 0;
    }
    const nextSellerScore = Math.min(1000, curSellerScore + bonusPoints);
    const sellerTierInfo = calculateTrustTier(nextSellerScore);

    // Xử lý Người Mua
    let curBuyerScore = INITIAL_SCORE;
    let buyerSuccessfulOrders = 0;
    if (buyerSnap.exists()) {
      const data = buyerSnap.data() as ITrustScoreProfile;
      curBuyerScore = data.score || INITIAL_SCORE;
      buyerSuccessfulOrders = data.successfulOrdersCount || 0;
    }
    const nextBuyerScore = Math.min(1000, curBuyerScore + buyerBonus);
    const buyerTierInfo = calculateTrustTier(nextBuyerScore);

    // Ghi dữ liệu Người Bán
    transaction.set(
      sellerRef,
      {
        userId: sellerId,
        score: nextSellerScore,
        tier: sellerTierInfo.tier,
        tierLabel: sellerTierInfo.tierLabel,
        successfulOrdersCount: sellerSuccessfulOrders + 1,
        updatedAt: now,
      },
      { merge: true }
    );

    // Ghi dữ liệu Người Mua
    transaction.set(
      buyerRef,
      {
        userId: buyerId,
        score: nextBuyerScore,
        tier: buyerTierInfo.tier,
        tierLabel: buyerTierInfo.tierLabel,
        successfulOrdersCount: buyerSuccessfulOrders + 1,
        updatedAt: now,
      },
      { merge: true }
    );

    // Ghi log thưởng điểm cho Người Bán
    const logRef = doc(collection(db, 'trust_score_logs'));
    transaction.set(logRef, {
      userId: sellerId,
      pointsDelta: bonusPoints,
      reason:
        tradeType === 'meetup'
          ? 'Giao dịch thành công tại Trạm Sửa Xe'
          : 'Đơn hàng ship bưu điện hoàn tất',
      relatedOrderId: orderId,
      createdAt: now,
    });
  });
};

/**
 * Phạt điểm khi bùng hẹn tại tiệm sửa xe
 */
export const penalizeNoShow = async (
  userId: string,
  orderId: string
): Promise<void> => {
  const profileRef = doc(db, 'trust_scores', userId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(profileRef);
    let curScore = INITIAL_SCORE;

    if (snap.exists()) {
      curScore = snap.data().score || INITIAL_SCORE;
    }

    const nextScore = Math.max(0, curScore + NO_SHOW_PENALTY);
    const { tier, tierLabel } = calculateTrustTier(nextScore);

    transaction.set(
      profileRef,
      {
        userId,
        score: nextScore,
        tier,
        tierLabel,
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    const logRef = doc(collection(db, 'trust_score_logs'));
    transaction.set(logRef, {
      userId,
      pointsDelta: NO_SHOW_PENALTY,
      reason: 'Bùng hẹn giao dịch tại Tiệm sửa xe',
      relatedOrderId: orderId,
      createdAt: Date.now(),
    });
  });
};

/**
 * Gửi đánh giá sao sau khi đơn hàng hoàn tất (Cơ chế Blind Review & Atomic Transaction)
 */
export const submitOrderReview = async (input: {
  orderId: string;
  targetUserId: string;
  rating: number;
  comment: string;
  photos?: string[];
}): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('UNAUTHORIZED_OPERATION');

  if (input.rating < 1 || input.rating > 5) {
    throw new Error('INVALID_RATING_VALUE');
  }

  const reviewRef = doc(collection(db, 'marketplace_reviews'));
  const reviewerName =
    currentUser.displayName ||
    currentUser.email?.split('@')[0] ||
    'Biker MotoTune';

  const now = Date.now();
  const reviewData: IReviewItem = {
    id: reviewRef.id,
    orderId: input.orderId,
    reviewerId: currentUser.uid,
    reviewerName,
    reviewerAvatar: currentUser.photoURL || null,
    targetUserId: input.targetUserId,
    rating: input.rating,
    comment: (input.comment || '').trim().slice(0, 500),
    photos: input.photos || [],
    createdAt: now,
    isPublished: true,
  };

  const profileRef = doc(db, 'trust_scores', input.targetUserId);

  await runTransaction(db, async (transaction) => {
    // 1. Tạo review document
    transaction.set(reviewRef, reviewData);

    // 2. Đọc và cập nhật ratingAverage
    const snap = await transaction.get(profileRef);
    let curAvg = 5.0;
    let curCount = 0;

    if (snap.exists()) {
      curAvg = snap.data().ratingAverage || 5.0;
      curCount = snap.data().ratingCount || 0;
    }

    const nextCount = curCount + 1;
    const nextAvg =
      Math.round(((curAvg * curCount + input.rating) / nextCount) * 10) / 10;

    transaction.set(
      profileRef,
      {
        ratingAverage: nextAvg,
        ratingCount: nextCount,
        updatedAt: now,
      },
      { merge: true }
    );
  });
};

/**
 * Báo cáo vi phạm đối tượng lừa đảo / bôi nhọ
 */
export const reportUserViolation = async (
  targetUserId: string,
  reason: string,
  orderId?: string,
  evidenceUrls: string[] = []
): Promise<string> => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('UNAUTHORIZED_OPERATION');

  const reportRef = await addDoc(collection(db, 'violation_reports'), {
    reporterId: currentUser.uid,
    targetUserId,
    orderId: orderId || null,
    reason: reason.trim(),
    evidenceUrls,
    status: 'pending_investigation',
    createdAt: Date.now(),
  });

  return reportRef.id;
};
