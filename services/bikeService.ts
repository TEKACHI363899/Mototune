import { db, auth } from '../firebaseConfig';
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  runTransaction,
} from 'firebase/firestore';
import { IBike } from '../interfaces/bike';
import { IServiceLog } from '../interfaces/serviceLog';
import { ITrip } from '../interfaces/trip';
import { uploadToCloudinary } from './cloudinaryService';
import { recordUserStat } from '../utils/badgeHelper';

const REMOVE_BG_API_KEY = process.env.EXPO_PUBLIC_REMOVE_BG_API_KEY;

const verifyUserOwnership = (uid: string): void => {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    throw new Error('UNAUTHORIZED_OPERATION');
  }
};

/**
 * Saves a new bike object to a user's Firestore document in the multiple bikes array
 */
export const saveBike = async (
  uid: string,
  brand: string,
  model: string,
  nickname: string
): Promise<void> => {
  verifyUserOwnership(uid);
  const userDocRef = doc(db, 'users', uid);

  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userDocRef);
    let bikes: IBike[] = [];

    if (userDoc.exists()) {
      const data = userDoc.data();
      bikes = (data.bikes as IBike[]) || [];

      if (bikes.length === 0 && data.bike) {
        bikes = [{ id: 'default', ...data.bike }];
      }
    }

    if (bikes.length >= 5) {
      throw new Error('Bạn chỉ có thể thêm tối đa 5 xe.');
    }

    const newBike: IBike = {
      id: Date.now().toString(),
      brand,
      model,
      nickname: nickname || model,
      odo: 0,
      maintenance: {
        oil: 0,
        airFilter: 0,
        sparkPlug: 0,
        coolant: 0,
        chain: 0,
        brakes: 0,
      },
    };

    bikes.push(newBike);
    const activeBikeIndex = bikes.length - 1;

    transaction.set(
      userDocRef,
      {
        bikes,
        activeBikeIndex,
        bike: newBike,
      },
      { merge: true }
    );
  });
};

/**
 * Updates a bike's ODO reading in Firestore inside the bikes array
 */
export const updateOdo = async (
  uid: string,
  bikeObj: IBike,
  newOdo: number
): Promise<void> => {
  await updateBike(uid, { ...bikeObj, odo: newOdo });
};

/**
 * Updates any specific properties of the user's bike inside the bikes array in Firestore
 */
export const updateBike = async (
  uid: string,
  updatedBike: IBike
): Promise<void> => {
  verifyUserOwnership(uid);
  const userDocRef = doc(db, 'users', uid);

  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userDocRef);
    if (!userDoc.exists()) return;

    const data = userDoc.data();
    let bikes = (data.bikes as IBike[]) || [];
    const activeIndex = data.activeBikeIndex ?? 0;

    if (bikes.length === 0 && data.bike) {
      bikes = [{ id: 'default', ...data.bike }];
    }

    const updatedBikes = bikes.map((b) => {
      const bikeId = b.id || 'default';
      if (bikeId === updatedBike.id) {
        return updatedBike;
      }
      return b;
    });

    const updateData: Record<string, unknown> = { bikes: updatedBikes };

    if (
      bikes[activeIndex]?.id === updatedBike.id ||
      (activeIndex === 0 && updatedBike.id === 'default')
    ) {
      updateData.bike = updatedBike;
    }

    transaction.set(userDocRef, updateData, { merge: true });
  });
};

/**
 * Adds a new maintenance record to the user's service log history
 */
export const addServiceLog = async (
  uid: string,
  log: Omit<IServiceLog, 'id'>
): Promise<string> => {
  verifyUserOwnership(uid);
  const docRef = await addDoc(
    collection(db, 'users', uid, 'service_logs'),
    log
  );
  return docRef.id;
};

/**
 * Deletes a maintenance service log record by ID
 */
export const deleteServiceLog = async (
  uid: string,
  logId: string
): Promise<void> => {
  verifyUserOwnership(uid);
  await deleteDoc(doc(db, 'users', uid, 'service_logs', logId));
};

/**
 * Fetches past trip history records for a user, sorted newest first
 */
export const fetchTripHistory = async (
  uid: string,
  limitCount = 20
): Promise<ITrip[]> => {
  const q = query(
    collection(db, 'users', uid, 'trips'),
    orderBy('startTime', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ITrip));
};

/**
 * Fetches past maintenance log records for a user's bike, sorted newest first
 */
export const fetchServiceLogs = async (
  uid: string,
  limitCount = 20
): Promise<IServiceLog[]> => {
  const q = query(
    collection(db, 'users', uid, 'service_logs'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as IServiceLog));
};

/**
 * Processes a raw photo base64 string, removes background (AI), uploads to Cloudinary, and saves to Firestore
 */
export const handleUploadCutoutAndSave = async (
  uid: string,
  bikeObj: IBike,
  base64Image: string,
  onStatusChange?: (status: string) => void
): Promise<string> => {
  verifyUserOwnership(uid);

  if (!REMOVE_BG_API_KEY || REMOVE_BG_API_KEY.includes('DÁN_API_KEY')) {
    throw new Error('Remove.bg API Key is not configured correctly in .env.');
  }

  if (onStatusChange) onStatusChange('A.I đang tách nền...');
  const removeBgUrl = 'https://api.remove.bg/v1.0/removebg';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

  try {
    const responseRemoveBg = await fetch(removeBgUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'X-Api-Key': REMOVE_BG_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        image_file_b64: base64Image,
        size: 'auto',
      }),
    });

    if (!responseRemoveBg.ok) {
      const errData = await responseRemoveBg.json();
      throw new Error(
        errData.errors?.[0]?.title || 'Remove.bg API rejected the image.'
      );
    }

    const dataRemoveBg = await responseRemoveBg.json();
    const cutoutBase64 = dataRemoveBg.data.result_b64;

    if (onStatusChange) onStatusChange('Đang tải lên mây...');
    const cloudinaryUrl = await uploadToCloudinary(
      `data:image/png;base64,${cutoutBase64}`,
      'image'
    );

    if (onStatusChange) onStatusChange('Đang ghi dữ liệu...');
    await recordUserStat(uid, 'showroom_designer', 1);

    const updatedBike = { ...bikeObj, aiCutoutUrl: cloudinaryUrl };
    await updateBike(uid, updatedBike);

    return cloudinaryUrl;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Deletes a bike by ID from the user's bikes array in Firestore
 */
export const deleteBike = async (uid: string, bikeId: string): Promise<void> => {
  verifyUserOwnership(uid);
  const userDocRef = doc(db, 'users', uid);

  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userDocRef);
    if (!userDoc.exists()) return;

    const data = userDoc.data();
    let bikes = (data.bikes as IBike[]) || [];

    if (bikes.length === 0 && data.bike) {
      bikes = [{ id: 'default', ...data.bike }];
    }

    const updatedBikes = bikes.filter((b) => (b.id || 'default') !== bikeId);
    let newActiveIndex = data.activeBikeIndex ?? 0;
    if (newActiveIndex >= updatedBikes.length) {
      newActiveIndex = Math.max(0, updatedBikes.length - 1);
    }

    const updateData: Record<string, unknown> = {
      bikes: updatedBikes,
      activeBikeIndex: newActiveIndex,
      bike: updatedBikes.length > 0 ? updatedBikes[newActiveIndex] : null,
    };

    transaction.set(userDocRef, updateData, { merge: true });
  });
};

