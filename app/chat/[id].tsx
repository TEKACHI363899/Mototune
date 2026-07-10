import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { ArrowLeft } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';

const COLORS = { bg: '#000000', card: '#1a1a1a', primary: '#E31B23', text: '#FFFFFF', textDim: '#A0A0A0' };

export default function ChatScreen() {
  const { id: otherUserId, name, avatar } = useLocalSearchParams();
  const router = useRouter();
  const currentUser = auth.currentUser;
  
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const chatId = currentUser && otherUserId 
    ? (currentUser.uid > (otherUserId as string) ? `${currentUser.uid}_${otherUserId}` : `${otherUserId}_${currentUser.uid}`)
    : 'temp';

  useEffect(() => {
    if (chatId === 'temp') return;
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [chatId]);

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUser) return;
    try {
      const msgText = newMessage;
      setNewMessage(''); 
      
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: msgText, senderId: currentUser.uid, createdAt: Date.now()
      });

      await setDoc(doc(db, 'chats', chatId), {
        participants: [currentUser.uid, otherUserId],
        usersInfo: {
          [currentUser.uid]: { name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Biker', avatar: currentUser.photoURL || '' },
          [otherUserId as string]: { name: name || 'Biker', avatar: avatar || '' }
        },
        lastMessage: msgText,
        lastUpdated: Date.now()
      }, { merge: true });

    } catch (e) { console.log(e); }
  };

  const renderMsg = ({ item }: { item: any }) => {
    const isMe = item.senderId === currentUser?.uid;
    return (
      <View style={[styles.msgWrapper, isMe ? styles.myMsgWrapper : styles.theirMsgWrapper]}>
        <View style={[styles.msgBubble, isMe ? styles.myMsg : styles.theirMsg]}>
          <Text style={styles.msgText}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 5, marginRight: 10 }}><ArrowLeft size={28} color={COLORS.text} /></TouchableOpacity>
        {avatar ? <Image source={{ uri: avatar as string }} style={styles.avatar} /> : <View style={[styles.avatar, {backgroundColor: '#333'}]} />}
        <Text style={styles.headerName}>{name || 'Biker'}</Text>
      </View>

      {/* 🛑 THÊM KEYBOARD VERTICAL OFFSET ĐỂ BÀN PHÍM LUÔN ĐẨY ĐÚNG TẦM MẮT */}
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <FlatList 
          data={messages} 
          keyExtractor={item => item.id} 
          renderItem={renderMsg} 
          inverted 
          contentContainerStyle={{ padding: 15 }} 
          showsVerticalScrollIndicator={false} 
          keyboardShouldPersistTaps="handled" // Giúp thu gọn bàn phím khi chạm ra ngoài
        />

        <View style={styles.inputBar}>
          <View style={styles.inputWrapper}>
            <TextInput 
              style={styles.input} 
              placeholder="Nhắn tin..." 
              placeholderTextColor={COLORS.textDim} 
              value={newMessage} 
              onChangeText={setNewMessage} 
              multiline // Cho phép nhập văn bản dài tự xuống dòng
            />
            {newMessage.trim().length > 0 && (
              <TouchableOpacity onPress={handleSend} style={styles.sendBtn}><Text style={{color: COLORS.primary, fontWeight: 'bold', fontSize: 16}}>Gửi</Text></TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderColor: '#222' },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 15 },
  headerName: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  msgWrapper: { marginBottom: 15, width: '100%' },
  myMsgWrapper: { alignItems: 'flex-end' },
  theirMsgWrapper: { alignItems: 'flex-start' },
  msgBubble: { maxWidth: '75%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  myMsg: { backgroundColor: COLORS.primary },
  theirMsg: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: '#333' },
  msgText: { color: COLORS.text, fontSize: 16 },
  inputBar: { paddingHorizontal: 15, paddingVertical: 10, borderTopWidth: 1, borderColor: '#222', backgroundColor: COLORS.bg },
  inputWrapper: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: COLORS.card, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 5, borderWidth: 1, borderColor: '#333' },
  input: { flex: 1, color: COLORS.text, fontSize: 16, minHeight: 40, maxHeight: 100, paddingTop: 10, paddingBottom: 10 },
  sendBtn: { padding: 10, marginBottom: 2 }
});