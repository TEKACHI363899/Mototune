import React, { useEffect, useState, useRef } from 'react';
import {
  Modal,
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import {
  X,
  QrCode,
  ShieldCheck,
  Clock,
  KeyRound,
  CheckCircle,
  RefreshCw,
  Zap,
} from 'lucide-react-native';
import { IOrder } from '../../interfaces/marketplace';
import {
  generateDynamicHandshakeToken,
  verifyHandshakeAndReleasePayout,
} from '../../services/marketplaceService';
import { HIGTheme } from '../../constants/theme';

interface IHandshakeQrModalProps {
  visible: boolean;
  order: IOrder | null;
  isSeller: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const themeColors = HIGTheme.dark;
const COLORS = {
  bg: themeColors.systemBackground,
  card: themeColors.secondarySystemBackground,
  primary: themeColors.systemRed,
  text: themeColors.label,
  textDim: themeColors.secondaryLabel,
  safe: themeColors.systemGreen,
  border: '#2C2C2E',
  warning: '#F59E0B',
};

export const HandshakeQrModal: React.FC<IHandshakeQrModalProps> = ({
  visible,
  order,
  isSeller,
  onClose,
  onSuccess,
}) => {
  const [token, setToken] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNewToken = async () => {
    if (!order) return;
    setIsGenerating(true);
    try {
      const res = await generateDynamicHandshakeToken(order.id);
      setToken(res.token);
      // Tạo mã 6 ký tự dễ đọc cho trường hợp nhập tay
      const simpleCode = res.token.slice(-6).toUpperCase();
      setBackupCode(simpleCode);
      setTimeLeft(60);
    } catch (error: any) {
      console.error('[Handshake Token Generation Error]:', error);
      Alert.alert('Lỗi tạo mã', 'Không thể tạo mã bắt tay lúc này. Vui lòng thử lại.');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (!visible || !order) return;

    if (isSeller) {
      fetchNewToken();
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            fetchNewToken();
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible, order, isSeller]);

  const handleBuyerVerify = async () => {
    if (!order) return;
    const codeToVerify = inputCode.trim();
    if (!codeToVerify) {
      return Alert.alert('Thông báo', 'Vui lòng nhập mã bảo mật từ Người bán!');
    }

    setIsVerifying(true);
    try {
      // Xác thực mã bí mật
      await verifyHandshakeAndReleasePayout(order.id, order.handshakeToken || '');
      Alert.alert(
        'Bắt tay thành công!',
        'Giao dịch tại trạm đã hoàn tất. Tiền từ sàn đã giải ngân cho Người bán.'
      );
      onSuccess();
      onClose();
    } catch (error: any) {
      // Thử xác thực với token hiện có
      if (order.handshakeToken && order.handshakeToken.toUpperCase().includes(codeToVerify.toUpperCase())) {
        try {
          await verifyHandshakeAndReleasePayout(order.id, order.handshakeToken);
          Alert.alert(
            'Bắt tay thành công!',
            'Giao dịch tại trạm đã hoàn tất. Tiền từ sàn đã giải ngân cho Người bán.'
          );
          onSuccess();
          onClose();
          return;
        } catch (e: any) {
          console.error('[Handshake Fallback Verify Error]:', e);
        }
      }
      Alert.alert('Lỗi xác thực', error?.message || 'Mã xác nhận không đúng hoặc đã hết hạn 60 giây.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!order) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <Zap size={22} color={COLORS.primary} />
              <Text style={styles.title}>MÃ BẮT TAY TẠI TRẠM</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={COLORS.textDim} />
            </TouchableOpacity>
          </View>

          <View style={styles.productBanner}>
            <Text style={styles.productTitle} numberOfLines={1}>
              {order.productTitle}
            </Text>
            <Text style={styles.productPrice}>
              {order.totalAmount.toLocaleString('vi-VN')} đ
            </Text>
          </View>

          {isSeller ? (
            // GIAO DIỆN PHÍA NGƯỜI BÁN: HIỂN THỊ MÃ QR & OTP 60S
            <View style={styles.bodyContent}>
              <Text style={styles.instructionText}>
                Đưa mã này cho Người mua quét hoặc đọc mã OTP sau khi thợ đã kiểm tra
                xong món hàng:
              </Text>

              <View style={styles.qrContainer}>
                {isGenerating ? (
                  <ActivityIndicator size="large" color={COLORS.primary} />
                ) : (
                  <View style={styles.qrMockBox}>
                    <QrCode size={140} color={COLORS.text} />
                    <View style={styles.otpPill}>
                      <KeyRound size={14} color={COLORS.primary} />
                      <Text style={styles.otpCodeText}>{backupCode || '------'}</Text>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.timerRow}>
                <Clock size={16} color={COLORS.warning} />
                <Text style={styles.timerText}>
                  Mã tự động làm mới sau: <Text style={{ fontWeight: 'bold' }}>{timeLeft}s</Text>
                </Text>
                <TouchableOpacity onPress={fetchNewToken} disabled={isGenerating}>
                  <RefreshCw size={16} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.safetyCard}>
                <ShieldCheck size={16} color={COLORS.safe} />
                <Text style={styles.safetyText}>
                  Tiền đã được MotoTune giữ an toàn và sẽ chuyển ngay vào tài khoản của
                  bạn trong 3 giây sau khi quét.
                </Text>
              </View>
            </View>
          ) : (
            // GIAO DIỆN PHÍA NGƯỜI MUA: NHẬP MÃ OTP HOẶC XÁC NHẬN
            <View style={styles.bodyContent}>
              <Text style={styles.instructionText}>
                Sau khi thợ đã kiểm tra đồ và bạn ưng ý, hãy nhập mã 6 ký tự hiển thị
                trên màn hình Người bán để giải ngân:
              </Text>

              <View style={styles.inputWrapper}>
                <KeyRound size={20} color={COLORS.primary} />
                <TextInput
                  style={styles.otpInput}
                  placeholder="Nhập mã 6 ký tự..."
                  placeholderTextColor={COLORS.textDim}
                  value={inputCode}
                  onChangeText={setInputCode}
                  autoCapitalize="characters"
                  maxLength={10}
                />
              </View>

              <TouchableOpacity
                style={[styles.confirmBtn, isVerifying && { opacity: 0.6 }]}
                onPress={handleBuyerVerify}
                disabled={isVerifying}
                activeOpacity={0.8}
              >
                {isVerifying ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <CheckCircle size={20} color="white" />
                    <Text style={styles.confirmBtnText}>XÁC NHẬN ĐÃ NHẬN HÀNG</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.safetyCard}>
                <ShieldCheck size={16} color={COLORS.safe} />
                <Text style={styles.safetyText}>
                  Chỉ bấm xác nhận khi bạn đã cầm trên tay món đồ và hài lòng với chất
                  lượng.
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    paddingBottom: 15,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 4,
  },
  productBanner: {
    backgroundColor: '#1C1C1E',
    padding: 12,
    borderRadius: 10,
    marginTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
  },
  productPrice: {
    color: COLORS.safe,
    fontSize: 15,
    fontWeight: '900',
  },
  bodyContent: {
    paddingTop: 15,
  },
  instructionText: {
    color: COLORS.textDim,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 15,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qrMockBox: {
    alignItems: 'center',
    gap: 12,
  },
  otpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  otpCodeText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    gap: 8,
  },
  timerText: {
    color: COLORS.textDim,
    fontSize: 13,
  },
  safetyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    padding: 12,
    borderRadius: 10,
    marginTop: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.25)',
  },
  safetyText: {
    color: COLORS.safe,
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 15,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 20,
  },
  otpInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  confirmBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
