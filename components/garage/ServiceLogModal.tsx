import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {
  BookOpen,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
  Wrench,
  Gauge,
  Settings,
  ShieldAlert,
  Compass,
  BatteryCharging,
} from 'lucide-react-native';
import { IServiceLog } from '../../interfaces/serviceLog';
import { fetchServiceLogs, addServiceLog, deleteServiceLog } from '../../services/bikeService';
import { recordUserStat } from '../../utils/badgeHelper';
import {
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_PARTS,
} from '../../constants/garage';
import { COLORS } from '../../constants/colors';
import { useAppStore } from '../../store/useAppStore';
import { HIGTouchTarget } from '../../constants/theme';
import { MaintenanceCategoryKey } from '../../interfaces/bike';

interface IServiceLogModalProps {
  visible: boolean;
  uid: string;
  onClose: () => void;
}

const CATEGORY_PICKER_ICONS: Record<MaintenanceCategoryKey, React.ComponentType<{ size?: number; color?: string }>> = {
  engine: Gauge,
  transmission: Settings,
  brakes_tires: ShieldAlert,
  chassis_suspension: Compass,
  electrical: BatteryCharging,
};

export default function ServiceLogModal({ visible, uid, onClose }: IServiceLogModalProps) {
  const bikes = useAppStore((state) => state.bikes);
  const activeBikeIndex = useAppStore((state) => state.activeBikeIndex);

  const [logs, setLogs] = useState<IServiceLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [part, setPart] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<MaintenanceCategoryKey>('engine');

  const [selectedBikeIndex, setSelectedBikeIndex] = useState<number>(activeBikeIndex);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      setSelectedBikeIndex(activeBikeIndex);
      setShowDropdown(false);
    }
  }, [visible, activeBikeIndex]);

  useEffect(() => {
    if (visible && uid) {
      const loadLogs = async () => {
        setIsLoading(true);
        try {
          const logData = await fetchServiceLogs(uid);
          setLogs(logData);
        } catch (error) {
          console.error('Error loading service logs:', error);
          if (Platform.OS === 'web') {
            window.alert('Không thể tải lịch sử bảo trì.');
          } else {
            Alert.alert('Lỗi', 'Không thể tải lịch sử bảo trì.');
          }
        } finally {
          setIsLoading(false);
        }
      };
      loadLogs();
    }
  }, [visible, uid]);

  const selectedBike = bikes[selectedBikeIndex] || bikes[0];
  const selectedBikeId = selectedBike?.id || 'default';

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (!log.bikeId) {
        return selectedBikeId === 'default' || selectedBikeIndex === 0;
      }
      return log.bikeId === selectedBikeId;
    });
  }, [logs, selectedBikeId, selectedBikeIndex]);

  const suggestedParts = useMemo(() => {
    return MAINTENANCE_PARTS.filter((p) => p.category === selectedCategoryTab);
  }, [selectedCategoryTab]);

  const handleSelectSuggestedPart = (partName: string) => {
    setPart(partName);
  };

  const handlePriceChange = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    if (!digitsOnly) {
      setPrice('');
      return;
    }
    const numericValue = parseInt(digitsOnly, 10);
    if (Number.isFinite(numericValue) && numericValue <= 500000000) {
      setPrice(numericValue.toString());
    }
  };

  const handleAddLog = async () => {
    const cleanPart = part.replace(/[<>'"]/g, '').trim().slice(0, 100);
    const parsedPrice = parseInt(price.replace(/[^0-9]/g, ''), 10);

    if (!cleanPart || isNaN(parsedPrice) || parsedPrice < 0) {
      if (Platform.OS === 'web') {
        window.alert('Vui lòng điền đủ Tên phụ tùng và Chi phí!');
      } else {
        Alert.alert('Thiếu thông tin', 'Vui lòng điền đủ Tên phụ tùng và Chi phí!');
      }
      return;
    }

    setIsSaving(true);
    try {
      const newLogData: Omit<IServiceLog, 'id'> = {
        bikeId: selectedBikeId,
        part: cleanPart,
        price: parsedPrice,
        note: note.replace(/[<>'"]/g, '').trim().slice(0, 250),
        createdAt: Date.now(),
        odoAtService: Math.max(0, Math.floor(selectedBike?.odo) || 0),
      };

      const docId = await addServiceLog(uid, newLogData);

      try {
        await recordUserStat(uid, 'rich_biker', parsedPrice);
        await recordUserStat(uid, 'custom_tuner', 1);
      } catch (statError) {
        console.error('Failed to update stats:', statError);
      }

      setLogs((prev) => [{ id: docId, ...newLogData }, ...prev]);
      setPart('');
      setPrice('');
      setNote('');
    } catch (error) {
      console.error('Error adding service log:', error);
      if (Platform.OS === 'web') {
        window.alert('Không thể lưu ghi chép bảo dưỡng.');
      } else {
        Alert.alert('Lỗi', 'Không thể lưu ghi chép bảo dưỡng.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLog = (logId: string) => {
    const executeDelete = async () => {
      try {
        await deleteServiceLog(uid, logId);
        setLogs((prev) => prev.filter((log) => log.id !== logId));
      } catch (error) {
        console.error('Error deleting service log:', error);
        if (Platform.OS === 'web') {
          window.alert('Không thể xóa ghi chép.');
        } else {
          Alert.alert('Lỗi', 'Không thể xóa ghi chép.');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Bạn có chắc muốn xóa ghi chép này?')) {
        executeDelete();
      }
    } else {
      Alert.alert('Xóa Y Bạ', 'Bạn có chắc muốn xóa ghi chép này?', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: executeDelete },
      ]);
    }
  };

  const categoriesWithoutAll = useMemo(() => {
    return MAINTENANCE_CATEGORIES.filter((c) => c.key !== 'all');
  }, []);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <BookOpen size={22} color={COLORS.info} />
              <Text style={styles.modalTitle}>LỊCH SỬ BẢO TRÌ</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.closeText}>Đóng</Text>
            </TouchableOpacity>
          </View>

          {/* Bike Selection Dropdown */}
          {bikes.length > 0 && (
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={styles.dropdownBtn}
                onPress={() => setShowDropdown(!showDropdown)}
              >
                <Text style={styles.dropdownBtnText}>
                  Xe: {selectedBike?.nickname} ({selectedBike?.brand} {selectedBike?.model})
                </Text>
                {showDropdown ? <ChevronUp size={18} color="white" /> : <ChevronDown size={18} color="white" />}
              </TouchableOpacity>

              {showDropdown && (
                <View style={styles.dropdownList}>
                  {bikes.map((b, index) => (
                    <TouchableOpacity
                      key={b.id || index.toString()}
                      style={[
                        styles.dropdownItem,
                        index === selectedBikeIndex && styles.activeDropdownItem,
                      ]}
                      onPress={() => {
                        setSelectedBikeIndex(index);
                        setShowDropdown(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          index === selectedBikeIndex && styles.activeDropdownItemText,
                        ]}
                      >
                        {b.nickname} ({b.brand} {b.model})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Add Service Log Form */}
          <View style={styles.logFormBox}>
            <Text style={styles.formTitle}>
              Thêm Ghi Chép Bảo Dưỡng cho {selectedBike?.nickname}
            </Text>

            {/* Quick suggestions categorized */}
            <View style={styles.quickPickerSection}>
              <Text style={styles.quickPickerLabel}>Chọn nhanh phụ tùng gợi ý:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryPillsRow}>
                {categoriesWithoutAll.map((cat) => {
                  const IconComp = CATEGORY_PICKER_ICONS[cat.key as MaintenanceCategoryKey] || Wrench;
                  const isActive = selectedCategoryTab === cat.key;
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                      onPress={() => setSelectedCategoryTab(cat.key as MaintenanceCategoryKey)}
                    >
                      <IconComp size={12} color={isActive ? '#FFFFFF' : COLORS.textDim} />
                      <Text style={[styles.categoryPillText, isActive && styles.categoryPillTextActive]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.partSuggestionsRow}>
                {suggestedParts.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.suggestedPartChip, part === item.name && styles.suggestedPartChipActive]}
                    onPress={() => handleSelectSuggestedPart(item.name)}
                  >
                    <Plus size={11} color={part === item.name ? COLORS.primary : COLORS.textDim} />
                    <Text style={[styles.suggestedPartText, part === item.name && styles.suggestedPartTextActive]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formRow}>
              <TextInput
                style={[styles.logInput, { flex: 2 }]}
                placeholder="Tên phụ tùng *"
                placeholderTextColor="#666"
                value={part}
                onChangeText={setPart}
              />
              <TextInput
                style={[styles.logInput, { flex: 1 }]}
                placeholder="Giá (VND) *"
                placeholderTextColor="#666"
                keyboardType="numeric"
                value={price ? parseInt(price, 10).toLocaleString('vi-VN') : ''}
                onChangeText={handlePriceChange}
              />
            </View>

            <TextInput
              style={[styles.logInput, styles.marginBottom10]}
              placeholder="Ghi chú (Tên hãng, tiệm sửa xe...)"
              placeholderTextColor="#666"
              maxLength={250}
              value={note}
              onChangeText={setNote}
            />

            <TouchableOpacity
              style={[styles.logSaveBtn, isSaving && styles.logSaveBtnDisabled]}
              onPress={handleAddLog}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.btnText}>LƯU VÀO Y BẠ</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Service Logs List */}
          {isLoading ? (
            <ActivityIndicator color={COLORS.info} style={styles.loader} />
          ) : (
            <FlatList
              data={filteredLogs}
              keyExtractor={(item) => item.id || Date.now().toString()}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Chưa có ghi chép nào cho xe này.</Text>
              }
              renderItem={({ item }) => (
                <View style={styles.logCard}>
                  <View style={styles.logCardHeader}>
                    <Text style={styles.logPartName}>{item.part}</Text>
                    <Text style={styles.logPrice}>{item.price.toLocaleString('vi-VN')} đ</Text>
                  </View>
                  {item.note ? <Text style={styles.logNote}>&quot;{item.note}&quot;</Text> : null}
                  <View style={styles.logCardFooter}>
                    <Text style={styles.logDate}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : ''} • ODO: {item.odoAtService || 0} km
                    </Text>
                    <TouchableOpacity onPress={() => item.id && handleDeleteLog(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: { flex: 1, backgroundColor: COLORS.bg },
  modalContainer: { flex: 1, backgroundColor: COLORS.bg },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalTitle: { color: 'white', fontWeight: '900', fontSize: 17, letterSpacing: 1 },
  closeBtn: { minHeight: HIGTouchTarget.min, justifyContent: 'center' },
  closeText: { color: COLORS.info, fontWeight: 'bold', fontSize: 14 },
  dropdownContainer: { position: 'relative', zIndex: 1000 },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E1E',
    padding: 14,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  dropdownBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  dropdownList: {
    position: 'absolute',
    top: 55,
    left: 20,
    right: 20,
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    zIndex: 1001,
    overflow: 'hidden',
  },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  activeDropdownItem: { backgroundColor: 'rgba(59, 130, 246, 0.12)' },
  dropdownItemText: { color: 'white', fontSize: 13 },
  activeDropdownItemText: { color: COLORS.info, fontWeight: 'bold' },
  logFormBox: {
    padding: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    marginTop: 5,
  },
  formTitle: { color: 'white', fontWeight: 'bold', fontSize: 14, marginBottom: 8 },
  quickPickerSection: { marginBottom: 10 },
  quickPickerLabel: { color: '#888888', fontSize: 11, fontWeight: '600', marginBottom: 6 },
  categoryPillsRow: { gap: 6, paddingBottom: 6 },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#181818',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  categoryPillActive: {
    backgroundColor: '#261416',
    borderColor: COLORS.primary,
  },
  categoryPillText: { color: COLORS.textDim, fontSize: 11, fontWeight: '600' },
  categoryPillTextActive: { color: COLORS.primary, fontWeight: '700' },
  partSuggestionsRow: { gap: 6, paddingVertical: 4 },
  suggestedPartChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#111111',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
  },
  suggestedPartChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#221113',
  },
  suggestedPartText: { color: '#AAAAAA', fontSize: 11, fontWeight: '600' },
  suggestedPartTextActive: { color: '#FFFFFF', fontWeight: '700' },
  formRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  logInput: {
    backgroundColor: '#111',
    color: 'white',
    padding: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    fontSize: 14,
  },
  marginBottom10: { marginBottom: 10 },
  logSaveBtn: {
    backgroundColor: COLORS.info,
    padding: 13,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: HIGTouchTarget.min,
    justifyContent: 'center',
  },
  logSaveBtnDisabled: { opacity: 0.6 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  loader: { marginTop: 20 },
  listContent: { padding: 16 },
  emptyText: { color: COLORS.textDim, textAlign: 'center', marginTop: 20, fontSize: 13 },
  logCard: {
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#282828',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.info,
  },
  logCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  logPartName: { color: 'white', fontSize: 15, fontWeight: 'bold' },
  logPrice: { color: COLORS.safe, fontSize: 15, fontWeight: 'bold' },
  logNote: { color: COLORS.textDim, fontSize: 13, fontStyle: 'italic', marginTop: 4 },
  logCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#262626',
    paddingTop: 8,
  },
  logDate: { color: '#666', fontSize: 11, fontWeight: '600' },
});

