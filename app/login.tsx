import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, signInAnonymously, signInWithEmailAndPassword } from 'firebase/auth';
import { ArrowLeft, Bike, ChevronRight, Mail } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert, // 🛑 Bổ sung để vuốt được khi bàn phím che
  Keyboard // 🛑 Bổ sung để đóng bàn phím khi chạm ra ngoài
  ,
  KeyboardAvoidingView, // 🛑 Bổ sung
  Platform,
  SafeAreaView, // 🛑 Bổ sung
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth } from '../firebaseConfig';

const COLORS = {
  bg: '#121212', card: '#1E1E1E', primary: '#E31B23', text: '#FFFFFF', textDim: '#A0A0A0'
};

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [isEmailMode, setIsEmailMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focusedInput, setFocusedInput] = useState('');

  const handleAnonymousLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (error: any) {
      Alert.alert("Lỗi hệ thống", error.message);
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    Keyboard.dismiss(); // Tắt bàn phím khi bấm đăng nhập
    if (!email || !password) return Alert.alert("Cảnh báo", "Vui lòng nhập đầy đủ Email và Mật khẩu");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      Alert.alert("Lỗi đăng nhập", "Tài khoản không đúng hoặc không tồn tại.");
      setLoading(false);
    }
  };

  const handleEmailRegister = async () => {
    Keyboard.dismiss(); // Tắt bàn phím khi bấm đăng ký
    if (!email || !password) return Alert.alert("Cảnh báo", "Vui lòng nhập đầy đủ Email và Mật khẩu");
    if (password.length < 6) return Alert.alert("Cảnh báo", "Mật khẩu phải có ít nhất 6 ký tự");
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      Alert.alert("Lỗi đăng ký", error.message);
      setLoading(false);
    }
  };

  // --- GIAO DIỆN NHẬP EMAIL ---
  if (isEmailMode) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
        
        <TouchableOpacity style={[styles.backBtn, { marginHorizontal: 30 }]} onPress={() => setIsEmailMode(false)}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>

        {/* 🛑 HỆ THỐNG CHỐNG BÀN PHÍM CHE KHUẤT */}
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* 🛑 ScrollView cho phép người dùng lướt màn hình lên xuống nếu bàn phím vẫn lấp */}
          <ScrollView 
            contentContainerStyle={styles.scrollFormContainer} 
            keyboardShouldPersistTaps="handled" // Cho phép bấm nút Đăng nhập mà ko bị mất focus đột ngột
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>TÀI KHOẢN MOTO<Text style={{color: COLORS.primary}}>TUNE</Text></Text>
            <Text style={styles.subTitle}>Sử dụng email để lưu trữ thông tin xe và đồng bộ lên đám mây.</Text>

            <View style={{ marginTop: 30, gap: 15 }}>
              <TextInput
                style={[styles.input, focusedInput === 'email' && styles.inputFocused]}
                placeholder="Địa chỉ Email"
                placeholderTextColor="#666"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput('')}
                returnKeyType="next" // Đổi nút Enter trên bàn phím thành "Tiếp theo"
              />

              <TextInput
                style={[styles.input, focusedInput === 'password' && styles.inputFocused]}
                placeholder="Mật khẩu (Ít nhất 6 ký tự)"
                placeholderTextColor="#666"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput('')}
                returnKeyType="done"
              />
            </View>

            <View style={{ marginTop: 30, gap: 15 }}>
              <TouchableOpacity style={styles.btnPrimary} onPress={handleEmailLogin} disabled={loading}>
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnPrimaryText}>ĐĂNG NHẬP</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.btnSecondary} onPress={handleEmailRegister} disabled={loading}>
                <Text style={styles.btnSecondaryText}>TẠO TÀI KHOẢN MỚI</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // --- GIAO DIỆN CHÍNH (WELCOME) ---
  return (
    <SafeAreaView style={[styles.container, { padding: 30 }]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      
      <View style={styles.logoContainer}>
        <Bike size={80} color={COLORS.primary} style={{ marginBottom: 20 }} />
        <Text style={styles.logoText}>MOTO<Text style={{color: COLORS.primary}}>TUNE</Text></Text>
        <Text style={styles.subText}>Cộng đồng Biker Việt Nam</Text>
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.btnPrimary} onPress={handleAnonymousLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : (
            <>
              <Text style={styles.btnPrimaryText}>TRẢI NGHIỆM NGAY</Text>
              <ChevronRight size={20} color="white" />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnSecondary} onPress={() => { Haptics.selectionAsync(); setIsEmailMode(true); }}>
          <Mail size={20} color={COLORS.text} />
          <Text style={styles.btnSecondaryText}>Đăng nhập bằng Email / Google</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  logoContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logoText: { fontSize: 42, fontWeight: '900', fontStyle: 'italic', color: COLORS.text, letterSpacing: 2 },
  subText: { color: COLORS.textDim, fontSize: 14, marginTop: 10, letterSpacing: 1 },
  actionContainer: { paddingBottom: 50, gap: 15 },
  
  btnPrimary: { flexDirection: 'row', backgroundColor: COLORS.primary, padding: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  btnPrimaryText: { color: 'white', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  btnSecondary: { flexDirection: 'row', backgroundColor: COLORS.card, padding: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: '#333' },
  btnSecondaryText: { color: COLORS.text, fontSize: 14, fontWeight: 'bold' },

  backBtn: { marginTop: 10, alignSelf: 'flex-start', padding: 10, backgroundColor: COLORS.card, borderRadius: 12 },
  
  // 🛑 Căn chỉnh lại Form chứa Email/Password để ScrollView chạy mượt
  scrollFormContainer: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 30, paddingBottom: 50, paddingTop: 20 },
  
  title: { fontSize: 28, fontWeight: '900', color: COLORS.text, fontStyle: 'italic' },
  subTitle: { color: COLORS.textDim, fontSize: 14, marginTop: 10, lineHeight: 22 },
  input: { backgroundColor: '#222', color: 'white', padding: 20, borderRadius: 12, fontSize: 16, borderWidth: 2, borderColor: '#333' },
  inputFocused: { borderColor: COLORS.primary, backgroundColor: '#2a1a1a' }
});