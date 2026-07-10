import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Gauge, Camera } from 'lucide-react-native';
import { IBike } from '../../interfaces/bike';
import { updateOdo } from '../../services/bikeService';
import { scanOdoWithGemini } from '../../services/geminiService';
import { COLORS } from '../../constants/colors';

interface IOdoMeterProps {
  bikeObj: IBike;
  uid: string;
  onOdoUpdated: (newOdo: number) => void;
}

export default function OdoMeter({ bikeObj, uid, onOdoUpdated }: IOdoMeterProps) {
  const [isUpdatingOdo, setIsUpdatingOdo] = useState<boolean>(false);
  const [tempOdo, setTempOdo] = useState<string>('');
  const [isOcrLoading, setIsOcrLoading] = useState<boolean>(false);

  const currentOdo = bikeObj.odo || 0;

  const handleSaveOdo = async () => {
    const newOdo = parseInt(tempOdo, 10);
    if (isNaN(newOdo) || newOdo < currentOdo) {
      Alert.alert("Lỗi", "Số ODO mới không hợp lệ hoặc nhỏ hơn ODO cũ!");
      return;
    }
    try {
      await updateOdo(uid, bikeObj, newOdo);
      onOdoUpdated(newOdo);
      setIsUpdatingOdo(false);
      setTempOdo('');
    } catch (error) {
      console.error("Error updating ODO:", error);
      Alert.alert("Lỗi", "Lưu ODO thất bại!");
    }
  };

  const handleScanOdo = async () => {
    if (Platform.OS === 'web') return; 
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Lỗi", "Cần quyền truy cập Camera!");
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true
      });

      if (!result.canceled && result.assets[0].base64) {
        setIsOcrLoading(true);
        const textValue = await scanOdoWithGemini(result.assets[0].base64);
        
        if (textValue === 'NULL' || !textValue) {
          Alert.alert("A.I Bó tay", "Ảnh mờ quá, thử chụp lại sát số ODO nhé!");
        } else {
          // Keep only numeric characters
          const cleanedOdo = textValue.replace(/[^0-9]/g, '');
          setTempOdo(cleanedOdo);
        }
      }
    } catch (error: any) {
      console.error("Gemini OCR error:", error);
      Alert.alert("Lỗi kết nối", "Hệ thống A.I không phản hồi.");
    } finally {
      setIsOcrLoading(false);
    }
  };

  return (
    <View style={styles.dashboardCard}>
      <View style={styles.dashHeader}>
        <Gauge size={24} color={COLORS.primary} />
        <Text style={styles.dashTitle}>ĐỒNG HỒ ODO</Text>
      </View>
      <Text style={styles.odoValue}>
        {currentOdo.toLocaleString('vi-VN')} <Text style={styles.odoUnit}>km</Text>
      </Text>
      
      {isUpdatingOdo ? (
        <View style={styles.odoUpdateRow}>
          <TextInput 
            style={styles.odoInput} 
            keyboardType="numeric" 
            placeholder="Nhập ODO" 
            placeholderTextColor="#666" 
            value={tempOdo} 
            onChangeText={setTempOdo} 
            autoFocus 
          />
          {Platform.OS !== 'web' && (
            <TouchableOpacity style={styles.ocrBtn} onPress={handleScanOdo} disabled={isOcrLoading}>
              {isOcrLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Camera size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.odoSaveBtn} onPress={handleSaveOdo}>
            <Text style={styles.btnTextBold}>Lưu</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.odoCancelBtn} onPress={() => setIsUpdatingOdo(false)}>
            <Text style={{ color: COLORS.textDim }}>Hủy</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.odoUpdateTrigBtn} 
          onPress={() => {
            setTempOdo(currentOdo.toString()); 
            setIsUpdatingOdo(true);
          }}
        >
          <Text style={styles.trigBtnText}>+ Cập nhật ODO bằng Cam A.I</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dashboardCard: { backgroundColor: COLORS.card, borderRadius: 15, padding: 20, borderWidth: 1, borderColor: '#333', marginBottom: 15 },
  dashHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  dashTitle: { color: 'white', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  odoValue: { color: 'white', fontSize: 32, fontWeight: '900', fontFamily: 'monospace' },
  odoUnit: { fontSize: 16, color: COLORS.textDim },
  odoUpdateTrigBtn: { marginTop: 10, alignSelf: 'flex-start' },
  trigBtnText: { color: COLORS.primary, fontWeight: 'bold' },
  odoUpdateRow: { flexDirection: 'row', gap: 10, marginTop: 15, alignItems: 'center' },
  odoInput: { flex: 1, backgroundColor: '#111', color: 'white', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#444' },
  ocrBtn: { backgroundColor: '#333', padding: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#444' },
  odoSaveBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  btnTextBold: { color: 'white', fontWeight: 'bold' },
  odoCancelBtn: { paddingHorizontal: 10 }
});
