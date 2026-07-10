import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { saveBike, updateBike } from '../../services/bikeService';
import { BIKE_DATA, BRANDS } from '../../constants/garage';
import { COLORS } from '../../constants/colors';
import { IBike } from '../../interfaces/bike';

interface IBikeEditorProps {
  uid: string;
  bikeToEdit?: IBike | null;
  onBikeSaved: () => void;
  onCancel: () => void;
}

export default function BikeEditor({ uid, bikeToEdit = null, onBikeSaved, onCancel }: IBikeEditorProps) {
  const [step, setStep] = useState<number>(bikeToEdit ? 3 : 1);
  const [brand, setBrand] = useState<string>(bikeToEdit?.brand || '');
  const [model, setModel] = useState<string>(bikeToEdit?.model || '');
  const [nickname, setNickname] = useState<string>(bikeToEdit?.nickname || '');

  const handleSave = async () => {
    try {
      if (bikeToEdit) {
        // Edit mode: replaces details of the current bike
        await updateBike(uid, {
          ...bikeToEdit,
          brand,
          model,
          nickname: nickname.trim() || model
        });
        Alert.alert("Hoàn tất", "Đã cập nhật thông tin xe!");
      } else {
        // Add mode: appends new bike to array
        await saveBike(uid, brand, model, nickname.trim());
        Alert.alert("Hoàn tất", "Đã mang chiến mã vào Garage!");
      }
      onBikeSaved();
    } catch (error: any) {
      console.error("Error saving bike:", error);
      Alert.alert("Lỗi", error.message || "Không thể lưu xe.");
    }
  };

  return (
    <View style={styles.editorBox}>
      {step === 1 && (
        <View>
          <Text style={styles.editorTitle}>B1: Chọn hãng xe của bạn</Text>
          <View style={styles.chipContainer}>
            {BRANDS.map(b => (
              <TouchableOpacity 
                key={b} 
                style={styles.chipBtn} 
                onPress={() => { setBrand(b); setStep(2); }}
              >
                <Text style={styles.chipText}>{b}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>Hủy</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 2 && (
        <View>
          <View style={styles.editorHeader}>
            <TouchableOpacity onPress={() => setStep(1)}>
              <ChevronLeft color={COLORS.textDim} size={28}/>
            </TouchableOpacity>
            <Text style={styles.editorTitle}>B2: Chọn dòng xe</Text>
          </View>
          
          {BIKE_DATA[brand]?.map(cat => (
            <View key={cat.categoryName} style={styles.categoryBlock}>
              <Text style={styles.categoryTitle}>{cat.categoryName}</Text>
              <View style={styles.modelGrid}>
                {cat.models.map(m => (
                  <TouchableOpacity 
                    key={m} 
                    style={styles.modelBtn} 
                    onPress={() => { setModel(m); setNickname(m); setStep(3); }}
                  >
                    <Text style={styles.modelText}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {step === 3 && (
        <View>
          <View style={styles.editorHeader}>
            {!bikeToEdit && (
              <TouchableOpacity onPress={() => setStep(2)}>
                <ChevronLeft color={COLORS.textDim} size={28}/>
              </TouchableOpacity>
            )}
            <Text style={styles.editorTitle}>{bikeToEdit ? "SỬA THÔNG TIN XE" : "B3: Đặt Tên Xe"}</Text>
          </View>
          
          {bikeToEdit && (
            <View style={styles.editInfoBox}>
              <Text style={{color: COLORS.textDim, fontSize: 13, fontWeight: 'bold'}}>Dòng xe:</Text>
              <Text style={{color: 'white', fontWeight: 'bold', fontSize: 16, marginTop: 4, marginBottom: 12}}>
                {brand} {model}
              </Text>
              <TouchableOpacity style={styles.changeModelBtn} onPress={() => setStep(1)}>
                <Text style={{color: COLORS.primary, fontWeight: 'bold', fontSize: 13}}>Thay đổi hãng & dòng xe</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.formRow}>
            <TextInput 
              style={styles.bikeInput} 
              placeholder="Vd: Ngựa đen..." 
              placeholderTextColor="#666" 
              value={nickname} 
              onChangeText={setNickname} 
              autoFocus 
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.btnText}>Lưu</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.defaultNameBtn} 
            onPress={() => setNickname(model)}
          >
            <Text style={styles.defaultNameText}>Sử dụng tên mặc định: &quot;{model}&quot;</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  editorBox: { backgroundColor: COLORS.card, padding: 25, borderRadius: 20, borderWidth: 1, borderColor: '#333' },
  editorHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  editorTitle: { color: 'white', fontWeight: 'bold', fontSize: 18, marginLeft: 5 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  chipBtn: { backgroundColor: '#222', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, borderWidth: 1, borderColor: '#444' },
  chipText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
  categoryBlock: { marginBottom: 20 },
  categoryTitle: { color: COLORS.primary, fontWeight: 'bold', fontSize: 14, marginBottom: 10, letterSpacing: 1, borderLeftWidth: 3, borderLeftColor: COLORS.primary, paddingLeft: 8 },
  modelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  modelBtn: { backgroundColor: '#1E1E1E', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 15, borderWidth: 1, borderColor: '#333' },
  modelText: { color: 'white', fontSize: 13, fontWeight: '500' },
  editInfoBox: { backgroundColor: '#111', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#222' },
  changeModelBtn: { backgroundColor: 'rgba(227, 27, 35, 0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: COLORS.primary },
  defaultNameBtn: { marginTop: 12, paddingVertical: 8, alignSelf: 'flex-start' },
  defaultNameText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 13, textDecorationLine: 'underline' },
  cancelBtn: { marginTop: 20, alignSelf: 'center', padding: 10 },
  cancelText: { color: COLORS.textDim, textDecorationLine: 'underline', fontSize: 15 },
  formRow: { flexDirection: 'row', gap: 10 },
  bikeInput: { flex: 1, backgroundColor: '#111', color: 'white', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#444', fontSize: 16 },
  saveBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 25, justifyContent: 'center', borderRadius: 10 },
  btnText: { color: 'white', fontWeight: 'bold' }
});
