export type BadgeTier = 'none' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

// Mã màu rực rỡ cho từng cấp độ
export const BADGE_TIERS_COLORS = {
  bronze: '#CD7F32',   // Đồng
  silver: '#C0C0C0',   // Bạc
  gold: '#FFD700',     // Vàng
  platinum: '#E5E4E2', // Bạch Kim
  diamond: '#00FFFF'   // Kim Cương (Xanh Neon)
};

// Cấu trúc luật: [Mốc Đồng, Mốc Bạc, Mốc Vàng, Mốc Bạch Kim, Mốc Kim Cương]
export const BADGE_RULES = {
  // --- NHÁNH CỘNG ĐỒNG ---
  post_creator: {
    id: 'post_creator', name: 'Trạm Phát Sóng', description: 'Tích cực đăng bài trên bảng tin.', icon: 'Radio',
    milestones: [1, 10, 50, 200, 1000]
  },
  social_butterfly: {
    id: 'social_butterfly', name: 'Anh Hùng Bàn Phím', description: 'Tương tác bình luận nhiệt tình.', icon: 'MessageCircle',
    milestones: [5, 50, 200, 1000, 5000]
  },
  // --- NHÁNH CHĂM XE ---
  ai_mechanic: {
    id: 'ai_mechanic', name: 'Thợ Đụng', description: 'Hỏi đáp bắt bệnh với Bác sĩ Xế Nổ A.I.', icon: 'Bot',
    milestones: [1, 10, 30, 100, 500]
  },
  rich_biker: {
    id: 'rich_biker', name: 'Đại Gia Phụ Tùng', description: 'Chi tiêu bảo dưỡng ghi nhận vào Y Bạ.', icon: 'DollarSign',
    milestones: [1000000, 5000000, 20000000, 50000000, 100000000]
  },
  custom_tuner: {
    id: 'custom_tuner', name: 'Dân Chơi Hệ Kiểng', description: 'Lên đồ chơi, gắn phụ kiện dọn kiểng cho xe.', icon: 'Sparkles',
    milestones: [1, 5, 15, 50, 100]
  },
  showroom_designer: {
    id: 'showroom_designer', name: 'Nghệ Nhân Showroom', description: 'Sử dụng AI Cutout cập nhật ảnh xe thực tế.', icon: 'Camera',
    milestones: [1, 5, 10, 30, 50]
  },
  // --- NHÁNH PHONG CÁCH LÁI ---
  night_rider: {
    id: 'night_rider', name: 'Cú Đêm', description: 'Bắt đầu hành trình chạy xe từ 23:00 - 04:00.', icon: 'Moon',
    milestones: [1, 5, 20, 50, 200]
  },
  early_bird: {
    id: 'early_bird', name: 'Kẻ Săn Bình Minh', description: 'Bắt đầu hành trình đón nắng sớm từ 04:00 - 06:00.', icon: 'Sun',
    milestones: [1, 5, 20, 50, 200]
  },
  city_hunter: {
    id: 'city_hunter', name: 'Chúa Tể Bào Phố', description: 'Hoàn thành các cuốc xe lượn phố ngắn (dưới 15km).', icon: 'MapPin',
    milestones: [5, 20, 100, 500, 2000]
  },
  long_tourer: {
    id: 'long_tourer', name: 'Kẻ Lãng Du', description: 'Hoàn thành các chuyến đi tour dài hơi (trên 50km).', icon: 'Map',
    milestones: [1, 5, 20, 50, 150]
  }
};

export const calculateBadgeTier = (badgeId: keyof typeof BADGE_RULES, currentStat: number) => {
  const milestones = BADGE_RULES[badgeId].milestones;
  if (currentStat >= milestones[4]) return { tier: 'diamond', level: 5, nextTarget: null };
  if (currentStat >= milestones[3]) return { tier: 'platinum', level: 4, nextTarget: milestones[4] };
  if (currentStat >= milestones[2]) return { tier: 'gold', level: 3, nextTarget: milestones[3] };
  if (currentStat >= milestones[1]) return { tier: 'silver', level: 2, nextTarget: milestones[2] };
  if (currentStat >= milestones[0]) return { tier: 'bronze', level: 1, nextTarget: milestones[1] };
  return { tier: 'none', level: 0, nextTarget: milestones[0] };
};

// Hàm tính toán tự động lấy danh hiệu cao nhất để hiển thị ở Avatar
export const getHighestBadge = (stats: any) => {
  if (!stats) return null;
  let highestBadge: any = null;
  let maxLevel = 0;

  Object.keys(BADGE_RULES).forEach((key) => {
    const statValue = stats[key] || 0;
    const { tier, level } = calculateBadgeTier(key as keyof typeof BADGE_RULES, statValue);
    
    if (level > maxLevel) {
      maxLevel = level;
      highestBadge = { id: key, tier, level, icon: BADGE_RULES[key as keyof typeof BADGE_RULES].icon };
    }
  });

  return highestBadge;
};