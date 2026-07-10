import { doc, increment, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const recordUserStat = async (userId: string, statId: string, amount: number = 1) => {
  if (!userId) return;
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      stats: {
        [statId]: increment(amount)
      }
    }, { merge: true });
  } catch (error) {
    console.error("Lỗi cập nhật chỉ số:", error);
  }
};