import { doc, increment, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

export const recordUserStat = async (
  userId: string,
  statId: string,
  amount: number = 1
): Promise<void> => {
  if (!userId || auth.currentUser?.uid !== userId || amount > 10 || amount <= 0) {
    return;
  }
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(
      userRef,
      {
        stats: {
          [statId]: increment(amount),
        },
      },
      { merge: true }
    );
  } catch (error) {
    console.error('[BadgeHelper] Error recording user stat:', error);
  }
};