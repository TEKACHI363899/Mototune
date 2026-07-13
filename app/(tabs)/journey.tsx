import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import { Accelerometer } from 'expo-sensors';
import * as SMS from 'expo-sms';
import * as Speech from 'expo-speech';
import { addDoc, arrayUnion, collection, doc, getDoc, increment, setDoc } from 'firebase/firestore';
import { AlertTriangle, CheckCircle, Clock, Droplet, Gauge, ListMusic, MapPin, Music, Pause, Play, PlusCircle, Settings, ShieldCheck, SkipBack, SkipForward, Smartphone, Square, Trash2 } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, FlatList, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Map from '../../components/Map';
import { db } from '../../firebaseConfig';
import { IBike } from '../../interfaces/bike';
import { useAppStore } from '../../store/useAppStore';

// 🛑 IMPORT HÀM CỘNG ĐIỂM HUY HIỆU
import { recordUserStat } from '../../utils/badgeHelper';

const { width, height } = Dimensions.get('window');
const COLORS = { bg: '#000000', card: '#121212', primary: '#E31B23', text: '#FFFFFF', textDim: '#A0A0A0', success: '#4ADE80', warning: '#F59E0B', info: '#3B82F6', hudAccent: '#FF4500' };

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const p = 0.017453292519943295;    
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p)/2 + c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))/2;
  return 12742 * Math.asin(Math.sqrt(a)); 
};

