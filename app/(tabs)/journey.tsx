import * as DocumentPicker from "expo-document-picker";
import * as Location from "expo-location";
import { Accelerometer } from "expo-sensors";
import * as SMS from "expo-sms";
import * as Speech from "expo-speech";
import * as TaskManager from "expo-task-manager";
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Droplet,
  Gauge,
  MapPin,
  Play,
  Smartphone,
  Square,
  X,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  DeviceEventEmitter,
  Dimensions,
  FlatList,
  Image,
  Modal,
  PanResponder,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Map from "../../components/Map";
import { db } from "../../firebaseConfig";
import { IBike } from "../../interfaces/bike";
import { useAppStore } from "../../store/useAppStore";

// 🛑 IMPORT HÀM CỘNG ĐIỂM HUY HIỆU
import { recordUserStat } from "../../utils/badgeHelper";

import { HIGTheme } from '../../constants/theme';

const { height } = Dimensions.get("window");
const themeColors = HIGTheme.dark; // 🔴 Bắt buộc màu đen/đỏ
const COLORS = {
  bg: themeColors.systemBackground,
  card: themeColors.secondarySystemBackground,
  primary: themeColors.systemRed,
  text: themeColors.label,
  textDim: themeColors.secondaryLabel,
  success: themeColors.systemGreen,
  warning: '#F59E0B',
  info: themeColors.systemBlue,
  hudAccent: themeColors.systemRed,
};
const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL || "https://mototune-backend.onrender.com";

const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const p = 0.017453292519943295;
  const c = Math.cos;
  const a =
    0.5 -
    c((lat2 - lat1) * p) / 2 +
    (c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))) / 2;
  return 12742 * Math.asin(Math.sqrt(a));
};


const LOCATION_TRACKING_TASK = "background-location-tracking";

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
      DeviceEventEmitter.emit("background-location-update", {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        speed: loc.coords.speed,
        timestamp: loc.timestamp,
      });
    }
  }
});


