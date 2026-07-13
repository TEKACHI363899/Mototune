import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import { Accelerometer } from 'expo-sensors';
import * as SMS from 'expo-sms';
import * as Speech from 'expo-speech';
import * as TaskManager from 'expo-task-manager';
import { addDoc, arrayUnion, collection, doc, getDoc, increment, setDoc } from 'firebase/firestore';
import { AlertTriangle, CheckCircle, Clock, Droplet, Gauge, ListMusic, MapPin, Music, Play, PlusCircle, SkipBack, SkipForward, Smartphone, Square, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, FlatList, Modal, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View, DeviceEventEmitter } from 'react-native';
import Map from '../../components/Map';
import { db } from '../../firebaseConfig';
import { IBike } from '../../interfaces/bike';
import { useAppStore } from '../../store/useAppStore';

// 🛑 IMPORT HÀM CỘNG ĐIỂM HUY HIỆU
import { recordUserStat } from '../../utils/badgeHelper';

const { height } = Dimensions.get('window');
const COLORS = { bg: '#000000', card: '#121212', primary: '#E31B23', text: '#FFFFFF', textDim: '#A0A0A0', success: '#4ADE80', warning: '#F59E0B', info: '#3B82F6', hudAccent: '#FF4500' };

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const p = 0.017453292519943295;    
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p)/2 + c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))/2;
  return 12742 * Math.asin(Math.sqrt(a)); 
};

type LocalSong = { uri: string; name: string };

const LOCATION_TRACKING_TASK = 'background-location-tracking';

// Define the background location task at root level
TaskManager.defineTask(LOCATION_TRACKING_TASK, async ({ data, error }) => {
  if (error) {
    console.error("Background location task error:", error);
    return;
  }
  if (data) {
    const { locations } = data as any;
    if (locations && locations.length > 0) {
      const loc = locations[0];
      DeviceEventEmitter.emit('background-location-update', {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        speed: loc.coords.speed,
        timestamp: loc.timestamp
      });
    }
  }
});

