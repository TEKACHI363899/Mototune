export type TFriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'friends';

export type TNotificationType =
  | 'friend_request'
  | 'friend_accept'
  | 'post_like'
  | 'post_comment'
  | 'trip_shared';

export interface IUserSummary {
  uid: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface IFriendship {
  id: string;
  users: [string, string];
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
  updatedAt: number;
  usersInfo: {
    [uid: string]: {
      displayName: string;
      avatarUrl: string | null;
    };
  };
}

export interface INotification {
  id: string;
  userId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  type: TNotificationType;
  title: string;
  message: string;
  targetId?: string;
  isRead: boolean;
  createdAt: number;
}

export interface IRouteCoordinate {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp?: number;
}

export interface ILastJourneyData {
  id: string;
  bikeId?: string;
  bikeModel?: string;
  startTime: number;
  endTime?: number;
  distanceKm: number;
  durationSeconds: number;
  progressRatio: number;
  routeCoordinates?: IRouteCoordinate[];
}

export interface IFriendTrip {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  bikeModel: string;
  routeCaption: string;
  distanceKm: number;
  durationSeconds: number;
  coordinates: IRouteCoordinate[];
  createdAt: number;
}

export interface IProfileStats {
  postsCount: number;
  friendsCount: number;
  tripsCount: number;
}
