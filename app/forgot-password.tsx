import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { HIGTheme, HIGTouchTarget } from '../constants/theme';
import { useColorScheme } from 'react-native';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "https://mototune-backend.onrender.com";
const API_KEY = process.env.EXPO_PUBLIC_MOTO_TUNE_API_KEY || ""; // Setup as needed

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const theme = useColorScheme();
  const colors = theme === 'dark' ? HIGTheme.dark : HIGTheme.dark; // Force dark theme as per app design

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [focusedInput, setFocusedInput] = useState('');

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY, // Matches our backend requireApiKey
  };

  const handleRequestOtp = async () => {
    Keyboard.dismiss();
    if (!email) {
      Alert.alert("Lỗi", "Vui lòng nhập email của bạn.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/request-reset`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: email.toLowerCase() }),
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || "Có lỗi xảy ra");

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep(2);
    } catch (error: any) {
      Alert.alert("Lỗi", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    Keyboard.dismiss();
    if (!otp || otp.length !== 6) {
      Alert.alert("Lỗi", "Vui lòng nhập đúng mã OTP 6 số.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: email.toLowerCase(), otp }),
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || "Mã OTP không hợp lệ");

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep(3);
    } catch (error: any) {
      Alert.alert("Lỗi", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    Keyboard.dismiss();
    if (newPassword.length < 6) {
      Alert.alert("Lỗi", "Mật khẩu phải dài ít nhất 6 ký tự.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: email.toLowerCase(), otp, newPassword }),
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || "Đổi mật khẩu thất bại");

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep(4); // Success step
    } catch (error: any) {
      Alert.alert("Lỗi", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.systemBackground }]}>
      <TouchableOpacity 
        style={[styles.backBtn, { marginHorizontal: 30, backgroundColor: colors.secondarySystemBackground }]} 
        onPress={() => router.back()}
      >
        <ArrowLeft size={24} color={colors.label} />
      </TouchableOpacity>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollFormContainer} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 1 && (
            <View>
              <Text style={[styles.title, { color: colors.label }]}>QUÊN MẬT KHẨU</Text>
              <Text style={[styles.subTitle, { color: colors.secondaryLabel }]}>
                Nhập email của bạn. Chúng tôi sẽ gửi một mã số xác nhận gồm 6 chữ số để đặt lại mật khẩu.
              </Text>

              <View style={{ marginTop: 30, gap: 15 }}>
                <TextInput
                  style={[
                    styles.input, 
                    { backgroundColor: colors.secondarySystemBackground, color: colors.label, borderColor: colors.separator },
                    focusedInput === 'email' && { borderColor: colors.systemRed }
                  ]}
                  placeholder="Địa chỉ Email"
                  placeholderTextColor={colors.secondaryLabel}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput('')}
                />
                <TouchableOpacity 
                  style={[styles.btnPrimary, { backgroundColor: colors.systemRed }]} 
                  onPress={handleRequestOtp} 
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnPrimaryText}>GỬI MÃ XÁC NHẬN</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={[styles.title, { color: colors.label }]}>XÁC NHẬN MÃ OTP</Text>
              <Text style={[styles.subTitle, { color: colors.secondaryLabel }]}>
                Mã xác nhận 6 số đã được gửi tới email <Text style={{color: colors.systemRed}}>{email}</Text>. Vui lòng kiểm tra hộp thư.
              </Text>

              <View style={{ marginTop: 30, gap: 15 }}>
                <TextInput
                  style={[
                    styles.input, 
                    { backgroundColor: colors.secondarySystemBackground, color: colors.label, borderColor: colors.separator },
                    focusedInput === 'otp' && { borderColor: colors.systemRed }
                  ]}
                  placeholder="Nhập mã 6 số"
                  placeholderTextColor={colors.secondaryLabel}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                  onFocus={() => setFocusedInput('otp')}
                  onBlur={() => setFocusedInput('')}
                />
                <TouchableOpacity 
                  style={[styles.btnPrimary, { backgroundColor: colors.systemRed }]} 
                  onPress={handleVerifyOtp} 
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnPrimaryText}>TIẾP TỤC</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 3 && (
            <View>
              <Text style={[styles.title, { color: colors.label }]}>MẬT KHẨU MỚI</Text>
              <Text style={[styles.subTitle, { color: colors.secondaryLabel }]}>
                Hãy nhập mật khẩu mới của bạn (tối thiểu 6 ký tự).
              </Text>

              <View style={{ marginTop: 30, gap: 15 }}>
                <TextInput
                  style={[
                    styles.input, 
                    { backgroundColor: colors.secondarySystemBackground, color: colors.label, borderColor: colors.separator },
                    focusedInput === 'newPassword' && { borderColor: colors.systemRed }
                  ]}
                  placeholder="Mật khẩu mới"
                  placeholderTextColor={colors.secondaryLabel}
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  onFocus={() => setFocusedInput('newPassword')}
                  onBlur={() => setFocusedInput('')}
                />
                <TouchableOpacity 
                  style={[styles.btnPrimary, { backgroundColor: colors.systemRed }]} 
                  onPress={handleResetPassword} 
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnPrimaryText}>ĐỔI MẬT KHẨU</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 4 && (
            <View style={{ alignItems: 'center', marginTop: 50 }}>
              <CheckCircle size={80} color={colors.systemGreen} />
              <Text style={[styles.title, { color: colors.label, marginTop: 20 }]}>THÀNH CÔNG</Text>
              <Text style={[styles.subTitle, { color: colors.secondaryLabel, textAlign: 'center' }]}>
                Mật khẩu của bạn đã được thay đổi. Bạn có thể sử dụng mật khẩu mới để đăng nhập.
              </Text>

              <TouchableOpacity 
                style={[styles.btnPrimary, { backgroundColor: colors.systemRed, marginTop: 30, width: '100%' }]} 
                onPress={() => router.back()}
              >
                <Text style={styles.btnPrimaryText}>VỀ TRANG ĐĂNG NHẬP</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { marginTop: 10, alignSelf: 'flex-start', padding: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  scrollFormContainer: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 30, paddingBottom: 50 },
  title: { fontSize: 28, fontWeight: '900', fontStyle: 'italic' },
  subTitle: { fontSize: 14, marginTop: 10, lineHeight: 22 },
  input: { padding: 20, borderRadius: 12, fontSize: 16, borderWidth: 1, minHeight: 60 },
  btnPrimary: { flexDirection: 'row', padding: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5, minHeight: HIGTouchTarget.min },
  btnPrimaryText: { color: 'white', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
});
