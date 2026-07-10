// expo-file-system import removed
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, where } from 'firebase/firestore';
// 🛑 IMPORT THÊM ICON AWARD
import { Award, Camera, Flame, LogOut, MessageCircle, Send, Trash2, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { uploadToCloudinary } from '../services/cloudinaryService';

// 🛑 IMPORT COMPONENT HUY HIỆU
import UserBadge from '../components/UserBadge';

const COLORS = { bg: '#121212', card: '#1E1E1E', primary: '#E31B23', text: '#FFFFFF', textDim: '#A0A0A0' };
// Cloudinary credentials managed via cloudinaryService

export default function ProfileScreen() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [bikeObj, setBikeObj] = useState<any>(null);

  useEffect(() => {
    let unsubscribeDoc: any = null;
    let unsubPosts: any = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        setAvatar(user.photoURL);
        
        const q = query(collection(db, 'posts'), where('authorId', '==', user.uid), orderBy('createdAt', 'desc'));
        unsubPosts = onSnapshot(q, (snapshot) => {
          setMyPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        unsubscribeDoc = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
          if (docSnap.exists() && docSnap.data().bike) {
            setBikeObj(docSnap.data().bike);
          } else {
            setBikeObj(null);
          }
        });
      } else {
        setMyPosts([]);
        setBikeObj(null);
        setAvatar(null);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubPosts) unsubPosts();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const handleChangeAvatar = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    if (!result.canceled && currentUser) {
      setUploadingAvatar(true);
      try {
        const secureUrl = await uploadToCloudinary(result.assets[0].uri, 'image');
        await updateProfile(currentUser, { photoURL: secureUrl });
        await setDoc(doc(db, 'users', currentUser.uid), { avatarUrl: secureUrl }, { merge: true });
        setAvatar(secureUrl);
      } catch (error: any) { 
        console.error("Upload avatar error:", error);
        Alert.alert("Lỗi", "Tải ảnh thất bại"); 
      } finally { 
        setUploadingAvatar(false); 
      }
    }
  };

  const handleDeletePost = (postId: string) => {
    if (Platform.OS === 'web') {
      const confirmDelete = window.confirm("Bài viết này sẽ bị xóa vĩnh viễn khỏi Hồ sơ. Bạn có chắc không?");
      if (confirmDelete) {
        deleteDoc(doc(db, 'posts', postId))
          .catch(() => window.alert("Không thể xóa bài viết lúc này."));
      }
    } else {
      Alert.alert(
        "Xóa bài viết",
        "Bài viết này sẽ bị xóa vĩnh viễn khỏi Hồ sơ. Bạn có chắc không?",
        [
          { text: "Hủy", style: "cancel" },
          { 
            text: "Xóa", 
            style: "destructive", 
            onPress: async () => {
              try {
                await deleteDoc(doc(db, 'posts', postId));
              } catch (error) {
                Alert.alert("Lỗi", "Không thể xóa bài viết lúc này.");
              }
            } 
          }
        ]
      );
    }
  };

  const ProfileHeader = () => (
    <View>
      <View style={styles.header}>
        <Text style={styles.title}>HỒ SƠ CỦA TÔI</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={{color: COLORS.textDim}}>Đóng</Text></TouchableOpacity>
      </View>
      
      <View style={styles.profileCard}>
        <TouchableOpacity onPress={handleChangeAvatar} disabled={uploadingAvatar}>
          {uploadingAvatar ? <View style={styles.avatar}><ActivityIndicator color="white" /></View> : avatar ? <Image source={{ uri: avatar }} style={styles.avatar} /> : <View style={styles.avatar}><User size={40} color={COLORS.bg} /></View>}
          <View style={styles.cameraIcon}><Camera size={14} color="white" /></View>
        </TouchableOpacity>
        
        {/* 🛑 GẮN HUY HIỆU TỎA SÁNG REALTIME BÊN CẠNH TÊN */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
          <Text style={styles.name}>{currentUser?.email ? currentUser.email.split('@')[0] : 'Biker Ẩn Danh'}</Text>
          {currentUser && <UserBadge userId={currentUser.uid} size={18} realtime={true} />}
        </View>
        
        {bikeObj ? (
           <View style={styles.bikeDisplay}>
             <Text style={styles.bikeText}>🏍️ Xe: <Text style={{color: 'white'}}>{bikeObj.nickname}</Text> ({bikeObj.model})</Text>
           </View>
        ) : (
           <View style={[styles.bikeDisplay, {borderColor: '#333', backgroundColor: 'transparent'}]}>
             <Text style={[styles.bikeText, {color: COLORS.textDim}]}>Chưa có xe trong Garage</Text>
           </View>
        )}

        {/* 🛑 NÚT DẪN VÀO PHÒNG TRƯNG BÀY HUY HIỆU */}
        <TouchableOpacity style={styles.badgesShowcaseBtn} onPress={() => router.push('/badges' as any)}>
          <Award size={18} color="#FFD700" />
          <Text style={styles.badgesShowcaseText}>PHÒNG TRƯNG BÀY HUY HIỆU</Text>
        </TouchableOpacity>

      </View>
      <TouchableOpacity style={styles.logoutBtn} onPress={async () => { await signOut(auth); router.replace('/login'); }}>
        <LogOut size={20} color={COLORS.primary} /><Text style={styles.logoutText}>ĐĂNG XUẤT</Text>
      </TouchableOpacity>
      <Text style={styles.sectionTitle}>BÀI VIẾT CỦA TÔI ({myPosts.length})</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList 
        data={myPosts} keyExtractor={item => item.id} ListHeaderComponent={<ProfileHeader />} 
        contentContainerStyle={{ paddingBottom: 50, maxWidth: 600, width: '100%', alignSelf: 'center' }}
        renderItem={({ item }) => (
          <View style={styles.miniPost}>
            
            <View style={styles.miniPostHeader}>
              {item.isShared ? (
                <Text style={styles.sharedBadge}>🔄 Đã Repost từ {item.sharedFromStr}</Text>
              ) : (
                <Text style={styles.dateBadge}>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</Text>
              )}
              <TouchableOpacity onPress={() => handleDeletePost(item.id)} style={{ padding: 4, marginRight: -4, marginTop: -4 }}>
                <Trash2 size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>

            {item.content ? <Text style={styles.miniPostText} numberOfLines={2}>{item.content}</Text> : <Text style={[styles.miniPostText, {fontStyle: 'italic', color: COLORS.textDim}]}>[Bài viết chứa Ảnh/Video]</Text>}
            <View style={styles.statsBar}>
              <View style={styles.statItem}><Flame size={16} color={COLORS.textDim} /><Text style={styles.statText}>{item.likesCount || 0}</Text></View>
              <View style={styles.statItem}><MessageCircle size={16} color={COLORS.textDim} /><Text style={styles.statText}>{item.commentsCount || 0}</Text></View>
              <View style={styles.statItem}><Send size={16} color={COLORS.textDim} style={{transform: [{rotate: '-45deg'}]}} /><Text style={styles.statText}>{item.repostsCount || 0}</Text></View>
            </View>
          </View>
        )} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: '#333', marginTop: Platform.OS === 'android' ? 25 : 0 },
  title: { color: 'white', fontWeight: '900', fontSize: 18 },
  profileCard: { backgroundColor: COLORS.card, margin: 20, padding: 30, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  cameraIcon: { position: 'absolute', bottom: 15, right: 0, backgroundColor: '#333', padding: 6, borderRadius: 15, borderWidth: 2, borderColor: COLORS.card },
  name: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  
  bikeDisplay: { marginTop: 15, backgroundColor: 'rgba(227, 27, 35, 0.15)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: COLORS.primary },
  bikeText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 14 },

  // 🛑 STYLE CHO NÚT PHÒNG TRƯNG BÀY
  badgesShowcaseBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, backgroundColor: 'rgba(255, 215, 0, 0.1)', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.5)' },
  badgesShowcaseText: { color: '#FFD700', fontWeight: 'bold', fontSize: 12, letterSpacing: 0.5 },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)', marginHorizontal: 20, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#333', gap: 10 },
  logoutText: { color: COLORS.textDim, fontWeight: 'bold', fontSize: 16 },
  sectionTitle: { color: COLORS.text, fontWeight: 'bold', fontSize: 16, margin: 20, marginTop: 10 },
  miniPost: { backgroundColor: COLORS.card, marginHorizontal: 20, marginBottom: 12, padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  
  miniPostHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  sharedBadge: { color: COLORS.primary, fontSize: 12, fontWeight: 'bold' },
  dateBadge: { color: COLORS.textDim, fontSize: 12 },

  miniPostText: { color: COLORS.text, fontSize: 15, lineHeight: 22 },
  statsBar: { flexDirection: 'row', gap: 20, marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#333' },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { color: COLORS.textDim, fontSize: 14, fontWeight: 'bold' }
});