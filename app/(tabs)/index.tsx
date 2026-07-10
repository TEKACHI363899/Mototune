import React, { useEffect, useState } from 'react';
import { StyleSheet, SafeAreaView, View, Text, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, Image, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Bot, User, Map, BookOpen, PlusCircle } from 'lucide-react-native';

import { auth, db } from '../../firebaseConfig';
import { IBike } from '../../interfaces/bike';
import { updateBike, deleteBike } from '../../services/bikeService';

// Central Constants
import { COLORS } from '../../constants/colors';

// Modular Components
import Showroom from '../../components/garage/Showroom';
import OdoMeter from '../../components/garage/OdoMeter';
import MaintenanceStatus from '../../components/garage/MaintenanceStatus';
import QuickLogModal from '../../components/garage/QuickLogModal';
import TripHistoryModal from '../../components/garage/TripHistoryModal';
import ServiceLogModal from '../../components/garage/ServiceLogModal';
import BikeEditor from '../../components/garage/BikeEditor';

export default function GarageScreen() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [bikes, setBikes] = useState<IBike[]>([]);
  const [activeBikeIndex, setActiveBikeIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [garageStep, setGarageStep] = useState<number>(0); // 0: Normal/Empty, 1: Adding/Editing Bike
  const [bikeToEdit, setBikeToEdit] = useState<IBike | null>(null); // State to store which bike to edit

  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showLogbook, setShowLogbook] = useState<boolean>(false);
  const [activePartService, setActivePartService] = useState<{ id: string; name: string } | null>(null);

  // Computes active bike object dynamically from state
  const bikeObj = bikes[activeBikeIndex] || null;

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        unsubscribeDoc = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            let userBikes = data.bikes as IBike[] || [];
            let activeIdx = data.activeBikeIndex ?? 0;

            // Self-healing migration path for single legacy bike users
            if (userBikes.length === 0 && data.bike) {
              const legacyBike = { id: 'default', ...data.bike };
              userBikes = [legacyBike];
              activeIdx = 0;
              // Save migrated bikes array back to Firestore
              setDoc(doc(db, 'users', user.uid), { 
                bikes: userBikes, 
                activeBikeIndex: activeIdx 
              }, { merge: true });
            }

            setBikes(userBikes);
            setActiveBikeIndex(activeIdx);
          } else {
            setBikes([]);
            setActiveBikeIndex(0);
          }
          setLoading(false);
        });
      } else {
        setBikes([]);
        setActiveBikeIndex(0);
        setGarageStep(0);
        setLoading(false);
        if (unsubscribeDoc) unsubscribeDoc();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const handleSwitchBike = async (index: number) => {
    setActiveBikeIndex(index);
    if (currentUser && bikes[index]) {
      // Save chosen active index to database
      await setDoc(doc(db, 'users', currentUser.uid), { 
        activeBikeIndex: index,
        // Also keep legacy single bike field synced so other screens function normally
        bike: bikes[index] 
      }, { merge: true });
    }
  };

  const handlePressAddBike = () => {
    setBikeToEdit(null);
    setGarageStep(1);
  };

  const handlePressEditBike = () => {
    setBikeToEdit(bikeObj);
    setGarageStep(1);
  };

  const handleDeleteBike = async (bikeId: string) => {
    const executeDelete = async () => {
      try {
        setLoading(true);
        await deleteBike(currentUser!.uid, bikeId);
        if (Platform.OS === 'web') {
          window.alert("Đã xóa xe khỏi Garage.");
        } else {
          Alert.alert("Hoàn tất", "Đã xóa xe khỏi Garage.");
        }
      } catch (error) {
        console.error("Error deleting bike:", error);
        if (Platform.OS === 'web') {
          window.alert("Không thể xóa xe lúc này.");
        } else {
          Alert.alert("Lỗi", "Không thể xóa xe lúc này.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Bạn có chắc muốn xóa xe "${bikeObj?.nickname}" khỏi Garage?`)) {
        executeDelete();
      }
    } else {
      Alert.alert(
        "Xóa Xe",
        `Bạn có chắc muốn xóa xe "${bikeObj?.nickname}" khỏi Garage? Toàn bộ dữ liệu ODO và linh kiện hao mòn sẽ bị xóa vĩnh viễn.`,
        [
          { text: "Hủy", style: "cancel" },
          { text: "Xóa", style: "destructive", onPress: executeDelete }
        ]
      );
    }
  };

  const handleBikeSaved = () => {
    setGarageStep(0);
    setBikeToEdit(null);
  };

  const handleOdoUpdated = async (newOdo: number) => {
    if (bikeObj && currentUser) {
      try {
        await updateBike(currentUser.uid, { ...bikeObj, odo: newOdo });
      } catch (error) {
        console.error("Failed to update ODO:", error);
      }
    }
  };

  const handleQuickLogSuccess = async (updatedBike: IBike) => {
    if (currentUser) {
      try {
        await updateBike(currentUser.uid, updatedBike);
      } catch (error) {
        console.error("Failed to update bike after quick log:", error);
      }
    }
    setActivePartService(null);
  };

  const handleBikeUpdated = async (updatedBike: IBike) => {
    if (currentUser) {
      try {
        await updateBike(currentUser.uid, updatedBike);
      } catch (error) {
        console.error("Failed to update bike:", error);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerPlaceholder} />
        <Text style={styles.headerTitle}>GARAGE</Text>
        <TouchableOpacity onPress={() => router.push('/profile')}>
          {currentUser?.photoURL ? (
            <Image source={{ uri: currentUser.photoURL }} style={styles.headerAvatar} />
          ) : (
            <User size={30} color={COLORS.primary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Multiple Bikes Horizonal Switcher Bar */}
      {currentUser && bikes.length > 0 && garageStep === 0 && (
        <View style={styles.bikeSelectorWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bikeSelectorContent}>
            {bikes.map((b, index) => (
              <TouchableOpacity 
                key={b.id || index.toString()} 
                style={[styles.bikeTab, index === activeBikeIndex && styles.activeBikeTab]}
                onPress={() => handleSwitchBike(index)}
              >
                <Text style={[styles.bikeTabText, index === activeBikeIndex && styles.activeBikeTabText]}>
                  {b.nickname}
                </Text>
              </TouchableOpacity>
            ))}
            {bikes.length < 5 && (
              <TouchableOpacity style={styles.addBikeTab} onPress={handlePressAddBike}>
                <PlusCircle size={16} color={COLORS.primary} />
                <Text style={styles.addBikeTabText}>Thêm xe</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      )}

      {/* Modals */}
      {currentUser && (
        <>
          <TripHistoryModal 
            visible={showHistory} 
            uid={currentUser.uid} 
            onClose={() => setShowHistory(false)} 
          />
          <ServiceLogModal 
            visible={showLogbook} 
            uid={currentUser.uid} 
            bikes={bikes}
            activeBikeIndex={activeBikeIndex}
            onClose={() => setShowLogbook(false)} 
          />
        </>
      )}

      {currentUser && bikeObj && (
        <QuickLogModal 
          activePartService={activePartService}
          bikeObj={bikeObj}
          uid={currentUser.uid}
          onClose={() => setActivePartService(null)}
          onSuccess={handleQuickLogSuccess}
        />
      )}

      {/* Main Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
        ) : (
          <>
            {bikeObj && garageStep === 0 && currentUser && (
              <View>
                {/* Bike Showroom */}
                <Showroom 
                  bikeObj={bikeObj}
                  uid={currentUser.uid}
                  onBikeUpdated={handleBikeUpdated}
                  onChangeBikeRequest={handlePressEditBike}
                  onDeleteBikeRequest={() => handleDeleteBike(bikeObj.id)}
                />

                {/* Dashboard & Wear list */}
                <View style={styles.contentPadding}>
                  {/* ODO Meter */}
                  <OdoMeter 
                    bikeObj={bikeObj}
                    uid={currentUser.uid}
                    onOdoUpdated={handleOdoUpdated}
                  />

                  {/* Wear and tear status list */}
                  <MaintenanceStatus 
                    bikeObj={bikeObj}
                    onOpenPartResetModal={(partId, partName) => setActivePartService({ id: partId, name: partName })}
                  />

                  {/* Action Buttons */}
                  <View style={styles.twinButtonsRow}>
                    <TouchableOpacity style={styles.twinBtn} onPress={() => setShowHistory(true)}>
                      <Map size={24} color="white" />
                      <Text style={styles.twinBtnText}>HÀNH TRÌNH</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.twinBtnInfo} onPress={() => setShowLogbook(true)}>
                      <BookOpen size={24} color={COLORS.info} />
                      <Text style={styles.twinBtnTextInfo}>Y BẠ KỸ THUẬT</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.footerSpacing} />
                </View>
              </View>
            )}

            {/* Empty State */}
            {bikes.length === 0 && garageStep === 0 && (
              <View style={styles.contentPadding}>
                <TouchableOpacity style={styles.addBikeBtn} onPress={handlePressAddBike}>
                  <PlusCircle size={50} color={COLORS.primary} style={styles.marginBottom10} />
                  <Text style={styles.addBikeText}>THÊM XE VÀO GARAGE</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Bike Editor Step wizard */}
            {garageStep === 1 && currentUser && (
              <View style={styles.contentPadding}>
                <BikeEditor 
                  uid={currentUser.uid}
                  bikeToEdit={bikeToEdit}
                  onBikeSaved={handleBikeSaved}
                  onCancel={() => setGarageStep(0)}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Floating Action Button for AI Mechanic Chatbot */}
      <TouchableOpacity 
        style={styles.fabBot} 
        onPress={() => router.push('/ai-mechanic')} 
        activeOpacity={0.8}
      >
        <Bot size={28} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#222', alignItems: 'center', marginTop: Platform.OS === 'android' ? 25 : 0 },
  headerPlaceholder: { width: 35 },
  headerTitle: { color: COLORS.text, fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  headerAvatar: { width: 35, height: 35, borderRadius: 18, borderWidth: 1, borderColor: '#333' },
  bikeSelectorWrapper: { backgroundColor: COLORS.bg, borderBottomWidth: 1, borderBottomColor: '#222' },
  bikeSelectorContent: { paddingHorizontal: 15, paddingVertical: 12, gap: 10, alignItems: 'center' },
  bikeTab: { backgroundColor: '#1A1A1A', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#333' },
  activeBikeTab: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  bikeTabText: { color: COLORS.textDim, fontSize: 13, fontWeight: 'bold' },
  activeBikeTabText: { color: 'white' },
  addBikeTab: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(227, 27, 35, 0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.primary, gap: 5 },
  addBikeTabText: { color: COLORS.primary, fontSize: 13, fontWeight: 'bold' },
  scrollView: { flex: 1 },
  loader: { marginTop: 50 },
  contentPadding: { flex: 1, padding: 20, maxWidth: 600, width: '100%', alignSelf: 'center' },
  addBikeBtn: { backgroundColor: COLORS.card, borderWidth: 2, borderColor: '#333', borderStyle: 'dashed', borderRadius: 20, padding: 40, alignItems: 'center', justifyContent: 'center', marginTop: 50 },
  marginBottom10: { marginBottom: 10 },
  addBikeText: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  twinButtonsRow: { flexDirection: 'row', gap: 12, marginBottom: 15 },
  twinBtn: { flex: 1, backgroundColor: '#222', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#333' },
  twinBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14, letterSpacing: 1, textAlign: 'center' },
  twinBtnInfo: { flex: 1, backgroundColor: 'rgba(59, 130, 246, 0.1)', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 15, borderRadius: 15, borderWidth: 1, borderColor: COLORS.info },
  twinBtnTextInfo: { color: COLORS.info, fontWeight: 'bold', fontSize: 14, letterSpacing: 1, textAlign: 'center' },
  footerSpacing: { height: 100 },
  fabBot: { position: 'absolute', bottom: Platform.OS === 'ios' ? 100 : 80, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#E31B23', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10, zIndex: 999 }
});