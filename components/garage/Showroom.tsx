import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, ActivityIndicator, Alert, Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Box, Image as ImageIcon, Camera, PlusCircle, Bike, Trash2 } from 'lucide-react-native';
import { IBike } from '../../interfaces/bike';
import { handleUploadCutoutAndSave } from '../../services/bikeService';
import Bike3d from '../Bike3d';
import { COLORS } from '../../constants/colors';

const { width } = Dimensions.get('window');

interface IShowroomProps {
  bikeObj: IBike;
  uid: string;
  onBikeUpdated: (updatedBike: IBike) => void;
  onChangeBikeRequest: () => void;
  onDeleteBikeRequest: () => void;
}

export default function Showroom({ bikeObj, uid, onBikeUpdated, onChangeBikeRequest, onDeleteBikeRequest }: IShowroomProps) {
  const [viewMode, setViewMode] = useState<'3D' | 'AI'>('AI');
  const [isUploadingCutout, setIsUploadingCutout] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  const handleUploadCutout = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Lỗi", "Cần quyền truy cập Thư viện ảnh!");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setIsUploadingCutout(true);
        setUploadStatus('Bắt đầu...');

        const secureUrl = await handleUploadCutoutAndSave(
          uid,
          bikeObj,
          result.assets[0].base64,
          (statusText) => setUploadStatus(statusText)
        );

        onBikeUpdated({ ...bikeObj, aiCutoutUrl: secureUrl });
        setUploadStatus('Xong!');
        setTimeout(() => {
          Alert.alert("Thành công", "Đã cập nhật ảnh xe thực tế của bạn!");
        }, 500);
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      Alert.alert("Lỗi", `Không thể cập nhật ảnh: ${error.message}`);
    } finally {
      setIsUploadingCutout(false);
      setUploadStatus('');
    }
  };

  const has3DModel = ['Exciter 155 VVA', 'CBR150R', 'NVX 155'].includes(bikeObj.model);

  return (
    <View style={styles.showroomContainer}>
      <View style={styles.headerBtnsRow}>
        <TouchableOpacity style={styles.editBtn} onPress={onChangeBikeRequest}>
          <Text style={styles.editBtnText}>Đổi xe khác</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={onDeleteBikeRequest}>
          <Trash2 size={13} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.toggleContainer}>
        <TouchableOpacity 
          style={[styles.toggleBtn, viewMode === '3D' && styles.toggleActive]} 
          onPress={() => setViewMode('3D')}
        >
          <Box size={14} color={viewMode === '3D' ? 'white' : COLORS.textDim} />
          <Text style={[styles.toggleText, viewMode === '3D' && { color: 'white', fontWeight: 'bold' }]}>3D</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.toggleBtn, viewMode === 'AI' && styles.toggleActive]} 
          onPress={() => setViewMode('AI')}
        >
          <ImageIcon size={14} color={viewMode === 'AI' ? 'white' : COLORS.textDim} />
          <Text style={[styles.toggleText, viewMode === 'AI' && { color: 'white', fontWeight: 'bold' }]}>Thực tế</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.presentationBox}>
        {viewMode === '3D' ? (
          has3DModel ? (
            <Bike3d modelName={bikeObj.model} />
          ) : (
            <View style={styles.placeholderBox}>
              <Bike size={60} color={COLORS.primary} opacity={0.5} />
              <Text style={styles.placeholderText}>Mô hình 3D cho {bikeObj.model} đang được phát triển.</Text>
            </View>
          )
        ) : (
          bikeObj.aiCutoutUrl ? (
            <View style={styles.cutoutImageWrapper}>
              <Image source={{ uri: bikeObj.aiCutoutUrl }} style={styles.cutoutImage} resizeMode="contain" />
              
              {isUploadingCutout && (
                <View style={[StyleSheet.absoluteFill, styles.loaderOverlay]}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.loaderStatusText}>{uploadStatus}</Text>
                </View>
              )}

              <TouchableOpacity style={styles.changePicBtn} onPress={handleUploadCutout} disabled={isUploadingCutout}>
                <Camera size={16} color="white" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.cutoutPlaceholder} onPress={handleUploadCutout} disabled={isUploadingCutout}>
              <View style={{ opacity: 0.2 }}>
                <Bike size={200} color="#FFFFFF" strokeWidth={1} />
              </View>
              <View style={styles.addPicOverlay}>
                {isUploadingCutout ? (
                  <View style={styles.centerGap}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>{uploadStatus}</Text>
                  </View>
                ) : (
                  <View style={styles.centerGap}>
                    <PlusCircle size={50} color={COLORS.primary} />
                    <Text style={styles.addPicText}>Chạm để thêm ảnh xe của bạn (AI Cutout)</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )
        )}
      </View>
      
      <View style={styles.bikeNameBox}>
        <Text style={styles.bikeNickname}>&quot;{bikeObj.nickname}&quot;</Text>
        <Text style={styles.bikeModel}>{bikeObj.brand} {bikeObj.model}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  showroomContainer: { width: '100%', backgroundColor: '#050505', borderBottomWidth: 1, borderBottomColor: '#1A1A1A', position: 'relative' },
  headerBtnsRow: { position: 'absolute', top: 15, left: 15, zIndex: 10, flexDirection: 'row', gap: 6, alignItems: 'center' },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: '#333' },
  editBtnText: { color: COLORS.textDim, fontSize: 11, fontWeight: 'bold' },
  deleteBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 15, borderWidth: 1, borderColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  toggleContainer: { position: 'absolute', top: 15, right: 15, zIndex: 10, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: 4, borderWidth: 1, borderColor: '#333' },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  toggleActive: { backgroundColor: '#333' },
  toggleText: { color: COLORS.textDim, fontSize: 12 },
  presentationBox: { width: '100%', height: width * 0.65, maxHeight: 500, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  placeholderBox: { alignItems: 'center', justifyContent: 'center', opacity: 0.7, padding: 20 },
  placeholderText: { color: COLORS.textDim, marginTop: 10, fontSize: 13, textAlign: 'center' },
  cutoutImageWrapper: { flex: 1, width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  cutoutImage: { width: '85%', height: '85%' }, 
  changePicBtn: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.7)', padding: 10, borderRadius: 20, borderWidth: 1, borderColor: '#444' },
  cutoutPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  addPicOverlay: { position: 'absolute', alignItems: 'center', justifyContent: 'center', padding: 20 },
  addPicText: { color: COLORS.primary, marginTop: 15, fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  bikeNameBox: { paddingVertical: 15, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#1A1A1A' },
  bikeNickname: { color: COLORS.text, fontSize: 24, fontWeight: '900', fontStyle: 'italic', letterSpacing: 1 },
  bikeModel: { fontSize: 14, fontWeight: 'bold', color: COLORS.textDim, marginTop: 2 },
  loaderOverlay: { backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 20 },
  loaderStatusText: { color: 'white', fontWeight: 'bold', fontSize: 14, marginTop: 15 },
  centerGap: { alignItems: 'center', gap: 10 },
  loadingText: { color: 'white', fontWeight: 'bold', fontSize: 12 }
});
