import {
  collection,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { IFriendship, IUserSummary, TFriendshipStatus, INotification } from '../interfaces/social';

export const getFriendshipCompositeId = (userA: string, userB: string): string => {
  return [userA, userB].sort().join('_');
};

/**
 * Gửi lời mời kết bạn 2 chiều với kiểm tra bảo mật chống trùng lặp và tự kết bạn
 */
export const sendFriendRequest = async (
  senderId: string,
  receiverId: string,
  senderInfo: IUserSummary,
  receiverInfo: IUserSummary
): Promise<string> => {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== senderId) {
    throw new Error('UNAUTHORIZED_OPERATION');
  }
  if (!senderId || !receiverId || senderId === receiverId) {
    throw new Error('INVALID_USER_IDS');
  }

  const friendshipId = getFriendshipCompositeId(senderId, receiverId);
  const friendshipRef = doc(db, 'friendships', friendshipId);
  const notifRef = doc(collection(db, 'notifications'));

  await runTransaction(db, async (transaction) => {
    const existingDoc = await transaction.get(friendshipRef);
    if (existingDoc.exists()) {
      const data = existingDoc.data() as IFriendship;
      if (data.status === 'accepted') {
        throw new Error('ALREADY_FRIENDS');
      }
      if (data.status === 'pending') {
        throw new Error('REQUEST_ALREADY_PENDING');
      }
    }

    const now = Date.now();
    const sortedUsers: [string, string] = [senderId, receiverId].sort() as [string, string];

    const friendshipData: IFriendship = {
      id: friendshipId,
      users: sortedUsers,
      senderId,
      receiverId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      usersInfo: {
        [senderId]: {
          displayName: senderInfo.displayName || 'Biker',
          avatarUrl: senderInfo.avatarUrl || null,
        },
        [receiverId]: {
          displayName: receiverInfo.displayName || 'Biker',
          avatarUrl: receiverInfo.avatarUrl || null,
        },
      },
    };

    const notificationData: Omit<INotification, 'id'> = {
      userId: receiverId,
      senderId,
      senderName: senderInfo.displayName || 'Biker',
      senderAvatar: senderInfo.avatarUrl || null,
      type: 'friend_request',
      title: 'Lời mời kết bạn',
      message: `${senderInfo.displayName || 'Một Biker'} đã gửi cho bạn lời mời kết bạn.`,
      targetId: friendshipId,
      isRead: false,
      createdAt: now,
    };

    transaction.set(friendshipRef, friendshipData);
    transaction.set(notifRef, notificationData);
  });

  return friendshipId;
};

/**
 * Chấp nhận lời mời kết bạn (Bảo mật: chỉ người nhận mới có quyền chấp nhận)
 */
export const acceptFriendRequest = async (
  friendshipId: string,
  callerUid: string
): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== callerUid) {
    throw new Error('UNAUTHORIZED_OPERATION');
  }

  const friendshipRef = doc(db, 'friendships', friendshipId);
  const notifRef = doc(collection(db, 'notifications'));

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(friendshipRef);
    if (!snapshot.exists()) {
      throw new Error('FRIENDSHIP_NOT_FOUND');
    }

    const data = snapshot.data() as IFriendship;
    if (data.receiverId !== callerUid) {
      throw new Error('UNAUTHORIZED_RECEIVER');
    }
    if (data.status === 'accepted') {
      return;
    }

    const now = Date.now();
    transaction.update(friendshipRef, {
      status: 'accepted',
      updatedAt: now,
    });

    const receiverName = data.usersInfo[callerUid]?.displayName || 'Người dùng';
    const receiverAvatar = data.usersInfo[callerUid]?.avatarUrl || null;

    const notificationData: Omit<INotification, 'id'> = {
      userId: data.senderId,
      senderId: callerUid,
      senderName: receiverName,
      senderAvatar: receiverAvatar,
      type: 'friend_accept',
      title: 'Đã chấp nhận kết bạn',
      message: `${receiverName} đã đồng ý lời mời kết bạn của bạn.`,
      targetId: friendshipId,
      isRead: false,
      createdAt: now,
    };

    transaction.set(notifRef, notificationData);
  });
};