export default function JourneyScreen() {
  const currentUser = useAppStore((state) => state.currentUser);
  const bikes = useAppStore((state) => state.bikes);

  const [isTracking, setIsTracking] = useState(false);
  const [routeCoords, setRouteCoords] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState("00:00");
  const [showSummary, setShowSummary] = useState(false);
  const [tripStats, setTripStats] = useState<any>(null);

  const [crashDetected, setCrashDetected] = useState(false);
  const [countdown, setCountdown] = useState(30);

  // Multiple bikes states
  const [selectedBikeId, setSelectedBikeId] = useState<string | null>(null);
  const [showBikeSelectModal, setShowBikeSelectModal] = useState(false);

  // Draggable Map Height and Scroll states
  const [mapHeight, setMapHeight] = useState(250);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const startMapHeight = useRef(250);

  // Spotify Online Playlists States
  const locationSubscription = useRef<Location.LocationSubscription | null>(
    null,
  );
  const accelSubscription = useRef<any>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const hudTimeInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // PanResponder to track resizable map dragging
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startMapHeight.current = mapHeight;
        setScrollEnabled(false);
      },
      onPanResponderMove: (event, gestureState) => {
        const newHeight = startMapHeight.current + gestureState.dy;
        if (newHeight >= 150 && newHeight <= 600) {
          setMapHeight(newHeight);
        }
      },
      onPanResponderRelease: () => {
        setScrollEnabled(true);
      },
      onPanResponderTerminate: () => {
        setScrollEnabled(true);
      },
    }),
  ).current;

  // --- Journey Lifecycle Functions ---

  const handlePressStart = async () => {
    if (!currentUser) return Alert.alert("Lỗi", "Vui lòng đăng nhập.");
    const { status: foregroundStatus } =
      await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== "granted")
      return Alert.alert("Lỗi", "Cần quyền GPS để vẽ bản đồ.");

    const { status: backgroundStatus } =
      await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== "granted") {
      console.warn("Background location permission denied.");
    }

    if (bikes.length === 0) {
      Alert.alert(
        "Chưa có xe",
        "Vui lòng thêm xe vào Garage trước khi bắt đầu hành trình.",
      );
      return;
    }

    // Enforce bike selection
    setShowBikeSelectModal(true);
  };

  const executeStartJourney = async (bikeId: string) => {
    setShowBikeSelectModal(false);
    setSelectedBikeId(bikeId);

    const selectedBike = bikes.find((b) => b.id === bikeId);
    try {
      let speechText = `Chào Biker. Hệ thống HUD đã sẵn sàng trên xe ${selectedBike?.nickname || ""}.`;
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
      Speech.speak(speechText, { language: "vi-VN", rate: 1.1 });
    } catch (e) {
      console.log(e);
    }

    // 🛑 TRIGGER 1: KIỂM TRA THỜI GIAN ĐỂ CỘNG ĐIỂM CÚ ĐÊM / BÌNH MINH
    if (currentUser) {
      const currentHour = new Date().getHours();
      if (currentHour >= 23 || currentHour < 4) {
        await recordUserStat(currentUser.uid, "night_rider", 1);
      } else if (currentHour >= 4 && currentHour <= 6) {
        await recordUserStat(currentUser.uid, "early_bird", 1);
      }
    }


    setIsTracking(true);
    const now = Date.now();
    setStartTime(now);
    setRouteCoords([]);
    setTotalDistance(0);
    setTripStats(null);
    setElapsedTime("00:00");

    hudTimeInterval.current = setInterval(() => {
      const diffMs = Date.now() - now;
      const mins = Math.floor(diffMs / 60000)
        .toString()
        .padStart(2, "0");
      const secs = Math.floor((diffMs % 60000) / 1000)
        .toString()
        .padStart(2, "0");
      setElapsedTime(`${mins}:${secs}`);
    }, 1000);

    // Register Background location tracking task
    const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(
      LOCATION_TRACKING_TASK,
    );
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
          notificationColor: "#E31B23",
        },
        pausesUpdatesAutomatically: false,
      });
    } catch (err) {
      console.error(
        "Failed to start background location updates, fallback to foreground watch:",
        err,
      );
      // Fallback to foreground position watching
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 5,
          timeInterval: 1000,
        },
        (loc) => {
          const newCoord = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          const speedKmh =
            loc.coords.speed && loc.coords.speed > 0
              ? loc.coords.speed * 3.6
              : 0;
          setCurrentSpeed(speedKmh);

          setRouteCoords((prev) => {
            if (prev.length > 0) {
              const lastCoord = prev[prev.length - 1];
              const dist = calculateDistance(
                lastCoord.latitude,
                lastCoord.longitude,
                newCoord.latitude,
                newCoord.longitude,
              );
              setTotalDistance((d) => d + dist);
            }
            return [...prev, newCoord];
          });
        },
      );
    }

    Accelerometer.setUpdateInterval(500);
    accelSubscription.current = Accelerometer.addListener(
      (accelerometerData) => {
        const { x, y, z } = accelerometerData;
        const gForce = Math.sqrt(x * x + y * y + z * z);
        if (gForce > 4 && !crashDetected) triggerCrashProtocol();
      },
    );
  };

  const triggerCrashProtocol = () => {
    setCrashDetected(true);
    Speech.speak("Phát hiện va chạm. Đang đếm ngược để gọi khẩn cấp.", {
      language: "vi-VN",
    });
    let time = 30;
    setCountdown(time);
    countdownInterval.current = setInterval(() => {
      time -= 1;
      setCountdown(time);
      if (time <= 0) {
        clearInterval(countdownInterval.current!);
        sendEmergencyAlert();
      }
    }, 1000);
  };

  const cancelCrashAlert = () => {
    setCrashDetected(false);
    if (countdownInterval.current) clearInterval(countdownInterval.current);
    Speech.speak("Đã hủy báo động khẩn cấp.", { language: "vi-VN" });
  };

  const sendEmergencyAlert = async () => {
    setCrashDetected(false);
    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
      const mapsLink =
        routeCoords.length > 0
          ? `http://www.openstreetmap.org/?mlat=${routeCoords[routeCoords.length - 1].latitude}&mlon=${routeCoords[routeCoords.length - 1].longitude}&zoom=15`
          : `Chưa có tọa độ GPS (Chế độ Test)`;
      await SMS.sendSMSAsync(
        ["0909000000"],
        `[KHẨN CẤP] Phát hiện sự cố va chạm xe. Vị trí hiện tại: ${mapsLink}`,
      );
    } else {
      Alert.alert("Lỗi", "Thiết bị không hỗ trợ gửi SMS.");
    }
  };

  const stopJourney = async () => {
    if (!isTracking) return;

    // Stop background location updates
    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(
        LOCATION_TRACKING_TASK,
      );
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
    const avgSpeed = durationHours > 0 ? totalDistance / durationHours : 0;

    const earnedPoints = Math.floor(totalDistance * 10);
    let newBadges: string[] = [];
    if (totalDistance > 10 && avgSpeed < 50)
      newBadges.push("Tay Lái Cẩn Thận");
    if (totalDistance > 50) newBadges.push("Phượt Thủ Bền Bỉ");

    if (currentUser && totalDistance > 0.1 && selectedBikeId) {
      try {
        // Save trip to database with bikeId
        await addDoc(collection(db, "users", currentUser.uid, "trips"), {
          startTime,
          endTime,
          distance: totalDistance,
          avgSpeed,
          route: routeCoords,
          points: earnedPoints,
          bikeId: selectedBikeId,
        });

        // Update ODO of selected bike in user document array
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        let updatedBikes = [...bikes];
        if (userDoc.exists()) {
          const data = userDoc.data();
          let currentBikes = (data.bikes as IBike[]) || [];
          if (currentBikes.length === 0 && data.bike) {
            currentBikes = [{ id: "default", ...data.bike }];
          }
          updatedBikes = currentBikes.map((b) => {
            const bId = b.id || "default";
            if (bId === selectedBikeId) {
              return { ...b, odo: (b.odo || 0) + totalDistance };
            }
            return b;
          });
        }

        const updateData: any = {
          bikes: updatedBikes,
          "gamification.safe_points": increment(earnedPoints),
        };

        // Sync with legacy single bike field if the active bike is updated
        if (userDoc.exists()) {
          const activeIndex = userDoc.data().activeBikeIndex ?? 0;
          if (
            updatedBikes[activeIndex] &&
            (updatedBikes[activeIndex].id === selectedBikeId ||
              (activeIndex === 0 && selectedBikeId === "default"))
          ) {
            updateData.bike = updatedBikes[activeIndex];
          }
        }

        if (newBadges.length > 0)
          updateData["gamification.badges"] = arrayUnion(...newBadges);
        await setDoc(userDocRef, updateData, { merge: true });

        // 🛑 TRIGGER 2: KIỂM TRA QUÃNG ĐƯỜNG ĐỂ CỘNG ĐIỂM BÀO PHỐ / ĐI TOUR
        if (totalDistance < 15) {
          await recordUserStat(currentUser.uid, "city_hunter", 1);
        } else if (totalDistance > 50) {
          await recordUserStat(currentUser.uid, "long_tourer", 1);
        }

        setTripStats({
          distance: totalDistance.toFixed(2),
          time: durationMinutes,
          speed: avgSpeed.toFixed(1),
          points: earnedPoints,
          badges: newBadges,
        });
        setShowSummary(true);
      } catch (error) {
        Alert.alert("Lỗi", "Không thể lưu dữ liệu hành trình lúc này.");
      }
    } else {
      Alert.alert(
        "Hành trình quá ngắn",
        "Chuyến đi của bạn chưa đủ quãng đường (100m) để lưu.",
      );
      setRouteCoords([]);
      setTotalDistance(0);
      setElapsedTime("00:00");
    }
    setCurrentSpeed(0);
  };

  const closeSummary = () => {
    setShowSummary(false);
    setRouteCoords([]);
    setTotalDistance(0);
    setElapsedTime("00:00");
    setSelectedBikeId(null);
  };

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

      <Modal visible={showSummary} transparent animationType="fade">
        <View style={styles.summaryOverlay}>
          <View style={styles.summaryCard}>
            <CheckCircle
              size={60}
              color={COLORS.success}
              style={{ marginBottom: 15 }}
            />
            <Text style={styles.summaryTitle}>HÀNH TRÌNH HOÀN THÀNH</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.gridItem}>
                <Text style={styles.gridVal}>{tripStats?.distance} km</Text>
                <Text style={styles.gridLbl}>Quãng đường</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridVal}>{tripStats?.time} phút</Text>
                <Text style={styles.gridLbl}>Thời gian</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridVal}>{tripStats?.speed} km/h</Text>
                <Text style={styles.gridLbl}>Vận tốc TB</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridVal}>+{tripStats?.points}</Text>
                <Text style={styles.gridLbl}>Điểm thưởng</Text>
              </View>
            </View>
            {tripStats?.badges && tripStats.badges.length > 0 && (
              <View style={styles.badgesEarnedBox}>
                <Text style={styles.badgesLabel}>Huy hiệu đạt được:</Text>
                {tripStats.badges.map((b: string, i: number) => (
                  <Text key={i} style={styles.badgeTxt}>
                    {b}
                  </Text>
                ))}
              </View>
            )}
            <TouchableOpacity
              style={styles.closeSummaryBtn}
              onPress={closeSummary}
            >
              <Text style={styles.closeSummaryBtnTxt}>OK, QUAY LẠI GARAGE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Multiple Bikes Selection Modal */}
      <Modal visible={showBikeSelectModal} transparent animationType="slide">
        <View style={styles.bikeSelectOverlay}>
          <View style={styles.bikeSelectCard}>
            <Text style={styles.bikeSelectTitle}>CHỌN XẾ YÊU ĐỒNG HÀNH</Text>
            <Text style={styles.bikeSelectSub}>
              Chọn xe bạn muốn sử dụng để ghi nhận quãng đường đi:
            </Text>
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
                    <Text style={styles.bikeSelectInfo}>
                      {item.brand} {item.model} (ODO: {item.odo || 0} km)
                    </Text>
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
        <ScrollView contentContainerStyle={styles.lobbyScrollContent}>
          <MapPin
            size={80}
            color={COLORS.primary}
            style={{ marginBottom: 20, alignSelf: "center" }}
          />
          <Text style={styles.lobbyTitle}>LÁI XE CÙNG MOTOTUNE</Text>
          <Text style={styles.lobbyDesc}>
            Theo dõi hành trình thông minh, cảnh báo va chạm khẩn cấp và thêm
            danh sách phát.
          </Text>

          {/* Spotify Playlists Selection Section */}
          <TouchableOpacity
            style={[styles.startBtn, { alignSelf: "center", marginTop: 25 }]}
            onPress={handlePressStart}
          >
            <Play size={24} color="white" />
            <Text style={styles.startBtnText}>BẮT ĐẦU BÀO TOUR</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.hudScrollView}
          contentContainerStyle={styles.hudScrollContent}
          scrollEnabled={scrollEnabled}
          showsVerticalScrollIndicator={false}
        >
          {/* Map Section */}
          <View style={[styles.mapContainer, { height: mapHeight }]}>
            <Map routeCoords={routeCoords} COLORS={COLORS} />
          </View>

          {/* Resizable Drag Handle Bar */}
          <View
            style={styles.dragHandleContainer}
            {...panResponder.panHandlers}
          >
            <View style={styles.dragHandleBar} />
          </View>

          {/* HUD Speed and Info */}
          <View style={styles.hudMain}>
            <View style={styles.speedCircle}>
              <Text style={styles.speedVal}>{Math.round(currentSpeed)}</Text>
              <Text style={styles.speedUnit}>KM/H</Text>
            </View>
            <View style={styles.hudStatsRow}>
              <View style={styles.statBox}>
                <Clock size={16} color={COLORS.hudAccent} />
                <Text style={styles.statVal}>{elapsedTime}</Text>
                <Text style={styles.statLbl}>THỜI GIAN</Text>
              </View>
              <View style={styles.statBox}>
                <Droplet size={16} color={COLORS.hudAccent} />
                <Text style={styles.statVal}>{totalDistance.toFixed(2)}</Text>
                <Text style={styles.statLbl}>KHOẢNG CÁCH</Text>
              </View>
            </View>
          </View>


          {/* Controls */}
          <View style={styles.hudControls}>
            <TouchableOpacity style={styles.stopBtn} onPress={stopJourney}>
              <Square size={24} color="white" />
              <Text style={styles.stopBtnText}>KẾT THÚC</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  webContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  webTitle: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 10,
    textAlign: "center",
  },
  webSub: {
    color: COLORS.textDim,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  lobbyScrollContent: {
    padding: 30,
    justifyContent: "center",
    minHeight: "80%",
  },
  lobbyTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 10,
    textAlign: "center",
  },
  lobbyDesc: {
    color: COLORS.textDim,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 30,
  },
  startBtn: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 35,
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: "center",
    gap: 10,
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  startBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 1,
  },
  hudScrollView: { flex: 1, backgroundColor: COLORS.bg },
  hudScrollContent: { padding: 20, paddingBottom: 40 },
  hudMain: { alignItems: "center", marginTop: 20, marginBottom: 25 },
  speedCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderColor: COLORS.hudAccent,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0B0B0B",
    borderStyle: "solid",
    borderWidth: 4,
    shadowColor: COLORS.hudAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
  },
  speedVal: {
    color: "white",
    fontSize: 56,
    fontWeight: "900",
    fontFamily: Platform.OS === "ios" ? "Courier-Bold" : "monospace",
  },
  speedUnit: {
    color: COLORS.hudAccent,
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  hudStatsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 40,
    marginTop: 25,
  },
  statBox: { alignItems: "center" },
  statVal: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginVertical: 4,
  },
  statLbl: { color: COLORS.textDim, fontSize: 10, letterSpacing: 1 },
  mapContainer: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#222",
    backgroundColor: COLORS.card,
  },
  dragHandleContainer: {
    width: "100%",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#050505",
    borderBottomWidth: 1,
    borderBottomColor: "#222",
    marginBottom: 15,
  },
  dragHandleBar: {
    width: 60,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#444",
  },
  musicAndControlRow: { gap: 15 },
  miniPlayer: {
    backgroundColor: "#0A0A0A",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222",
    gap: 12,
  },
  miniPlayerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  miniSongName: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    flex: 1,
  },
  progressBarContainer: {
    width: "100%",
  },
  progressBarBackground: {
    width: "100%",
    height: 4,
    backgroundColor: "#222",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
  },
  progressTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  progressTimeText: {
    color: COLORS.textDim,
    fontSize: 10,
    fontWeight: "600",
  },
  miniControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 25,
  },
  controlIconBtn: {
    padding: 8,
  },
  playPauseBtn: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  playPauseBtnText: {
    color: "black",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  noMusicBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1A1A1A",
    padding: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#222",
  },
  noMusicBtnTxt: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  hudControls: { flexDirection: "row", gap: 15, alignItems: "center" },
  hudCircleBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#1A1A1A",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  stopBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#333",
    paddingVertical: 14,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  stopBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
    letterSpacing: 2,
  },
  crashOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    padding: 30,
  },
  crashTitle: {
    color: "white",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 2,
    marginVertical: 15,
  },
  crashSub: { color: "white", fontSize: 16, opacity: 0.8 },
  countdownText: {
    color: "white",
    fontSize: 80,
    fontWeight: "900",
    marginVertical: 20,
  },
  safeBtn: {
    backgroundColor: "white",
    paddingHorizontal: 30,
    paddingVertical: 18,
    borderRadius: 30,
    elevation: 8,
  },
  safeBtnText: {
    color: COLORS.primary,
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 1,
  },
  playlistContainer: { flex: 1, backgroundColor: COLORS.bg },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  modalTitle: {
    color: "white",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 2,
  },
  importBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    margin: 20,
    padding: 15,
    borderRadius: 15,
  },
  importBtnText: { color: "white", fontWeight: "bold", fontSize: 14 },
  songItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
  },
  activeSongItem: { borderBottomColor: COLORS.primary },
  songName: { color: COLORS.textDim, fontSize: 14, flex: 1 },
  activeSongName: { color: "white", fontWeight: "bold" },
  emptyPlaylist: { color: COLORS.textDim, textAlign: "center", marginTop: 40 },
  summaryOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },
  summaryCard: {
    backgroundColor: COLORS.card,
    width: "100%",
    maxWidth: 400,
    padding: 30,
    borderRadius: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  summaryTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 25,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
    gap: 15,
    marginBottom: 25,
  },
  gridItem: {
    width: "47%",
    backgroundColor: "#0A0A0A",
    padding: 15,
    borderRadius: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222",
  },
  gridVal: { color: "white", fontSize: 18, fontWeight: "bold" },
  gridLbl: {
    color: COLORS.textDim,
    fontSize: 10,
    marginTop: 4,
    textTransform: "uppercase",
  },
  badgesEarnedBox: {
    width: "100%",
    backgroundColor: "rgba(227, 27, 35, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(227, 27, 35, 0.2)",
    padding: 15,
    borderRadius: 15,
    marginBottom: 25,
  },
  badgesLabel: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  badgeTxt: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
    marginVertical: 2,
  },
  closeSummaryBtn: {
    width: "100%",
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
  },
  closeSummaryBtnTxt: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
    letterSpacing: 1,
  },
  bikeSelectOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  bikeSelectCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
    maxHeight: height * 0.7,
  },
  bikeSelectTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 2,
    textAlign: "center",
  },
  bikeSelectSub: {
    color: COLORS.textDim,
    fontSize: 12,
    textAlign: "center",
    marginTop: 5,
    marginBottom: 15,
  },
  bikeSelectItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    backgroundColor: "#0B0B0B",
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#222",
  },
  bikeSelectNick: { color: "white", fontSize: 15, fontWeight: "bold" },
  bikeSelectInfo: { color: COLORS.textDim, fontSize: 12, marginTop: 2 },
  cancelBikeSelectBtn: {
    width: "100%",
    backgroundColor: "#222",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 10,
  },
  cancelBikeSelectBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
    letterSpacing: 1,
  },

  // Lobby Spotify Playlists Styles
  lobbyPlaylistSection: { width: "100%", marginTop: 10 },
  lobbyPlaylistHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  lobbyPlaylistTitle: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  createPlaylistBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "#1C1C1E",
    borderWidth: 1,
    borderColor: "#2C2C2E",
  },
  createPlaylistBtnText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "bold",
  },
  playlistCard: {
    width: 140,
    backgroundColor: COLORS.card,
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#222",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  selectedPlaylistCard: { backgroundColor: "white", borderColor: "white" },
  playlistCardName: {
    color: "white",
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 8,
    width: "100%",
  },
  selectedPlaylistCardName: { color: "black" },
  playlistCardTracks: { color: COLORS.textDim, fontSize: 11, marginTop: 4 },
  selectedPlaylistCardTracks: { color: "#666" },
  emptyPlaylists: {
    color: COLORS.textDim,
    fontSize: 12,
    textAlign: "center",
    marginVertical: 15,
    lineHeight: 20,
  },

  // Prompt Modal Styles
  promptOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },
  promptCard: {
    backgroundColor: COLORS.card,
    width: "100%",
    maxWidth: 350,
    padding: 25,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  promptTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 10,
  },
  promptSubtitle: { color: COLORS.textDim, fontSize: 13, marginBottom: 15 },
  promptInput: {
    backgroundColor: "#0A0A0A",
    color: "white",
    borderWidth: 1,
    borderColor: "#222",
    padding: 12,
    borderRadius: 10,
    fontSize: 14,
    marginBottom: 20,
  },
  promptActions: { flexDirection: "row", justifyContent: "flex-end", gap: 15 },
  promptCancelBtn: { padding: 10 },
  promptCancelBtnText: {
    color: COLORS.textDim,
    fontWeight: "bold",
    fontSize: 14,
  },
  promptConfirmBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
  },
  promptConfirmBtnText: { color: "white", fontWeight: "bold", fontSize: 14 },

  // Editor Modal Styles
  editorContainer: { flex: 1, backgroundColor: COLORS.bg },
  selectedTracksBox: {
    backgroundColor: "#0F0F0F",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  selectedLabel: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 8,
  },
  trackTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#222",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  trackTagText: { color: "white", fontSize: 12, fontWeight: "600" },
  emptySelectedText: {
    color: COLORS.textDim,
    fontSize: 12,
    fontStyle: "italic",
    paddingVertical: 5,
  },
  searchBarBox: {
    flexDirection: "row",
    padding: 15,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#0F0F0F",
    color: "white",
    borderWidth: 1,
    borderColor: "#222",
    padding: 12,
    borderRadius: 15,
    fontSize: 14,
  },
  searchBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    justifyContent: "center",
    borderRadius: 15,
  },
  searchBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
    letterSpacing: 1,
  },
  searchResultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  searchCover: { width: 50, height: 50, borderRadius: 8, marginRight: 15 },
  searchCoverContainer: { position: "relative", marginRight: 15 },
  previewLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  searchTrackName: { color: "white", fontSize: 16, fontWeight: "bold" },
  searchArtistName: { color: COLORS.textDim, fontSize: 12, marginTop: 2 },
  trackAddBtn: {
    backgroundColor: "#1A1A1A",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#333",
  },
  trackAddedBtn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  trackAddBtnTxt: { color: "white", fontSize: 11, fontWeight: "bold" },
  emptySearchText: {
    color: COLORS.textDim,
    textAlign: "center",
    marginTop: 40,
    paddingHorizontal: 30,
    lineHeight: 22,
    fontSize: 13,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    margin: 20,
    borderRadius: 25,
    alignItems: "center",
    elevation: 5,
  },
  saveBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
    letterSpacing: 2,
  },
});
