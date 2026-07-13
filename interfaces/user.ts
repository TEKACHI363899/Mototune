import { IBike } from './bike';

export interface IUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  avatarUrl?: string; // Sync with profile updates
  bikes?: IBike[];
  activeBikeIndex?: number;
  createdAt?: number;
}
