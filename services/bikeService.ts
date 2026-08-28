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
import { IBike, IMaintenanceStatus, MaintenancePartKey } from '../interfaces/bike';
import { IServiceLog } from '../interfaces/serviceLog';
import { ITrip } from '../interfaces/trip';
import { uploadToCloudinary } from './cloudinaryService';
import { recordUserStat } from '../utils/badgeHelper';
import { DEFAULT_MAINTENANCE_STATUS } from '../constants/garage';

const REMOVE_BG_API_KEY = process.env.EXPO_PUBLIC_REMOVE_BG_API_KEY;

const verifyUserOwnership = (uid: string): void => {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    throw new Error('UNAUTHORIZED_OPERATION');
  }
};

const isFiniteNumber = (val: unknown): val is number => {
  return typeof val === 'number' && Number.isFinite(val) && !Number.isNaN(val);
};

/**
 * Normalizes a maintenance object, filling missing keys with 0 and mapping legacy keys
 */
export const normalizeMaintenanceStatus = (
  raw?: Partial<IMaintenanceStatus> | null,
  legacyLastOil?: number
): IMaintenanceStatus => {
  const base = { ...DEFAULT_MAINTENANCE_STATUS };
  if (!raw && typeof legacyLastOil !== 'number') return base;

  const rawObj = raw || {};
  const legacyBrakes = isFiniteNumber(rawObj.brakes) ? rawObj.brakes : 0;
  const legacyOil = isFiniteNumber(rawObj.oil)
    ? rawObj.oil
    : (isFiniteNumber(legacyLastOil) ? legacyLastOil : 0);

  return {
    oil: isFiniteNumber(rawObj.oil) ? rawObj.oil : legacyOil,
    oilFilter: isFiniteNumber(rawObj.oilFilter) ? rawObj.oilFilter : 0,
    airFilter: isFiniteNumber(rawObj.airFilter) ? rawObj.airFilter : 0,
    sparkPlug: isFiniteNumber(rawObj.sparkPlug) ? rawObj.sparkPlug : 0,
    coolant: isFiniteNumber(rawObj.coolant) ? rawObj.coolant : 0,
    fuelInjector: isFiniteNumber(rawObj.fuelInjector) ? rawObj.fuelInjector : 0,
    chain: isFiniteNumber(rawObj.chain) ? rawObj.chain : 0,
    belt: isFiniteNumber(rawObj.belt) ? rawObj.belt : 0,
    clutch: isFiniteNumber(rawObj.clutch) ? rawObj.clutch : 0,
    gearOil: isFiniteNumber(rawObj.gearOil) ? rawObj.gearOil : 0,
    rollers: isFiniteNumber(rawObj.rollers) ? rawObj.rollers : 0,
    frontBrake: isFiniteNumber(rawObj.frontBrake) ? rawObj.frontBrake : legacyBrakes,
    rearBrake: isFiniteNumber(rawObj.rearBrake) ? rawObj.rearBrake : legacyBrakes,
    brakeFluid: isFiniteNumber(rawObj.brakeFluid) ? rawObj.brakeFluid : 0,
    brakeRotor: isFiniteNumber(rawObj.brakeRotor) ? rawObj.brakeRotor : 0,
    frontTire: isFiniteNumber(rawObj.frontTire) ? rawObj.frontTire : 0,
    frontFork: isFiniteNumber(rawObj.frontFork) ? rawObj.frontFork : 0,
    rearShock: isFiniteNumber(rawObj.rearShock) ? rawObj.rearShock : 0,
    steeringBearing: isFiniteNumber(rawObj.steeringBearing) ? rawObj.steeringBearing : 0,
    battery: isFiniteNumber(rawObj.battery) ? rawObj.battery : 0,
    headlight: isFiniteNumber(rawObj.headlight) ? rawObj.headlight : 0,
    cables: isFiniteNumber(rawObj.cables) ? rawObj.cables : 0,
  };
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
      brand: (brand || '').trim(),
      model: (model || '').trim(),
      nickname: (nickname || '').trim() || model,
      odo: 0,
      maintenance: { ...DEFAULT_MAINTENANCE_STATUS },
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
  const sanitizedOdo = Math.max(0, Math.min(1000000, Math.floor(newOdo) || 0));
  await updateBike(uid, { ...bikeObj, odo: sanitizedOdo });
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

    const normalizedBike: IBike = {
      ...updatedBike,
      odo: Math.max(0, Math.min(1000000, Math.floor(updatedBike.odo) || 0)),
      maintenance: normalizeMaintenanceStatus(
        updatedBike.maintenance,
        updatedBike.lastOilChangeOdo
      ),
    };

    const updatedBikes = bikes.map((b) => {
      const bikeId = b.id || 'default';
      if (bikeId === normalizedBike.id) {
        return normalizedBike;
      }
      return b;
    });

    const updateData: Record<string, unknown> = { bikes: updatedBikes };

    if (
      bikes[activeIndex]?.id === normalizedBike.id ||
      (activeIndex === 0 && normalizedBike.id === 'default')
    ) {
      updateData.bike = normalizedBike;
    }

    transaction.set(userDocRef, updateData, { merge: true });
  });
};

export interface IReplaceMaintenancePartParams {
  bikeId: string;
  partId: MaintenancePartKey | string;
  partName: string;
  price: number;
  note: string;
  odoAtService?: number;
}

