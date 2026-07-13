import { create } from 'zustand';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { IBike } from '../interfaces/bike';

interface IAppState {
  currentUser: FirebaseUser | null;
  bikes: IBike[];
  activeBikeIndex: number;
  loading: boolean;
  initialized: boolean;
  initAuthListener: () => () => void;
  setActiveBikeIndex: (index: number) => Promise<void>;
  updateBikeInStore: (updatedBike: IBike) => Promise<void>;
}

export const useAppStore = create<IAppState>((set, get) => {
  let unsubscribeDoc: (() => void) | null = null;

  return {
    currentUser: null,
    bikes: [],
    activeBikeIndex: 0,
    loading: true,
    initialized: false,

    initAuthListener: () => {
      if (get().initialized) {
        return () => {};
      }

      set({ initialized: true });

      const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        set({ currentUser: user });

        if (unsubscribeDoc) {
          unsubscribeDoc();
          unsubscribeDoc = null;
        }

        if (user) {
          set({ loading: true });
          unsubscribeDoc = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              let userBikes = data.bikes as IBike[] || [];
              let activeIdx = data.activeBikeIndex ?? 0;

              // Self-healing migration path for single legacy bike users
              if (userBikes.length === 0 && data.bike) {
                const legacyBike = { id: 'default', ...data.bike };
                userBikes = [legacyBike];
                activeIdx = 0;
                setDoc(doc(db, 'users', user.uid), { 
                  bikes: userBikes, 
                  activeBikeIndex: activeIdx 
                }, { merge: true });
              }

              set({ bikes: userBikes, activeBikeIndex: activeIdx, loading: false });
            } else {
              set({ bikes: [], activeBikeIndex: 0, loading: false });
            }
          }, (err) => {
            console.error("Firestore user doc listen error:", err);
            set({ loading: false });
          });
        } else {
          set({ bikes: [], activeBikeIndex: 0, loading: false });
        }
      });

      return () => {
        unsubscribeAuth();
        if (unsubscribeDoc) {
          unsubscribeDoc();
        }
      };
    },

    setActiveBikeIndex: async (index: number) => {
      const user = get().currentUser;
      const bikes = get().bikes;
      if (user && bikes[index]) {
        set({ activeBikeIndex: index });
        await setDoc(doc(db, 'users', user.uid), { 
          activeBikeIndex: index,
          bike: bikes[index] // Keep legacy single bike field synced
        }, { merge: true });
      }
    },

    updateBikeInStore: async (updatedBike: IBike) => {
      const user = get().currentUser;
      if (user) {
        const currentBikes = get().bikes;
        const updatedBikes = currentBikes.map(b => b.id === updatedBike.id ? updatedBike : b);
        
        const activeIdx = get().activeBikeIndex;
        const updateData: any = { bikes: updatedBikes };
        
        if (updatedBikes[activeIdx]?.id === updatedBike.id) {
          updateData.bike = updatedBike;
        }

        await setDoc(doc(db, 'users', user.uid), updateData, { merge: true });
      }
    }
  };
});
