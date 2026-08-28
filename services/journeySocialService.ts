import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  addDoc,
  runTransaction,
  increment,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { ILastJourneyData, IFriendTrip, IRouteCoordinate } from '../interfaces/social';
import { ITrip } from '../interfaces/trip';
import { recordUserStat } from '../utils/badgeHelper';

/**
 * Lấy hành trình gần nhất của người dùng
 */
export const getLastJourney = async (userId: string): Promise<ILastJourneyData | null> => {
  if (!userId) return null;
  try {
    const q = query(
      collection(db, 'users', userId, 'trips'),
      orderBy('startTime', 'desc'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const docSnap = snap.docs[0];
    const data = docSnap.data() as ITrip & { route?: IRouteCoordinate[]; bikeModel?: string };
    const distanceKm = data.distance || 0;
    const durationSeconds = data.duration || 0;
    const progressRatio = Math.min(distanceKm / 50, 1.0); // Chuẩn hóa tiến trình tương đối

    return {
      id: docSnap.id,
      bikeId: data.bikeId,
      bikeModel: data.bikeModel || 'Mô tô',
      startTime: data.startTime,
      endTime: data.endTime,
      distanceKm,
      durationSeconds,
      progressRatio,
      routeCoordinates: data.route || [],
    };
  } catch (error) {
    console.error('Error fetching last journey:', error);
    return null;
  }
};

/**
 * Lấy danh sách các chuyến đi gần nhất của bạn bè trong danh sách friendUids
 */
export const fetchFriendsTrips = async (
  friendUids: string[],
  limitTrips = 10
): Promise<IFriendTrip[]> => {
  if (!friendUids || friendUids.length === 0) return [];
  try {
    const maxFriendsToQuery = friendUids.slice(0, 10);
    const tripPromises = maxFriendsToQuery.map(async (friendUid) => {
      // Lấy thông tin người dùng
      const userRef = doc(db, 'users', friendUid);
      const tripQuery = query(
        collection(db, 'users', friendUid, 'trips'),
        orderBy('startTime', 'desc'),
        limit(2)
      );

      const [userSnap, tripsSnap] = await Promise.all([
        getDoc(userRef),
        getDocs(tripQuery),
      ]);

      const userData = userSnap.exists() ? userSnap.data() : null;
      const userName = userData?.displayName || userData?.name || userData?.email?.split('@')[0] || 'Biker Đồng Đội';
      const userAvatar = userData?.avatarUrl || userData?.photoURL || null;

      return tripsSnap.docs.map((tDoc: QueryDocumentSnapshot) => {
        const tData = tDoc.data() as ITrip & { route?: IRouteCoordinate[]; bikeModel?: string; caption?: string };
        return {
          id: tDoc.id,
          userId: friendUid,
          userName,
          userAvatar,
          bikeModel: tData.bikeModel || (userData?.bike?.model) || 'Mô tô',
          routeCaption: tData.caption || `Đã hoàn thành chặng đường ${(tData.distance || 0).toFixed(1)} km`,
          distanceKm: tData.distance || 0,
          durationSeconds: tData.duration || 0,
          coordinates: tData.route || [],
          createdAt: tData.startTime || Date.now(),
        } as IFriendTrip;
      });
    });

    const nested = await Promise.all(tripPromises);
    const flat = nested.flat();
    flat.sort((a: IFriendTrip, b: IFriendTrip) => b.createdAt - a.createdAt);
    return flat.slice(0, limitTrips);
  } catch (error) {
    console.error('Error fetching friends trips:', error);
    return [];
  }
};

/**
 * Chia sẻ hành trình lên Bảng tin dưới dạng bài viết
 */
export const shareTripToFeed = async (
  userId: string,
  trip: ILastJourneyData,
  caption: string
): Promise<string> => {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== userId) {
    throw new Error('UNAUTHORIZED_OPERATION');
  }

  const postPayload = {
    content: caption || `Hành trình mới hoàn thành: ${trip.distanceKm.toFixed(1)} km`,
    authorId: userId,
    authorName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Biker Mototune',
    authorAvatar: currentUser.photoURL || null,
    mediaUrl: null,
    mediaType: 'trip_map',
    createdAt: Date.now(),
    likesCount: 0,
    commentsCount: 0,
    repostsCount: 0,
    isShared: false,
    tripSummary: {
      tripId: trip.id,
      distance: trip.distanceKm,
      duration: trip.durationSeconds,
      bikeModel: trip.bikeModel || null,
      route: trip.routeCoordinates ? trip.routeCoordinates.slice(0, 30) : [],
    },
  };

  const docRef = await addDoc(collection(db, 'posts'), postPayload);
  await recordUserStat(userId, 'post_creator', 1);
  return docRef.id;
};
