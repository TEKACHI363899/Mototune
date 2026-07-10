import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import * as Icons from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { db } from '../firebaseConfig';

// 🛑 IMPORT THÊM BADGE_RULES VÀ calculateBadgeTier
import { BADGE_RULES, BADGE_TIERS_COLORS, calculateBadgeTier, getHighestBadge } from '../utils/badgeConfig';

export default function UserBadge({ userId, size = 16, realtime = false }: { userId: string, size?: number, realtime?: boolean }) {
  const [displayBadge, setDisplayBadge] = useState<any>(null);

  // Hàm xử lý logic ưu tiên: Trang bị tự chọn > Cao nhất tự động
  const processBadgeData = (data: any) => {
    if (!data || !data.stats) return null;

    let badgeToShow = null;

    // 1. Kiểm tra xem user có đang trang bị huy hiệu nào không
    if (data.selectedBadge && BADGE_RULES[data.selectedBadge as keyof typeof BADGE_RULES]) {
      const statValue = data.stats[data.selectedBadge] || 0;
      const { tier, level } = calculateBadgeTier(data.selectedBadge as keyof typeof BADGE_RULES, statValue);
      
      // Chắc chắn là họ đã mở khóa (level > 0) thì mới cho hiển thị
      if (level > 0) {
        badgeToShow = { 
          id: data.selectedBadge, 
          tier, 
          level, 
          icon: BADGE_RULES[data.selectedBadge as keyof typeof BADGE_RULES].icon 
        };
      }
    }

    // 2. Nếu không trang bị cái nào -> Lấy cái cao nhất tự động
    if (!badgeToShow) {
      badgeToShow = getHighestBadge(data.stats);
    }

    return badgeToShow;
  };

  useEffect(() => {
    if (!userId) return;
    const userRef = doc(db, 'users', userId);

    if (realtime) {
      // Dùng cho trang Profile (Cập nhật lập tức khi vừa đổi trang bị)
      const unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          setDisplayBadge(processBadgeData(docSnap.data()));
        }
      });
      return () => unsubscribe();
    } else {
      // Dùng cho Bảng tin Explore (Đọc 1 lần cho mượt mà Bảng tin)
      getDoc(userRef).then((docSnap) => {
        if (docSnap.exists()) {
          setDisplayBadge(processBadgeData(docSnap.data()));
        }
      });
    }
  }, [userId]);

  if (!displayBadge) return null; // Tàng hình nếu chưa có thành tựu gì

  const IconComponent = (Icons as any)[displayBadge.icon] || Icons.Award;
  const color = BADGE_TIERS_COLORS[displayBadge.tier as keyof typeof BADGE_TIERS_COLORS];

  return (
    <View style={{ marginLeft: 6, backgroundColor: 'rgba(255,255,255,0.05)', padding: 3, borderRadius: 12, borderWidth: 1, borderColor: color, justifyContent: 'center', alignItems: 'center' }}>
      <IconComponent size={size} color={color} />
    </View>
  );
}