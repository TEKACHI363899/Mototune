import { Bike } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// 🛑 PHIÊN BẢN WEB: KHÔNG IMPORT BẤT KỲ THƯ VIỆN 3D NÀO ĐỂ TRÁNH LỖI BUNDLER
export default function Bike3d({ modelName }: { modelName: string }) {
  return (
    <View style={styles.comingSoonContainer}>
      <Bike size={80} color="#333" style={styles.shadowIcon} />
      <Text style={styles.comingSoonTitle}>HIỂN THỊ 3D ĐỘC QUYỀN TRÊN MOBILE</Text>
      <Text style={styles.comingSoonSub}>Giao diện Web đang ở chế độ an toàn (Safe Mode).</Text>
      <Text style={styles.comingSoonSub}>Vui lòng mở ứng dụng MotoTune trên điện thoại để ngắm {modelName}!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  comingSoonContainer: { 
    width: '100%', height: 250, borderRadius: 15, backgroundColor: '#1A1A1A', 
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' 
  },
  shadowIcon: { opacity: 0.5, marginBottom: 15 },
  comingSoonTitle: { color: '#E31B23', fontWeight: '900', fontSize: 16, letterSpacing: 1, marginBottom: 5 },
  comingSoonSub: { color: '#A0A0A0', fontSize: 14, fontStyle: 'italic', textAlign: 'center', paddingHorizontal: 20 }
});