export default function JourneyScreen() {
  const currentUser = useAppStore(state => state.currentUser);
  const bikes = useAppStore(state => state.bikes);
  
  const [isTracking, setIsTracking] = useState(false);
  const [routeCoords, setRouteCoords] = useState<{latitude: number, longitude: number}[]>([]);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0); 
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [showSummary, setShowSummary] = useState(false);
  const [tripStats, setTripStats] = useState<any>(null);

  const [crashDetected, setCrashDetected] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const [playlist, setPlaylist] = useState<LocalSong[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);

  // Multiple bikes states
  const [selectedBikeId, setSelectedBikeId] = useState<string | null>(null);
  const [showBikeSelectModal, setShowBikeSelectModal] = useState(false);

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const accelSubscription = useRef<any>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const hudTimeInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { 
      stopJourney(); 
      if (soundRef.current) { soundRef.current.unloadAsync(); }
    };
  }, []);

  // Listen to background location updates
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('background-location-update', (data) => {
      if (!isTracking) return;
      
      const newCoord = { latitude: data.latitude, longitude: data.longitude };
      const speedKmh = (data.speed && data.speed > 0) ? data.speed * 3.6 : 0;
      setCurrentSpeed(speedKmh);

      setRouteCoords((prev) => {
        if (prev.length > 0) {
          const lastCoord = prev[prev.length - 1];
          const dist = calculateDistance(lastCoord.latitude, lastCoord.longitude, newCoord.latitude, newCoord.longitude);
          setTotalDistance((d) => d + dist);
        }
        return [...prev, newCoord];
      });
    });

    return () => {
      subscription.remove();
    };
  }, [isTracking]);

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.webContainer}>
        <Smartphone size={100} color={COLORS.primary} style={{ marginBottom: 20 }} />
        <Text style={styles.webTitle}>TÍNH NĂNG ĐỘC QUYỀN MOBILE</Text>
        <Text style={styles.webSub}>Hành trình thông minh yêu cầu phần cứng thiết bị. Vui lòng mở ứng dụng MotoTune trên điện thoại!</Text>
      </SafeAreaView>
    );
  }

  const pickSongs = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', multiple: true });
      if (!result.canceled && result.assets) {
        const newSongs = result.assets.map(asset => ({ uri: asset.uri, name: asset.name }));
        setPlaylist(prev => [...prev, ...newSongs]);
      }
    } catch (e) { Alert.alert('Lỗi', 'Không thể chọn nhạc.'); }
  };

  const playMusic = async (index: number) => {
    if (playlist.length === 0) return;
    try {
      if (soundRef.current) { await soundRef.current.unloadAsync(); }
      const { sound } = await Audio.Sound.createAsync({ uri: playlist[index].uri });
      soundRef.current = sound;
      await soundRef.current.playAsync();
      setIsPlaying(true);
      setCurrentSongIndex(index);
      
      soundRef.current.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) { nextSong(); }
      });
    } catch (error) { Alert.alert('Lỗi phát nhạc', 'File nhạc có thể bị hỏng.'); }
  };

  const togglePlayPause = async () => {
    if (playlist.length === 0) return;
    if (!soundRef.current) { playMusic(currentSongIndex); return; }
    if (isPlaying) { await soundRef.current.pauseAsync(); setIsPlaying(false); } 
    else { await soundRef.current.playAsync(); setIsPlaying(true); }
  };

  const nextSong = () => { if (playlist.length > 0) playMusic((currentSongIndex + 1) % playlist.length); };
  const prevSong = () => { if (playlist.length > 0) playMusic((currentSongIndex - 1 + playlist.length) % playlist.length); };
  const stopMusic = async () => { if (soundRef.current) { await soundRef.current.stopAsync(); setIsPlaying(false); } };

  const handlePressStart = async () => {
    if (!currentUser) return Alert.alert("Lỗi", "Vui lòng đăng nhập.");
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') return Alert.alert("Lỗi", "Cần quyền GPS để vẽ bản đồ.");

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.warn("Background location permission denied.");
    }

    if (bikes.length === 0) {
      Alert.alert("Chưa có xe", "Vui lòng thêm xe vào Garage trước khi bắt đầu hành trình.");
      return;
    }

    // Enforce bike selection
    setShowBikeSelectModal(true);
  };

  const executeStartJourney = async (bikeId: string) => {
    setShowBikeSelectModal(false);
    setSelectedBikeId(bikeId);

    const selectedBike = bikes.find(b => b.id === bikeId);
    try {
      let speechText = `Chào Biker. Hệ thống HUD đã sẵn sàng trên xe ${selectedBike?.nickname || ''}.`;
      if (selectedBike) {
        const lastOil = selectedBike.lastOilChangeOdo ?? 0;
        const kmPassed = (selectedBike.odo || 0) - lastOil;
        const kmLeft = 2000 - kmPassed;
        if (kmLeft < 200 && kmLeft > 0) {
          speechText += ` Lưu ý, xế cưng còn ${Math.floor(kmLeft)} km nữa là đến hạn thay nhớt.`;
        } else if (kmLeft <= 0) {
          speechText += ` Cảnh báo, xe bạn đã quá hạn thay nhớt. Hãy thay nhớt ngay lập tức!`;
        }
      }
      Speech.speak(speechText, { language: 'vi-VN', rate: 1.1 });
    } catch (e) { console.log(e); }

    // 🛑 TRIGGER 1: KIỂM TRA THỜI GIAN ĐỂ CỘNG ĐIỂM CÚ ĐÊM / BÌNH MINH
    if (currentUser) {
      const currentHour = new Date().getHours();
      if (currentHour >= 23 || currentHour < 4) {
        await recordUserStat(currentUser.uid, 'night_rider', 1);
      } else if (currentHour >= 4 && currentHour <= 6) {
        await recordUserStat(currentUser.uid, 'early_bird', 1);
      }
    }

    setIsTracking(true);
    const now = Date.now();
    setStartTime(now);
    setRouteCoords([]);
    setTotalDistance(0);
    setTripStats(null);
    setElapsedTime('00:00');

    hudTimeInterval.current = setInterval(() => {
      const diffMs = Date.now() - now;
      const mins = Math.floor(diffMs / 60000).toString().padStart(2, '0');
      const secs = Math.floor((diffMs % 60000) / 1000).toString().padStart(2, '0');
      setElapsedTime(`${mins}:${secs}`);
    }, 1000);

    // Register Background location tracking task
    const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TRACKING_TASK);
    if (!isTaskRegistered) {
      console.log("Registering background location task...");
    }

    try {
      await Location.startLocationUpdatesAsync(LOCATION_TRACKING_TASK, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000,
        distanceInterval: 5,
        foregroundService: {
          notificationTitle: "MotoTune Đang Hoạt Động",
          notificationBody: "Hành trình và bản đồ đang được chạy ngầm tự động.",
          notificationColor: "#E31B23"
        },
        pausesUpdatesAutomatically: false
      });
    } catch (err) {
      console.error("Failed to start background location updates, fallback to foreground watch:", err);
      // Fallback to foreground position watching
      locationSubscription.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5, timeInterval: 1000 },
        (loc) => {
          const newCoord = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          const speedKmh = (loc.coords.speed && loc.coords.speed > 0) ? loc.coords.speed * 3.6 : 0;
          setCurrentSpeed(speedKmh);

          setRouteCoords((prev) => {
            if (prev.length > 0) {
              const lastCoord = prev[prev.length - 1];
              const dist = calculateDistance(lastCoord.latitude, lastCoord.longitude, newCoord.latitude, newCoord.longitude);
              setTotalDistance((d) => d + dist);
            }
            return [...prev, newCoord];
          });
        }
      );
    }

    Accelerometer.setUpdateInterval(500);
    accelSubscription.current = Accelerometer.addListener(accelerometerData => {
      const { x, y, z } = accelerometerData;
      const gForce = Math.sqrt(x * x + y * y + z * z);
      if (gForce > 4 && !crashDetected) triggerCrashProtocol();
    });
  };

  const triggerCrashProtocol = () => { 
    setCrashDetected(true);
    Speech.speak("Phát hiện va chạm. Đang đếm ngược để gọi khẩn cấp.", { language: 'vi-VN' });
    let time = 30;
    setCountdown(time);
    countdownInterval.current = setInterval(() => {
      time -= 1;
      setCountdown(time);
      if (time <= 0) { clearInterval(countdownInterval.current!); sendEmergencyAlert(); }
    }, 1000);
  };

  const cancelCrashAlert = () => { 
    setCrashDetected(false); 
    if (countdownInterval.current) clearInterval(countdownInterval.current); 
    Speech.speak("Đã hủy báo động khẩn cấp.", { language: 'vi-VN' }); 
  };

  const sendEmergencyAlert = async () => { 
    setCrashDetected(false);
    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
      const mapsLink = routeCoords.length > 0 
        ? `http://www.openstreetmap.org/?mlat=${routeCoords[routeCoords.length - 1].latitude}&mlon=${routeCoords[routeCoords.length - 1].longitude}&zoom=15` 
        : `Chưa có tọa độ GPS (Chế độ Test)`;
      await SMS.sendSMSAsync(['0909000000'], `[KHẨN CẤP] Phát hiện sự cố va chạm xe. Vị trí hiện tại: ${mapsLink}`);
    } else { 
      Alert.alert("Lỗi", "Thiết bị không hỗ trợ gửi SMS."); 
    }
  };

  const stopJourney = async () => {
    if (!isTracking) return;
    stopMusic();
    
    // Stop background location updates
    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING_TASK);
      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK);
      }
    } catch (err) {
      console.warn("Stop background updates warning:", err);
    }

    if (locationSubscription.current) locationSubscription.current.remove();
    if (accelSubscription.current) accelSubscription.current.remove();
    if (hudTimeInterval.current) clearInterval(hudTimeInterval.current);
    
    setIsTracking(false);
    const endTime = Date.now();
    const durationMs = endTime - (startTime || endTime);
    const durationMinutes = Math.floor(durationMs / (1000 * 60));
    const durationHours = durationMs / (1000 * 60 * 60);
    const avgSpeed = durationHours > 0 ? (totalDistance / durationHours) : 0;
    
    const earnedPoints = Math.floor(totalDistance * 10);
    let newBadges: string[] = [];
    if (totalDistance > 10 && avgSpeed < 50) newBadges.push("Tay Lái Cẩn Thận 🛡️");
    if (totalDistance > 50) newBadges.push("Phượt Thủ Bền Bỉ 🦅");

    if (currentUser && totalDistance > 0.1 && selectedBikeId) { 
      try {
        // Save trip to database with bikeId
        await addDoc(collection(db, 'users', currentUser.uid, 'trips'), { 
          startTime, 
          endTime, 
          distance: totalDistance, 
          avgSpeed, 
          route: routeCoords, 
          points: earnedPoints,
          bikeId: selectedBikeId 
        });

        // Update ODO of selected bike in user document array
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        let updatedBikes = [...bikes];
        if (userDoc.exists()) {
          const data = userDoc.data();
          let currentBikes = data.bikes as IBike[] || [];
          if (currentBikes.length === 0 && data.bike) {
            currentBikes = [{ id: 'default', ...data.bike }];
          }
          updatedBikes = currentBikes.map(b => {
            const bId = b.id || 'default';
            if (bId === selectedBikeId) {
              return { ...b, odo: (b.odo || 0) + totalDistance };
            }
            return b;
          });
        }

        const updateData: any = { 
          bikes: updatedBikes, 
          'gamification.safe_points': increment(earnedPoints) 
        };

        // Sync with legacy single bike field if the active bike is updated
        if (userDoc.exists()) {
          const activeIndex = userDoc.data().activeBikeIndex ?? 0;
          if (updatedBikes[activeIndex] && (updatedBikes[activeIndex].id === selectedBikeId || (activeIndex === 0 && selectedBikeId === 'default'))) {
            updateData.bike = updatedBikes[activeIndex];
          }
        }

        if (newBadges.length > 0) updateData['gamification.badges'] = arrayUnion(...newBadges);
        await setDoc(userDocRef, updateData, { merge: true });

        // 🛑 TRIGGER 2: KIỂM TRA QUÃNG ĐƯỜNG ĐỂ CỘNG ĐIỂM BÀO PHỐ / ĐI TOUR
        if (totalDistance < 15) {
          await recordUserStat(currentUser.uid, 'city_hunter', 1);
        } else if (totalDistance > 50) {
          await recordUserStat(currentUser.uid, 'long_tourer', 1);
        }

        setTripStats({ distance: totalDistance.toFixed(2), time: durationMinutes, speed: avgSpeed.toFixed(1), points: earnedPoints, badges: newBadges });
        setShowSummary(true);
      } catch (error) { Alert.alert("Lỗi", "Không thể lưu dữ liệu hành trình lúc này."); }
    } else {
      Alert.alert("Hành trình quá ngắn", "Chuyến đi của bạn chưa đủ quãng đường (100m) để lưu.");
      setRouteCoords([]); setTotalDistance(0); setElapsedTime('00:00');
    }
    setCurrentSpeed(0);
  };

  const closeSummary = () => { setShowSummary(false); setRouteCoords([]); setTotalDistance(0); setElapsedTime('00:00'); setSelectedBikeId(null); };

  return (
    <SafeAreaView style={styles.container}>
      
      {crashDetected && (
        <View style={styles.crashOverlay}>
          <AlertTriangle size={80} color="white" />
          <Text style={styles.crashTitle}>PHÁT HIỆN SỰ CỐ!</Text>
          <Text style={styles.crashSub}>Gửi cảnh báo khẩn cấp trong:</Text>
          <Text style={styles.countdownText}>{countdown}</Text>
          <TouchableOpacity style={styles.safeBtn} onPress={cancelCrashAlert}>
            <Text style={styles.safeBtnText}>TÔI ỔN, HỦY BÁO ĐỘNG</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={showPlaylistModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.playlistContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>BẢN TIN NHẠC</Text>
            <TouchableOpacity onPress={() => setShowPlaylistModal(false)}><X size={28} color={COLORS.textDim} /></TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.importBtn} onPress={pickSongs}>
            <PlusCircle size={20} color="white" />
            <Text style={styles.importBtnText}>Nhập file nhạc từ điện thoại</Text>
          </TouchableOpacity>
          <FlatList 
            data={playlist}
            keyExtractor={(_, index) => index.toString()}
            contentContainerStyle={{ padding: 20 }}
            renderItem={({ item, index }) => (
              <TouchableOpacity style={[styles.songItem, index === currentSongIndex && styles.activeSongItem]} onPress={() => playMusic(index)}>
                <Music size={18} color={index === currentSongIndex ? COLORS.primary : COLORS.textDim} />
                <Text style={[styles.songName, index === currentSongIndex && styles.activeSongName]} numberOfLines={1}>{item.name}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.emptyPlaylist}>Chưa có bài hát nào được chọn.</Text>}
          />
        </SafeAreaView>
      </Modal>

      {/* Summary Dialog */}
      <Modal visible={showSummary} transparent animationType="fade">
        <View style={styles.summaryOverlay}>
          <View style={styles.summaryCard}>
            <CheckCircle size={60} color={COLORS.success} style={{ marginBottom: 15 }} />
            <Text style={styles.summaryTitle}>HÀNH TRÌNH HOÀN THÀNH</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.gridItem}><Text style={styles.gridVal}>{tripStats?.distance} km</Text><Text style={styles.gridLbl}>Quãng đường</Text></View>
              <View style={styles.gridItem}><Text style={styles.gridVal}>{tripStats?.time} phút</Text><Text style={styles.gridLbl}>Thời gian</Text></View>
              <View style={styles.gridItem}><Text style={styles.gridVal}>{tripStats?.speed} km/h</Text><Text style={styles.gridLbl}>Vận tốc TB</Text></View>
              <View style={styles.gridItem}><Text style={styles.gridVal}>+{tripStats?.points}</Text><Text style={styles.gridLbl}>Điểm thưởng</Text></View>
            </View>
            {tripStats?.badges && tripStats.badges.length > 0 && (
              <View style={styles.badgesEarnedBox}>
                <Text style={styles.badgesLabel}>Huy hiệu đạt được:</Text>
                {tripStats.badges.map((b: string, i: number) => <Text key={i} style={styles.badgeTxt}>{b}</Text>)}
              </View>
            )}
            <TouchableOpacity style={styles.closeSummaryBtn} onPress={closeSummary}><Text style={styles.closeSummaryBtnTxt}>OK, QUAY LẠI GARAGE</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Multiple Bikes Selection Modal */}
      <Modal visible={showBikeSelectModal} transparent animationType="slide">
        <View style={styles.bikeSelectOverlay}>
          <View style={styles.bikeSelectCard}>
            <Text style={styles.bikeSelectTitle}>CHỌN XẾ YÊU ĐỒNG HÀNH</Text>
            <Text style={styles.bikeSelectSub}>Chọn xe bạn muốn sử dụng để ghi nhận quãng đường đi:</Text>
            <FlatList 
              data={bikes}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ gap: 10, marginVertical: 15 }}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.bikeSelectItem}
                  onPress={() => executeStartJourney(item.id)}
                >
                  <Gauge size={24} color={COLORS.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bikeSelectNick}>{item.nickname}</Text>
                    <Text style={styles.bikeSelectInfo}>{item.brand} {item.model} (ODO: {item.odo || 0} km)</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity 
              style={styles.cancelBikeSelectBtn}
              onPress={() => setShowBikeSelectModal(false)}
            >
              <Text style={styles.cancelBikeSelectBtnText}>HỦY BỎ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Main UI HUD */}
      {!isTracking ? (
        <View style={styles.lobbyContainer}>
          <MapPin size={80} color={COLORS.primary} style={{ marginBottom: 20 }} />
          <Text style={styles.lobbyTitle}>HỆ THỐNG ĐỒNG HÀNH H.U.D</Text>
          <Text style={styles.lobbyDesc}>Theo dõi hành trình thông minh, cảnh báo va chạm khẩn cấp và kết nối âm nhạc đồng hành.</Text>
          <TouchableOpacity style={styles.startBtn} onPress={handlePressStart}>
            <Play size={24} color="white" />
            <Text style={styles.startBtnText}>BẮT ĐẦU BÀO TOUR</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.hudContainer}>
          {/* HUD Speed and Info */}
          <View style={styles.hudMain}>
            <View style={styles.speedCircle}>
              <Text style={styles.speedVal}>{Math.round(currentSpeed)}</Text>
              <Text style={styles.speedUnit}>KM/H</Text>
            </View>
            <View style={styles.hudStatsRow}>
              <View style={styles.statBox}><Clock size={16} color={COLORS.hudAccent} /><Text style={styles.statVal}>{elapsedTime}</Text><Text style={styles.statLbl}>THỜI GIAN</Text></View>
              <View style={styles.statBox}><Droplet size={16} color={COLORS.hudAccent} /><Text style={styles.statVal}>{totalDistance.toFixed(2)}</Text><Text style={styles.statLbl}>KHOẢNG CÁCH</Text></View>
            </View>
          </View>

          {/* Map Section */}
          <View style={styles.mapContainer}>
            <Map routeCoords={routeCoords} />
          </View>

          {/* Music Mini Player & Controls */}
          <View style={styles.musicAndControlRow}>
            {playlist.length > 0 ? (
              <View style={styles.miniPlayer}>
                <Text style={styles.miniSongName} numberOfLines={1}>{playlist[currentSongIndex].name}</Text>
                <View style={styles.miniControls}>
                  <TouchableOpacity onPress={prevSong}><SkipBack size={20} color="white" /></TouchableOpacity>
                  <TouchableOpacity onPress={togglePlayPause} style={styles.playPauseBtn}><Text style={{color: 'black', fontSize: 10, fontWeight: 'bold'}}>{isPlaying ? 'PAUSE' : 'PLAY'}</Text></TouchableOpacity>
                  <TouchableOpacity onPress={nextSong}><SkipForward size={20} color="white" /></TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.noMusicBtn} onPress={() => setShowPlaylistModal(true)}>
                <Music size={18} color="white" />
                <Text style={styles.noMusicBtnTxt}>CHỌN NHẠC ĐỒNG HÀNH</Text>
              </TouchableOpacity>
            )}

            <View style={styles.hudControls}>
              {playlist.length > 0 && <TouchableOpacity style={styles.hudCircleBtn} onPress={() => setShowPlaylistModal(true)}><ListMusic size={20} color="white" /></TouchableOpacity>}
              <TouchableOpacity style={styles.stopBtn} onPress={stopJourney}><Square size={24} color="white" /><Text style={styles.stopBtnText}>KẾT THÚC</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  webContainer: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center', padding: 30 },
  webTitle: { color: COLORS.primary, fontSize: 22, fontWeight: '900', letterSpacing: 2, marginBottom: 10, textAlign: 'center' },
  webSub: { color: COLORS.textDim, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  lobbyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  lobbyTitle: { color: COLORS.text, fontSize: 24, fontWeight: '900', letterSpacing: 2, marginBottom: 10, textAlign: 'center' },
  lobbyDesc: { color: COLORS.textDim, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 40 },
  startBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, paddingHorizontal: 30, paddingVertical: 18, borderRadius: 30, alignItems: 'center', gap: 10, elevation: 8, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
  startBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  hudContainer: { flex: 1, justifyContent: 'space-between', padding: 20 },
  hudMain: { alignItems: 'center', marginTop: 10 },
  speedCircle: { width: 140, height: 140, borderRadius: 70, borderColor: COLORS.hudAccent, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0B0B', borderStyle: 'solid', borderWidth: 4, shadowColor: COLORS.hudAccent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 15, elevation: 10 },
  speedVal: { color: 'white', fontSize: 56, fontWeight: '900', fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace' },
  speedUnit: { color: COLORS.hudAccent, fontSize: 11, fontWeight: 'bold', letterSpacing: 2 },
  hudStatsRow: { flexDirection: 'row', justifyContent: 'center', gap: 40, marginTop: 25 },
  statBox: { alignItems: 'center' },
  statVal: { color: 'white', fontSize: 20, fontWeight: 'bold', marginVertical: 4 },
  statLbl: { color: COLORS.textDim, fontSize: 10, letterSpacing: 1 },
  mapContainer: { flex: 1, marginVertical: 20, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#222', backgroundColor: COLORS.card },
  musicAndControlRow: { gap: 15 },
  miniPlayer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0A0A0A', padding: 12, borderRadius: 15, borderWidth: 1, borderColor: '#222' },
  miniSongName: { color: 'white', fontSize: 13, fontWeight: '600', flex: 1, marginRight: 15 },
  miniControls: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  playPauseBtn: { backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  noMusicBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1A1A1A', padding: 12, borderRadius: 15, borderWidth: 1, borderColor: '#222' },
  noMusicBtnTxt: { color: 'white', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  hudControls: { flexDirection: 'row', gap: 15, alignItems: 'center' },
  hudCircleBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  stopBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#333', paddingVertical: 14, borderRadius: 25, justifyContent: 'center', alignItems: 'center', gap: 10 },
  stopBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14, letterSpacing: 2 },
  crashOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: 30 },
  crashTitle: { color: 'white', fontSize: 32, fontWeight: '900', letterSpacing: 2, marginVertical: 15 },
  crashSub: { color: 'white', fontSize: 16, opacity: 0.8 },
  countdownText: { color: 'white', fontSize: 80, fontWeight: '900', marginVertical: 20 },
  safeBtn: { backgroundColor: 'white', paddingHorizontal: 30, paddingVertical: 18, borderRadius: 30, elevation: 8 },
  safeBtnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  playlistContainer: { flex: 1, backgroundColor: COLORS.bg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#222' },
  modalTitle: { color: 'white', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  importBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, margin: 20, padding: 15, borderRadius: 15 },
  importBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  songItem: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  activeSongItem: { borderBottomColor: COLORS.primary },
  songName: { color: COLORS.textDim, fontSize: 14, flex: 1 },
  activeSongName: { color: 'white', fontWeight: 'bold' },
  emptyPlaylist: { color: COLORS.textDim, textAlign: 'center', marginTop: 40 },
  summaryOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 25 },
  summaryCard: { backgroundColor: COLORS.card, width: '100%', maxWidth: 400, padding: 30, borderRadius: 25, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  summaryTitle: { color: 'white', fontSize: 18, fontWeight: '900', letterSpacing: 2, marginBottom: 25 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', width: '100%', gap: 15, marginBottom: 25 },
  gridItem: { width: '47%', backgroundColor: '#0A0A0A', padding: 15, borderRadius: 15, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  gridVal: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  gridLbl: { color: COLORS.textDim, fontSize: 10, marginTop: 4, textTransform: 'uppercase' },
  badgesEarnedBox: { width: '100%', backgroundColor: 'rgba(227, 27, 35, 0.05)', borderWidth: 1, borderColor: 'rgba(227, 27, 35, 0.2)', padding: 15, borderRadius: 15, marginBottom: 25 },
  badgesLabel: { color: COLORS.primary, fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
  badgeTxt: { color: 'white', fontSize: 13, fontWeight: '600', marginVertical: 2 },
  closeSummaryBtn: { width: '100%', backgroundColor: COLORS.primary, paddingVertical: 15, borderRadius: 25, alignItems: 'center' },
  closeSummaryBtnTxt: { color: 'white', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
  bikeSelectOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  bikeSelectCard: { backgroundColor: COLORS.card, borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, maxHeight: height * 0.7 },
  bikeSelectTitle: { color: 'white', fontSize: 16, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  bikeSelectSub: { color: COLORS.textDim, fontSize: 12, textAlign: 'center', marginTop: 5, marginBottom: 15 },
  bikeSelectItem: { flexDirection: 'row', alignItems: 'center', gap: 15, backgroundColor: '#0B0B0B', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#222' },
  bikeSelectNick: { color: 'white', fontSize: 15, fontWeight: 'bold' },
  bikeSelectInfo: { color: COLORS.textDim, fontSize: 12, marginTop: 2 },
  cancelBikeSelectBtn: { width: '100%', backgroundColor: '#222', paddingVertical: 15, borderRadius: 25, alignItems: 'center', marginTop: 10 },
  cancelBikeSelectBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 }
});