/**
 * Atomically updates a bike's maintenance status ODO and adds a service log
 */
export const replaceMaintenancePart = async (
  uid: string,
  params: IReplaceMaintenancePartParams
): Promise<{ updatedBike: IBike; logId: string }> => {
  verifyUserOwnership(uid);

  const sanitizedPrice = Math.max(0, Math.min(500000000, Math.floor(params.price) || 0));
  const sanitizedNote = (params.note || '').replace(/[<>'"]/g, '').trim().slice(0, 250);
  const sanitizedPartName = (params.partName || '').replace(/[<>'"]/g, '').trim().slice(0, 100);

  const userDocRef = doc(db, 'users', uid);
  const newLogRef = doc(collection(db, 'users', uid, 'service_logs'));

  let resultBike: IBike | null = null;

  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userDocRef);
    if (!userDoc.exists()) {
      throw new Error('USER_NOT_FOUND');
    }

    const data = userDoc.data();
    let bikes = (data.bikes as IBike[]) || [];
    const activeIndex = data.activeBikeIndex ?? 0;

    if (bikes.length === 0 && data.bike) {
      bikes = [{ id: 'default', ...data.bike }];
    }

    const targetIndex = bikes.findIndex((b) => (b.id || 'default') === params.bikeId);
    if (targetIndex === -1) {
      throw new Error('BIKE_NOT_FOUND');
    }

    const targetBike = bikes[targetIndex];
    const serviceOdo = typeof params.odoAtService === 'number'
      ? Math.max(0, Math.min(1000000, Math.floor(params.odoAtService)))
      : Math.max(0, Math.floor(targetBike.odo) || 0);

    const normalizedMaintenance = normalizeMaintenanceStatus(
      targetBike.maintenance,
      targetBike.lastOilChangeOdo
    );

    const updatedMaintenance: IMaintenanceStatus = {
      ...normalizedMaintenance,
      [params.partId]: serviceOdo,
    };

    const updatedBike: IBike = {
      ...targetBike,
      odo: Math.max(targetBike.odo || 0, serviceOdo),
      maintenance: updatedMaintenance,
      ...(params.partId === 'oil' ? { lastOilChangeOdo: serviceOdo } : {}),
    };

    bikes[targetIndex] = updatedBike;

    const newLog: IServiceLog = {
      id: newLogRef.id,
      bikeId: params.bikeId,
      part: sanitizedPartName,
      partKey: params.partId as MaintenancePartKey,
      price: sanitizedPrice,
      note: sanitizedNote,
      createdAt: Date.now(),
      odoAtService: serviceOdo,
    };

    transaction.set(newLogRef, newLog);

    const updatePayload: Record<string, unknown> = { bikes };
    if (
      bikes[activeIndex]?.id === updatedBike.id ||
      (activeIndex === 0 && updatedBike.id === 'default')
    ) {
      updatePayload.bike = updatedBike;
    }

    transaction.set(userDocRef, updatePayload, { merge: true });
    resultBike = updatedBike;
  });

  if (!resultBike) {
    throw new Error('TRANSACTION_FAILED');
  }

  try {
    await recordUserStat(uid, 'rich_biker', sanitizedPrice);
    await recordUserStat(uid, 'custom_tuner', 1);
  } catch (statError) {
    console.error('Failed to update user badges:', statError);
  }

  return { updatedBike: resultBike, logId: newLogRef.id };
};

/**
 * Adds a new maintenance record to the user's service log history
 */
export const addServiceLog = async (
  uid: string,
  log: Omit<IServiceLog, 'id'>
): Promise<string> => {
  verifyUserOwnership(uid);
  const sanitizedLog = {
    ...log,
    part: (log.part || '').replace(/[<>'"]/g, '').trim().slice(0, 100),
    price: Math.max(0, Math.min(500000000, Math.floor(log.price) || 0)),
    note: (log.note || '').replace(/[<>'"]/g, '').trim().slice(0, 250),
    odoAtService: Math.max(0, Math.min(1000000, Math.floor(log.odoAtService) || 0)),
    createdAt: log.createdAt || Date.now(),
  };
  const docRef = await addDoc(
    collection(db, 'users', uid, 'service_logs'),
    sanitizedLog
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
  limitCount = 50
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

  // Remove potential data URI prefix if present so remove.bg receives raw base64
  const rawBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

  if (onStatusChange) onStatusChange('A.I đang tách nền...');
  const removeBgUrl = 'https://api.remove.bg/v1.0/removebg';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

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
        image_file_b64: rawBase64,
        size: 'auto',
      }),
    });

    if (!responseRemoveBg.ok) {
      let errorMessage = 'Remove.bg API rejected the image.';
      try {
        const errData = await responseRemoveBg.json();
        errorMessage = errData.errors?.[0]?.title || errData.message || errorMessage;
      } catch {
        errorMessage = `Remove.bg error (Status ${responseRemoveBg.status})`;
      }
      throw new Error(errorMessage);
    }

    const dataRemoveBg = await responseRemoveBg.json();
    const cutoutBase64 = dataRemoveBg.data?.result_b64;

    if (!cutoutBase64) {
      throw new Error('Không nhận được dữ liệu ảnh tách nền từ server A.I');
    }

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


