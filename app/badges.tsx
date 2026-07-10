import { useRouter } from 'expo-router';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import * as Icons from 'lucide-react-native';
import { CheckCircle2, ChevronLeft, Lock, Star, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { BADGE_RULES, BADGE_TIERS_COLORS, calculateBadgeTier } from '../utils/badgeConfig';

const TIER_NAMES = ['Đồng 🥉', 'Bạc 🥈', 'Vàng 🥇', 'Bạch Kim 💎', 'Kim Cương 👑'];
const TIER_KEYS = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

export default function BadgesScreen() {
  const router = useRouter();
  const [userStats, setUserStats] = useState<any>({});
  
  // 🛑 STATE MỚI: LƯU TRỮ DANH HIỆU ĐANG ĐƯỢC TRANG BỊ
  const [equippedBadge, setEquippedBadge] = useState<string | null>(null);
  const [selectedBadgeKey, setSelectedBadgeKey] = useState<string | null>(null);
  const [isEquipping, setIsEquipping] = useState(false);
  
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    const unsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setUserStats(docSnap.data().stats || {});
        // Lấy danh hiệu đang được chọn từ Firebase
        setEquippedBadge(docSnap.data().selectedBadge || null);
      }
    });
    return () => unsubscribe();
  }, []);

  // 🛑 HÀM LƯU LỰA CHỌN DANH HIỆU LÊN FIREBASE
  const handleEquipBadge = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || !selectedBadgeKey) return;
    
    setIsEquipping(true);
    try {
      await setDoc(doc(db, 'users', currentUser.uid), {
        selectedBadge: selectedBadgeKey
      }, { merge: true });
      Alert.alert("Thành công", "Đã trang bị danh hiệu này làm biểu tượng đại diện!");
    } catch (error) {
      Alert.alert("Lỗi", "Không thể trang bị danh hiệu lúc này.");
    } finally {
      setIsEquipping(false);
    }
  };

  const renderBadge = ({ item }: { item: any }) => {
    if (!BADGE_RULES || !BADGE_RULES[item.key as keyof typeof BADGE_RULES]) return null;

    const badgeRule = BADGE_RULES[item.key as keyof typeof BADGE_RULES];
    const currentStat = userStats ? (userStats[item.key] || 0) : 0;
    const { tier, level, nextTarget } = calculateBadgeTier(item.key as keyof typeof BADGE_RULES, currentStat);
    
    const IconComponent = (Icons as any)[badgeRule.icon] || Icons.Award;
    const isUnlocked = level > 0;
    const color = isUnlocked ? BADGE_TIERS_COLORS[tier as keyof typeof BADGE_TIERS_COLORS] : '#333';
    
    const prevTarget = level > 1 ? badgeRule.milestones[level - 2] : 0;
    const progress = nextTarget ? Math.min(100, Math.max(0, ((currentStat - prevTarget) / (nextTarget - prevTarget)) * 100)) : 100;

    // Kiểm tra xem huy hiệu này có đang được trang bị không
    const isThisEquipped = equippedBadge === item.key;

    return (
      <TouchableOpacity 
        style={[
          styles.badgeCard, 
          !isUnlocked && { opacity: 0.5 },
          isThisEquipped && { borderColor: '#FFD700', backgroundColor: 'rgba(255, 215, 0, 0.05)' } // Sáng viền vàng nếu đang trang bị
        ]} 
        activeOpacity={0.8}
        onPress={() => setSelectedBadgeKey(item.key)}
      >
        {/* 🛑 Thêm ngôi sao nhỏ góc phải nếu đang trang bị */}
        {isThisEquipped && (
          <View style={styles.equippedStar}>
            <Star size={12} color="#000" fill="#000" />
          </View>
        )}

        <View style={[styles.iconWrapper, { borderColor: color, shadowColor: color }]}>
          <IconComponent size={36} color={color} />
          {isUnlocked && <View style={[styles.levelBadge, { backgroundColor: color }]}><Text style={styles.levelText}>Lv.{level}</Text></View>}
        </View>
        <Text style={styles.badgeName} numberOfLines={1}>{badgeRule.name}</Text>
        <Text style={styles.badgeDesc} numberOfLines={2}>{badgeRule.description}</Text>
        
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: color }]} />
        </View>
        <Text style={styles.progressText}>
          {currentStat.toLocaleString()} / {nextTarget ? nextTarget.toLocaleString() : 'MAX'}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderBadgeDetails = () => {
    if (!selectedBadgeKey) return null;
    const badgeRule = BADGE_RULES[selectedBadgeKey as keyof typeof BADGE_RULES];
    const currentStat = userStats ? (userStats[selectedBadgeKey] || 0) : 0;
    const { tier, level } = calculateBadgeTier(selectedBadgeKey as keyof typeof BADGE_RULES, currentStat);
    
    const IconComponent = (Icons as any)[badgeRule.icon] || Icons.Award;
    const isUnlocked = level > 0;
    const currentColor = isUnlocked ? BADGE_TIERS_COLORS[tier as keyof typeof BADGE_TIERS_COLORS] : '#444';
    const isThisEquipped = equippedBadge === selectedBadgeKey;

    return (
      <View style={styles.modalContent}>
        <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelectedBadgeKey(null)}>
          <X size={24} color={COLORS.textDim} />
        </TouchableOpacity>

        <View style={styles.modalHeaderInfo}>
          <View style={[styles.modalIconWrapper, { borderColor: currentColor }]}>
            <IconComponent size={50} color={currentColor} />
          </View>
          <Text style={styles.modalBadgeName}>{badgeRule.name}</Text>
          <Text style={styles.modalBadgeDesc}>{badgeRule.description}</Text>
          <Text style={styles.modalCurrentStat}>Tiến độ hiện tại: <Text style={{color: '#FFF'}}>{currentStat.toLocaleString()}</Text></Text>
        </View>

        {/* 🛑 NÚT TRANG BỊ DANH HIỆU */}
        {isUnlocked ? (
          isThisEquipped ? (
            <View style={styles.equippedBtnActive}>
              <CheckCircle2 size={20} color="#000" />
              <Text style={styles.equippedBtnTextActive}>Đang trang bị</Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.equipBtn, { borderColor: currentColor }]} 
              onPress={handleEquipBadge}
              disabled={isEquipping}
            >
              <Text style={[styles.equipBtnText, { color: currentColor }]}>
                {isEquipping ? "Đang xử lý..." : "Trang bị danh hiệu này"}
              </Text>
            </TouchableOpacity>
          )
        ) : (
          <View style={styles.lockedBtn}>
            <Lock size={16} color="#666" />
            <Text style={styles.lockedBtnText}>Chưa mở khóa</Text>
          </View>
        )}

        <Text style={styles.treeTitle}>CÂY TIẾN TRÌNH</Text>

        <ScrollView style={styles.tiersList} showsVerticalScrollIndicator={false}>
          {badgeRule.milestones.map((milestone, index) => {
            const isTierUnlocked = currentStat >= milestone;
            const tierColor = BADGE_TIERS_COLORS[TIER_KEYS[index] as keyof typeof BADGE_TIERS_COLORS];
            const isCurrentActiveTier = level === index + 1;

            return (
              <View 
                key={index} 
                style={[
                  styles.tierRow, 
                  !isTierUnlocked && { opacity: 0.5 },
                  isCurrentActiveTier && { borderColor: tierColor, backgroundColor: 'rgba(255,255,255,0.05)' }
                ]}
              >
                <View style={[styles.tierIconBox, { borderColor: isTierUnlocked ? tierColor : '#333' }]}>
                  <IconComponent size={20} color={isTierUnlocked ? tierColor : '#666'} />
                </View>
                
                <View style={styles.tierInfo}>
                  <Text style={[styles.tierName, { color: isTierUnlocked ? tierColor : '#999' }]}>
                    Cấp {index + 1} - {TIER_NAMES[index]}
                  </Text>
                  <Text style={styles.tierReq}>Yêu cầu: Đạt mốc {milestone.toLocaleString()}</Text>
                </View>

                <View style={styles.tierStatus}>
                  {isTierUnlocked ? (
                    <CheckCircle2 size={24} color={COLORS.success} />
                  ) : (
                    <Lock size={20} color="#666" />
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const badgeList = BADGE_RULES ? Object.keys(BADGE_RULES).map(key => ({ key })) : [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><ChevronLeft size={28} color="#FFF" /></TouchableOpacity>
        <Text style={styles.headerTitle}>PHÒNG TRƯNG BÀY</Text>
        <View style={{width: 28}} />
      </View>
      
      {badgeList.length > 0 ? (
        <FlatList
          data={badgeList}
          keyExtractor={item => item.key}
          numColumns={2}
          renderItem={renderBadge}
          contentContainerStyle={{ padding: 15 }}
          columnWrapperStyle={{ gap: 15 }}
        />
      ) : (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20}}>
          <Text style={{color: '#E31B23', textAlign: 'center', fontWeight: 'bold'}}>Lỗi không tìm thấy file Luật!</Text>
        </View>
      )}

      <Modal visible={!!selectedBadgeKey} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setSelectedBadgeKey(null)} />
          <View style={styles.modalContainer}>
            {renderBadgeDetails()}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const COLORS = { success: '#4ADE80', textDim: '#A0A0A0', bg: '#000', card: '#111' };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, marginTop: Platform.OS === 'android' ? 25 : 0 },
  backBtn: { padding: 5 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  badgeCard: { flex: 1, backgroundColor: '#111', padding: 15, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#222', marginBottom: 15, position: 'relative' },
  
  // 🛑 Style biểu tượng ngôi sao đang trang bị
  equippedStar: { position: 'absolute', top: 10, right: 10, backgroundColor: '#FFD700', padding: 4, borderRadius: 10, zIndex: 5 },

  iconWrapper: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 10 },
  levelBadge: { position: 'absolute', bottom: -10, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 2, borderColor: '#111' },
  levelText: { color: '#000', fontSize: 10, fontWeight: '900' },
  badgeName: { color: '#FFF', fontSize: 13, fontWeight: 'bold', marginBottom: 5, textAlign: 'center' },
  badgeDesc: { color: '#A0A0A0', fontSize: 11, textAlign: 'center', height: 32, marginBottom: 10 },
  progressContainer: { width: '100%', height: 6, backgroundColor: '#222', borderRadius: 3, overflow: 'hidden', marginBottom: 5 },
  progressBar: { height: '100%', borderRadius: 3 },
  progressText: { color: '#666', fontSize: 10, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  modalContainer: { width: '90%', maxHeight: '85%', backgroundColor: '#1A1A1A', borderRadius: 20, borderWidth: 1, borderColor: '#333', overflow: 'hidden' },
  modalContent: { padding: 20 },
  closeModalBtn: { position: 'absolute', top: 15, right: 15, zIndex: 10, padding: 5, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 15 },
  modalHeaderInfo: { alignItems: 'center', marginBottom: 15, marginTop: 10 },
  modalIconWrapper: { width: 90, height: 90, borderRadius: 45, borderWidth: 4, justifyContent: 'center', alignItems: 'center', marginBottom: 15, backgroundColor: '#111' },
  modalBadgeName: { color: '#FFF', fontSize: 20, fontWeight: '900', marginBottom: 5 },
  modalBadgeDesc: { color: COLORS.textDim, fontSize: 13, textAlign: 'center', marginBottom: 10, paddingHorizontal: 10 },
  modalCurrentStat: { color: COLORS.textDim, fontSize: 14, fontWeight: 'bold', backgroundColor: '#000', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#333' },
  
  // 🛑 Styles cho các nút Trang bị
  equipBtn: { width: '100%', paddingVertical: 12, borderRadius: 12, borderWidth: 2, alignItems: 'center', marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.05)' },
  equipBtnText: { fontWeight: '900', fontSize: 15, letterSpacing: 1 },
  equippedBtnActive: { width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: '#FFD700', marginBottom: 20 },
  equippedBtnTextActive: { color: '#000', fontWeight: '900', fontSize: 15, letterSpacing: 1 },
  lockedBtn: { width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: '#222', marginBottom: 20, borderWidth: 1, borderColor: '#333' },
  lockedBtnText: { color: '#666', fontWeight: 'bold', fontSize: 15 },

  treeTitle: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1, borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 10, marginBottom: 15 },
  tiersList: { flexGrow: 0 },
  tierRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#222' },
  tierIconBox: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginRight: 15, backgroundColor: '#000' },
  tierInfo: { flex: 1 },
  tierName: { fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  tierReq: { color: '#666', fontSize: 12 },
  tierStatus: { marginLeft: 10 }
});