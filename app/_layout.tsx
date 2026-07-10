import { Stack, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { Bike } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import { auth } from '../firebaseConfig';

const { width } = Dimensions.get('window');

export default function RootLayout() {
  // Trạng thái hệ thống ngầm
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // Trạng thái màn hình chờ (Splash Screen)
  const [appReady, setAppReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("Khởi động hệ thống...");

  const router = useRouter();
  const segments = useSegments();

  // 1. Lắng nghe Firebase Auth
  useEffect(() => {
    const subscriber = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setInitializing(false);
    });
    return subscriber;
  }, []);

  // 2. Chạy thanh tiến trình giả lập (Khoảng 1.5 giây để hiển thị đủ thông báo)
  useEffect(() => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 5) + 3; // Tăng ngẫu nhiên từ 3-7%
      if (currentProgress > 100) currentProgress = 100;
      
      setProgress(currentProgress);

      // Cập nhật thông báo theo từng giai đoạn
      if (currentProgress >= 15 && currentProgress < 40) setLoadingText("Kiểm tra kết nối cơ sở dữ liệu...");
      else if (currentProgress >= 40 && currentProgress < 70) setLoadingText("Đồng bộ hóa dữ liệu Garage & Y bạ...");
      else if (currentProgress >= 70 && currentProgress < 95) setLoadingText("Tải cấu hình Trợ lý A.I...");
      else if (currentProgress === 100) setLoadingText("Hệ thống sẵn sàng.");

      if (currentProgress === 100) {
        clearInterval(interval);
      }
    }, 60);

    return () => clearInterval(interval);
  }, []);

  // 3. Mở khóa ứng dụng khi cả Firebase và thanh tiến trình đều xong 100%
  useEffect(() => {
    if (!initializing && progress >= 100) {
      // Dừng lại 0.3s ở 100% cho người dùng đọc chữ "Hệ thống sẵn sàng" rồi mới tắt
    const timeout = setTimeout(() => {
        setAppReady(true);
      }, 2000); // Kéo dài thời gian hiển thị 100% thêm 2 giây để app load ngầm
      return () => clearTimeout(timeout);
    }
  }, [initializing, progress]);

  // 4. Điều hướng sau khi App đã sẵn sàng
  useEffect(() => {
    if (!appReady) return;
    const inAuthGroup = segments[0] === 'login';

    if (!user && !inAuthGroup) {
      router.replace('/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, appReady, segments]);

  // 🛑 GIAO DIỆN MÀN HÌNH CHỜ (SPLASH SCREEN)
  if (!appReady) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.logoWrapper}>
          <Bike size={60} color="#E31B23" strokeWidth={1.5} />
          <Text style={styles.brandName}>MOTOTUNE</Text>
          <Text style={styles.brandSlogan}>Hệ Sinh Thái Chăm Sóc Xe Thông Minh</Text>
        </View>

        <View style={styles.loadingBox}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusText}>{loadingText}</Text>
            <Text style={styles.percentageText}>{progress}%</Text>
          </View>
        </View>
      </View>
    );
  }

  // 🛑 GIAO DIỆN ỨNG DỤNG CHÍNH
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profile" options={{ presentation: 'modal' }} /> 
      {/* 2 Trang mới cho Mạng xã hội */}
      <Stack.Screen name="create-post" options={{ presentation: 'modal' }} />
      <Stack.Screen name="post/[id]" options={{ presentation: 'card' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#050505', // Đen tuyền sang trọng
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 80,
  },
  brandName: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 4,
    marginTop: 15,
  },
  brandSlogan: {
    color: '#A0A0A0',
    fontSize: 12,
    letterSpacing: 1,
    marginTop: 5,
    textTransform: 'uppercase',
  },
  loadingBox: {
    position: 'absolute',
    bottom: 80,
    width: width * 0.8, // Chiếm 80% chiều rộng màn hình
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#1A1A1A',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E31B23', // Đỏ đặc trưng của MotoTune
    borderRadius: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  statusText: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '600',
  },
  percentageText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  }
});