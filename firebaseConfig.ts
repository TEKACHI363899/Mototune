import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);

// Kích hoạt bộ nhớ đệm lưu trữ ngoại tuyến (Offline Persistence Cache)
// Hỗ trợ lưu trữ cục bộ trên cả Web (IndexedDB) và Native (SQLite/AsyncStorage)
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: Platform.OS === 'web' ? persistentMultipleTabManager() : undefined
  })
});

let auth: any;

if (Platform.OS === 'web') {
  // Trình duyệt Web tự động lưu đăng nhập rất mượt qua bộ nhớ của trình duyệt
  auth = getAuth(app);
} else {
  // Tránh lỗi Metro Crash bằng cách gọi module động ở thời gian thực
  const authModule = require('firebase/auth');
  
  // Kiểm tra kỹ xem hàm có tồn tại không trước khi gọi
  if (typeof authModule.getReactNativePersistence === 'function') {
    auth = initializeAuth(app, {
      persistence: authModule.getReactNativePersistence(AsyncStorage)
    });
  } else {
    auth = getAuth(app);
  }
}

export { auth, db };
