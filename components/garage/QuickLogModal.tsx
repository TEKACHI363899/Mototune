import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { X } from 'lucide-react-native';
import { IBike, IMaintenanceStatus } from '../../interfaces/bike';
import { addServiceLog, updateBike } from '../../services/bikeService';
import { recordUserStat } from '../../utils/badgeHelper';
import { COLORS } from '../../constants/colors';

interface IQuickLogModalProps {
  activePartService: { id: string; name: string } | null;
  bikeObj: IBike;
  uid: string;
  onClose: () => void;
  onSuccess: (updatedBike: IBike) => void;
}

export default function QuickLogModal({ activePartService, bikeObj, uid, onClose, onSuccess }: IQuickLogModalProps) {
  const [price, setPrice] = useState<string>('');
  const [note, setNote] = useState<string>('');

  if (!activePartService) return null;

  const currentOdo = bikeObj.odo || 0;

  const executePartService = async () => {
    if (!price.trim()) {
      if (Platform.OS === 'web') {
        window.alert("Vui lòng nhập giá tiền!");
      } else {
        Alert.alert("Thiếu thông tin", "Vui lòng nhập giá tiền!");
      }
      return;
    }

    try {
      const parsedPrice = parseInt(price, 10) || 0;
      const newLog = {
        part: activePartService.name,
        price: parsedPrice,
        note: note || '',
        createdAt: Date.now(),
        odoAtService: currentOdo
      };

      // 1. Add log to service history
      await addServiceLog(uid, newLog);

      // 2. Trigger Badge helper stat updates
      await recordUserStat(uid, 'rich_biker', parsedPrice);

      // 3. Update Wear & Tear maintenance ODO in user bike document
      const currentMaintenance = bikeObj.maintenance || { oil: 0, airFilter: 0, sparkPlug: 0, coolant: 0, chain: 0, brakes: 0 };
      const updatedMaintenance: IMaintenanceStatus = { 
        ...currentMaintenance, 
        [activePartService.id]: currentOdo 
      };
      
      const updateData: Partial<IBike> = { maintenance: updatedMaintenance };
      if (activePartService.id === 'oil') {
        updateData.lastOilChangeOdo = currentOdo;
      }

      const updatedBike = { ...bikeObj, ...updateData };
      await updateBike(uid, updatedBike);

      // Reset form
      setPrice('');
      setNote('');

      // Trigger callback with new bike state
      onSuccess(updatedBike);
      
      if (Platform.OS === 'web') {
        window.alert(`✅ Đã lưu Y bạ và làm mới hao mòn cho [${activePartService.name}]!`);
      } else {
        Alert.alert("Thành công", `Đã lưu Y bạ và làm mới hao mòn cho [${activePartService.name}]!`);
      }
    } catch (error) {
      console.error("Lỗi Firestore:", error);
      Alert.alert("Lỗi", "Không thể lưu dữ liệu.");
    }
  };

  return (
    <Modal visible={!!activePartService} transparent animationType="fade">
      <View style={styles.quickLogOverlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={styles.keyboardContainer}
        >
          <View style={styles.quickLogBox}>
            <View style={styles.quickLogHeader}>
              <Text style={styles.quickLogTitle}>Thay thế {activePartService.name}</Text>
              <TouchableOpacity onPress={onClose}>
                <X size={20} color={COLORS.textDim} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.helpText}>
              Ghi nhận vào Y bạ và tự động làm mới thanh hao mòn cho mốc ODO hiện tại ({currentOdo} km).
            </Text>

            <TextInput 
              style={styles.quickLogInput} 
              placeholder="Giá tiền (VND) *" 
              placeholderTextColor="#666" 
              keyboardType="numeric" 
              value={price} 
              onChangeText={setPrice} 
              autoFocus
            />
            <TextInput 
              style={styles.quickLogInput} 
              placeholder="Ghi chú (Tên hãng, nơi thay...)" 
              placeholderTextColor="#666" 
              value={note} 
              onChangeText={setNote} 
            />
            
            <TouchableOpacity style={styles.quickLogSubmitBtn} onPress={executePartService}>
              <Text style={styles.btnText}>Lưu & Làm mới Hao mòn</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  quickLogOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  keyboardContainer: { width: '100%', alignItems: 'center' },
  quickLogBox: { width: '100%', maxWidth: 400, backgroundColor: COLORS.card, borderRadius: 15, padding: 20, borderWidth: 1, borderColor: '#333' },
  quickLogHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  quickLogTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  helpText: { color: COLORS.textDim, fontSize: 13, marginBottom: 15, textAlign: 'center' },
  quickLogInput: { backgroundColor: '#111', color: 'white', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#333', fontSize: 15, marginBottom: 10 },
  quickLogSubmitBtn: { backgroundColor: COLORS.primary, padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  btnText: { color: 'white', fontWeight: 'bold' }
});
