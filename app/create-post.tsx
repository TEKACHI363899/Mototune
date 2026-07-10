import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { addDoc, collection } from 'firebase/firestore';
import { ImageIcon, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { uploadToCloudinary } from '../services/cloudinaryService';

// 🛑 IMPORT HÀM CỘNG ĐIỂM HUY HIỆU
import { recordUserStat } from '../utils/badgeHelper';

const COLORS = { bg: '#121212', card: '#1E1E1E', primary: '#E31B23', text: '#FFFFFF', textDim: '#A0A0A0' };

// Cloudinary credentials managed via cloudinaryService 

const VideoPreview = ({ uri }: { uri: string }) => {
  const player = useVideoPlayer(uri, p => { p.loop = true; p.muted = true; p.play(); });
  return <VideoView player={player} style={styles.previewBox} contentFit="cover" />;
};

export default function CreatePostScreen() {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [debugLog, setDebugLog] = useState("Sẵn sàng..."); 

  const pickMedia = async () => {
    try {
      setDebugLog("Đang mở thư viện ảnh...");
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'], allowsEditing: true, aspect: [4, 5], quality: 0.8,
      });
      if (!result.canceled) {
        setMedia({ uri: result.assets[0].uri, type: result.assets[0].type });
        setDebugLog("Đã chọn file xong!");
      }
    } catch (e: any) { setDebugLog("LỖI MỞ ẢNH: " + e.message); }
  };

  // Local uploadToCloudinary function removed and moved to cloudinaryService

  const handlePost = async () => {
    if (!content.trim() && !media) return;
    setLoading(true);
    try {
      let mediaUrl = ""; let mediaType = "";
      if (media) {
        setDebugLog("Đang nén và tải ảnh lên...");
        mediaUrl = await uploadToCloudinary(media.uri, media.type);
        mediaType = media.type;
      }
      const user = auth.currentUser;
      if (!user) throw new Error("Mất kết nối tài khoản.");
      
      setDebugLog("Đang ghi dữ liệu...");
      await addDoc(collection(db, 'posts'), {
        content: content, authorId: user.uid, authorName: user.email ? user.email.split('@')[0] : 'Biker Ẩn Danh',
        authorAvatar: user.photoURL || null, mediaUrl: mediaUrl, mediaType: mediaType,
        createdAt: Date.now(), likesCount: 0, commentsCount: 0
      });
      
      // 🛑 KÍCH HOẠT ĐIỂM THÀNH TỰU SAU KHI ĐĂNG THÀNH CÔNG
      await recordUserStat(user.uid, 'post_creator', 1);

      setDebugLog("THÀNH CÔNG!");
      setTimeout(() => { router.back(); }, 1000);
    } catch (error: any) { setDebugLog("LỖI CHÍNH: " + error.message); } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: COLORS.bg }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}><Text style={{ color: COLORS.textDim, fontSize: 16 }}>Hủy</Text></TouchableOpacity>
          <Text style={styles.title}>TẠO BÀI VIẾT</Text>
          <TouchableOpacity onPress={handlePost} disabled={loading || (!content.trim() && !media)}>
            {loading ? <ActivityIndicator color={COLORS.primary} /> : <Text style={{ color: (!content.trim() && !media) ? '#666' : COLORS.primary, fontWeight: 'bold', fontSize: 16 }}>Đăng</Text>}
          </TouchableOpacity>
        </View>

        {debugLog !== "Sẵn sàng..." && (
          <View style={{ padding: 10, backgroundColor: '#333' }}>
            <Text style={{ color: '#F59E0B', fontWeight: 'bold', textAlign: 'center', fontSize: 12 }}>Trạng thái: {debugLog}</Text>
          </View>
        )}
        
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          <TextInput 
            style={styles.input} 
            placeholder="Bạn đang nghĩ gì về chiếc xe của mình?" 
            placeholderTextColor={COLORS.textDim} 
            multiline 
            autoFocus 
            value={content} 
            onChangeText={setContent} 
          />
          
          {media && (
            <View style={styles.mediaPreview}>
              <TouchableOpacity style={styles.removeMediaBtn} onPress={() => setMedia(null)}><X size={20} color="white" /></TouchableOpacity>
              {media.type === 'video' ? <VideoPreview uri={media.uri} /> : <Image source={{ uri: media.uri }} style={styles.previewBox} />}
            </View>
          )}
        </ScrollView>

        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.toolBtn} onPress={pickMedia} disabled={loading}>
            <ImageIcon size={24} color={COLORS.primary} />
            <Text style={{color: COLORS.text, fontWeight: 'bold'}}>Thêm Ảnh / Video</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: '#333' },
  title: { color: COLORS.text, fontWeight: 'bold', fontSize: 16 },
  input: { color: COLORS.text, fontSize: 18, padding: 20, textAlignVertical: 'top', minHeight: 150 },
  toolbar: { flexDirection: 'row', padding: 15, borderTopWidth: 1, borderColor: '#333', backgroundColor: COLORS.card },
  toolBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#222', padding: 10, borderRadius: 8 },
  mediaPreview: { margin: 20, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  previewBox: { width: '100%', height: 300, backgroundColor: '#222' },
  removeMediaBtn: { position: 'absolute', top: 10, right: 10, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: 5, borderRadius: 15 }
});