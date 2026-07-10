import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Modal, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Map } from 'lucide-react-native';
import { ITrip } from '../../interfaces/trip';
import { fetchTripHistory } from '../../services/bikeService';
import { COLORS } from '../../constants/colors';

interface ITripHistoryModalProps {
  visible: boolean;
  uid: string;
  onClose: () => void;
}

export default function TripHistoryModal({ visible, uid, onClose }: ITripHistoryModalProps) {
  const [trips, setTrips] = useState<ITrip[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (visible && uid) {
      const loadHistory = async () => {
        setIsLoading(true);
        try {
          const tripData = await fetchTripHistory(uid);
          setTrips(tripData);
        } catch (error) {
          console.error("Error loading trip history:", error);
          Alert.alert("Lỗi", "Không thể tải lịch sử hành trình.");
        } finally {
          setIsLoading(false);
        }
      };
      loadHistory();
    }
  }, [visible, uid]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Map size={24} color={COLORS.primary} />
          <Text style={styles.modalTitle}>LỊCH SỬ HÀNH TRÌNH</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Đóng</Text>
          </TouchableOpacity>
        </View>
        
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Đang tải...</Text>
          </View>
        ) : (
          <FlatList 
            data={trips} 
            keyExtractor={(item) => item.id || Date.now().toString()} 
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Chưa có lịch sử hành trình nào.</Text>
            }
            renderItem={({ item }) => (
              <View style={styles.tripCard}>
                <Text style={styles.tripText}>
                  {item.startTime ? new Date(item.startTime).toLocaleString('vi-VN') : ''} 
                  {item.distance !== undefined ? ` - ${item.distance.toFixed(2)} km` : ''}
                </Text>
              </View>
            )} 
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: COLORS.bg },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#222' },
  modalTitle: { color: 'white', fontWeight: '900', fontSize: 18, marginLeft: 10, letterSpacing: 1 },
  closeBtn: { marginLeft: 'auto' },
  closeText: { color: COLORS.primary, fontWeight: 'bold' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: COLORS.textDim, marginTop: 10 },
  listContent: { padding: 20 },
  emptyText: { color: COLORS.textDim, textAlign: 'center', marginTop: 20 },
  tripCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#333' },
  tripText: { color: 'white' }
});
