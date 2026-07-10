import { useRouter } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { ArrowLeft, MessageSquare, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { FlatList, Image, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';

const COLORS = { bg: '#000000', card: '#121212', primary: '#E31B23', text: '#FFFFFF', textDim: '#A0A0A0' };

export default function InboxScreen() {
  const router = useRouter();
  const currentUser = auth.currentUser;
  const [chatRooms, setChatRooms] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    // Tìm các phòng chat có chứa ID của mình
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', currentUser.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sắp xếp thủ công tại máy để tránh bị lỗi bắt tạo Index của Firebase
      rooms.sort((a: any, b: any) => b.lastUpdated - a.lastUpdated);
      setChatRooms(rooms);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const renderRoom = ({ item }: { item: any }) => {
    // Xác định ai là người đang chat với mình
    const otherUserId = item.participants.find((id: string) => id !== currentUser?.uid);
    const otherUser = item.usersInfo?.[otherUserId] || { name: 'Người dùng MotoTune', avatar: '' };

    return (
      <TouchableOpacity 
        style={styles.roomCard} 
        onPress={() => router.push(`/chat/${otherUserId}?name=${otherUser.name}&avatar=${encodeURIComponent(otherUser.avatar || '')}` as any)}
      >
        {otherUser.avatar ? <Image source={{ uri: otherUser.avatar }} style={styles.avatar} /> : <View style={styles.avatar}><User color={COLORS.bg} size={24} /></View>}
        <View style={styles.roomInfo}>
          <Text style={styles.roomName}>{otherUser.name}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 5 }}><ArrowLeft size={28} color={COLORS.text} /></TouchableOpacity>
        <Text style={styles.title}>Hộp thư</Text>
        <View style={{ width: 38 }} />
      </View>

      {chatRooms.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MessageSquare size={60} color="#333" style={{marginBottom: 20}} />
          <Text style={styles.emptyText}>Chưa có tin nhắn nào</Text>
          <Text style={styles.subText}>Ra Bảng tin và chọn một Biker để bắt đầu trò chuyện nhé!</Text>
        </View>
      ) : (
        <FlatList data={chatRooms} keyExtractor={item => item.id} renderItem={renderRoom} contentContainerStyle={{ padding: 15 }} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderColor: '#222' },
  title: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { color: COLORS.text, fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  subText: { color: COLORS.textDim, textAlign: 'center', lineHeight: 22, marginBottom: 30 },
  
  roomCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#222' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  roomInfo: { flex: 1 },
  roomName: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  lastMessage: { color: COLORS.textDim, fontSize: 14 }
});