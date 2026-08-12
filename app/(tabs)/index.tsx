import React, { useState } from 'react';
import { StyleSheet, SafeAreaView, View, Text, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, Image, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Bot, User, Map, BookOpen, PlusCircle } from 'lucide-react-native';

import { useAppStore } from '../../store/useAppStore';
import { deleteBike } from '../../services/bikeService';
import { IBike } from '../../interfaces/bike';

import { useColorScheme } from 'react-native';
// Central Constants
import { HIGTheme, HIGSpacing, HIGTouchTarget, HIGTypography } from '../../constants/theme';

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
  const theme = 'dark'; // Force dark mode for MotoTune
  const colors = HIGTheme[theme];

  // Zustand Store
  const currentUser = useAppStore(state => state.currentUser);
  const bikes = useAppStore(state => state.bikes);
  const activeBikeIndex = useAppStore(state => state.activeBikeIndex);
  const loading = useAppStore(state => state.loading);
  const setActiveBikeIndex = useAppStore(state => state.setActiveBikeIndex);
  const updateBikeInStore = useAppStore(state => state.updateBikeInStore);

  const [garageStep, setGarageStep] = useState<number>(0); // 0: Normal/Empty, 1: Adding/Editing Bike
  const [bikeToEdit, setBikeToEdit] = useState<IBike | null>(null); // State to store which bike to edit

  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showLogbook, setShowLogbook] = useState<boolean>(false);
  const [activePartService, setActivePartService] = useState<{ id: string; name: string } | null>(null);

  // Computes active bike object dynamically from state
  const bikeObj = bikes[activeBikeIndex] || null;

  const handleSwitchBike = async (index: number) => {
    try {
      await setActiveBikeIndex(index);
    } catch (error) {
      console.error("Error switching bike:", error);
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
        await updateBikeInStore({ ...bikeObj, odo: newOdo });
      } catch (error) {
        console.error("Failed to update ODO:", error);
      }
    }
  };

  const handleQuickLogSuccess = async (updatedBike: IBike) => {
    if (currentUser) {
      try {
        await updateBikeInStore(updatedBike);
      } catch (error) {
        console.error("Failed to update bike after quick log:", error);
      }
    }
    setActivePartService(null);
  };

  const handleBikeUpdated = async (updatedBike: IBike) => {
    if (currentUser) {
      try {
        await updateBikeInStore(updatedBike);
      } catch (error) {
        console.error("Failed to update bike:", error);
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.systemBackground }]}>
      <StatusBar barStyle={theme === 'dark' ? "light-content" : "dark-content"} backgroundColor={colors.systemBackground} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <View style={styles.headerPlaceholder} />
        <Text style={[styles.headerTitle, { color: colors.label }]}>GARAGE</Text>
        <TouchableOpacity onPress={() => router.push('/profile')} style={styles.headerAvatarBtn}>
          {currentUser?.photoURL ? (
            <Image source={{ uri: currentUser.photoURL }} style={[styles.headerAvatar, { borderColor: colors.separator }]} />
          ) : (
            <User size={30} color={colors.systemRed} />
          )}
        </TouchableOpacity>
      </View>

      {/* Multiple Bikes Horizonal Switcher Bar */}
      {currentUser && bikes.length > 0 && garageStep === 0 && (
        <View style={[styles.bikeSelectorWrapper, { backgroundColor: colors.systemBackground, borderBottomColor: colors.separator }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bikeSelectorContent}>
            {bikes.map((b, index) => (
              <TouchableOpacity 
                key={b.id || index.toString()} 
                style={[
                  styles.bikeTab, 
                  { backgroundColor: colors.secondarySystemBackground, borderColor: colors.separator },
                  index === activeBikeIndex && { backgroundColor: colors.systemRed, borderColor: colors.systemRed }
                ]}
                onPress={() => handleSwitchBike(index)}
              >
                <Text 
                  style={[
                    styles.bikeTabText, 
                    { color: colors.secondaryLabel },
                    index === activeBikeIndex && styles.activeBikeTabText
                  ]}
                  numberOfLines={1}
                  allowFontScaling={false}
                >
                  {b.nickname}
                </Text>
              </TouchableOpacity>
            ))}
            {bikes.length < 5 && (
              <TouchableOpacity style={[styles.addBikeTab, { borderColor: colors.systemRed, backgroundColor: theme === 'dark' ? '#2a1a1a' : '#fce8e8' }]} onPress={handlePressAddBike}>
                <PlusCircle size={16} color={colors.systemRed} />
                <Text style={[styles.addBikeTabText, { color: colors.systemRed }]}>Thêm xe</Text>
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
          <ActivityIndicator size="large" color={colors.systemRed} style={styles.loader} />
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
                    <TouchableOpacity style={[styles.twinBtn, { backgroundColor: colors.secondarySystemBackground, borderColor: colors.separator }]} onPress={() => setShowHistory(true)}>
                      <Map size={24} color={colors.label} />
                      <Text style={[styles.twinBtnText, { color: colors.label }]}>HÀNH TRÌNH</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.twinBtnInfo, { backgroundColor: theme === 'dark' ? '#1a2b3c' : '#e6f0fa', borderColor: colors.systemBlue }]} onPress={() => setShowLogbook(true)}>
                      <BookOpen size={24} color={colors.systemBlue} />
                      <Text style={[styles.twinBtnTextInfo, { color: colors.systemBlue }]}>Y BẠ KỸ THUẬT</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.footerSpacing} />
                </View>
              </View>
            )}

            {/* Empty State */}
            {bikes.length === 0 && garageStep === 0 && (
              <View style={styles.contentPadding}>
                <TouchableOpacity style={[styles.addBikeBtn, { backgroundColor: colors.secondarySystemBackground, borderColor: colors.separator }]} onPress={handlePressAddBike}>
                  <PlusCircle size={50} color={colors.systemRed} style={styles.marginBottom10} />
                  <Text style={[styles.addBikeText, { color: colors.label }]}>THÊM XE VÀO GARAGE</Text>
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
        style={[styles.fabBot, { backgroundColor: colors.systemRed, shadowColor: colors.systemRed }]} 
        onPress={() => router.push('/ai-mechanic')} 
        activeOpacity={0.8}
      >
        <Bot size={28} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, alignItems: 'center', marginTop: Platform.OS === 'android' ? 25 : 0 },
  headerPlaceholder: { width: 35 },
  headerTitle: { fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  headerAvatarBtn: { minHeight: HIGTouchTarget.min, minWidth: HIGTouchTarget.min, alignItems: 'center', justifyContent: 'center' },
  headerAvatar: { width: 35, height: 35, borderRadius: 18, borderWidth: 1 },
  bikeSelectorWrapper: { borderBottomWidth: StyleSheet.hairlineWidth },
  bikeSelectorContent: { paddingHorizontal: 15, paddingVertical: 12, gap: 10, alignItems: 'center' },
  bikeTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, minHeight: HIGTouchTarget.min, justifyContent: 'center' },
  bikeTabText: { fontSize: 13, fontWeight: 'bold' },
  activeBikeTabText: { color: 'white' },
  addBikeTab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, gap: 5, minHeight: HIGTouchTarget.min },
  addBikeTabText: { fontSize: 13, fontWeight: 'bold' },
  scrollView: { flex: 1 },
  loader: { marginTop: 50 },
  contentPadding: { flex: 1, padding: 20, maxWidth: 600, width: '100%', alignSelf: 'center' },
  addBikeBtn: { borderWidth: 2, borderStyle: 'dashed', borderRadius: 20, padding: 40, alignItems: 'center', justifyContent: 'center', marginTop: 50, minHeight: HIGTouchTarget.min },
  marginBottom10: { marginBottom: 10 },
  addBikeText: { fontSize: 18, fontWeight: 'bold' },
  twinButtonsRow: { flexDirection: 'row', gap: 12, marginBottom: 15 },
  twinBtn: { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 15, borderRadius: 15, borderWidth: 1, minHeight: HIGTouchTarget.min },
  twinBtnText: { fontWeight: 'bold', fontSize: 14, letterSpacing: 1, textAlign: 'center' },
  twinBtnInfo: { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 15, borderRadius: 15, borderWidth: 1, minHeight: HIGTouchTarget.min },
  twinBtnTextInfo: { fontWeight: 'bold', fontSize: 14, letterSpacing: 1, textAlign: 'center' },
  footerSpacing: { height: 100 },
  fabBot: { position: 'absolute', bottom: Platform.OS === 'ios' ? 100 : 80, right: 20, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10, zIndex: 999 }
});
