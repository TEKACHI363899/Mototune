import { useRouter } from 'expo-router';
import { Bot, ChevronLeft, Send, User, Video } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Linking, Modal, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as Location from 'expo-location';

import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

// 🛑 IMPORT HÀM CỘNG ĐIỂM HUY HIỆU
import { recordUserStat } from '../utils/badgeHelper';
import { fetchAITextResponse, fetchAIVideoResponse } from '../services/geminiService';

const COLORS = { bg: '#000000', card: '#121212', primary: '#E31B23', text: '#FFFFFF', textDim: '#A0A0A0', botBubble: '#1A1A1A', userBubble: '#E31B23' };

type Message = { id: string; text: string; sender: 'user' | 'bot'; isVideo?: boolean };

// API key is loaded from process.env via geminiService 

export default function AIMechanicScreen() {
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bikeContext, setBikeContext] = useState('');
  
  const [locationContext, setLocationContext] = useState('');

  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const [camPermission, requestCamPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Chào Biker! Tôi là Bác sĩ Xế Nổ. Xe bạn đang bị xào máy, kêu cò hay dọng dên? Hãy mô tả hoặc bấm nút Camera quay tiếng máy 5 giây cho tôi nghe thử nhé!', sender: 'bot' }
  ]);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    let unsubscribeDoc: any = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubscribeDoc = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
          if (docSnap.exists() && docSnap.data().bike) {
            const bike = docSnap.data().bike;
            setBikeContext(`Khách hàng đang chạy xe: ${bike.brand} ${bike.model}. ODO: ${bike.odo || 0} km. Thay nhớt lần cuối: ${bike.lastOilChangeOdo || 0} km.`);
          } else { setBikeContext(''); }
        });
      }
    });

    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          let geocode = await Location.reverseGeocodeAsync({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          });
          if (geocode.length > 0) {
            const place = geocode[0];
            const address = `${place.subregion || place.city || ''}, ${place.region || ''}`;
            setLocationContext(address);
          }
        }
      } catch (e) { console.log("Lỗi định vị ngầm:", e); }
    })();

    return () => { unsubscribeAuth(); if (unsubscribeDoc) unsubscribeDoc(); };
  }, []);

  const SYSTEM_PROMPT = `Bạn là Bác sĩ Xế Nổ, chuyên gia máy gầm xe máy số 1 Việt Nam.
[VỊ TRÍ HIỆN TẠI CỦA KHÁCH]: ${locationContext ? locationContext : 'Đang tải GPS...'}
[THÔNG TIN CHIẾC XE]: ${bikeContext ? bikeContext : 'Chưa rõ'}

1. Kỹ năng BẮT BỆNH QUAN TRỌNG:
- Bạn CÓ KHẢ NĂNG xem và nghe âm thanh từ video. Đừng bao giờ nói là bạn không xem được video.
- Nghe tiếng lạch cạch: Lỏng cò, sên cam.
- Nghe tiếng xào xào: Bạc đạn dên, nhông sên dĩa.

2. TÌM ĐỊA ĐIỂM SỬA CHỮA: 
- Khi khách hỏi tìm tiệm sửa xe, hãy khoanh vùng khu vực dựa vào VỊ TRÍ HIỆN TẠI.
- BẮT BUỘC chèn đường link tìm kiếm động này: https://www.google.com/maps/search/?api=1&query=tiệm+thay+nhớt+sửa+xe+máy+gần+đây

3. BẮT BUỘC Ở CUỐI CÂU: Chèn nguyên văn "⚠️ LƯU Ý: Chẩn đoán A.I chỉ mang tính chất tham khảo. Bạn hãy mang xe ra Garage uy tín để kiểm tra nhé!".
4. Phong cách: Biker bụi bặm.`;

  // Local fetch functions removed and moved to geminiService

  const handleSendText = async () => {
    if (!inputText.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), text: inputText.trim(), sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    const aiText = await fetchAITextResponse(messages, userMsg.text, SYSTEM_PROMPT);
    setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: aiText, sender: 'bot' }]);
    setIsLoading(false);

    // 🛑 TRIGGER: CỘNG ĐIỂM HUY HIỆU THỢ ĐỤNG KHI CHAT
    if (auth.currentUser) {
      await recordUserStat(auth.currentUser.uid, 'ai_mechanic', 1);
    }
  };

  const openCameraUI = async () => {
    if (!camPermission?.granted) await requestCamPermission();
    if (!micPermission?.granted) await requestMicPermission();
    if (camPermission?.granted && micPermission?.granted) {
      setIsCameraVisible(true);
    } else {
      Alert.alert('Cần quyền', 'Vui lòng cấp quyền Camera và Micro để A.I nghe tiếng máy!');
    }
  };

  const handleRecordVideo = async () => {
    if (cameraRef.current && !isRecording) {
      setIsRecording(true);
      try {
        const video = await cameraRef.current.recordAsync({ maxDuration: 5 });
        setIsCameraVisible(false);
        setIsRecording(false);
        
        if (video) {
          setIsLoading(true);
          setMessages(prev => [...prev, { id: Date.now().toString(), text: '[Gửi đoạn Video chẩn đoán âm thanh 5 giây]', sender: 'user', isVideo: true }]);
          
          const aiText = await fetchAIVideoResponse(video.uri, SYSTEM_PROMPT);
          setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: aiText, sender: 'bot' }]);

          // 🛑 TRIGGER: CỘNG ĐIỂM HUY HIỆU THỢ ĐỤNG KHI GỬI VIDEO THÀNH CÔNG
          if (auth.currentUser) {
            await recordUserStat(auth.currentUser.uid, 'ai_mechanic', 1);
          }
        }
      } catch (error) {
        setIsRecording(false);
        Alert.alert("Lỗi", "Không thể quay video.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const renderTextWithLinks = (text: string, isVideo?: boolean) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return (
      <Text style={[styles.messageText, isVideo && {fontStyle: 'italic', color: '#FFF'}]}>
        {parts.map((part, index) => {
          if (part.match(urlRegex)) {
            return (
              <Text 
                key={index} 
                style={{ color: '#4ADE80', textDecorationLine: 'underline', fontWeight: 'bold' }} 
                onPress={() => Linking.openURL(part)}
              >
                {part}
              </Text>
            );
          }
          return <Text key={index}>{part}</Text>;
        })}
      </Text>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageWrapper, isUser ? styles.messageWrapperUser : styles.messageWrapperBot]}>
        {!isUser && <View style={styles.botAvatar}><Bot size={18} color={COLORS.primary} /></View>}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.botBubble, item.isVideo && styles.videoBubble]}>
          {renderTextWithLinks(item.text, item.isVideo)}
        </View>
        {isUser && <View style={styles.userAvatar}><User size={18} color="#FFF" /></View>}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Modal visible={isCameraVisible} animationType="slide" transparent={false}>
        <View style={styles.camContainer}>
          <CameraView style={styles.cameraView} ref={cameraRef} mode="video" facing="back" videoQuality="480p">
            <View style={styles.overlayTop}>
              <Text style={styles.warningText}>⚠️ KẾT QUẢ A.I CHỈ ĐỂ THAM KHẢO</Text>
              <Text style={styles.instructionText}>Hãy để cụm Micro điện thoại gần lốc máy / pô xe</Text>
            </View>

            <View style={styles.camControls}>
              <TouchableOpacity onPress={() => setIsCameraVisible(false)} style={styles.camCancelBtn}>
                <Text style={{color: 'white', fontWeight: 'bold'}}>Hủy</Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={handleRecordVideo} style={styles.recordBtnFrame}>
                <View style={[styles.recordBtnInner, isRecording && styles.recordingActive]} />
              </TouchableOpacity>
              
              <View style={{width: 50}} /> 
            </View>
            
            {isRecording && <Text style={styles.recordingText}>🔴 Đang thu âm A.I (5s)...</Text>}
          </CameraView>
        </View>
      </Modal>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><ChevronLeft size={28} color={COLORS.text} /></TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>BÁC SĨ XẾ NỔ</Text>
          <Text style={styles.headerStatus}>🟢 A.I đang trực tuyến</Text>
        </View>
        <View style={{width: 28}}/>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
      >
        <FlatList
          ref={flatListRef} data={messages} keyExtractor={item => item.id} renderItem={renderMessage}
          contentContainerStyle={{ padding: 15, paddingBottom: 20 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {isLoading && (
          <View style={styles.typingIndicator}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={{color: COLORS.textDim, marginLeft: 10, fontStyle: 'italic'}}>Bác sĩ đang nghe và chẩn đoán...</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          {Platform.OS !== 'web' && (
            <TouchableOpacity style={styles.camTriggerBtn} onPress={openCameraUI} disabled={isLoading}>
              <Video size={24} color={COLORS.primary} />
            </TouchableOpacity>
          )}

          <TextInput style={styles.input} placeholder="Hoặc mô tả bệnh xe tại đây..." placeholderTextColor="#666" value={inputText} onChangeText={setInputText} multiline />
          
          <TouchableOpacity style={[styles.sendBtn, !inputText.trim() && {opacity: 0.5}]} onPress={handleSendText} disabled={isLoading || !inputText.trim()}>
            <Send size={20} color="#FFF" style={{marginLeft: 2}} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: '#222', backgroundColor: COLORS.card },
  backBtn: { padding: 5 },
  headerInfo: { alignItems: 'center' },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  headerStatus: { color: '#4ADE80', fontSize: 12, marginTop: 2, fontWeight: 'bold' },
  
  messageWrapper: { flexDirection: 'row', marginBottom: 15, alignItems: 'flex-end' },
  messageWrapperUser: { justifyContent: 'flex-end' },
  messageWrapperBot: { justifyContent: 'flex-start' },
  messageBubble: { maxWidth: '75%', padding: 12, borderRadius: 16 },
  userBubble: { backgroundColor: COLORS.userBubble, borderBottomRightRadius: 4 },
  botBubble: { backgroundColor: COLORS.botBubble, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#333' },
  videoBubble: { backgroundColor: '#3B82F6', borderWidth: 0 },
  messageText: { color: COLORS.text, fontSize: 15, lineHeight: 22 },
  
  botAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(227, 27, 35, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 8, borderWidth: 1, borderColor: COLORS.primary },
  userAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  typingIndicator: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
  
  inputContainer: { flexDirection: 'row', padding: 15, backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: '#222', alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#111', color: COLORS.text, paddingHorizontal: 15, paddingTop: 12, paddingBottom: 12, borderRadius: 20, borderWidth: 1, borderColor: '#333', fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginLeft: 10, marginBottom: 2 },
  camTriggerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(227, 27, 35, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 10, marginBottom: 2 },

  camContainer: { flex: 1, backgroundColor: 'black' },
  cameraView: { flex: 1, justifyContent: 'space-between' },
  overlayTop: { marginTop: 60, alignItems: 'center', paddingHorizontal: 20 },
  warningText: { backgroundColor: 'rgba(227, 27, 35, 0.9)', color: 'white', fontWeight: '900', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, fontSize: 14, overflow: 'hidden' },
  instructionText: { color: 'white', fontWeight: 'bold', marginTop: 15, fontSize: 16, textShadowColor: 'black', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 5 },
  camControls: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 50 },
  camCancelBtn: { padding: 15 },
  recordBtnFrame: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: 'white', justifyContent: 'center', alignItems: 'center' },
  recordBtnInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary },
  recordingActive: { borderRadius: 10, width: 40, height: 40 }, 
  recordingText: { position: 'absolute', bottom: 150, alignSelf: 'center', color: 'red', fontWeight: '900', fontSize: 16, textShadowColor: 'black', textShadowRadius: 2 }
});