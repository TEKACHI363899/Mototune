import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, onSnapshot, orderBy, query, setDoc, limit } from 'firebase/firestore';
import { ArrowLeft, Store, Tag, ArrowRight, ShieldCheck } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';

import { HIGTheme } from '../../constants/theme';
const themeColors = HIGTheme.dark;
const COLORS = {
  bg: themeColors.systemBackground,
  card: themeColors.secondarySystemBackground,
  primary: themeColors.systemRed,
  text: themeColors.label,
  textDim: themeColors.secondaryLabel,
  safe: themeColors.systemGreen,
  border: '#2C2C2E',
};

interface IChatMessage {
  id: string;
  text: string;
  senderId: string;
  createdAt: number;
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const {
    id: otherUserId,
    name,
    avatar,
    productId,
    productTitle,
    productPrice,
    productImage,
  } = useLocalSearchParams();
  const router = useRouter();
  const currentUser = auth.currentUser;

  const [messages, setMessages] = useState<IChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const chatId =
    currentUser && otherUserId
      ? currentUser.uid > (otherUserId as string)
        ? `${currentUser.uid}_${otherUserId}`
        : `${otherUserId}_${currentUser.uid}`
      : 'temp';

  useEffect(() => {
    if (chatId === 'temp') return;
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as IChatMessage)));
      },
      (err) => {
        console.error('[Chat Messages Listener Error]', err);
      }
    );
    return () => unsubscribe();
  }, [chatId]);

  const handleSend = async (customText?: string) => {
    const textToSend = (customText || newMessage).trim();
    if (!textToSend || !currentUser) return;
    try {
      if (!customText) setNewMessage('');

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: textToSend,
        senderId: currentUser.uid,
        createdAt: Date.now(),
      });

      await setDoc(
        doc(db, 'chats', chatId),
        {
          participants: [currentUser.uid, otherUserId],
          usersInfo: {
            [currentUser.uid]: {
              name:
                currentUser.displayName ||
                currentUser.email?.split('@')[0] ||
                'Biker',
              avatar: currentUser.photoURL || '',
            },
            [otherUserId as string]: {
              name: name || 'Biker',
              avatar: avatar || '',
            },
          },
          lastMessage: textToSend,
          lastUpdated: Date.now(),
        },
        { merge: true }
      );
    } catch (e) {
      console.log(e);
    }
  };

  const renderMsg = ({ item }: { item: any }) => {
    const isMe = item.senderId === currentUser?.uid;
    return (
      <View
        style={[
          styles.msgWrapper,
          isMe ? styles.myMsgWrapper : styles.theirMsgWrapper,
        ]}
      >
        <View style={[styles.msgBubble, isMe ? styles.myMsg : styles.theirMsg]}>
          <Text style={styles.msgText}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 12 : 16) }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ padding: 5, marginRight: 10 }}
        >
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        {avatar ? (
          <Image source={{ uri: avatar as string }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: '#333' }]} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName}>{name || 'Biker'}</Text>
          <Text style={styles.headerStatus}>Đang trực tuyến</Text>
        </View>
      </View>

      {/* THẺ SẢN PHẨM GHIM TRÊN ĐẦU NẾU TRUY CẬP TỪ CHỢ */}
      {productTitle && (
        <View style={styles.productTopBanner}>
          {productImage ? (
            <Image
              source={{ uri: productImage as string }}
              style={styles.pBannerImg}
            />
          ) : (
            <View style={[styles.pBannerImg, { backgroundColor: '#222' }]} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.pBannerTitle} numberOfLines={1}>
              {productTitle}
            </Text>
            <Text style={styles.pBannerPrice}>
              {parseInt((productPrice as string) || '0', 10).toLocaleString('vi-VN')}{' '}
              đ
            </Text>
          </View>
          <TouchableOpacity
            style={styles.quickAskBtn}
            onPress={() =>
              handleSend(`Chào bạn, món đồ "${productTitle}" còn không ạ?`)
            }
          >
            <Text style={styles.quickAskText}>Hỏi còn hàng</Text>
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMsg}
          inverted
          contentContainerStyle={{ padding: 15 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Nhắn tin thương lượng, trao đổi..."
              placeholderTextColor={COLORS.textDim}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
            />
            {newMessage.trim().length > 0 && (
              <TouchableOpacity
                onPress={() => handleSend()}
                style={styles.sendBtn}
              >
                <Text
                  style={{
                    color: COLORS.primary,
                    fontWeight: 'bold',
                    fontSize: 15,
                  }}
                >
                  Gửi
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: { width: 38, height: 38, borderRadius: 19, marginRight: 12 },
  headerName: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  headerStatus: { color: COLORS.safe, fontSize: 11, marginTop: 1 },

  productTopBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  pBannerImg: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#222' },
  pBannerTitle: { color: COLORS.text, fontSize: 13, fontWeight: 'bold' },
  pBannerPrice: {
    color: COLORS.safe,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  quickAskBtn: {
    backgroundColor: 'rgba(227, 27, 35, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(227, 27, 35, 0.3)',
  },
  quickAskText: { color: COLORS.primary, fontSize: 11, fontWeight: 'bold' },

  msgWrapper: { marginBottom: 12, width: '100%' },
  myMsgWrapper: { alignItems: 'flex-end' },
  theirMsgWrapper: { alignItems: 'flex-start' },
  msgBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  myMsg: { backgroundColor: COLORS.primary },
  theirMsg: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  msgText: { color: COLORS.text, fontSize: 15, lineHeight: 21 },

  inputBar: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    minHeight: 36,
    maxHeight: 100,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendBtn: { paddingHorizontal: 8, paddingVertical: 8, marginBottom: 2 },
});

