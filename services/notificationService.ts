import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { INotification } from '../interfaces/social';

/**
 * Lắng nghe realtime danh sách thông báo của người dùng
 */
export const subscribeNotifications = (
  userId: string,
  callback: (notifications: INotification[]) => void,
  limitCount = 30
): Unsubscribe => {
  if (!userId) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    limit(limitCount)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      } as INotification));
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      callback(list);
    },
    (error) => {
      console.error('Error subscribing to notifications:', error);
      callback([]);
    }
  );
};

/**
 * Đánh dấu một thông báo là đã đọc
 */
export const markNotificationAsRead = async (
  notificationId: string,
  callerUid: string
): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== callerUid) {
    throw new Error('UNAUTHORIZED_OPERATION');
  }

  const notifRef = doc(db, 'notifications', notificationId);
  const snap = await getDoc(notifRef);
  if (!snap.exists() || snap.data().userId !== callerUid) {
    throw new Error('UNAUTHORIZED_OPERATION');
  }
  await updateDoc(notifRef, { isRead: true });
};

/**
 * Đánh dấu tất cả thông báo của người dùng là đã đọc
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== userId) {
    throw new Error('UNAUTHORIZED_OPERATION');
  }

  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    where('isRead', '==', false),
    limit(50)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return;

  const batch = writeBatch(db);
  snapshot.docs.forEach((d) => {
    batch.update(d.ref, { isRead: true });
  });

  await batch.commit();
};

/**
 * Tạo thông báo liên quan đến đơn hàng Chợ Biker
 */
export const createMarketplaceNotification = async (
  userId: string,
  type: string,
  message: string,
  targetId: string
): Promise<void> => {
  if (!userId) return;
  const currentAuth = auth.currentUser;
  const senderName = currentAuth?.displayName || currentAuth?.email?.split('@')[0] || 'Hệ thống MotoTune';
  const senderAvatar = currentAuth?.photoURL || null;

  await addDoc(collection(db, 'notifications'), {
    userId,
    senderId: currentAuth?.uid || 'system',
    senderName,
    senderAvatar,
    type: 'marketplace',
    title: 'Thông báo Chợ Biker',
    message,
    targetId,
    isRead: false,
    createdAt: Date.now(),
  });
};

