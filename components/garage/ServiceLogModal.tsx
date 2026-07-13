import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Modal, SafeAreaView, FlatList, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { BookOpen, Trash2, ChevronDown, ChevronUp } from 'lucide-react-native';
import { IServiceLog } from '../../interfaces/serviceLog';
import { fetchServiceLogs, addServiceLog, deleteServiceLog } from '../../services/bikeService';
import { recordUserStat } from '../../utils/badgeHelper';
import { COLORS } from '../../constants/colors';
import { useAppStore } from '../../store/useAppStore';

interface IServiceLogModalProps {
  visible: boolean;
  uid: string;
  onClose: () => void;
}

export default function ServiceLogModal({ visible, uid, onClose }: IServiceLogModalProps) {
  const bikes = useAppStore(state => state.bikes);
  const activeBikeIndex = useAppStore(state => state.activeBikeIndex);

  const [logs, setLogs] = useState<IServiceLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [part, setPart] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [note, setNote] = useState<string>('');
  
  // Custom Dropdown states
  const [selectedBikeIndex, setSelectedBikeIndex] = useState<number>(activeBikeIndex);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  // Sync state when modal becomes visible or parent active index changes
  useEffect(() => {
    if (visible) {
      setSelectedBikeIndex(activeBikeIndex);
      setShowDropdown(false);
    }
  }, [visible, activeBikeIndex]);

  // Load all logs once when modal opens
  useEffect(() => {
    if (visible && uid) {
      const loadLogs = async () => {
        setIsLoading(true);
        try {
          const logData = await fetchServiceLogs(uid);
          setLogs(logData);
        } catch (error) {
          console.error("Error loading service logs:", error);
          Alert.alert("Lỗi", "Không thể tải y bạ kỹ thuật.");
        } finally {
          setIsLoading(false);
        }
      };
      loadLogs();
    }
  }, [visible, uid]);

  const selectedBike = bikes[selectedBikeIndex] || bikes[0];
  const selectedBikeId = selectedBike?.id || 'default';

  // Filter logs for the selected bike on client-side
  const filteredLogs = logs.filter(log => {
    if (!log.bikeId) {
      // Legacy records with no bikeId belong to the first bike ('default')
      return selectedBikeId === 'default' || selectedBikeIndex === 0;
    }
    return log.bikeId === selectedBikeId;
  });

  const handleAddLog = async () => {
    if (!part.trim() || !price.trim()) {
      if (Platform.OS === 'web') {
        window.alert("Vui lòng điền đủ Tên phụ tùng và Giá tiền!");
      } else {
        Alert.alert("Thiếu thông tin", "Vui lòng điền đủ Tên phụ tùng và Giá tiền!");
      }
      return;
    }

    try {
      const parsedPrice = parseInt(price, 10) || 0;
      const newLog: Omit<IServiceLog, 'id'> = {
        bikeId: selectedBikeId,
        part: part.trim(),
        price: parsedPrice,
        note: note.trim() || '',
        createdAt: Date.now(),
        odoAtService: selectedBike?.odo || 0
      };

      const docId = await addServiceLog(uid, newLog);
      
      // 🛑 TRIGGER: CỘNG ĐIỂM HUY HIỆU ĐẠI GIA PHỤ TÙNG TỪ Y BẠ TỔNG
      await recordUserStat(uid, 'rich_biker', parsedPrice);
      // Ghi nhận thêm 1 món đồ chơi/độ kiểng
      await recordUserStat(uid, 'custom_tuner', 1);

      setLogs(prev => [{ id: docId, ...newLog }, ...prev]);
      setPart('');
      setPrice('');
      setNote('');
    } catch (error) {
      console.error("Error adding service log:", error);
      Alert.alert("Lỗi", "Không thể lưu ghi chép bảo dưỡng.");
    }
  };

  const handleDeleteLog = (logId: string) => {
    const executeDelete = async () => {
      try {
        await deleteServiceLog(uid, logId);
        setLogs(prev => prev.filter(log => log.id !== logId));
      } catch (error) {
        console.error("Error deleting service log:", error);
        Alert.alert("Lỗi", "Không thể xóa ghi chép.");
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Bạn có chắc muốn xóa ghi chép này?")) {
        executeDelete();
      }
    } else {
      Alert.alert(
        "Xóa Y Bạ",
        "Bạn có chắc muốn xóa ghi chép này?",
        [
          { text: "Hủy", style: "cancel" },
          { text: "Xóa", style: "destructive", onPress: executeDelete }
        ]
      );
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView 
        style={styles.keyboardContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <BookOpen size={24} color={COLORS.info} />
            <Text style={styles.modalTitle}>Y BẠ KỸ THUẬT</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
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
                        index === selectedBikeIndex && styles.activeDropdownItem
                      ]}
                      onPress={() => {
                        setSelectedBikeIndex(index);
                        setShowDropdown(false);
                      }}
                    >
                      <Text 
                        style={[
                          styles.dropdownItemText, 
                          index === selectedBikeIndex && styles.activeDropdownItemText
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
            <Text style={styles.formTitle}>Thêm Ghi Chép Bảo Dưỡng cho {selectedBike?.nickname}</Text>
            <View style={styles.formRow}>
              <TextInput 
                style={[styles.logInput, { flex: 2 }]} 
                placeholder="Tên phụ tùng (vd: Thay vỏ xe)" 
                placeholderTextColor="#666" 
                value={part} 
                onChangeText={setPart} 
              />
              <TextInput 
                style={[styles.logInput, { flex: 1 }]} 
                placeholder="Giá (VND)" 
                placeholderTextColor="#666" 
                keyboardType="numeric" 
                value={price} 
                onChangeText={setPrice} 
              />
            </View>
            <TextInput 
              style={[styles.logInput, styles.marginBottom10]} 
              placeholder="Ghi chú (vd: Tiệm chú Bảy)" 
              placeholderTextColor="#666" 
              value={note} 
              onChangeText={setNote} 
            />
            <TouchableOpacity style={styles.logSaveBtn} onPress={handleAddLog}>
              <Text style={styles.btnText}>LƯU VÀO Y BẠ</Text>
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
                    <TouchableOpacity onPress={() => item.id && handleDeleteLog(item.id)}>
                      <Trash2 size={18} color="#EF4444" />
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
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#222' },
  modalTitle: { color: 'white', fontWeight: '900', fontSize: 18, marginLeft: 10, letterSpacing: 1 },
  closeBtn: { marginLeft: 'auto' },
  closeText: { color: COLORS.info, fontWeight: 'bold' },
  dropdownContainer: { position: 'relative', zIndex: 1000 },
  dropdownBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1E1E1E', padding: 15, marginHorizontal: 20, marginTop: 10, borderRadius: 10, borderWidth: 1, borderColor: '#333' },
  dropdownBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  dropdownList: { position: 'absolute', top: 55, left: 20, right: 20, backgroundColor: '#1E1E1E', borderRadius: 10, borderWidth: 1, borderColor: '#333', zIndex: 1001, overflow: 'hidden', elevation: 5 },
  dropdownItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  activeDropdownItem: { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
  dropdownItemText: { color: 'white', fontSize: 14 },
  activeDropdownItemText: { color: COLORS.info, fontWeight: 'bold' },
  logFormBox: { padding: 20, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: '#222', marginTop: 5 },
  formTitle: { color: 'white', fontWeight: 'bold', marginBottom: 10 },
  formRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  logInput: { backgroundColor: '#111', color: 'white', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#333', fontSize: 15 },
  marginBottom10: { marginBottom: 10 },
  logSaveBtn: { backgroundColor: COLORS.info, padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 5 },
  btnText: { color: 'white', fontWeight: 'bold' },
  loader: { marginTop: 20 },
  listContent: { padding: 20 },
  emptyText: { color: COLORS.textDim, textAlign: 'center', marginTop: 20 },
  logCard: { backgroundColor: COLORS.card, padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#333', borderLeftWidth: 4, borderLeftColor: COLORS.info },
  logCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  logPartName: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  logPrice: { color: COLORS.safe, fontSize: 16, fontWeight: 'bold' },
  logNote: { color: COLORS.textDim, fontSize: 14, fontStyle: 'italic', marginTop: 5 },
  logCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, borderTopWidth: 1, borderTopColor: '#333', paddingTop: 10 },
  logDate: { color: '#666', fontSize: 12, fontWeight: 'bold' }
});
