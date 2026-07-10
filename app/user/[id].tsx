import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { ArrowLeft, Flame, MessageCircle, Send, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { FlatList, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../../firebaseConfig';

const COLORS = { bg: '#121212', card: '#1E1E1E', primary: '#E31B23', text: '#FFFFFF', textDim: '#A0A0A0' };

export default function OtherUserProfileScreen() {
  const { id, name, avatar } = useLocalSearchParams();
  const router = useRouter();
  const [userPosts, setUserPosts] = useState<any[]>([]);
  
  // Biến lưu xe dạng Object
  const [bikeObj, setBikeObj] = useState<any>(null);

  useEffect(() => {
    if (!id) return;

    const q = query(collection(db, 'posts'), where('authorId', '==', id), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUserPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Lấy thông tin Xe
    const fetchUserBike = async () => {
      const docSnap = await getDoc(doc(db, 'users', id as string));
      if (docSnap.exists() && docSnap.data().bike) {
        setBikeObj(docSnap.data().bike);
      }
    };
    fetchUserBike();

    return () => unsubscribe();
  }, [id]);

  const ProfileHeader = () => (
    <View>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 5 }}><ArrowLeft size={28} color={COLORS.text} /></TouchableOpacity>
        <Text style={styles.title}>{name}</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.profileCard}>
        {avatar ? <Image source={{ uri: avatar as string }} style={styles.avatar} /> : <View style={styles.avatar}><User size={40} color={COLORS.bg} /></View>}
        <Text style={styles.name}>{name}</Text>
        
        {/* HIỂN THỊ XE CHUẨN CẤU TRÚC MỚI */}
        {bikeObj ? (
           <View style={styles.bikeDisplay}>
             <Text style={styles.bikeText}>
               🏍️ Garage: <Text style={{color: 'white'}}>{bikeObj.nickname}</Text> ({bikeObj.model})
             </Text>
           </View>
        ) : null}
        
        <TouchableOpacity style={styles.chatBtn} onPress={() => router.push(`/chat/${id}?name=${name}&avatar=${encodeURIComponent(avatar as string || '')}` as any)}>
          <Text style={styles.chatText}>NHẮN TIN NGAY</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.sectionTitle}>BÀI VIẾT ({userPosts.length})</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList 
        data={userPosts} 
        keyExtractor={item => item.id} 
        ListHeaderComponent={<ProfileHeader />} 
        contentContainerStyle={{ paddingBottom: 50, maxWidth: 600, width: '100%', alignSelf: 'center' }}
        renderItem={({ item }) => (
          <View style={styles.miniPost}>
            {item.isShared && <Text style={styles.sharedBadge}>🔄 Đã Repost từ {item.sharedFromStr}</Text>}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderColor: '#333' },
  title: { color: 'white', fontWeight: '900', fontSize: 18 },
  profileCard: { backgroundColor: COLORS.card, margin: 20, padding: 30, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  name: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  
  bikeDisplay: { marginTop: 10, backgroundColor: 'rgba(227, 27, 35, 0.1)', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: COLORS.primary },
  bikeText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 13 },

  chatBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 40, paddingVertical: 15, borderRadius: 30, marginTop: 20, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },
  chatText: { color: 'white', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  sectionTitle: { color: COLORS.text, fontWeight: 'bold', fontSize: 16, margin: 20, marginTop: 10 },
  miniPost: { backgroundColor: COLORS.card, marginHorizontal: 20, marginBottom: 12, padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  sharedBadge: { color: COLORS.primary, fontSize: 12, fontWeight: 'bold', marginBottom: 8 },
  miniPostText: { color: COLORS.text, fontSize: 15, lineHeight: 22 },
  statsBar: { flexDirection: 'row', gap: 20, marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#333' },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { color: COLORS.textDim, fontSize: 14, fontWeight: 'bold' }
});