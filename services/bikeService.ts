import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc, addDoc, deleteDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { IBike } from '../interfaces/bike';
import { IServiceLog } from '../interfaces/serviceLog';
import { ITrip } from '../interfaces/trip';
import { uploadToCloudinary } from './cloudinaryService';
import { recordUserStat } from '../utils/badgeHelper';

const REMOVE_BG_API_KEY = process.env.EXPO_PUBLIC_REMOVE_BG_API_KEY;

/**
 * Saves a new bike object to a user's Firestore document in the multiple bikes array
 * @param uid User ID
 * @param brand Bike Brand (e.g. Honda)
 * @param model Bike Model (e.g. Winner X)
 * @param nickname User's custom nickname for their bike
 */
export const saveBike = async (uid: string, brand: string, model: string, nickname: string): Promise<void> => {
  const userDocRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userDocRef);
  
  let bikes: IBike[] = [];
  let activeBikeIndex = 0;

  if (userDoc.exists()) {
    const data = userDoc.data();
    bikes = data.bikes as IBike[] || [];
    
    // Migrate single legacy bike to array if array is empty
    if (bikes.length === 0 && data.bike) {
      bikes = [{ id: 'default', ...data.bike }];
    }
  }

  if (bikes.length >= 5) {
    throw new Error("Bạn chỉ có thể thêm tối đa 5 xe.");
  }

  const newBike: IBike = {
    id: Date.now().toString(),
    brand,
    model,
    nickname: nickname || model,
    odo: 0,
    maintenance: { oil: 0, airFilter: 0, sparkPlug: 0, coolant: 0, chain: 0, brakes: 0 }
  };

  bikes.push(newBike);
  activeBikeIndex = bikes.length - 1;

  await setDoc(userDocRef, { 
    bikes, 
    activeBikeIndex,
    // Keep legacy single bike field synced to support old code references
    bike: newBike 
  }, { merge: true });
};

/**
 * Updates a bike's ODO reading in Firestore inside the bikes array
 * @param uid User ID
 * @param bikeObj Current bike object state
 * @param newOdo New ODO value in km
 */
export const updateOdo = async (uid: string, bikeObj: IBike, newOdo: number): Promise<void> => {
  await updateBike(uid, { ...bikeObj, odo: newOdo });
};

/**
 * Updates any specific properties of the user's bike inside the bikes array in Firestore
 * @param uid User ID
 * @param updatedBike Updated bike object
 */
export const updateBike = async (uid: string, updatedBike: IBike): Promise<void> => {
  const userDocRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userDocRef);
  
  if (userDoc.exists()) {
    const data = userDoc.data();
    let bikes = data.bikes as IBike[] || [];
    const activeIndex = data.activeBikeIndex ?? 0;

    // Migrate if needed
    if (bikes.length === 0 && data.bike) {
      bikes = [{ id: 'default', ...data.bike }];
    }

    const updatedBikes = bikes.map((b) => {
      // Map legacy bike id 'default' if it doesn't have an ID
      const bikeId = b.id || 'default';
      if (bikeId === updatedBike.id) {
        return updatedBike;
      }
      return b;
    });

    const updateData: any = { bikes: updatedBikes };
    
    // Sync with legacy single bike field if the active bike is updated
    if (bikes[activeIndex]?.id === updatedBike.id || (activeIndex === 0 && updatedBike.id === 'default')) {
      updateData.bike = updatedBike;
    }

    await setDoc(userDocRef, updateData, { merge: true });
  }
};

/**
 * Adds a new maintenance record to the user's service log history
 * @param uid User ID
 * @param log Maintenance service log object (excluding ID)
 * @returns Generated Firestore document ID
 */
export const addServiceLog = async (uid: string, log: Omit<IServiceLog, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'users', uid, 'service_logs'), log);
  return docRef.id;
};

/**
 * Deletes a maintenance service log record by ID
 * @param uid User ID
 * @param logId ID of the log record to delete
 */
export const deleteServiceLog = async (uid: string, logId: string): Promise<void> => {
  await deleteDoc(doc(db, 'users', uid, 'service_logs', logId));
};