type LocalSong = { uri: string; name: string };

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

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.webContainer}>
        <Smartphone size={100} color={COLORS.primary} style={{ marginBottom: 20 }} />
        <Text style={styles.webTitle}>TÍNH NĂNG ĐỘC QUYỀN MOBILE</Text>
        <Text style={styles.webSub}>Hành trình thông minh yêu cầu phần cứng thiết bị. Vui lòng mở ứng dụng MotoTune trên điện thoại!</Text>
      </SafeAreaView>
    );
  }

  const pickMusicFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true, multiple: true });
      if (!result.canceled && result.assets) {
        const newSongs = result.assets.map(asset => ({ uri: asset.uri, name: asset.name }));
        setPlaylist(prev => [...prev, ...newSongs]);
      }
    } catch (error) { Alert.alert('Lỗi', 'Không thể tải nhạc.'); }
  };

  const removeSong = (index: number) => {
    if (index === currentSongIndex) { stopMusic(); }
    setPlaylist(prev => prev.filter((_, i) => i !== index));
    if (index < currentSongIndex) { setCurrentSongIndex(prev => prev - 1); }
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
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return Alert.alert("Lỗi", "Cần quyền GPS để vẽ bản đồ.");

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
          <View style={styles.playlistHeader}>
            <ListMusic size={24} color={COLORS.primary} />
            <Text style={styles.playlistTitle}>DANH SÁCH NHẠC</Text>
            <TouchableOpacity onPress={() => setShowPlaylistModal(false)} style={{marginLeft: 'auto'}}><Text style={{color: COLORS.primary, fontWeight: 'bold'}}>Đóng</Text></TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.addMusicBtn} onPress={pickMusicFiles}>
            <PlusCircle size={20} color="white" />
            <Text style={{color: 'white', fontWeight: 'bold'}}>THÊM FILE NHẠC TỪ MÁY (.MP3)</Text>
          </TouchableOpacity>
          <FlatList
            data={playlist} keyExtractor={(item, index) => index.toString()}
            ListEmptyComponent={<Text style={{color: COLORS.textDim, textAlign: 'center', marginTop: 40}}>Chưa có bài hát nào trong Playlist.</Text>}
            renderItem={({ item, index }) => (
              <View style={[styles.songItem, currentSongIndex === index && styles.songItemActive]}>
                <TouchableOpacity style={{flex: 1, flexDirection: 'row', alignItems: 'center'}} onPress={() => playMusic(index)}>
                  {currentSongIndex === index && isPlaying ? <Play size={16} color={COLORS.hudAccent} style={{marginRight: 10}} /> : <Music size={16} color={COLORS.textDim} style={{marginRight: 10}} />}
                  <Text style={[styles.songName, currentSongIndex === index && {color: COLORS.hudAccent}]} numberOfLines={1}>{item.name}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeSong(index)} style={{padding: 10}}><Trash2 size={20} color="#EF4444" /></TouchableOpacity>
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>

      <Modal visible={showSummary} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.summaryContainer}>
          <View style={styles.summaryHeader}><CheckCircle size={30} color={COLORS.success} /><Text style={styles.summaryTitle}>TỔNG KẾT CHUYẾN ĐI</Text></View>
          <ScrollView style={styles.summaryBody} showsVerticalScrollIndicator={false}>
            <View style={styles.summaryMapBox}><Map routeCoords={routeCoords} COLORS={COLORS} /></View>
            <View style={styles.statsRow}>
              <View style={styles.summaryStat}><MapPin size={20} color={COLORS.primary} /><Text style={styles.sStatValue}>{tripStats?.distance} <Text style={styles.sStatUnit}>km</Text></Text><Text style={styles.sStatLabel}>Quãng đường</Text></View>
              <View style={styles.summaryStat}><Clock size={20} color={COLORS.info} /><Text style={styles.sStatValue}>{tripStats?.time} <Text style={styles.sStatUnit}>phút</Text></Text><Text style={styles.sStatLabel}>Thời gian</Text></View>
              <View style={styles.summaryStat}><Gauge size={20} color={COLORS.warning} /><Text style={styles.sStatValue}>{tripStats?.speed} <Text style={styles.sStatUnit}>km/h</Text></Text><Text style={styles.sStatLabel}>Tốc độ TB</Text></View>
            </View>
            <Text style={styles.sectionTitle}>SỨC KHỎE XE BỊ TRỪ HAO</Text>
            <View style={styles.maintenanceBox}>
              <View style={styles.maintItem}><Droplet size={20} color={COLORS.textDim} /><Text style={styles.maintText}>Nhớt máy</Text><Text style={styles.maintMinus}>-{tripStats?.distance} km</Text></View>
              <View style={styles.maintItem}><Settings size={20} color={COLORS.textDim} /><Text style={styles.maintText}>Nhông sên dĩa</Text><Text style={styles.maintMinus}>-{tripStats?.distance} km</Text></View>
            </View>
            <Text style={styles.sectionTitle}>THÀNH TÍCH AN TOÀN</Text>
            <View style={styles.gamificationBox}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15}}><ShieldCheck size={28} color={COLORS.success} /><View><Text style={{color: COLORS.text, fontSize: 16, fontWeight: 'bold'}}>Điểm an toàn nhận được</Text><Text style={{color: COLORS.success, fontSize: 24, fontWeight: '900'}}>+{tripStats?.points} EXP</Text></View></View>
            </View>
          </ScrollView>
          <View style={styles.summaryFooter}><TouchableOpacity style={styles.closeSummaryBtn} onPress={closeSummary}><Text style={{color: 'white', fontWeight: 'bold', fontSize: 16}}>HOÀN TẤT</Text></TouchableOpacity></View>
        </SafeAreaView>
      </Modal>

      {/* Bike Selection Modal */}
      <Modal visible={showBikeSelectModal} animationType="slide" transparent>
        <View style={styles.bikeSelectOverlay}>
          <View style={styles.bikeSelectBox}>
            <View style={styles.bikeSelectHeader}>
              <Text style={styles.bikeSelectTitle}>CHỌN XE SỬ DỤNG</Text>
              <TouchableOpacity onPress={() => setShowBikeSelectModal(false)}>
                <Text style={{color: COLORS.primary, fontWeight: 'bold'}}>Hủy</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.bikeSelectSub}>
              Vui lòng chọn chiếc xe bạn sẽ sử dụng cho hành trình này để ghi nhận hành trình và ODO chính xác:
            </Text>
            <FlatList
              data={bikes}
              keyExtractor={(item, index) => item.id || index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.bikeSelectItem}
                  onPress={() => executeStartJourney(item.id)}
                >
                  <Text style={styles.bikeSelectName}>{item.nickname}</Text>
                  <Text style={styles.bikeSelectDesc}>{item.brand} {item.model} • ODO: {Math.floor(item.odo || 0)} km</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <View style={styles.mapContainer}>
        {routeCoords.length > 0 ? (
          <Map routeCoords={routeCoords} COLORS={COLORS} />
        ) : (
          <View style={styles.mapPlaceholder}><MapPin size={40} color={COLORS.textDim} /><Text style={{color: COLORS.textDim, marginTop: 10}}>Bản đồ GPS đang chờ tín hiệu...</Text></View>
        )}
      </View>

      <View style={styles.hudPanel}>
        <View style={styles.hudTopRow}>
          <View style={styles.hudBox}>
            <Text style={styles.hudLabel}>THỜI GIAN</Text>
            <Text style={styles.hudValueSmall}>{elapsedTime}</Text>
          </View>
          <View style={styles.hudBox}>
            <Text style={styles.hudLabel}>QUÃNG ĐƯỜNG</Text>
            <Text style={styles.hudValueSmall}>{totalDistance.toFixed(1)} <Text style={{fontSize: 16}}>km</Text></Text>
          </View>
        </View>
        <View style={styles.speedoBox}>
          <Text style={styles.speedoValue}>{currentSpeed.toFixed(0)}</Text>
          <Text style={styles.speedoLabel}>KM/H</Text>
        </View>
      </View>

      <View style={styles.controlPanel}>
        <View style={styles.musicPlayerPanel}>
          <TouchableOpacity style={styles.playlistBtn} onPress={() => setShowPlaylistModal(true)}><ListMusic size={22} color={COLORS.primary} /></TouchableOpacity>
          <View style={styles.musicControls}>
            <TouchableOpacity onPress={prevSong} style={styles.musicCtrlBtn}><SkipBack size={24} color="white" fill="white" /></TouchableOpacity>
            <TouchableOpacity onPress={togglePlayPause} style={[styles.musicCtrlBtn, {backgroundColor: COLORS.primary, width: 50, height: 50, borderRadius: 25}]}>
              {isPlaying ? <Pause size={24} color="white" fill="white" /> : <Play size={24} color="white" fill="white" style={{marginLeft: 4}}/>}
            </TouchableOpacity>
            <TouchableOpacity onPress={nextSong} style={styles.musicCtrlBtn}><SkipForward size={24} color="white" fill="white" /></TouchableOpacity>
          </View>
        </View>

        {!isTracking ? (
          <TouchableOpacity style={styles.startBtn} onPress={handlePressStart}>
            <Play size={24} color="white" fill="white" />
            <Text style={styles.btnText}>BẮT ĐẦU HÀNH TRÌNH</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.stopBtn} onPress={stopJourney}>
            <Square size={24} color="white" fill="white" />
            <Text style={styles.btnText}>KẾT THÚC HÀNH TRÌNH</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.testSosBtn} onPress={triggerCrashProtocol}>
          <AlertTriangle size={20} color={COLORS.primary} />
          <Text style={{color: COLORS.primary, fontWeight: 'bold', fontSize: 16}}>TEST CẢNH BÁO SỰ CỐ</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  webContainer: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center', padding: 40 },
  webTitle: { color: COLORS.text, fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 15 },
  webSub: { color: COLORS.textDim, fontSize: 16, textAlign: 'center', lineHeight: 24 },
  mapContainer: { flex: 1, backgroundColor: '#111', borderBottomWidth: 2, borderBottomColor: COLORS.hudAccent },
  mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hudPanel: { backgroundColor: '#0A0A0A', padding: 20, alignItems: 'center' },
  hudTopRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 20 },
  hudBox: { alignItems: 'center' },
  hudLabel: { color: COLORS.hudAccent, fontSize: 12, fontWeight: '900', letterSpacing: 2, opacity: 0.8 },
  hudValueSmall: { color: 'white', fontSize: 32, fontWeight: '900', fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace' },
  speedoBox: { alignItems: 'center', justifyContent: 'center', width: 200, height: 200, borderRadius: 100, borderWidth: 4, borderColor: '#222', borderTopColor: COLORS.hudAccent },
  speedoValue: { color: COLORS.hudAccent, fontSize: 85, fontWeight: '900', fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace', height: 95 },
  speedoLabel: { color: '#666', fontSize: 18, fontWeight: '900', letterSpacing: 4 },
  controlPanel: { padding: 20, backgroundColor: COLORS.bg, paddingBottom: Platform.OS === 'ios' ? 30 : 20 },
  musicPlayerPanel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1A1A1A', padding: 15, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: '#333' },
  playlistBtn: { padding: 10, backgroundColor: 'rgba(227, 27, 35, 0.1)', borderRadius: 12 },
  musicControls: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  musicCtrlBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  startBtn: { backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, borderRadius: 15, gap: 10 },
  stopBtn: { backgroundColor: '#1A1A1A', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, borderRadius: 15, gap: 10, borderWidth: 2, borderColor: '#333' },
  btnText: { color: 'white', fontWeight: '900', fontSize: 18, letterSpacing: 1 },
  
  testSosBtn: { marginTop: 15, backgroundColor: 'rgba(227, 27, 35, 0.1)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 15, gap: 10, borderWidth: 1, borderColor: COLORS.primary },

  playlistContainer: { flex: 1, backgroundColor: COLORS.bg },
  playlistHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#333', gap: 10 },
  playlistTitle: { color: 'white', fontWeight: '900', fontSize: 18, letterSpacing: 1 },
  addMusicBtn: { backgroundColor: '#222', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, margin: 20, borderRadius: 12, gap: 10, borderWidth: 1, borderColor: '#444' },
  songItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#222' },
  songItemActive: { backgroundColor: 'rgba(255, 69, 0, 0.1)' },
  songName: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  crashOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(227, 27, 35, 0.95)', zIndex: 100, justifyContent: 'center', alignItems: 'center', padding: 20 },
  crashTitle: { color: 'white', fontSize: 30, fontWeight: '900', marginTop: 20 },
  crashSub: { color: 'white', fontSize: 16, marginTop: 10 },
  countdownText: { color: 'white', fontSize: 100, fontWeight: '900', marginTop: 20 },
  safeBtn: { backgroundColor: '#111', paddingHorizontal: 40, paddingVertical: 20, borderRadius: 30, marginTop: 40, borderWidth: 2, borderColor: 'white' },
  safeBtnText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  summaryContainer: { flex: 1, backgroundColor: COLORS.bg },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#333', gap: 10 },
  summaryTitle: { color: COLORS.success, fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  summaryBody: { flex: 1, padding: 20 },
  summaryMapBox: { height: 200, borderRadius: 15, overflow: 'hidden', borderWidth: 1, borderColor: '#333', marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 25 },
  summaryStat: { flex: 1, backgroundColor: COLORS.card, padding: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  sStatValue: { color: COLORS.text, fontSize: 20, fontWeight: '900', marginTop: 8 },
  sStatUnit: { fontSize: 12, color: COLORS.textDim, fontWeight: 'normal' },
  sStatLabel: { color: COLORS.textDim, fontSize: 12, marginTop: 4 },
  sectionTitle: { color: COLORS.textDim, fontSize: 14, fontWeight: 'bold', marginBottom: 10, letterSpacing: 1 },
  maintenanceBox: { backgroundColor: COLORS.card, borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#333', marginBottom: 25 },
  maintItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#333' },
  maintText: { color: COLORS.text, flex: 1, marginLeft: 15, fontSize: 15 },
  maintMinus: { color: COLORS.primary, fontWeight: 'bold' },
  gamificationBox: { backgroundColor: 'rgba(74, 222, 128, 0.1)', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: 'rgba(74, 222, 128, 0.3)', marginBottom: 40 },
  summaryFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#333', backgroundColor: COLORS.bg },
  closeSummaryBtn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 30, alignItems: 'center' },
  
  bikeSelectOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  bikeSelectBox: { backgroundColor: COLORS.card, borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, maxHeight: '80%', borderWidth: 1, borderColor: '#333' },
  bikeSelectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  bikeSelectTitle: { color: 'white', fontWeight: '900', fontSize: 18, letterSpacing: 1 },
  bikeSelectSub: { color: COLORS.textDim, fontSize: 14, marginBottom: 20 },
  bikeSelectItem: { backgroundColor: '#1A1A1A', padding: 15, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  bikeSelectName: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  bikeSelectDesc: { color: COLORS.textDim, fontSize: 12, marginTop: 4 }
});