/**
 * Từ chối lời mời kết bạn
 */
export const declineFriendRequest = async (
  friendshipId: string,
  callerUid: string
): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== callerUid) {
    throw new Error('UNAUTHORIZED_OPERATION');
  }

  const friendshipRef = doc(db, 'friendships', friendshipId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(friendshipRef);
    if (!snapshot.exists()) return;

    const data = snapshot.data() as IFriendship;
    if (data.receiverId !== callerUid) {
      throw new Error('UNAUTHORIZED_RECEIVER');
    }

    transaction.delete(friendshipRef);
  });
};

/**
 * Thu hồi lời mời kết bạn đã gửi
 */
export const revokeFriendRequest = async (
  friendshipId: string,
  callerUid: string
): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== callerUid) {
    throw new Error('UNAUTHORIZED_OPERATION');
  }

  const friendshipRef = doc(db, 'friendships', friendshipId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(friendshipRef);
    if (!snapshot.exists()) return;

    const data = snapshot.data() as IFriendship;
    if (data.senderId !== callerUid || data.status !== 'pending') {
      throw new Error('UNAUTHORIZED_SENDER');
    }

    transaction.delete(friendshipRef);
  });
};

/**
 * Hủy kết bạn (Chỉ một trong 2 người trong quan hệ mới có quyền)
 */
export const unfriend = async (
  friendshipId: string,
  callerUid: string
): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== callerUid) {
    throw new Error('UNAUTHORIZED_OPERATION');
  }

  const friendshipRef = doc(db, 'friendships', friendshipId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(friendshipRef);
    if (!snapshot.exists()) return;

    const data = snapshot.data() as IFriendship;
    if (!data.users.includes(callerUid)) {
      throw new Error('UNAUTHORIZED_USER');
    }

    transaction.delete(friendshipRef);
  });
};

/**
 * Lấy trạng thái quan hệ giữa User A và User B
 */
export const getFriendshipStatus = async (
  userA: string,
  userB: string
): Promise<{ status: TFriendshipStatus; friendshipId: string | null }> => {
  if (!userA || !userB || userA === userB) {
    return { status: 'none', friendshipId: null };
  }

  const friendshipId = getFriendshipCompositeId(userA, userB);
  const snapshot = await getDoc(doc(db, 'friendships', friendshipId));

  if (!snapshot.exists()) {
    return { status: 'none', friendshipId: null };
  }

  const data = snapshot.data() as IFriendship;
  if (data.status === 'accepted') {
    return { status: 'friends', friendshipId };
  }
  if (data.status === 'pending') {
    return {
      status: data.senderId === userA ? 'pending_sent' : 'pending_received',
      friendshipId,
    };
  }

  return { status: 'none', friendshipId: null };
};

/**
 * Lắng nghe realtime danh sách bạn bè đã chấp nhận
 */
export const subscribeFriends = (
  userId: string,
  callback: (friends: IFriendship[]) => void
): Unsubscribe => {
  if (!userId) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, 'friendships'),
    where('users', 'array-contains', userId),
    where('status', '==', 'accepted'),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as IFriendship));
      callback(list);
    },
    (error) => {
      console.error('Error subscribing to friends:', error);
      callback([]);
    }
  );
};

/**
 * Lắng nghe realtime danh sách lời mời kết bạn nhận được đang chờ duyệt
 */
export const subscribePendingReceivedRequests = (
  userId: string,
  callback: (requests: IFriendship[]) => void
): Unsubscribe => {
  if (!userId) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, 'friendships'),
    where('receiverId', '==', userId),
    where('status', '==', 'pending'),
    limit(30)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as IFriendship));
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      callback(list);
    },
    (error) => {
      console.error('Error subscribing to pending requests:', error);
      callback([]);
    }
  );
};

/**
 * Đếm số lượng bạn bè
 */
export const fetchFriendsCount = async (userId: string): Promise<number> => {
  if (!userId) return 0;
  const q = query(
    collection(db, 'friendships'),
    where('users', 'array-contains', userId),
    where('status', '==', 'accepted'),
    limit(100)
  );
  const snap = await getDocs(q);
  return snap.size;
};
