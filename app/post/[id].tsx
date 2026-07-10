import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, increment, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { ArrowLeft, Send } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';

const COLORS = { bg: '#121212', card: '#1E1E1E', primary: '#E31B23', text: '#FFFFFF', textDim: '#A0A0A0' };

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchPost = async () => {
      const docSnap = await getDoc(doc(db, 'posts', id as string));
      if (docSnap.exists()) setPost({ id: docSnap.id, ...docSnap.data() });
    };
    fetchPost();

    const q = query(collection(db, 'posts', id as string, 'comments'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [id]);

  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    setSending(true);
    try {
      const user = auth.currentUser;
      await addDoc(collection(db, 'posts', id as string, 'comments'), {
        content: newComment,
        authorName: user?.email ? user.email.split('@')[0] : 'Biker Ẩn Danh',
        createdAt: Date.now()
      });
      await updateDoc(doc(db, 'posts', id as string), { commentsCount: increment(1) });
      setNewComment('');
    } catch (error) { console.log(error); }
    setSending(false);
  };

  const renderComment = ({ item }: { item: any }) => (
    <View style={styles.commentBox}>
      <Text style={styles.commentAuthor}>{item.authorName}</Text>
      <Text style={styles.commentText}>{item.content}</Text>
    </View>
  );

  return (
    // 🛑 Bọc TOÀN BỘ MÀN HÌNH bằng KeyboardAvoidingView để nó trượt mượt mà
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      // Offset = 0 vì chúng ta đang dùng SafeAreaView
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0} 
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}><ArrowLeft color={COLORS.text} /></TouchableOpacity>
          <Text style={styles.title}>BÌNH LUẬN</Text>
          <View style={{ width: 24 }} />
        </View>

        {post ? (
          <FlatList
            data={comments}
            keyExtractor={item => item.id}
            renderItem={renderComment}
            contentContainerStyle={{ padding: 20, paddingBottom: 20 }} // Thêm padding dưới để tránh sát đáy
            ListHeaderComponent={
              <View style={styles.originalPost}>
                <Text style={styles.postAuthor}>{post.authorName}</Text>
                <Text style={styles.postContent}>{post.content}</Text>
              </View>
            }
            ListEmptyComponent={<Text style={{ color: COLORS.textDim, textAlign: 'center', marginTop: 20 }}>Chưa có bình luận nào.</Text>}
          />
        ) : <ActivityIndicator style={{ marginTop: 50 }} color={COLORS.primary} />}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Viết bình luận..."
            placeholderTextColor={COLORS.textDim}
            value={newComment}
            onChangeText={setNewComment}
            // Thêm thuộc tính này để TextInput có thể gõ nhiều dòng
            multiline={true}
            maxLength={300}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSendComment} disabled={sending || !newComment.trim()}>
            {sending ? <ActivityIndicator size="small" color="white" /> : <Send size={20} color="white" />}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: '#333' },
  title: { color: COLORS.text, fontWeight: 'bold', fontSize: 16 },
  originalPost: { backgroundColor: COLORS.card, padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#333' },
  postAuthor: { color: COLORS.primary, fontWeight: 'bold', marginBottom: 5 },
  postContent: { color: COLORS.text, fontSize: 16, lineHeight: 22 },
  commentBox: { marginBottom: 15, padding: 10, backgroundColor: '#1a1a1a', borderRadius: 8 },
  commentAuthor: { color: COLORS.textDim, fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  commentText: { color: COLORS.text, fontSize: 14 },
  inputContainer: { flexDirection: 'row', padding: 15, borderTopWidth: 1, borderColor: '#333', alignItems: 'flex-end' }, // Đổi thành flex-end để ô chat to lên
  input: { flex: 1, backgroundColor: COLORS.card, color: COLORS.text, padding: 12, borderRadius: 20, marginRight: 10, minHeight: 44, maxHeight: 100 }, // Khung chữ tự giãn nở
  sendBtn: { backgroundColor: COLORS.primary, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' }
});