/**
 * Fetches all past trip history records for a user, sorted newest first
 * @param uid User ID
 * @returns Array of Trip objects
 */
export const fetchTripHistory = async (uid: string): Promise<ITrip[]> => {
  const q = query(collection(db, 'users', uid, 'trips'), orderBy('startTime', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ITrip));
};

/**
 * Fetches all past maintenance log records for a user's bike, sorted newest first
 * @param uid User ID
 * @returns Array of ServiceLog objects
 */
export const fetchServiceLogs = async (uid: string): Promise<IServiceLog[]> => {
  const q = query(collection(db, 'users', uid, 'service_logs'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IServiceLog));
};

/**
 * Processes a raw photo base64 string, removes background (AI), uploads to Cloudinary, and saves to Firestore
 * @param uid User ID
 * @param bikeObj Current bike state
 * @param base64Image Raw base64 image data
 * @param onStatusChange Optional callback to report upload status
 * @returns Cloudinary secure URL of the cropped cutout image
 */
export const handleUploadCutoutAndSave = async (
  uid: string,
  bikeObj: IBike,
  base64Image: string,
  onStatusChange?: (status: string) => void
): Promise<string> => {
  if (!REMOVE_BG_API_KEY || REMOVE_BG_API_KEY.includes('DÁN_API_KEY')) {
    throw new Error('Remove.bg API Key is not configured correctly in .env.');
  }

  if (onStatusChange) onStatusChange('A.I đang tách nền...');
  const removeBgUrl = 'https://api.remove.bg/v1.0/removebg';
  const responseRemoveBg = await fetch(removeBgUrl, {
    method: 'POST',
    headers: {
      'X-Api-Key': REMOVE_BG_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      image_file_b64: base64Image,
      size: 'auto'
    }),
  });

  if (!responseRemoveBg.ok) {
    const errData = await responseRemoveBg.json();
    throw new Error(errData.errors?.[0]?.title || "Remove.bg API rejected the image.");
  }

  const dataRemoveBg = await responseRemoveBg.json();
  const cutoutBase64 = dataRemoveBg.data.result_b64;

  if (onStatusChange) onStatusChange('Đang tải lên mây...');
  // Upload to Cloudinary using base64 data URI schema
  const cloudinaryUrl = await uploadToCloudinary(`data:image/png;base64,${cutoutBase64}`, 'image');

  if (onStatusChange) onStatusChange('Đang ghi dữ liệu...');
  // Record user stat points for badges
  await recordUserStat(uid, 'showroom_designer', 1);
  
  // Save updated bike model back to Firebase
  const updatedBike = { ...bikeObj, aiCutoutUrl: cloudinaryUrl };
  await updateBike(uid, updatedBike);

  return cloudinaryUrl;
};

/**
 * Deletes a bike by ID from the user's bikes array in Firestore
 * @param uid User ID
 * @param bikeId ID of the bike to delete
 */
export const deleteBike = async (uid: string, bikeId: string): Promise<void> => {
  const userDocRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userDocRef);
  if (userDoc.exists()) {
    const data = userDoc.data();
    let bikes = data.bikes as IBike[] || [];
    
    // Migrate if needed
    if (bikes.length === 0 && data.bike) {
      bikes = [{ id: 'default', ...data.bike }];
    }

    const updatedBikes = bikes.filter(b => (b.id || 'default') !== bikeId);
    
    // Adjust activeBikeIndex if it's out of bounds
    let newActiveIndex = data.activeBikeIndex ?? 0;
    if (newActiveIndex >= updatedBikes.length) {
      newActiveIndex = Math.max(0, updatedBikes.length - 1);
    }

    const updateData: any = {
      bikes: updatedBikes,
      activeBikeIndex: newActiveIndex
    };

    // Sync legacy single bike field
    if (updatedBikes.length > 0) {
      updateData.bike = updatedBikes[newActiveIndex];
    } else {
      updateData.bike = null;
    }

    await setDoc(userDocRef, updateData, { merge: true });
  }
};

